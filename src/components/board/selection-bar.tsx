'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Star, Tag, Download, X, CheckSquare, Square } from 'lucide-react';

interface SelectionBarProps {
  count: number;
  totalVisible: number;
  onClear: () => void;
  onSelectAll: () => void;
  onDelete: () => void;
  onFavorite: () => void;
  onTag: () => void;
  onDownload: () => void;
}

export function SelectionBar({
  count,
  totalVisible,
  onClear,
  onSelectAll,
  onDelete,
  onFavorite,
  onTag,
  onDownload,
}: SelectionBarProps) {
  const allSelected = count > 0 && count >= totalVisible;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-3 px-5 py-3 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/50"
        >
          {/* Count */}
          <span className="text-xs font-medium text-white/70 mr-1">
            {count} selected
          </span>

          {/* Select All / Clear All toggle */}
          <button
            onClick={allSelected ? onClear : onSelectAll}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-[11px] font-medium text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all cursor-pointer"
            title={allSelected ? 'Clear Selection' : 'Select All'}
          >
            {allSelected ? (
              <Square className="w-3.5 h-3.5" />
            ) : (
              <CheckSquare className="w-3.5 h-3.5" />
            )}
            {allSelected ? 'Clear' : 'All'}
          </button>

          <div className="w-px h-5 bg-white/[0.08]" />

          <button
            onClick={onFavorite}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-yellow-400 hover:bg-white/[0.06] transition-all cursor-pointer"
            title="Toggle Favorites"
          >
            <Star className="w-4 h-4" />
          </button>
          <button
            onClick={onTag}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-accent hover:bg-white/[0.06] transition-all cursor-pointer"
            title="Categorize"
          >
            <Tag className="w-4 h-4" />
          </button>
          <button
            onClick={onDownload}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-green-400 hover:bg-white/[0.06] transition-all cursor-pointer"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-danger hover:bg-danger/10 transition-all cursor-pointer"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-white/[0.08]" />

          <button
            onClick={onClear}
            className="w-7 h-7 rounded-md flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
