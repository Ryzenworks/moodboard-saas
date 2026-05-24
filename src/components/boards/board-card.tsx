'use client';

import { motion } from 'framer-motion';
import { MoreHorizontal, Trash2, Edit3, Image as ImageIcon, Palette } from 'lucide-react';
import type { Board } from '@/types';
import Link from 'next/link';
import { useState, useRef, useEffect, useMemo } from 'react';
import { getBoardColor, BOARD_COLORS } from '@/utils/board-colors';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { PromptModal } from '@/components/ui/prompt-modal';
import { MoodboardLogo } from '@/components/ui/logo';

interface BoardCardProps {
  board: Board;
  index: number;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onColorChange: (id: string, color: string) => void;
}

function extractEmoji(name: string): { emoji: string | null; cleanName: string } {
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*/u;
  const match = name.match(emojiRegex);
  if (match) return { emoji: match[1], cleanName: name.slice(match[0].length) };
  return { emoji: null, cleanName: name };
}

export function BoardCard({ board, index, onDelete, onRename, onColorChange }: BoardCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const color = useMemo(() => getBoardColor(board.color), [board.color]);
  const { emoji } = useMemo(() => extractEmoji(board.name), [board.name]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setColorPickerOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [menuOpen]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <Link href={`/boards/${board.id}`} className="block group">
          <div className="relative rounded-[18px] overflow-hidden transition-all duration-500 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)]">

            {/* ── Surface layers ── */}
            <div className="relative" style={{ background: color.surface }}>

              {/* Bloom — soft top-center light */}
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-700 opacity-100 group-hover:opacity-[1.4]"
                style={{ background: color.bloom }}
              />

              {/* Vignette — bottom depth grounding */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: color.vignette }}
              />

              {/* Noise grain — subtle texture */}
              <div
                className="absolute inset-0 opacity-[0.025] mix-blend-overlay pointer-events-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                }}
              />

              {/* Hover glow — radial center bloom on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{ background: `radial-gradient(ellipse 60% 45% at 50% 30%, ${color.glow}, transparent 70%)` }}
              />

              {/* Edge light — top border glow */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent group-hover:via-white/[0.14] transition-all duration-500 pointer-events-none" />

              {/* Glass border */}
              <div className="absolute inset-0 rounded-[18px] border border-white/[0.05] group-hover:border-white/[0.10] transition-colors duration-500 pointer-events-none" />

              {/* ── Content ── */}
              <div className="pt-9 pb-4 px-5 flex flex-col items-center text-center relative z-10">

                {/* Icon container */}
                {emoji ? (
                  <span className="text-[40px] leading-none select-none mb-4 transition-transform duration-500 ease-out group-hover:scale-105 drop-shadow-lg">
                    {emoji}
                  </span>
                ) : (
                  <div className="relative mb-4 transition-transform duration-500 ease-out group-hover:scale-105">
                    {/* Icon glow */}
                    <div
                      className="absolute inset-0 blur-xl opacity-25 group-hover:opacity-40 transition-opacity duration-700 rounded-full"
                      style={{ background: color.hex, transform: 'scale(2)' }}
                    />
                    {/* Icon container */}
                    <div
                      className="relative w-11 h-11 rounded-[12px] flex items-center justify-center border border-white/[0.06]"
                      style={{ background: color.iconBg }}
                    >
                      <MoodboardLogo size={20} tinted className="drop-shadow-sm" style={{ color: color.text }} />
                    </div>
                  </div>
                )}

                {/* Title */}
                <h3 className="text-[15px] font-semibold text-white/90 leading-snug tracking-[-0.01em] truncate max-w-full group-hover:text-white transition-colors duration-300">
                  {board.name}
                </h3>

                {/* Description */}
                {board.description && (
                  <p className="text-[11px] text-white/18 mt-1.5 truncate max-w-full leading-relaxed">
                    {board.description}
                  </p>
                )}
              </div>

              {/* ── Footer ── */}
              <div className="px-5 pb-4 pt-1 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="w-3 h-3 text-white/12" />
                  <span className="text-[11px] text-white/22 font-medium tabular-nums">
                    {board.image_count} image{board.image_count !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className="text-[10px] text-white/10 tabular-nums">
                  {new Date(board.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>

              {/* ── Menu ── */}
              <div className="absolute top-3 right-3 z-20" ref={menuRef}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(!menuOpen);
                    setColorPickerOpen(false);
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white/8 hover:text-white/45 hover:bg-white/[0.06] transition-all duration-300 cursor-pointer opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                    className="absolute right-0 top-full mt-1 w-40 bg-[#141414]/95 backdrop-blur-xl border border-white/[0.07] rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-50 py-1"
                  >
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuOpen(false);
                        setRenameOpen(true);
                      }}
                      className="flex items-center gap-2.5 w-full px-3.5 h-8 text-[12px] text-white/45 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> Rename
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setColorPickerOpen(!colorPickerOpen);
                      }}
                      className="flex items-center gap-2.5 w-full px-3.5 h-8 text-[12px] text-white/45 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
                    >
                      <Palette className="w-3 h-3" /> Color
                    </button>

                    {colorPickerOpen && (
                      <div className="px-3.5 py-2.5 flex flex-wrap gap-2">
                        {BOARD_COLORS.map((c) => (
                          <button
                            key={c.id}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onColorChange(board.id, c.id);
                              setColorPickerOpen(false);
                              setMenuOpen(false);
                            }}
                            title={c.label}
                            className={`w-5 h-5 rounded-full transition-all duration-200 cursor-pointer border-2 hover:scale-125 ${
                              board.color === c.id
                                ? 'border-white scale-110'
                                : 'border-transparent hover:border-white/30'
                            }`}
                            style={{ background: c.swatch }}
                          />
                        ))}
                      </div>
                    )}

                    <div className="h-px bg-white/[0.05] my-1" />

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuOpen(false);
                        setConfirmOpen(true);
                      }}
                      className="flex items-center gap-2.5 w-full px-3.5 h-8 text-[12px] text-danger/60 hover:text-danger hover:bg-danger/5 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </Link>
      </motion.div>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => onDelete(board.id)}
        title="Delete Board"
        message={`"${board.name}" and all its images will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete Board"
        danger
      />

      <PromptModal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        onSubmit={(name) => onRename(board.id, name)}
        title="Rename Board"
        placeholder="Board name"
        initialValue={board.name}
        submitLabel="Rename"
      />
    </>
  );
}
