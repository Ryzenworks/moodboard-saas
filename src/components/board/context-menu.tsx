'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Trash2,
  Download,
  Copy,
  FileText,
  Check,
  Hash,
  Plus,
} from 'lucide-react';
import { useBoardStore } from '@/store/board';
import { downloadFile } from '@/utils/download';
import { ConfirmModal } from '@/components/ui/confirm-modal';

interface ContextMenuProps {
  onFavorite: (id: string, current: boolean) => void;
  onDelete: (id: string, storagePath: string) => void;
  onNoteEdit: (id: string) => void;
  onTag: (imageId: string, categoryId: string) => void;
  onUntag: (imageId: string, categoryId: string) => void;
  onCreateCategory: (name: string) => Promise<{ id: string } | undefined>;
  onCopy: (id: string) => void;
}

export function ContextMenu({
  onFavorite,
  onDelete,
  onNoteEdit,
  onTag,
  onUntag,
  onCreateCategory,
  onCopy,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [newCatName, setNewCatName] = useState('');
  const [showNewInput, setShowNewInput] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const {
    contextMenuImageId,
    contextMenuPosition,
    closeContextMenu,
    images,
    categories,
    imageCategoryMap,
  } = useBoardStore();

  const image = images.find((i) => i.id === contextMenuImageId);
  const assignedIds = new Set(
    contextMenuImageId ? imageCategoryMap[contextMenuImageId] || [] : []
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showNewInput) {
          setShowNewInput(false);
          setNewCatName('');
        } else {
          closeContextMenu();
        }
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [closeContextMenu, showNewInput]);

  useEffect(() => {
    if (showNewInput) inputRef.current?.focus();
  }, [showNewInput]);

  useEffect(() => {
    if (!contextMenuImageId) {
      setShowNewInput(false);
      setNewCatName('');
    }
  }, [contextMenuImageId]);

  if (!image || !contextMenuPosition) return null;

  function handleCategoryToggle(catId: string) {
    if (!contextMenuImageId) return;
    if (assignedIds.has(catId)) {
      onUntag(contextMenuImageId, catId);
    } else {
      onTag(contextMenuImageId, catId);
    }
  }

  async function handleNewCategory() {
    if (!newCatName.trim() || !contextMenuImageId) return;
    const cat = await onCreateCategory(newCatName.trim());
    if (cat) {
      onTag(contextMenuImageId, cat.id);
    }
    setNewCatName('');
    setShowNewInput(false);
  }

  const menuW = 208;
  const menuH = 320 + categories.length * 32;
  const x = Math.min(contextMenuPosition.x, window.innerWidth - menuW - 8);
  const y = Math.min(contextMenuPosition.y, window.innerHeight - Math.min(menuH, 500) - 8);

  const menuItemClass =
    'flex items-center gap-2.5 w-full px-3.5 h-[34px] text-[12px] text-white/45 hover:text-white hover:bg-white/[0.06] transition-all duration-150 cursor-pointer rounded-md mx-0.5';

  return (
    <>
      <AnimatePresence>
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.96, y: -2 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -2 }}
          transition={{ duration: 0.1 }}
          className="fixed z-[200] w-[208px] bg-[#161616]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl shadow-black/60 overflow-hidden py-1.5 px-0.5"
          style={{ left: x, top: y }}
        >
          {/* ── Actions ── */}
          <button
            onClick={() => { onFavorite(image.id, image.is_favorite); closeContextMenu(); }}
            className={menuItemClass}
          >
            <Star className="w-3.5 h-3.5" fill={image.is_favorite ? 'currentColor' : 'none'} />
            {image.is_favorite ? 'Unfavourite' : 'Favourite'}
          </button>
          <button
            onClick={() => { onNoteEdit(image.id); closeContextMenu(); }}
            className={menuItemClass}
          >
            <FileText className="w-3.5 h-3.5" />
            Edit Note
          </button>

          <div className="h-px bg-white/[0.05] my-1.5 mx-1" />

          {/* ── Inline Categories ── */}
          {categories.length > 0 && (
            <div className="px-3.5 py-1">
              <span className="text-[9px] font-semibold text-white/15 uppercase tracking-[0.12em]">
                Categories
              </span>
            </div>
          )}

          <div className="max-h-[140px] overflow-y-auto px-0.5">
            {categories.map((cat) => {
              const active = assignedIds.has(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryToggle(cat.id)}
                  className="flex items-center gap-2.5 w-full px-3 h-[30px] text-[12px] transition-all duration-150 cursor-pointer hover:bg-white/[0.06] rounded-md group"
                >
                  <div
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-all duration-200 ${
                      active
                        ? 'bg-accent border-accent shadow-[0_0_6px_rgba(5,109,250,0.3)]'
                        : 'border border-white/[0.12] group-hover:border-white/[0.25]'
                    }`}
                  >
                    {active && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className={`transition-colors ${active ? 'text-white' : 'text-white/35 group-hover:text-white/60'}`}>
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* + New Category */}
          {showNewInput ? (
            <div className="px-2.5 py-1.5">
              <input
                ref={inputRef}
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNewCategory();
                  if (e.key === 'Escape') { setShowNewInput(false); setNewCatName(''); }
                  e.stopPropagation();
                }}
                placeholder="Category name..."
                className="w-full h-7 px-2.5 text-[11px] bg-white/[0.04] border border-white/[0.1] rounded-lg text-white placeholder:text-white/15 outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
              />
            </div>
          ) : (
            <button
              onClick={() => setShowNewInput(true)}
              className="flex items-center gap-2.5 w-full px-3.5 h-[30px] text-[12px] text-white/20 hover:text-white/45 hover:bg-white/[0.04] transition-all cursor-pointer rounded-md mx-0.5"
            >
              <Plus className="w-3 h-3" />
              New Category
            </button>
          )}

          <div className="h-px bg-white/[0.05] my-1.5 mx-1" />

          {/* ── Utilities ── */}
          <button
            onClick={() => { onCopy(image.id); closeContextMenu(); }}
            className={menuItemClass}
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Image
          </button>
          <button
            onClick={() => {
              downloadFile(image.url, image.filename);
              closeContextMenu();
            }}
            className={menuItemClass}
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
          {image.palette.length > 0 && (
            <button
              onClick={() => { navigator.clipboard.writeText(image.palette.join(', ')); closeContextMenu(); }}
              className={menuItemClass}
            >
              <Hash className="w-3.5 h-3.5" />
              Copy {image.palette.length} colors
            </button>
          )}

          <div className="h-px bg-white/[0.05] my-1.5 mx-1" />

          {/* ── Delete ── */}
          <button
            onClick={() => {
              closeContextMenu();
              setDeleteConfirmOpen(true);
            }}
            className="flex items-center gap-2.5 w-full px-3.5 h-[34px] text-[12px] text-danger/50 hover:text-danger hover:bg-danger/5 transition-all duration-150 cursor-pointer rounded-md mx-0.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </motion.div>
      </AnimatePresence>

      <ConfirmModal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          if (image) onDelete(image.id, image.storage_path);
        }}
        title="Delete Image"
        message={`"${image.filename}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </>
  );
}
