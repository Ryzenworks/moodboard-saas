'use client';

import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image as ImageIcon, X, Check, AlertTriangle, Ban, Loader2, XCircle } from 'lucide-react';
import { useUploadStore, type UploadItemStatus } from '@/store/upload';

/** Max items to render in the progress list — prevents DOM explosion for large batches */
const MAX_VISIBLE_ITEMS = 20;

interface UploadZoneProps {
  onDrop: (files: File[]) => void;
  onCancelItem?: (id: string) => void;
  onCancelAll?: () => void;
  uploadsRemaining?: number;
  compact?: boolean;
}

const STATUS_LABELS: Record<UploadItemStatus, string> = {
  queued: 'Queued',
  validating: 'Checking…',
  blocked: 'Blocked',
  compressing: 'Compressing…',
  uploading: 'Uploading…',
  retrying: 'Retrying…',
  completed: 'Done',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<UploadItemStatus, string> = {
  queued: 'text-white/30',
  validating: 'text-blue-300/60',
  blocked: 'text-amber-400/70',
  compressing: 'text-blue-300/60',
  uploading: 'text-accent/80',
  retrying: 'text-amber-300/70',
  completed: 'text-emerald-400/70',
  failed: 'text-red-400/70',
  cancelled: 'text-white/25',
};

const BAR_COLORS: Record<UploadItemStatus, string> = {
  queued: 'bg-white/10',
  validating: 'bg-blue-400',
  blocked: 'bg-amber-500',
  compressing: 'bg-blue-400',
  uploading: 'bg-accent',
  retrying: 'bg-amber-400',
  completed: 'bg-emerald-400',
  failed: 'bg-red-400',
  cancelled: 'bg-white/10',
};

export function UploadZone({ onDrop, onCancelItem, onCancelAll, uploadsRemaining, compact = false }: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // ── Upload store state (optimized subscriptions) ──
  const items = useUploadStore((s) => s.items);
  const batchStatus = useUploadStore((s) => s.batchStatus);
  const stats = useUploadStore((s) => s.derivedStats);

  // Window the visible items — show active/queued first, then recent completed
  const visibleItems = useMemo(() => {
    if (items.length <= MAX_VISIBLE_ITEMS) return items;
    // Prioritize: active > queued > failed > completed > blocked > cancelled
    const priority: Record<UploadItemStatus, number> = {
      uploading: 0, compressing: 0, retrying: 0, validating: 0,
      queued: 1, failed: 2, completed: 3, blocked: 4, cancelled: 5,
    };
    const sorted = [...items].sort((a, b) => priority[a.status] - priority[b.status]);
    return sorted.slice(0, MAX_VISIBLE_ITEMS);
  }, [items]);
  const hiddenCount = Math.max(0, items.length - MAX_VISIBLE_ITEMS);

  // Auto-reopen toast when a new batch starts
  const prevBatchStatus = useRef(batchStatus);
  useEffect(() => {
    if (batchStatus !== 'idle' && prevBatchStatus.current === 'idle') {
      setDismissed(false);
    }
    prevBatchStatus.current = batchStatus;
  }, [batchStatus]);

  // Auto-dismiss after batch completes
  useEffect(() => {
    if (batchStatus === 'done' && !dismissed) {
      const timer = setTimeout(() => setDismissed(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [batchStatus, dismissed]);

  // ── Window-level drag listeners (compact mode only) ──
  useEffect(() => {
    if (!compact) return;

    function onDragEnter(e: DragEvent) {
      e.preventDefault();
      dragCounter.current++;
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDragActive(true);
      }
    }

    function onDragOver(e: DragEvent) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    }

    function onDragLeave(e: DragEvent) {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDragActive(false);
      }
    }

    function onDropHandler(e: DragEvent) {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragActive(false);
    }

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDropHandler);

    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDropHandler);
    };
  }, [compact]);

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length) onDrop(files);
    },
    [onDrop]
  );

  const handleOverlayDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragActive(false);
      if (e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        handleFiles(e.target.files);
        e.target.value = '';
      }
    },
    [handleFiles]
  );

  // ── Derived state ──
  const isActive = batchStatus === 'uploading' || batchStatus === 'validating';
  const showToast = (items.length > 0 || stats.rejected > 0 || stats.duplicate > 0) && !dismissed && batchStatus !== 'idle';
  const limitReached = uploadsRemaining !== undefined && uploadsRemaining !== Infinity && uploadsRemaining <= 0;

  // ── Compact mode ──
  if (compact) {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />

        {/* Drop overlay */}
        <AnimatePresence>
          {isDragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[200] pointer-events-auto"
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.relatedTarget === null || !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
                  dragCounter.current = 0;
                  setIsDragActive(false);
                }
              }}
              onDrop={handleOverlayDrop}
            >
              <div className="absolute inset-2 bg-accent/[0.07] backdrop-blur-sm flex items-center justify-center border-2 border-dashed border-accent/30 rounded-2xl">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-7 h-7 text-accent" />
                  </div>
                  <p className="text-base font-semibold text-white">Drop images to upload</p>
                  <p className="text-xs text-white/30 mt-1">PNG, JPG, GIF, WebP · Max 20MB each</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload button */}
        <div className="flex items-center gap-2">
          {limitReached ? (
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('moodboard:upgrade', { detail: { trigger: 'upload_limit' } }));
              }}
              className="flex items-center gap-2 px-4 h-8 text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Limit reached
            </button>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isActive}
              className="flex items-center gap-2 px-4 h-8 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(5,109,250,0.15)]"
            >
              {isActive ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {isActive ? `Uploading ${stats.completed}/${stats.accepted}` : 'Upload'}
              {!isActive && uploadsRemaining !== undefined && uploadsRemaining !== Infinity && uploadsRemaining <= 10 && (
                <span className={`ml-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  uploadsRemaining <= 5
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-white/10 text-white/50'
                }`}>
                  {uploadsRemaining}
                </span>
              )}
            </button>
          )}
        </div>

        {/* ── Upload progress panel ── */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: 'spring', bounce: 0.1, duration: 0.35 }}
              className="fixed bottom-6 right-6 z-[150] w-[340px] bg-[#161616]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-white/80">
                    {batchStatus === 'done' ? (
                      <span className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-emerald-400" />
                        Batch complete
                      </span>
                    ) : batchStatus === 'validating' ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 text-accent animate-spin" />
                        Preparing uploads…
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 text-accent animate-spin" />
                        Uploading…
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    {isActive && onCancelAll && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancelAll();
                        }}
                        className="px-2 py-1 rounded-md text-[10px] text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-all cursor-pointer"
                      >
                        Cancel all
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDismissed(true);
                      }}
                      className="w-5 h-5 rounded-md flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/[0.08] transition-all cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Stats bar */}
                <div className="flex items-center gap-3 text-[10px]">
                  {stats.completed > 0 && (
                    <span className="text-emerald-400/70">{stats.completed} done</span>
                  )}
                  {stats.active > 0 && (
                    <span className="text-accent/70">{stats.active} active</span>
                  )}
                  {stats.queued > 0 && (
                    <span className="text-white/25">{stats.queued} queued</span>
                  )}
                  {stats.failed > 0 && (
                    <span className="text-red-400/70">{stats.failed} failed</span>
                  )}
                  {stats.blocked > 0 && (
                    <span className="text-amber-400/70">{stats.blocked} blocked</span>
                  )}
                  {stats.cancelled > 0 && (
                    <span className="text-white/20">{stats.cancelled} cancelled</span>
                  )}
                  {stats.rejected > 0 && (
                    <span className="text-red-400/50">{stats.rejected} rejected</span>
                  )}
                  {stats.duplicate > 0 && (
                    <span className="text-amber-400/50">{stats.duplicate} duplicate{stats.duplicate !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>

              {/* Item list */}
              <div className="max-h-52 overflow-y-auto">
                {visibleItems.map((item) => (
                  <div key={item.id} className="px-4 py-2 border-b border-white/[0.03] last:border-0 group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-white/50 truncate max-w-[180px]">
                        {item.file.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] ${STATUS_COLORS[item.status]}`}>
                          {item.status === 'blocked' ? (
                            <span className="flex items-center gap-0.5">
                              <Ban className="w-2.5 h-2.5" />
                              {STATUS_LABELS[item.status]}
                            </span>
                          ) : item.status === 'failed' ? (
                            <span className="flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {STATUS_LABELS[item.status]}
                            </span>
                          ) : item.status === 'completed' ? (
                            <span className="flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" />
                              ✓
                            </span>
                          ) : (
                            STATUS_LABELS[item.status]
                          )}
                        </span>
                        {/* Cancel button for active items */}
                        {['queued', 'compressing', 'uploading', 'retrying', 'validating'].includes(item.status) && onCancelItem && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCancelItem(item.id);
                            }}
                            className="w-4 h-4 rounded flex items-center justify-center text-white/15 hover:text-red-400/70 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Progress bar */}
                    {!['blocked', 'cancelled'].includes(item.status) && (
                      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${BAR_COLORS[item.status]}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${item.progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    )}
                    {/* Block reason */}
                    {item.status === 'blocked' && item.blockReason && (
                      <p className="text-[9px] text-amber-400/40 mt-0.5">{item.blockReason}</p>
                    )}
                    {/* Error message */}
                    {item.status === 'failed' && item.error && (
                      <p className="text-[9px] text-red-400/40 mt-0.5">{item.error}</p>
                    )}
                  </div>
                ))}
                {/* Hidden items summary */}
                {hiddenCount > 0 && (
                  <div className="px-4 py-2 text-center">
                    <span className="text-[10px] text-white/20">
                      +{hiddenCount} more item{hiddenCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Batch progress bar */}
              {isActive && stats.accepted > 0 && (
                <div className="px-4 py-2 border-t border-white/[0.06]">
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(((stats.completed + stats.failed) / stats.accepted) * 100)}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // ── Full empty-state upload zone ──
  return (
    <div
      className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
        isDragActive
          ? 'border-accent/50 bg-accent/[0.05]'
          : 'border-white/[0.08] bg-white/[0.01] hover:border-white/[0.15] hover:bg-white/[0.02]'
      }`}
      onDragEnter={(e) => { e.preventDefault(); setIsDragActive(true); }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => { e.preventDefault(); setIsDragActive(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragActive(false);
        if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
          <ImageIcon className="w-7 h-7 text-white/15" />
        </div>
        <div>
          <p className="text-sm font-medium text-white/60 mb-1">
            Drop images here or click to upload
          </p>
          <p className="text-xs text-white/25">
            PNG, JPG, GIF, WebP — max 20MB each — compressed automatically
          </p>
          {uploadsRemaining !== undefined && uploadsRemaining !== Infinity && (
            <p className={`text-[10px] mt-1 ${uploadsRemaining <= 5 ? 'text-amber-400/60' : 'text-white/15'}`}>
              {uploadsRemaining > 0 ? `${uploadsRemaining} upload${uploadsRemaining !== 1 ? 's' : ''} remaining` : 'Upload limit reached — upgrade to Pro'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
