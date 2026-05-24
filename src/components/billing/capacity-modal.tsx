'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Trash2, Mail } from 'lucide-react';
import { PLAN_LIMITS } from '@/types';

interface CapacityModalProps {
  open: boolean;
  onClose: () => void;
  type: 'boards' | 'uploads';
}

/**
 * Informational modal for Pro users who've hit their plan capacity.
 * Does NOT show upgrade CTAs — Pro users should never see monetization prompts.
 */
export function CapacityModal({ open, onClose, type }: CapacityModalProps) {
  const limit = type === 'boards' ? PLAN_LIMITS.pro.maxBoards : PLAN_LIMITS.pro.maxUploads;
  const label = type === 'boards' ? 'boards' : 'uploads';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          {/* Modal */}
          <motion.div
            className="relative bg-card border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', duration: 0.3 }}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/20 hover:text-white/50 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold mb-1.5">
              {type === 'boards' ? 'Board' : 'Upload'} limit reached
            </h3>

            {/* Description */}
            <p className="text-sm text-white/40 mb-5 leading-relaxed">
              You&apos;ve reached the maximum of{' '}
              <span className="text-white/70 font-medium">{limit} {label}</span>{' '}
              on the Pro plan.
            </p>

            {/* Suggestions */}
            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-3 text-xs text-white/35">
                <Trash2 className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                <span>Delete an existing {type === 'boards' ? 'board' : 'upload'} to make room</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/35">
                <Mail className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                <span>Need more capacity? Contact support</span>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="w-full h-10 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm font-medium text-white/70 hover:bg-white/[0.1] transition-colors cursor-pointer"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
