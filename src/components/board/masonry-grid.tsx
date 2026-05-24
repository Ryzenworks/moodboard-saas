'use client';

import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Image } from '@/types';
import { ImageCard } from './image-card';

interface MasonryGridProps {
  images: Image[];
  onFavorite: (id: string, current: boolean) => void;
  onDelete: (id: string, storagePath: string) => void;
  onNoteUpdate: (id: string, note: string) => void;
  onImageClick: (id: string, e: React.MouseEvent) => void;
}

const BATCH_SIZE = 40; // images per batch for infinite scroll

export function MasonryGrid({
  images,
  onFavorite,
  onDelete,
  onNoteUpdate,
  onImageClick,
}: MasonryGridProps) {
  const [columns, setColumns] = useState(4);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Responsive columns
  useEffect(() => {
    function updateCols() {
      const w = window.innerWidth - 220;
      if (w < 500) setColumns(1);
      else if (w < 768) setColumns(2);
      else if (w < 1100) setColumns(3);
      else if (w < 1500) setColumns(4);
      else setColumns(5);
    }
    updateCols();
    window.addEventListener('resize', updateCols);
    return () => window.removeEventListener('resize', updateCols);
  }, []);

  // Grow visible count when new images arrive (e.g. realtime inserts)
  // Only hard-reset when images shrink significantly (filter/sort change)
  useEffect(() => {
    setVisibleCount((prev) => {
      if (images.length <= BATCH_SIZE) return BATCH_SIZE;
      // If images grew (new upload), show the new ones
      if (images.length > prev) return images.length;
      // If images shrunk significantly (filter/sort), reset
      return BATCH_SIZE;
    });
  }, [images.length]);

  // Infinite scroll via IntersectionObserver
  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, images.length));
  }, [images.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < images.length) {
          loadMore();
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, images.length, loadMore]);

  // Distribute visible images into columns (height-balanced)
  const visibleImages = useMemo(
    () => images.slice(0, visibleCount),
    [images, visibleCount]
  );

  const cols = useMemo(() => {
    const result: Image[][] = Array.from({ length: columns }, () => []);
    const heights = new Array(columns).fill(0);

    visibleImages.forEach((img) => {
      const shortest = heights.indexOf(Math.min(...heights));
      result[shortest].push(img);
      const aspectRatio = img.height && img.width ? img.height / img.width : 1;
      heights[shortest] += aspectRatio * 300 + 80;
    });

    return result;
  }, [visibleImages, columns]);

  if (images.length === 0) return null;

  return (
    <>
      <div className="flex gap-4 w-full select-none">
        {cols.map((col, colIdx) => (
          <div key={colIdx} className="flex-1 flex flex-col gap-4 min-w-0">
            {col.map((img, imgIdx) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: Math.min((colIdx * col.length + imgIdx) * 0.02, 0.4),
                  duration: 0.3,
                }}
              >
                <ImageCard
                  image={img}
                  onFavorite={onFavorite}
                  onDelete={onDelete}
                  onNoteUpdate={onNoteUpdate}
                  onClick={(id, e) => onImageClick(id, e)}
                />
              </motion.div>
            ))}
          </div>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      {visibleCount < images.length && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          <div className="flex items-center gap-2 text-xs text-white/20">
            <div className="w-4 h-4 border-2 border-white/20 border-t-accent rounded-full animate-spin" />
            Loading more...
          </div>
        </div>
      )}

      {/* Image count indicator */}
      {images.length > BATCH_SIZE && (
        <div className="text-center py-4 text-[11px] text-white/15">
          Showing {Math.min(visibleCount, images.length)} of {images.length}
        </div>
      )}
    </>
  );
}
