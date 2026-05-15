'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Plus } from 'lucide-react';
import { useBoardStore } from '@/store/board';
import type { Category } from '@/types';

interface TagModalProps {
  imageId: string | null;
  onClose: () => void;
  onTag: (imageId: string, categoryId: string) => void;
  onUntag: (imageId: string, categoryId: string) => void;
  onCreateCategory: (name: string) => Promise<Category | undefined>;
}

export function TagModal({ imageId, onClose, onTag, onUntag, onCreateCategory }: TagModalProps) {
  const [newCat, setNewCat] = useState('');
  const { categories, imageCategoryMap } = useBoardStore();

  if (!imageId) return null;

  const imageCats = new Set(imageCategoryMap[imageId] || []);

  async function handleCreate() {
    if (!newCat.trim() || !imageId) return;
    const cat = await onCreateCategory(newCat.trim());
    if (cat) {
      onTag(imageId, cat.id);
    }
    setNewCat('');
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm bg-[#111] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold">Categories</h3>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-md flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Category list */}
          <div className="max-h-60 overflow-y-auto p-2">
            {categories.length === 0 && (
              <p className="text-xs text-white/20 text-center py-4">No categories yet</p>
            )}
            {categories.map((cat) => {
              const active = imageCats.has(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    if (active) onUntag(imageId, cat.id);
                    else onTag(imageId, cat.id);
                  }}
                  className="flex items-center gap-2.5 w-full px-3 h-9 rounded-lg text-xs transition-all cursor-pointer hover:bg-white/[0.04]"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      active
                        ? 'bg-accent border-accent'
                        : 'border-white/[0.15]'
                    }`}
                  >
                    {active && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={active ? 'text-white' : 'text-white/50'}>
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* New category input */}
          <div className="px-3 pb-3">
            <div className="flex gap-2">
              <input
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="+ New category..."
                className="flex-1 h-8 px-3 text-xs bg-white/[0.04] border border-white/[0.06] rounded-lg text-white placeholder:text-white/20 outline-none focus:border-accent/40 transition-all"
              />
              {newCat.trim() && (
                <button
                  onClick={handleCreate}
                  className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white hover:bg-accent-hover transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
