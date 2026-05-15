import { createClient } from '@/lib/supabase/client';
import { toError } from '@/utils/to-error';
import type { PlanType } from '@/types';

export const subscriptionService = {
  async get(userId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw toError(error); // PGRST116 = not found
    return data as {
      plan: PlanType;
      status: string;
      razorpay_subscription_id: string | null;
      current_period_end: string | null;
    } | null;
  },

  async getOrCreate(userId: string) {
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
    return data as {
      plan: PlanType;
      status: string;
      razorpay_subscription_id: string | null;
      current_period_end: string | null;
    };
  },

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

  async createCheckout(planId: string): Promise<{ subscriptionId: string; orderId: string }> {
    const res = await fetch('/api/razorpay/create-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create subscription');
    }
    return res.json();
  },
};
