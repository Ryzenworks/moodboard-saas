'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useBoardStore } from '@/store/board';
import { useSubscriptionStore } from '@/store/subscription';
import { subscriptionService } from '@/services/subscription';
import { imagesService } from '@/services/images';
import type { Image } from '@/types';

/**
 * Subscribes to Supabase Realtime for new images on the given board.
 * Falls back to lightweight polling (30s) if Realtime is not enabled.
 * 
 * When a new image is inserted (e.g. from extension), it's automatically
 * added to the board store — the masonry grid updates instantly.
 *
 * IMPORTANT: This hook does NOT increment imageCount directly.
 * Usage counting is handled by the upload manager (for dashboard uploads)
 * or by authoritative DB reconciliation (for extension uploads).
 * This prevents double-counting race conditions.
 */
export function useRealtimeBoard(boardId: string, userId?: string) {
  const addImage = useBoardStore((s) => s.addImage);
  const realtimeWorking = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addIfNew = useCallback(
    (newImage: Image) => {
      const existing = useBoardStore.getState().images;
      if (existing.some((img) => img.id === newImage.id)) return;
      addImage(newImage);

      // For images arriving via Realtime (e.g. extension uploads),
      // do an authoritative DB count refresh instead of optimistic increment.
      // This is slightly slower but mathematically correct.
      if (userId) {
        subscriptionService.getUsage(userId).then((usage) => {
          useSubscriptionStore.getState().setUsage(usage.boards, usage.images);
        }).catch(() => { /* non-critical */ });
      }

      console.log('[Realtime] Image added:', newImage.id);
    },
    [addImage, userId]
  );

  useEffect(() => {
    if (!boardId) return;

    const supabase = createClient();
    const channelName = `board-${boardId}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // ── Primary: Supabase Realtime ──
    try {
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'images',
            filter: `board_id=eq.${boardId}`,
          },
          (payload) => {
            realtimeWorking.current = true;
            addIfNew(payload.new as Image);
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Status:', status);
          if (status === 'SUBSCRIBED') {
            realtimeWorking.current = true;
          }
        });
    } catch (err) {
      console.warn('[Realtime] Subscription failed:', err);
    }

    // ── Fallback: Lightweight polling (every 30s) ──
    // Only fetches if Realtime hasn't fired any events yet
    let lastKnownCount = useBoardStore.getState().images.length;

    pollRef.current = setInterval(async () => {
      // Skip polling if realtime is working
      if (realtimeWorking.current) return;

      try {
        const fresh = await imagesService.listByBoard(boardId);
        if (fresh.length > lastKnownCount) {
          console.log('[Poll] New images detected:', fresh.length - lastKnownCount);
          const existingIds = new Set(useBoardStore.getState().images.map((i) => i.id));
          const newOnes = fresh.filter((img) => !existingIds.has(img.id));
          newOnes.forEach(addIfNew);
        }
        lastKnownCount = fresh.length;
      } catch {
        // Silently ignore poll failures
      }
    }, 30000);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      realtimeWorking.current = false;
    };
  }, [boardId, addIfNew]);
}
