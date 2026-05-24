'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image as ImageIcon, X, Check } from 'lucide-react';
import type { UploadProgress } from '@/services/images';

interface UploadZoneProps {
  onDrop: (files: File[]) => void;
  uploading: boolean;
  progress: UploadProgress[];
  compact?: boolean;
  skippedCount?: number;
  limitMessage?: string;
  uploadsRemaining?: number;
}

export function UploadZone({ onDrop, uploading, progress, compact = false, skippedCount = 0, limitMessage = '', uploadsRemaining }: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const prevUploadingRef = useRef(false);

  // ── Window-level drag listeners (compact mode only) ──
  // These listen on window so nothing blocks them. No permanent DOM overlay needed.
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
      // Required to allow drop
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
      // Don't handle drop here — the overlay div handles it when visible
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

  // Auto-reopen toast on new uploads
  useEffect(() => {
    if (uploading && !prevUploadingRef.current) {
      setDismissed(false);
    }
    prevUploadingRef.current = uploading;
  }, [uploading]);

  // Auto-hide after all complete
  useEffect(() => {
    if (progress.length > 0 && !uploading && !dismissed) {
      const allDone = progress.every((p) => p.status === 'done' || p.status === 'error');
      if (allDone) {
        const timer = setTimeout(() => setDismissed(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [progress, uploading, dismissed]);

  // Allowed MIME types
  const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

  const [rejectMessage, setRejectMessage] = useState<string | null>(null);

  // Auto-clear rejection message
  useEffect(() => {
    if (rejectMessage) {
      const t = setTimeout(() => setRejectMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [rejectMessage]);

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const all = Array.from(fileList);
      const valid = all.filter((f) => ACCEPTED_TYPES.has(f.type));
      const rejected = all.length - valid.length;

      if (rejected > 0) {
        setRejectMessage(
          `${rejected} file${rejected > 1 ? 's' : ''} rejected — only PNG, JPG, WebP, GIF allowed.`
        );
      }
      if (valid.length) onDrop(valid);
    },
    [onDrop]
  );

  // Drop handler for the visible overlay
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

  // ── Toast visibility ──
  const showToast = progress.length > 0 && !dismissed;
  const completedCount = progress.filter((p) => p.status === 'done').length;
  const allDone = progress.length > 0 && progress.every((p) => p.status === 'done' || p.status === 'error');

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

        {/*
          Drop overlay — ONLY rendered when dragging files.
          pointer-events-auto ONLY when isDragActive.
          When not dragging: pointer-events-none so nothing is blocked.
        */}
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
                // Only deactivate if leaving the window entirely
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
                  <p className="text-xs text-white/30 mt-1">PNG, JPG, GIF, WebP</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload button with remaining count */}
        <div className="flex items-center gap-2">
          {uploadsRemaining !== undefined && uploadsRemaining !== Infinity && uploadsRemaining <= 0 ? (
            <button
              onClick={() => {
                // Trigger upgrade modal via a custom event the parent can listen to
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
              disabled={uploading}
              className="flex items-center gap-2 px-4 h-8 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(5,109,250,0.15)]"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload
              {uploadsRemaining !== undefined && uploadsRemaining !== Infinity && uploadsRemaining <= 10 && (
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

        {/* Upload progress toast */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: 'spring', bounce: 0.1, duration: 0.35 }}
              className="fixed bottom-6 right-6 z-[150] w-80 bg-[#161616]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-xs font-medium text-white/80">
                  {allDone ? (
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-emerald-400" />
                      {completedCount} uploaded
                    </span>
                  ) : (
                    `Uploading ${progress.length} file${progress.length > 1 ? 's' : ''}`
                  )}
                </span>
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
              <div className="max-h-48 overflow-y-auto">
                {progress.map((p) => (
                  <div key={p.filename} className="px-4 py-2 border-b border-white/[0.03] last:border-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-white/50 truncate max-w-[200px]">
                        {p.filename}
                      </span>
                      <span className={`text-[10px] capitalize ${
                        p.status === 'done' ? 'text-emerald-400/60' :
                        p.status === 'error' ? 'text-red-400/60' :
                        'text-white/25'
                      }`}>
                        {p.status === 'done' ? '✓' : p.status}
                      </span>
                    </div>
                    <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          p.status === 'done' ? 'bg-emerald-400' :
                          p.status === 'error' ? 'bg-red-400' :
                          'bg-accent'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${p.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rejection toast */}
        <AnimatePresence>
          {rejectMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="fixed bottom-20 right-6 z-[150] px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-xl shadow-lg"
            >
              <p className="text-xs text-red-300">{rejectMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Duplicate skipped toast */}
        <AnimatePresence>
          {skippedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="fixed bottom-32 right-6 z-[150] px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl backdrop-blur-xl shadow-lg"
            >
              <p className="text-xs text-amber-300">
                {skippedCount} duplicate{skippedCount > 1 ? 's' : ''} skipped
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Limit reached toast */}
        <AnimatePresence>
          {limitMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="fixed bottom-44 right-6 z-[150] px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl backdrop-blur-xl shadow-lg"
            >
              <p className="text-xs text-amber-300">{limitMessage}</p>
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
            PNG, JPG, GIF, WebP — compressed automatically
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
