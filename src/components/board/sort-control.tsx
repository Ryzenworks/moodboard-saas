'use client';

import { cn } from '@/utils/cn';
import { useBoardStore } from '@/store/board';
import type { SortMode } from '@/types';
import { ArrowUpDown } from 'lucide-react';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'newest', label: '✦ Newest' },
  { value: 'oldest', label: '✦ Oldest' },
  { value: 'favorites', label: '⭐ Favourites' },
];

export function SortControl() {
  const sort = useBoardStore((s) => s.sort);
  const setSort = useBoardStore((s) => s.setSort);

  return (
    <div className="relative group">
      <button className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-[11px] font-medium text-white/40 bg-white/[0.04] border border-white/[0.06] hover:text-white/60 hover:bg-white/[0.06] transition-all cursor-pointer">
        <ArrowUpDown className="w-3 h-3" />
        {SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Sort'}
      </button>
      <div className="absolute right-0 top-full mt-1 w-36 bg-[#1a1a1a] border border-white/[0.08] rounded-lg shadow-xl shadow-black/40 overflow-hidden z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSort(opt.value)}
            className={cn(
              'flex items-center w-full px-3 h-8 text-xs transition-all cursor-pointer',
              sort === opt.value
                ? 'text-accent bg-accent/10'
                : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
