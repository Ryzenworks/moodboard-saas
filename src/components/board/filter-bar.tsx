'use client';

import { cn } from '@/utils/cn';
import { useBoardStore } from '@/store/board';
import { Star, FolderOpen, Plus, X as XIcon } from 'lucide-react';

const COLOR_OPTIONS = [
  { name: 'Red', hex: '#e53935' },
  { name: 'Orange', hex: '#fb8c00' },
  { name: 'Yellow', hex: '#fdd835' },
  { name: 'Green', hex: '#43a047' },
  { name: 'Teal', hex: '#00897b' },
  { name: 'Blue', hex: '#1e88e5' },
  { name: 'Purple', hex: '#8e24aa' },
  { name: 'Pink', hex: '#d81b60' },
  { name: 'White', hex: '#eee' },
  { name: 'Gray', hex: '#888' },
  { name: 'Black', hex: '#222' },
];

interface FilterBarProps {
  onNewCategory: () => void;
}

export function FilterBar({ onNewCategory }: FilterBarProps) {
  const {
    categories,
    images,
    imageCategoryMap,
    filterCategoryIds,
    filterFavorites,
    filterUncategorized,
    filterColors,
    toggleCategoryFilter,
    setFilterFavorites,
    setFilterUncategorized,
    toggleColorFilter,
    clearFilters,
  } = useBoardStore();

  const favCount = images.filter((i) => i.is_favorite).length;
  const uncatCount = images.filter((i) => {
    const cats = imageCategoryMap[i.id] || [];
    return cats.length === 0;
  }).length;

  const hasActiveFilters = filterCategoryIds.size > 0 || filterFavorites || filterUncategorized || filterColors.size > 0;

  return (
    <div className="space-y-3">
      {/* Category chips */}
      <div className="flex flex-wrap items-center gap-2">
        {/* All */}
        <button
          onClick={clearFilters}
          className={cn(
            'px-3 h-7 rounded-full text-[11px] font-medium transition-all cursor-pointer',
            !hasActiveFilters
              ? 'bg-accent/20 text-accent border border-accent/30'
              : 'bg-white/[0.05] text-white/40 border border-white/[0.06] hover:text-white/60 hover:bg-white/[0.08]'
          )}
        >
          All
        </button>

        {/* Favorites */}
        <button
          onClick={() => setFilterFavorites(!filterFavorites)}
          className={cn(
            'px-3 h-7 rounded-full text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer',
            filterFavorites
              ? 'bg-accent/20 text-accent border border-accent/30'
              : 'bg-white/[0.05] text-white/40 border border-white/[0.06] hover:text-white/60 hover:bg-white/[0.08]'
          )}
        >
          <Star className="w-3 h-3" /> Favourites
          <span className="text-[10px] opacity-60">{favCount}</span>
        </button>

        {/* Uncategorized */}
        <button
          onClick={() => setFilterUncategorized(!filterUncategorized)}
          className={cn(
            'px-3 h-7 rounded-full text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer',
            filterUncategorized
              ? 'bg-accent/20 text-accent border border-accent/30'
              : 'bg-white/[0.05] text-white/40 border border-white/[0.06] hover:text-white/60 hover:bg-white/[0.08]'
          )}
        >
          <FolderOpen className="w-3 h-3" /> Uncategorized
          <span className="text-[10px] opacity-60">{uncatCount}</span>
        </button>

        {/* Category chips */}
        {categories.map((cat) => {
          const active = filterCategoryIds.has(cat.id);
          const count = Object.values(imageCategoryMap).filter((ids) =>
            ids.includes(cat.id)
          ).length;
          return (
            <button
              key={cat.id}
              onClick={() => toggleCategoryFilter(cat.id)}
              className={cn(
                'px-3 h-7 rounded-full text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer',
                active
                  ? 'bg-[#056dfa] text-white border border-[#056dfa]'
                  : 'bg-white/[0.05] text-white/40 border border-white/[0.06] hover:text-white/60 hover:bg-white/[0.08]'
              )}
            >
              {cat.name}
              <span className="text-[10px] opacity-60">{count}</span>
            </button>
          );
        })}

        {/* New category */}
        <button
          onClick={onNewCategory}
          className="px-3 h-7 rounded-full text-[11px] font-medium text-white/25 border border-dashed border-white/[0.12] hover:text-white/50 hover:border-white/[0.2] transition-all flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3 h-3" /> New
        </button>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-2 h-7 rounded-full text-[11px] text-white/30 hover:text-white/60 transition-all flex items-center gap-1 cursor-pointer"
          >
            <XIcon className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Color filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-white/20 uppercase tracking-wider mr-1">Colors</span>
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c.name}
            onClick={() => toggleColorFilter(c.name)}
            className={cn(
              'w-5 h-5 rounded-full border-2 transition-all cursor-pointer hover:scale-110',
              filterColors.has(c.name)
                ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.3)]'
                : 'border-transparent opacity-50 hover:opacity-80'
            )}
            style={{ backgroundColor: c.hex }}
            title={c.name}
          />
        ))}
      </div>
    </div>
  );
}
