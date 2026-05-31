import { create } from 'zustand';
import type { PlanType, PlanLimits } from '@/types';
import { PLAN_LIMITS } from '@/types';

interface SubscriptionState {
  plan: PlanType;
  status: string;
  razorpaySubscriptionId: string | null;
  currentPeriodEnd: string | null;
  boardCount: number;
  imageCount: number;
  loading: boolean;

  /**
   * Tracks in-flight optimistic increments not yet reflected in the DB.
   * Reset to 0 by setUsage() and reconcileUsage() when authoritative
   * DB counts arrive.
   */
  _optimisticDelta: number;

  // Actions
  setPlan: (plan: PlanType) => void;
  setSubscription: (data: {
    plan: PlanType;
    status: string;
    razorpaySubscriptionId: string | null;
    currentPeriodEnd: string | null;
  }) => void;

  /**
   * Hard set usage — ONLY for initial hydration before any uploads.
   * Resets the optimistic delta.
   */
  setUsage: (boards: number, images: number) => void;

  /**
   * DB-authoritative usage reconciliation — used when navigating to boards
   * list or on app hydration. Trusts the DB count and resets optimistic delta.
   */
  reconcileUsage: (boards: number, dbImages: number) => void;

  /** Atomic increment — called on each successful upload */
  incrementImageCount: (delta: number) => void;

  /** Atomic decrement — called on upload failure/cancel rollback */
  decrementImageCount: (delta: number) => void;

  setBoardCount: (count: number) => void;
  setLoading: (loading: boolean) => void;

  // Computed
  getLimits: () => PlanLimits;
  canCreateBoard: () => boolean;
  canUploadImage: () => boolean;
  isProActive: () => boolean;
  getUsagePercent: (type: 'boards' | 'uploads') => number;
  getRemainingUploads: () => number;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  plan: 'free',
  status: 'active',
  razorpaySubscriptionId: null,
  currentPeriodEnd: null,
  boardCount: 0,
  imageCount: 0,
  loading: true,
  _optimisticDelta: 0,

  setPlan: (plan) => set({ plan }),

  setSubscription: (data) =>
    set({
      plan: data.plan,
      status: data.status,
      razorpaySubscriptionId: data.razorpaySubscriptionId,
      currentPeriodEnd: data.currentPeriodEnd,
      loading: false,
    }),

  setUsage: (boards, images) =>
    set({
      boardCount: boards,
      imageCount: images,
      _optimisticDelta: 0,
    }),

  reconcileUsage: (boards, dbImages) =>
    set(() => {
      // Trust the DB as authoritative.
      // reconcileUsage is called from boards page load and app hydration —
      // contexts where the DB has had time to catch up.
      // Reset _optimisticDelta to prevent stale delta from inflating future counts.
      console.log(`[CountSync] reconcile: db=${dbImages} → using DB as authoritative`);

      return {
        boardCount: boards,
        imageCount: dbImages,
        _optimisticDelta: 0,
      };
    }),

  incrementImageCount: (delta) =>
    set((s) => {
      const next = Math.max(0, s.imageCount + delta);
      console.log(`[CountSync] imageCount: ${s.imageCount} → ${next} (delta: +${delta})`);
      return {
        imageCount: next,
        _optimisticDelta: s._optimisticDelta + delta,
      };
    }),

  decrementImageCount: (delta) =>
    set((s) => {
      const next = Math.max(0, s.imageCount - delta);
      console.log(`[CountSync] imageCount: ${s.imageCount} → ${next} (delta: -${delta})`);
      return {
        imageCount: next,
        _optimisticDelta: Math.max(0, s._optimisticDelta - delta),
      };
    }),

  setBoardCount: (count) => set({ boardCount: count }),
  setLoading: (loading) => set({ loading }),

  getLimits: () => PLAN_LIMITS[get().plan],
  canCreateBoard: () => {
    const s = get();
    const limits = PLAN_LIMITS[s.plan];
    return s.boardCount < limits.maxBoards;
  },
  canUploadImage: () => {
    const s = get();
    const limits = PLAN_LIMITS[s.plan];
    return s.imageCount < limits.maxUploads;
  },
  isProActive: () => {
    const s = get();
    return s.plan === 'pro' && s.status === 'active';
  },
  getUsagePercent: (type) => {
    const s = get();
    const limits = PLAN_LIMITS[s.plan];
    if (type === 'boards') {
      return limits.maxBoards === Infinity ? 0 : (s.boardCount / limits.maxBoards) * 100;
    }
    return limits.maxUploads === Infinity ? 0 : (s.imageCount / limits.maxUploads) * 100;
  },
  getRemainingUploads: () => {
    const s = get();
    const limits = PLAN_LIMITS[s.plan];
    if (limits.maxUploads === Infinity) return Infinity;
    return Math.max(0, limits.maxUploads - s.imageCount);
  },
}));
