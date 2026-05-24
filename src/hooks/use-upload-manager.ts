'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useUploadStore } from '@/store/upload';
import { useBoardStore } from '@/store/board';
import { useSubscriptionStore } from '@/store/subscription';
import { useBoardsStore } from '@/store/boards';
import { imagesService } from '@/services/images';
import { boardsService } from '@/services/boards';
import { extractPaletteFromUrl } from '@/utils/palette';
import { PLAN_LIMITS } from '@/types';
import type { UploadItem } from '@/store/upload';

// ── Constants ──
const MAX_CONCURRENT = 3;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const PROGRESS_THROTTLE_MS = 60;
/** How many files to process per microtask chunk during intake */
const INTAKE_CHUNK_SIZE = 50;

/**
 * Canonical fingerprint from a File object.
 * Deterministic: same file always produces the same fingerprint.
 */
function fileFingerprint(file: File): string {
  return `${file.name}::${file.size}::${file.lastModified}`;
}

/**
 * Yield to the browser so React can render.
 * Uses MessageChannel for reliable scheduling that doesn't get throttled.
 */
function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => resolve();
    ch.port2.postMessage(null);
  });
}

/**
 * Production-grade upload manager.
 *
 * Performance guarantees:
 * - UI updates within 1 frame of file selection
 * - O(allowed) processing, NOT O(total selected)
 * - 1000-file batches handled without browser freeze
 * - Chunked intake with yields between chunks
 * - Plan limits enforced BEFORE any validation/processing
 */
export function useUploadManager(boardId: string, userId: string | undefined) {
  const store = useUploadStore;
  const addImage = useBoardStore((s) => s.addImage);
  const updateImage = useBoardStore((s) => s.updateImage);
  const incrementImageCount = useSubscriptionStore((s) => s.incrementImageCount);
  const updateBoardInList = useBoardsStore((s) => s.updateBoard);

  // Ref to track if the executor loop is running
  const executorRunning = useRef(false);

  // ── Executor: processes queued items with concurrency control ──
  const processQueue = useCallback(() => {
    if (executorRunning.current) return;
    executorRunning.current = true;

    const state = store.getState();
    let launched = 0;

    // Launch up to MAX_CONCURRENT items
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const active = store.getState().getActiveCount();
      const next = store.getState().getNextQueued();

      if (!next || active >= MAX_CONCURRENT) break;

      launched++;
      processItem(next);
    }

    executorRunning.current = false;

    // If nothing was launched, check if batch is complete
    if (launched === 0) {
      checkBatchComplete();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, userId]);

  // ── Check if the batch is done ──
  const checkBatchComplete = useCallback(() => {
    const state = store.getState();
    const pending = state.items.filter((i) =>
      ['queued', 'compressing', 'uploading', 'retrying', 'validating'].includes(i.status)
    );

    if (pending.length === 0 && state.batchStatus === 'uploading') {
      state.setBatchStatus('done');
      setTimeout(() => {
        const current = store.getState();
        if (current.batchStatus === 'done') {
          current.reset();
        }
      }, 3000);
    }
  }, []);

  // ── Process a single upload item ──
  const processItem = useCallback(async (item: UploadItem) => {
    const { updateItem, markCompleted, markFailed } = store.getState();

    // Create AbortController for this upload
    const abortController = new AbortController();
    updateItem(item.id, { status: 'validating', progress: 5, abortController });

    try {
      if (abortController.signal.aborted) throw new DOMException('Aborted', 'AbortError');

      // DB-level dedup check
      try {
        const existsInDB = await imagesService.checkDuplicate(boardId, item.fingerprint);
        if (existsInDB) {
          updateItem(item.id, { status: 'blocked', blockReason: 'Already uploaded to this board' });
          store.getState().addStats({ duplicate: 1 });
          onItemFinished();
          return;
        }
      } catch {
        // Fail open
      }

      if (abortController.signal.aborted) throw new DOMException('Aborted', 'AbortError');

      // Upload (handles compression, storage upload, DB insert)
      updateItem(item.id, { status: 'compressing', progress: 10 });

      let lastProgressTime = 0;
      const img = await imagesService.upload(
        item.file,
        boardId,
        userId!,
        (p) => {
          if (abortController.signal.aborted) return;
          const now = Date.now();
          if (now - lastProgressTime < PROGRESS_THROTTLE_MS && p.status === 'uploading') return;
          lastProgressTime = now;

          const statusMap: Record<string, UploadItem['status']> = {
            compressing: 'compressing',
            uploading: 'uploading',
            extracting: 'uploading',
            done: 'completed',
            error: 'failed',
          };

          updateItem(item.id, {
            status: statusMap[p.status] || 'uploading',
            progress: p.progress,
          });
        },
        item.fingerprint
      );

      if (abortController.signal.aborted) throw new DOMException('Aborted', 'AbortError');

      // Success
      markCompleted(item.id, img);
      addImage(img);
      incrementImageCount(1);

      // Sync counts (non-blocking)
      const newCount = useBoardStore.getState().images.length;
      updateBoardInList(boardId, { image_count: newCount });
      boardsService.syncImageCount(boardId, newCount).catch(() => {});

      // Background palette (non-blocking)
      extractPaletteFromUrl(img.url)
        .then(async (palette) => {
          if (palette.length) {
            updateImage(img.id, { palette });
            try { await imagesService.updatePalette(img.id, palette); }
            catch { /* non-critical */ }
          }
        })
        .catch(() => {});

    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Upload failed';
      markFailed(item.id, message);
    } finally {
      onItemFinished();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, userId, addImage, updateImage, incrementImageCount, updateBoardInList, processQueue]);

  // ── Called when any item finishes (success, fail, blocked) ──
  const onItemFinished = useCallback(() => {
    // Release executor lock and try to process more
    executorRunning.current = false;
    processQueue();
  }, [processQueue]);

  // ════════════════════════════════════════════════════════
  // ──  MAIN UPLOAD ENTRY POINT  ──────────────────────────
  // ════════════════════════════════════════════════════════
  //
  // PERFORMANCE CONTRACT:
  //   1. Plan limit computed FIRST (O(1))
  //   2. Files sliced to allowed count BEFORE any loops
  //   3. Batch status + stats set SYNCHRONOUSLY (UI renders immediately)
  //   4. Validation/dedup runs ASYNC in chunks after first paint
  //   5. Only O(allowed) files are ever touched
  //
  const upload = useCallback((files: File[]) => {
    if (!userId) return;

    const state = store.getState();

    // If batch is idle/done, reset for fresh batch
    if (state.batchStatus === 'idle' || state.batchStatus === 'done') {
      state.reset();
    }

    // ════════════════════════════════════════════════════
    // INSTANT: Plan limit computation (O(1), no loops)
    // ════════════════════════════════════════════════════
    const plan = useSubscriptionStore.getState().plan;
    const imageCount = useSubscriptionStore.getState().imageCount;
    const limit = PLAN_LIMITS[plan].maxUploads;
    const remaining = limit === Infinity ? Infinity : Math.max(0, limit - imageCount);

    // ════════════════════════════════════════════════════
    // INSTANT: Slice files BEFORE any processing
    // For 1000 files on free plan with 50 remaining:
    //   → candidateFiles = first 50 only
    //   → overflowCount = 950 (never touched)
    // ════════════════════════════════════════════════════
    let candidateFiles: File[];
    let overflowCount: number;

    if (remaining === Infinity) {
      candidateFiles = files;
      overflowCount = 0;
    } else if (remaining <= 0) {
      candidateFiles = [];
      overflowCount = files.length;
    } else {
      candidateFiles = files.slice(0, remaining);
      overflowCount = Math.max(0, files.length - remaining);
    }

    // ════════════════════════════════════════════════════
    // INSTANT: Set batch status + overflow stats NOW
    // React renders on next frame — user sees "importing started"
    // ════════════════════════════════════════════════════
    store.getState().setBatchStatus('validating');

    if (overflowCount > 0) {
      store.getState().addStats({ blocked: overflowCount, total: files.length });
    }

    // If everything is blocked, show done immediately
    if (candidateFiles.length === 0) {
      store.getState().setBatchStatus('done');
      return;
    }

    // ════════════════════════════════════════════════════
    // ASYNC: Process candidates in chunks after first paint
    // Only O(allowed) files are validated/fingerprinted
    // ════════════════════════════════════════════════════
    processIntakeAsync(candidateFiles, overflowCount, limit);

  }, [userId]);

  // ── Async chunked intake (runs after React renders) ──
  const processIntakeAsync = useCallback(async (candidateFiles: File[], overflowCount: number, limit: number) => {
    // Yield so React can paint the "validating" state
    await yieldToBrowser();

    const storeImages = useBoardStore.getState().images;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storeFingerprints = new Set(storeImages.map((img: any) => img.fingerprint).filter(Boolean));
    const queueFingerprints = new Set(store.getState().items.map((i) => i.fingerprint));
    const batchSeen = new Set<string>();

    const accepted: { file: File; fp: string }[] = [];
    let rejectedCount = 0;
    let dupeCount = 0;

    // Process in chunks to avoid blocking main thread
    for (let offset = 0; offset < candidateFiles.length; offset += INTAKE_CHUNK_SIZE) {
      const chunk = candidateFiles.slice(offset, offset + INTAKE_CHUNK_SIZE);

      for (const file of chunk) {
        // Format check
        if (!ACCEPTED_TYPES.has(file.type)) {
          rejectedCount++;
          continue;
        }
        // Size check
        if (file.size > MAX_FILE_SIZE) {
          rejectedCount++;
          continue;
        }

        const fp = fileFingerprint(file);

        // In-memory dedup (batch + store + queue)
        if (batchSeen.has(fp) || storeFingerprints.has(fp) || queueFingerprints.has(fp)) {
          dupeCount++;
          continue;
        }

        batchSeen.add(fp);
        accepted.push({ file, fp });
      }

      // Yield between chunks if there are more to process
      if (offset + INTAKE_CHUNK_SIZE < candidateFiles.length) {
        // Update stats incrementally so UI shows progress during intake
        if (rejectedCount > 0 || dupeCount > 0) {
          store.getState().addStats({
            ...(rejectedCount > 0 ? { rejected: rejectedCount } : {}),
            ...(dupeCount > 0 ? { duplicate: dupeCount } : {}),
          });
          rejectedCount = 0;
          dupeCount = 0;
        }
        await yieldToBrowser();
      }
    }

    // Final stats flush
    if (rejectedCount > 0 || dupeCount > 0) {
      store.getState().addStats({
        ...(rejectedCount > 0 ? { rejected: rejectedCount } : {}),
        ...(dupeCount > 0 ? { duplicate: dupeCount } : {}),
      });
    }

    if (accepted.length === 0) {
      store.getState().setBatchStatus('done');
      return;
    }

    // ── Enqueue accepted items ──
    const uploadItems = accepted.map(({ file, fp }) => ({
      id: fp,
      file,
      fingerprint: fp,
    }));

    const added = store.getState().enqueue(uploadItems);
    store.getState().addStats({ total: candidateFiles.length + overflowCount });

    // ── Start executor ──
    store.getState().setBatchStatus('uploading');
    processQueue();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processQueue]);

  // ── Cancel a single item ──
  const cancelItem = useCallback((id: string) => {
    store.getState().markCancelled(id);
    executorRunning.current = false;
    processQueue();
  }, [processQueue]);

  // ── Cancel all ──
  const cancelAll = useCallback(() => {
    store.getState().cancelAll();
  }, []);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      const state = store.getState();
      if (state.isUploading()) {
        state.cancelAll();
      }
    };
  }, []);

  return {
    upload,
    cancelItem,
    cancelAll,
    isUploading: useUploadStore((s) => s.batchStatus === 'uploading' || s.batchStatus === 'validating'),
    batchStatus: useUploadStore((s) => s.batchStatus),
    items: useUploadStore((s) => s.items),
    stats: useUploadStore((s) => s.derivedStats),
  };
}
