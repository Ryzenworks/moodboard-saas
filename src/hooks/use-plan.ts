'use client';

import { useCallback } from 'react';
import { useSubscriptionStore } from '@/store/subscription';
import { PLAN_LIMITS } from '@/types';

export interface BatchTrimResult {
  allowed: File[];
  rejected: number;
  remaining: number;
  message?: string;
}

export function usePlan() {
  const {
    plan,
    status,
    boardCount,
    imageCount,
    canCreateBoard,
    canUploadImage,
    isProActive,
    getUsagePercent,
    getLimits,
    getRemainingUploads,
  } = useSubscriptionStore();

  const limits = getLimits();
  const remaining = getRemainingUploads();

  const checkBoardLimit = useCallback((): { allowed: boolean; reason?: 'free_limit' | 'pro_capacity'; message?: string } => {
    if (canCreateBoard()) return { allowed: true };
    const currentPlan = useSubscriptionStore.getState().plan;
    if (currentPlan === 'pro') {
      return {
        allowed: false,
        reason: 'pro_capacity',
        message: `You've reached the maximum of ${PLAN_LIMITS.pro.maxBoards} boards on the Pro plan.`,
      };
    }
    return {
      allowed: false,
      reason: 'free_limit',
      message: `You've reached your limit of ${PLAN_LIMITS.free.maxBoards} board on the Free plan. Upgrade to Pro for up to ${PLAN_LIMITS.pro.maxBoards} boards.`,
    };
  }, [canCreateBoard]);

  const checkUploadLimit = useCallback((): { allowed: boolean; remaining: number; message?: string } => {
    const r = getRemainingUploads();
    if (r > 0) return { allowed: true, remaining: r };
    return {
      allowed: false,
      remaining: 0,
      message: `You've reached your limit of ${PLAN_LIMITS.free.maxUploads} uploads on the Free plan. Upgrade to Pro for unlimited uploads.`,
    };
  }, [getRemainingUploads]);

  /**
   * Trims an upload batch to fit within the user's remaining quota.
   * Returns allowed files, rejected count, and a user-facing message.
   */
  const trimUploadBatch = useCallback((files: File[]): BatchTrimResult => {
    const r = getRemainingUploads();

    // Pro / unlimited — allow all
    if (r === Infinity) {
      return { allowed: files, rejected: 0, remaining: Infinity };
    }

    // No remaining
    if (r <= 0) {
      return {
        allowed: [],
        rejected: files.length,
        remaining: 0,
        message: `Upload limit reached (${PLAN_LIMITS.free.maxUploads}/${PLAN_LIMITS.free.maxUploads}). Upgrade to Pro for unlimited uploads.`,
      };
    }

    // Partial — trim to fit
    if (files.length <= r) {
      return { allowed: files, rejected: 0, remaining: r - files.length };
    }

    const allowed = files.slice(0, r);
    const rejected = files.length - r;
    return {
      allowed,
      rejected,
      remaining: 0,
      message: `${allowed.length} uploaded · ${rejected} skipped (Free plan limit reached)`,
    };
  }, [getRemainingUploads]);

  return {
    plan,
    status,
    isPro: isProActive(),
    isFree: plan === 'free',
    limits,
    boardCount,
    imageCount,
    remaining,
    boardsRemaining: limits.maxBoards === Infinity ? Infinity : Math.max(0, limits.maxBoards - boardCount),
    uploadsRemaining: remaining,
    boardUsagePercent: getUsagePercent('boards'),
    uploadUsagePercent: getUsagePercent('uploads'),
    checkBoardLimit,
    checkUploadLimit,
    trimUploadBatch,
  };
}
