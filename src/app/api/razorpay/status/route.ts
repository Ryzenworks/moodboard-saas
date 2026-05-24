import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/razorpay/status
 *
 * Returns the current subscription status for the authenticated user.
 * Used by the client to poll after Razorpay checkout completes,
 * so we can update the UI without a full page reload.
 */

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store',
    },
  });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, status, razorpay_subscription_id, current_period_end, cancel_at_period_end')
    .eq('user_id', user.id)
    .single() as { data: { plan: string; status: string; razorpay_subscription_id: string | null; current_period_end: string | null; cancel_at_period_end: boolean | null } | null };

  if (!sub) {
    return json({
      plan: 'free',
      status: 'active',
      razorpaySubscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
  }

  return json({
    plan: sub.plan,
    status: sub.status,
    razorpaySubscriptionId: sub.razorpay_subscription_id,
    currentPeriodEnd: sub.current_period_end,
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
  });
}
