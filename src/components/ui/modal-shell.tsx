'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}

export function ModalShell({ open, onClose, children, width = 'max-w-md' }: ModalShellProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [open, handleEsc]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            ref={contentRef}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', bounce: 0.12, duration: 0.35 }}
            className={`relative w-full ${width} bg-[#131313]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden`}
          >
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 w-6 h-6 rounded-md flex items-center justify-center text-white/25 hover:text-white/70 hover:bg-white/[0.06] transition-all cursor-pointer z-10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
