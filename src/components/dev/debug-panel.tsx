'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth';
import { useSubscriptionStore } from '@/store/subscription';
import { PLAN_LIMITS } from '@/types';
import type { PlanType } from '@/types';

/**
 * Development-only debug panel with plan controls.
 * Uses mounted guard to prevent SSR hydration mismatch.
 */
export function DevDebugPanel() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (process.env.NODE_ENV !== 'development') return null;

  return <DevDebugPanelInner />;
}

function DevDebugPanelInner() {
  const user = useAuthStore((s) => s.user);
  const plan = useSubscriptionStore((s) => s.plan);
  const boardCount = useSubscriptionStore((s) => s.boardCount);
  const imageCount = useSubscriptionStore((s) => s.imageCount);
  const setPlan = useSubscriptionStore((s) => s.setPlan);
  const setUsage = useSubscriptionStore((s) => s.setUsage);
  const getRemainingUploads = useSubscriptionStore((s) => s.getRemainingUploads);
  const canCreateBoard = useSubscriptionStore((s) => s.canCreateBoard);

  const remaining = getRemainingUploads();
  const limits = PLAN_LIMITS[plan];
  const hasCookie = document.cookie.includes('moodboard_onboarded=1');
  const canBoard = canCreateBoard();

  const [expanded, setExpanded] = useState(false);

  const switchPlan = useCallback((newPlan: PlanType) => {
    setPlan(newPlan);
  }, [setPlan]);

  function handleResetUsage() {
    setUsage(0, 0);
  }

  function handleResetDev() {
    document.cookie = 'moodboard_onboarded=; path=/; max-age=0';
    try { localStorage.removeItem('moodboard_ext_connected'); } catch {}
    setUsage(0, 0);
    setPlan('free');
    window.location.href = '/welcome';
  }

  const planColor = plan === 'pro' ? 'text-violet-400' : 'text-white/50';

  return (
    <div className="fixed bottom-3 left-3 z-[9999] rounded-xl bg-black/95 border border-white/10 text-[10px] font-mono text-white/50 max-w-[300px] backdrop-blur-xl select-none shadow-2xl">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/[0.03] rounded-xl transition-colors"
      >
        <span className="text-white/25 font-bold">🛠 DEV</span>
        <div className="flex items-center gap-2">
          <span className={planColor}>{plan.toUpperCase()}</span>
          <span className="text-white/20">{boardCount}b · {imageCount}i</span>
          <span className="text-white/15">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-white/[0.04] pt-2">
          {/* Status */}
          <div className="space-y-0.5">
            <div>user: <span className="text-white/70">{user?.email || 'none'}</span></div>
            <div>plan: <span className={planColor}>{plan}</span> · boards: <span className="text-white/70">{boardCount}/{limits.maxBoards}</span></div>
            <div>uploads: <span className="text-white/70">{imageCount}/{limits.maxUploads === Infinity ? '∞' : limits.maxUploads}</span> · left: <span className={remaining <= 5 && remaining !== Infinity ? 'text-amber-400' : 'text-white/70'}>{remaining === Infinity ? '∞' : remaining}</span></div>
            <div>
              can board: <span className={canBoard ? 'text-green-400' : 'text-red-400'}>{canBoard ? '✓' : '✗'}</span>
              {' · '}cookie: <span className={hasCookie ? 'text-green-400' : 'text-red-400'}>{hasCookie ? '✓' : '✗'}</span>
            </div>
          </div>

          {/* Plan toggle */}
          <div className="flex gap-1">
            <button
              onClick={() => switchPlan('free')}
              className={`flex-1 py-1 rounded-md text-[9px] font-semibold transition-colors cursor-pointer ${
                plan === 'free'
                  ? 'bg-white/10 text-white'
                  : 'bg-white/[0.03] text-white/30 hover:bg-white/[0.06]'
              }`}
            >
              FREE
            </button>
            <button
              onClick={() => switchPlan('pro')}
              className={`flex-1 py-1 rounded-md text-[9px] font-semibold transition-colors cursor-pointer ${
                plan === 'pro'
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'bg-white/[0.03] text-white/30 hover:bg-white/[0.06]'
              }`}
            >
              PRO
            </button>
          </div>

          {/* Usage controls */}
          <div className="flex gap-1">
            <button
              onClick={handleResetUsage}
              className="flex-1 py-1 rounded-md text-[9px] bg-white/[0.04] text-white/40 hover:bg-white/[0.08] cursor-pointer transition-colors"
            >
              Reset Usage
            </button>
            <button
              onClick={() => setUsage(boardCount, 49)}
              className="flex-1 py-1 rounded-md text-[9px] bg-amber-500/10 text-amber-300/60 hover:bg-amber-500/20 cursor-pointer transition-colors"
            >
              Near Limit
            </button>
            <button
              onClick={() => setUsage(1, 50)}
              className="flex-1 py-1 rounded-md text-[9px] bg-red-500/10 text-red-300/60 hover:bg-red-500/20 cursor-pointer transition-colors"
            >
              At Limit
            </button>
          </div>

          {/* Reset everything */}
          <button
            onClick={handleResetDev}
            className="w-full py-1 rounded-md text-[9px] bg-red-500/15 border border-red-500/20 text-red-300/70 hover:bg-red-500/25 cursor-pointer transition-colors"
          >
            Reset All Dev State → /welcome
          </button>
        </div>
      )}
    </div>
  );
}
