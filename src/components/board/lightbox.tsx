'use client';

import { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Star, Download, Trash2 } from 'lucide-react';
import type { Image } from '@/types';
import { downloadFile } from '@/utils/download';
import { ConfirmModal } from '@/components/ui/confirm-modal';

interface LightboxProps {
  images: Image[];
  activeId: string | null;
  onClose: () => void;
  onNavigate: (id: string) => void;
  onFavorite: (id: string, current: boolean) => void;
  onDelete: (id: string, storagePath: string) => void;
}

export function Lightbox({
  images,
  activeId,
  onClose,
  onNavigate,
  onFavorite,
  onDelete,
}: LightboxProps) {
  const activeIndex = images.findIndex((img) => img.id === activeId);
  const image = activeIndex >= 0 ? images[activeIndex] : null;
  const [direction, setDirection] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const navigate = useCallback(
    (dir: number) => {
      if (activeIndex < 0) return;
      setDirection(dir);
      const next = (activeIndex + dir + images.length) % images.length;
      onNavigate(images[next].id);
    },
    [activeIndex, images, onNavigate]
  );

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!activeId) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeId, navigate, onClose]);

  return (
    <>
    <AnimatePresence mode="wait">
      {image && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center"
          onClick={onClose}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.1] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Nav */}
          <button
            onClick={(e) => { e.stopPropagation(); navigate(-1); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.1] transition-all cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(1); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.1] transition-all cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Image */}
          <motion.img
            key={image.id}
            src={image.url}
            alt={image.filename}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.25 }}
            className="max-w-[85vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Bottom bar */}
          <div
            className="absolute bottom-0 inset-x-0 p-4 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {image.filename}
              </p>
              {image.note && (
                <p className="text-xs text-white/40 truncate mt-0.5">
                  {image.note}
                </p>
              )}
              {image.palette.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {image.palette.map((c, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full border border-white/20 cursor-pointer hover:scale-125 transition-transform"
                      style={{ background: c }}
                      title={c}
                      onClick={() => {
                        navigator.clipboard.writeText(c);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onFavorite(image.id, image.is_favorite)}
                className="w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center text-white/60 hover:text-yellow-400 transition-all cursor-pointer"
              >
                <Star className="w-4 h-4" fill={image.is_favorite ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={() => downloadFile(image.url, image.filename)}
                className="w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center text-white/60 hover:text-green-400 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center text-white/60 hover:text-red-400 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-xs text-white/30">
            {activeIndex + 1} / {images.length}
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {image && (
      <ConfirmModal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          onDelete(image.id, image.storage_path);
          const nextIdx = Math.min(activeIndex, images.length - 2);
          if (nextIdx >= 0 && images.length > 1) {
            const nextImg = images.filter((i) => i.id !== image.id)[nextIdx];
            if (nextImg) onNavigate(nextImg.id);
            else onClose();
          } else {
            onClose();
          }
        }}
        title="Delete Image"
        message={`"${image.filename}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    )}
    </>
  );
}
