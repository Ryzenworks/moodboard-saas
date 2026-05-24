import { createClient } from '@/lib/supabase/client';
import { toError } from '@/utils/to-error';
import type { PlanType } from '@/types';

export interface SubscriptionData {
  plan: PlanType;
  status: string;
  razorpay_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end?: boolean;
}

export const subscriptionService = {
  /**
   * Get subscription from Supabase (client-side query).
   */
  async get(userId: string): Promise<SubscriptionData | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw toError(error); // PGRST116 = not found
    return data as SubscriptionData | null;
  },

  /**
   * Get or create subscription (auto-creates Free plan if none exists).
   */
  async getOrCreate(userId: string): Promise<SubscriptionData> {
    const existing = await this.get(userId);
    if (existing) return existing;

    // Create free subscription
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('subscriptions') as any)
      .insert({
        user_id: userId,
        plan: 'free',
        status: 'active',
      })
      .select()
      .single();
    if (error) throw toError(error);
    return data as SubscriptionData;
  },

  /**
   * Get usage counts (boards + images).
   */
  async getUsage(userId: string): Promise<{ boards: number; images: number }> {
    const supabase = createClient();
    const [boardsRes, imagesRes] = await Promise.all([
      supabase.from('boards').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('images').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    ]);
    return {
      boards: boardsRes.count ?? 0,
      images: imagesRes.count ?? 0,
    };
  },

  /**
   * Create a Razorpay checkout session.
   * Server-side determines the plan — client doesn't send planId.
   */
  async createCheckout(): Promise<{ subscriptionId: string; keyId: string }> {
    const res = await fetch('/api/razorpay/create-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create subscription');
    }
    return res.json();
  },

  /**
   * Refresh subscription status from server.
   * Used after Razorpay checkout completes to sync plan state
   * without a full page reload.
   */
  async refreshStatus(): Promise<{
    plan: PlanType;
    status: string;
    razorpaySubscriptionId: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  }> {
    const res = await fetch('/api/razorpay/status', {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error('Failed to fetch subscription status');
    }
    return res.json();
  },
};
