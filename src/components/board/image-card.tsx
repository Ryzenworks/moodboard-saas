'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Star, Trash2, Download, ZoomIn, Check } from 'lucide-react';
import type { Image } from '@/types';
import { cn } from '@/utils/cn';
import { downloadFile } from '@/utils/download';
import { useBoardStore } from '@/store/board';

interface ImageCardProps {
  image: Image;
  onFavorite: (id: string, current: boolean) => void;
  onDelete: (id: string, storagePath: string) => void;
  onNoteUpdate: (id: string, note: string) => void;
  onClick: (id: string, e: React.MouseEvent) => void;
}

export function ImageCard({
  image,
  onFavorite,
  onDelete,
  onNoteUpdate,
  onClick,
}: ImageCardProps) {
  const [loaded, setLoaded] = useState(false);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteCircle = useRef<SVGCircleElement>(null);
  const { selected, toggleSelect, openContextMenu, imageCategoryMap, categories } = useBoardStore();
  const isSelected = selected.has(image.id);

  // Get category names for this image
  const catIds = imageCategoryMap[image.id] || [];
  const catNames = catIds
    .map((id) => categories.find((c) => c.id === id)?.name)
    .filter(Boolean)
    .slice(0, 3);

  const startDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteCircle.current) {
      deleteCircle.current.style.transition = 'stroke-dashoffset 600ms linear';
      deleteCircle.current.style.strokeDashoffset = '0';
    }
    deleteTimer.current = setTimeout(() => {
      onDelete(image.id, image.storage_path);
    }, 600);
  }, [image.id, image.storage_path, onDelete]);

  const cancelDelete = useCallback(() => {
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
    if (deleteCircle.current) {
      deleteCircle.current.style.transition = 'none';
      deleteCircle.current.style.strokeDashoffset = '82';
    }
  }, []);

  function handleClick(e: React.MouseEvent) {
    onClick(image.id, e);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    openContextMenu(image.id, e.clientX, e.clientY);
  }
  const hasSelection = selected.size > 0;

  return (
    <motion.div
      layout
      className={cn(
        'group relative bg-card rounded-xl overflow-hidden cursor-pointer transition-all duration-300 select-none',
        isSelected
          ? 'ring-2 ring-accent/60 ring-offset-1 ring-offset-[#0a0a0a] shadow-[0_0_12px_rgba(5,109,250,0.15)]'
          : hasSelection
            ? 'border border-white/[0.04] opacity-[0.55] saturate-[0.85] hover:opacity-100 hover:saturate-100 hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/20'
            : 'border border-white/[0.06] hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/20'
      )}
      style={{ WebkitTouchCallout: 'none', WebkitTapHighlightColor: 'transparent' }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Selection check */}
      {isSelected && (
        <div className="absolute top-2 right-2 z-20 w-5 h-5 rounded-full bg-accent flex items-center justify-center shadow-md shadow-accent/30">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex gap-1">
        {image.is_favorite && (
          <span className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-[10px]">
            ⭐
          </span>
        )}
      </div>

      {/* Hover overlay — only on hover, never on resting selected */}
      <div className="absolute inset-0 z-10 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite(image.id, image.is_favorite); }}
          className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-yellow-400 hover:bg-black/80 transition-all cursor-pointer"
        >
          <Star className="w-4 h-4" fill={image.is_favorite ? 'currentColor' : 'none'} />
        </button>
        <button
          onMouseDown={startDelete}
          onMouseUp={cancelDelete}
          onMouseLeave={cancelDelete}
          className="relative w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-red-400 hover:bg-black/80 transition-all cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 28 28">
            <circle ref={deleteCircle} cx="14" cy="14" r="13" fill="none" stroke="rgb(239,68,68)" strokeWidth="2" strokeDasharray="82" strokeDashoffset="82" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onClick(image.id, e); }}
          className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-accent hover:bg-black/80 transition-all cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); downloadFile(image.url, image.filename); }}
          className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-green-400 hover:bg-black/80 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Image */}
      <div className={`relative ${!loaded ? 'aspect-square skeleton' : ''}`}>
        <img
          src={image.url}
          alt={image.filename}
          className={`w-full block transition-opacity duration-300 pointer-events-none ${loaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          decoding="async"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          onLoad={() => setLoaded(true)}
        />
      </div>

      {/* Palette strip */}
      {image.palette.length > 0 && (
        <div className="flex h-1.5">
          {image.palette.map((c, i) => (
            <div key={i} className="flex-1" style={{ background: c }} />
          ))}
        </div>
      )}

      {/* Meta: categories + note */}
      {(catNames.length > 0 || image.note) && (
        <div className="px-3 py-2 space-y-1.5">
          {catNames.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {catNames.map((name) => (
                <span
                  key={name}
                  className="px-2 py-0.5 rounded text-[9px] font-medium bg-[#056dfa] text-white"
                >
                  {name}
                </span>
              ))}
              {catIds.length > 3 && (
                <span className="px-1.5 py-0.5 rounded text-[9px] text-white/30">
                  +{catIds.length - 3}
                </span>
              )}
            </div>
          )}
          {image.note && (
            <p
              className="text-[11px] text-white/40 truncate cursor-text"
              title="Double-click to edit"
              onDoubleClick={(e) => {
                e.stopPropagation();
                // Signal parent to open note modal — pass empty string as signal
                onNoteUpdate(image.id, '__EDIT__');
              }}
            >
              {image.note}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
