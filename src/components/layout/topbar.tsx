'use client';

import { Search } from 'lucide-react';

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
}

export function Topbar({
  title,
  subtitle,
  actions,
  onSearch,
  searchPlaceholder = 'Search...',
  showSearch = false,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-40 h-14 glass border-b border-white/[0.04] flex items-center justify-between px-6 gap-4">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-white truncate">{title}</h1>
          {subtitle && (
            <p className="text-[11px] text-white/30 truncate">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Center: Search */}
      {showSearch && onSearch && (
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full h-8 pl-9 pr-3 text-xs bg-white/[0.04] border border-white/[0.06] rounded-lg text-white placeholder:text-white/25 outline-none focus:bg-white/[0.06] focus:border-white/[0.1] transition-all"
            />
          </div>
        </div>
      )}

      {/* Right: Actions */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </header>
  );
}
