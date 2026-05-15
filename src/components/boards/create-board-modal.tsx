'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BOARD_COLORS, type BoardColor } from '@/utils/board-colors';

interface CreateBoardModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, color: string) => Promise<void>;
}

export function CreateBoardModal({ open, onClose, onCreate }: CreateBoardModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<BoardColor>('cobalt');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onCreate(name.trim(), description.trim(), color);
      setName('');
      setDescription('');
      setColor('cobalt');
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
            className="relative w-full max-w-md bg-[#111] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-semibold">New Board</h2>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-md flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <Input
                label="Board Name"
                placeholder="e.g. 🎨 Brand Identity"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Description
                </label>
                <textarea
                  placeholder="Optional description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-input text-foreground placeholder:text-muted border border-white/[0.08] rounded-[var(--radius-md)] outline-none transition-all duration-200 focus:bg-input-focus focus:border-accent/50 focus:ring-1 focus:ring-accent/30 resize-none"
                />
              </div>

              {/* Color picker */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Color
                </label>
                <div className="flex gap-2">
                  {BOARD_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      title={c.label}
                      className="relative w-7 h-7 rounded-full transition-all cursor-pointer hover:scale-110"
                      style={{ background: c.swatch }}
                    >
                      {color === c.id && (
                        <motion.div
                          layoutId="color-check"
                          className="absolute inset-0 flex items-center justify-center"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
                        >
                          <Check className="w-3.5 h-3.5 text-white drop-shadow-md" />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <Button variant="ghost" onClick={onClose} type="button">
                  Cancel
                </Button>
                <Button type="submit" loading={loading} disabled={!name.trim()}>
                  Create Board
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
