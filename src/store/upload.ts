import { create } from 'zustand';
import type { Image } from '@/types';

// ── Upload item lifecycle states ──
export type UploadItemStatus =
  | 'queued'
  | 'validating'
  | 'blocked'
  | 'compressing'
  | 'uploading'
  | 'retrying'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface UploadItem {
  /** Deterministic ID based on fingerprint */
  id: string;
  file: File;
  fingerprint: string;
  status: UploadItemStatus;
  progress: number;
  error?: string;
  blockReason?: string;
  resultImage?: Image;
  /** AbortController for cancelling this upload */
  abortController?: AbortController;
}

export type BatchStatus = 'idle' | 'validating' | 'uploading' | 'done';

export interface UploadStats {
  total: number;
  accepted: number;
  rejected: number;
  blocked: number;
  duplicate: number;
  completed: number;
  failed: number;
  cancelled: number;
  queued: number;
  active: number;
}

interface UploadState {
  // ── State ──
  items: UploadItem[];
  batchStatus: BatchStatus;
  /** Base counters incremented by addStats (rejected, duplicate, blocked overflow) */
  _baseStats: { rejected: number; blocked: number; duplicate: number; total: number };
  /** Eagerly computed derived stats — STABLE reference for selectors */
  derivedStats: UploadStats;

  // ── Actions ──
  enqueue: (items: Omit<UploadItem, 'status' | 'progress'>[]) => number;
  updateItem: (id: string, updates: Partial<UploadItem>) => void;
  markCompleted: (id: string, image: Image) => void;
  markFailed: (id: string, error: string) => void;
  markCancelled: (id: string) => void;
  cancelAll: () => void;
  setBatchStatus: (status: BatchStatus) => void;
  addStats: (deltas: Partial<{ rejected: number; blocked: number; duplicate: number; total: number }>) => void;
  getNextQueued: () => UploadItem | null;
  getActiveCount: () => number;
  reset: () => void;
  isUploading: () => boolean;
}

const EMPTY_BASE = { rejected: 0, blocked: 0, duplicate: 0, total: 0 };

const EMPTY_DERIVED: UploadStats = {
  total: 0, accepted: 0, rejected: 0, blocked: 0, duplicate: 0,
  completed: 0, failed: 0, cancelled: 0, queued: 0, active: 0,
};

/**
 * Single-pass stats computation from items + base counters.
 * Called eagerly inside every mutation — result is stored as `derivedStats`.
 * Selectors subscribe to `derivedStats` which is a STABLE object reference
 * (only replaced when the computed values actually change).
 */
function computeFromItems(
  items: UploadItem[],
  base: { rejected: number; blocked: number; duplicate: number; total: number }
): UploadStats {
  let queued = 0, active = 0, completed = 0, failed = 0, cancelled = 0, itemBlocked = 0;
  for (let i = 0; i < items.length; i++) {
    const s = items[i].status;
    if (s === 'queued') queued++;
    else if (s === 'compressing' || s === 'uploading' || s === 'retrying' || s === 'validating') active++;
    else if (s === 'completed') completed++;
    else if (s === 'failed') failed++;
    else if (s === 'cancelled') cancelled++;
    else if (s === 'blocked') itemBlocked++;
  }

  return {
    total: base.total || (items.length + base.rejected + base.duplicate + base.blocked),
    accepted: items.length - itemBlocked,
    rejected: base.rejected,
    blocked: base.blocked + itemBlocked,
    duplicate: base.duplicate,
    completed,
    failed,
    cancelled,
    queued,
    active,
  };
}

export const useUploadStore = create<UploadState>((set, get) => ({
  items: [],
  batchStatus: 'idle',
  _baseStats: { ...EMPTY_BASE },
  derivedStats: { ...EMPTY_DERIVED },

  enqueue: (newItems) => {
    const state = get();
    const existingIds = new Set(state.items.map((i) => i.id));
    const deduped = newItems.filter((item) => !existingIds.has(item.id));

    if (deduped.length === 0) return 0;

    const uploadItems: UploadItem[] = deduped.map((item) => ({
      ...item,
      status: 'queued' as const,
      progress: 0,
    }));

    const nextItems = [...state.items, ...uploadItems];
    set({
      items: nextItems,
      derivedStats: computeFromItems(nextItems, state._baseStats),
    });

    return deduped.length;
  },

  updateItem: (id, updates) =>
    set((s) => {
      const nextItems = s.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      );
      return {
        items: nextItems,
        derivedStats: computeFromItems(nextItems, s._baseStats),
      };
    }),

  markCompleted: (id, image) =>
    set((s) => {
      const nextItems = s.items.map((item) =>
        item.id === id
          ? { ...item, status: 'completed' as const, progress: 100, resultImage: image }
          : item
      );
      return {
        items: nextItems,
        derivedStats: computeFromItems(nextItems, s._baseStats),
      };
    }),

  markFailed: (id, error) =>
    set((s) => {
      const nextItems = s.items.map((item) =>
        item.id === id
          ? { ...item, status: 'failed' as const, error }
          : item
      );
      return {
        items: nextItems,
        derivedStats: computeFromItems(nextItems, s._baseStats),
      };
    }),

  markCancelled: (id) => {
    const item = get().items.find((i) => i.id === id);
    if (item?.abortController) {
      item.abortController.abort();
    }
    set((s) => {
      const nextItems = s.items.map((i) =>
        i.id === id
          ? { ...i, status: 'cancelled' as const, progress: 0 }
          : i
      );
      return {
        items: nextItems,
        derivedStats: computeFromItems(nextItems, s._baseStats),
      };
    });
  },

  cancelAll: () => {
    const items = get().items;
    items.forEach((item) => {
      if (item.abortController && (item.status === 'uploading' || item.status === 'compressing' || item.status === 'retrying')) {
        item.abortController.abort();
      }
    });
    set((s) => {
      const nextItems = s.items.map((item) => {
        if (['queued', 'validating', 'compressing', 'uploading', 'retrying'].includes(item.status)) {
          return { ...item, status: 'cancelled' as const, progress: 0 };
        }
        return item;
      });
      return {
        items: nextItems,
        batchStatus: 'done' as const,
        derivedStats: computeFromItems(nextItems, s._baseStats),
      };
    });
  },

  setBatchStatus: (batchStatus) => set({ batchStatus }),

  addStats: (deltas) =>
    set((s) => {
      const base = { ...s._baseStats };
      for (const [key, val] of Object.entries(deltas)) {
        if (val !== undefined) {
          (base as Record<string, number>)[key] = ((base as Record<string, number>)[key] || 0) + val;
        }
      }
      return {
        _baseStats: base,
        derivedStats: computeFromItems(s.items, base),
      };
    }),

  getNextQueued: () => {
    return get().items.find((item) => item.status === 'queued') ?? null;
  },

  getActiveCount: () => {
    return get().items.filter((item) =>
      item.status === 'compressing' || item.status === 'uploading' || item.status === 'retrying'
    ).length;
  },

  reset: () =>
    set({
      items: [],
      batchStatus: 'idle',
      _baseStats: { ...EMPTY_BASE },
      derivedStats: { ...EMPTY_DERIVED },
    }),

  isUploading: () => {
    const status = get().batchStatus;
    return status === 'validating' || status === 'uploading';
  },
}));
