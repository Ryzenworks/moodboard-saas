'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import {
  LayoutGrid,
  Settings,
  CreditCard,
  LogOut,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth';
import { useSubscriptionStore } from '@/store/subscription';
import { UsageBar } from '@/components/billing/usage-bar';
import { PLAN_LIMITS } from '@/types';

const NAV_ITEMS = [
  { href: '/boards', label: 'Boards', icon: LayoutGrid },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const user = useAuthStore((s) => s.user);
  const plan = useSubscriptionStore((s) => s.plan);
  const boardCount = useSubscriptionStore((s) => s.boardCount);
  const imageCount = useSubscriptionStore((s) => s.imageCount);
  const isPro = plan === 'pro';
  const limits = PLAN_LIMITS[plan];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-[#0a0a0a] border-r border-white/[0.06] flex flex-col z-50">
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-5 border-b border-white/[0.04]">
        <Link href="/boards" className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-xs font-semibold tracking-[0.18em] text-white/90 uppercase">
            Moodboard
          </span>
        </Link>
        {isPro && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-accent/15 text-accent border border-accent/25 uppercase tracking-wider">
            <Zap className="w-2.5 h-2.5" />
            Pro
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 px-3 h-9 rounded-lg text-sm font-medium transition-all duration-200',
                active
                  ? 'text-white'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-white/[0.06] rounded-lg border border-white/[0.06]"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                />
              )}
              <item.icon className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Usage (only show for free plan) */}
      {!isPro && (
        <div className="px-4 pb-3 space-y-3">
          <UsageBar label="Boards" current={boardCount} max={limits.maxBoards} />
          <UsageBar label="Uploads" current={imageCount} max={limits.maxUploads} />
          <Link
            href="/billing"
            className="flex items-center justify-center gap-1.5 h-8 w-full rounded-lg text-[10px] font-semibold text-accent bg-accent/10 border border-accent/20 hover:bg-accent/15 transition-all cursor-pointer"
          >
            <Zap className="w-3 h-3" />
            Upgrade to Pro
          </Link>
        </div>
      )}

      {/* User section */}
      <div className="p-3 border-t border-white/[0.04]">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold shrink-0">
            {user?.fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/80 truncate">
              {user?.fullName || 'User'}
            </p>
            <p className="text-[10px] text-white/30 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 h-8 w-full rounded-lg text-xs text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all mt-1 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
