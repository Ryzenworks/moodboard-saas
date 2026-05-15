'use client';

import { useCallback } from 'react';
import { useSubscriptionStore } from '@/store/subscription';
import { PLAN_LIMITS } from '@/types';

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
  } = useSubscriptionStore();

  const limits = getLimits();

  const checkBoardLimit = useCallback((): { allowed: boolean; message?: string } => {
    if (canCreateBoard()) return { allowed: true };
    return {
      allowed: false,
      message: `You've reached your limit of ${PLAN_LIMITS.free.maxBoards} boards on the Free plan. Upgrade to Pro for unlimited boards.`,
    };
  }, [canCreateBoard]);

  const checkUploadLimit = useCallback((): { allowed: boolean; message?: string } => {
    if (canUploadImage()) return { allowed: true };
    return {
      allowed: false,
      message: `You've reached your limit of ${PLAN_LIMITS.free.maxUploads} uploads on the Free plan. Upgrade to Pro for unlimited uploads.`,
    };
  }, [canUploadImage]);

  return {
    plan,
    status,
    isPro: isProActive(),
    isFree: plan === 'free',
    limits,
    boardCount,
    imageCount,
    boardsRemaining: limits.maxBoards === Infinity ? Infinity : Math.max(0, limits.maxBoards - boardCount),
    uploadsRemaining: limits.maxUploads === Infinity ? Infinity : Math.max(0, limits.maxUploads - imageCount),
    boardUsagePercent: getUsagePercent('boards'),
    uploadUsagePercent: getUsagePercent('uploads'),
    checkBoardLimit,
    checkUploadLimit,
  };
}
