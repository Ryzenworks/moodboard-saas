import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/razorpay/create-subscription
 *
 * Creates a Razorpay subscription for the authenticated user.
 * Uses server-side RAZORPAY_PRO_PLAN_ID — client never needs to know the plan ID.
 *
 * Flow:
 *   1. Authenticate user via Supabase session
 *   2. Lookup/create Razorpay customer
 *   3. Create Razorpay subscription linked to customer
 *   4. Return subscription ID for client-side checkout
 */

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const planId = process.env.RAZORPAY_PRO_PLAN_ID;

  if (!keyId || !keySecret) {
    console.error('[Razorpay] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET');
    return json({ error: 'Payment system not configured' }, 500);
  }

  if (!planId) {
    console.error('[Razorpay] Missing RAZORPAY_PRO_PLAN_ID');
    return json({ error: 'Subscription plan not configured' }, 500);
  }

  // ── Authenticate user ──
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Lazy-import to avoid build errors when keys aren't set
    const Razorpay = (await import('razorpay')).default;
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    // ── Check for existing Razorpay customer ──
    let customerId: string | null = null;

    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('razorpay_customer_id, razorpay_subscription_id, status, plan')
      .eq('user_id', user.id)
      .single() as { data: { razorpay_customer_id: string | null; razorpay_subscription_id: string | null; status: string; plan: string } | null };

    // If user already has an active Pro subscription, don't create another
    if (existingSub?.plan === 'pro' && existingSub?.status === 'active') {
      return json({
        error: 'You already have an active Pro subscription',
        existing: true,
      }, 409);
    }

    customerId = existingSub?.razorpay_customer_id || null;

    // ── Create Razorpay customer if none exists ──
    if (!customerId) {
      try {
        const customer = await razorpay.customers.create({
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          notes: { user_id: user.id },
        } as Parameters<typeof razorpay.customers.create>[0]);

        customerId = customer.id;
        console.log('[Razorpay] Created customer:', customerId);

        // Store customer ID in subscription record
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('subscriptions') as any)
          .upsert({
            user_id: user.id,
            razorpay_customer_id: customerId,
            plan: existingSub?.plan || 'free',
            status: existingSub?.status || 'active',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
      } catch (custErr) {
        console.error('[Razorpay] Customer creation failed:', custErr);
        // Continue without customer — Razorpay allows subscriptions without customer_id
      }
    }

    // ── Create Razorpay subscription ──
    const subscriptionPayload: Record<string, unknown> = {
      plan_id: planId,
      total_count: 120, // Max 10 years of monthly billing
      notes: {
        user_id: user.id,
        email: user.email,
      },
    };

    if (customerId) {
      subscriptionPayload.customer_id = customerId;
    }

    console.log('[Razorpay] Creating subscription for user:', user.id.slice(0, 8) + '...');

    const subscription = await razorpay.subscriptions.create(
      subscriptionPayload as unknown as Parameters<typeof razorpay.subscriptions.create>[0]
    );

    console.log('[Razorpay] ✅ Subscription created:', subscription.id);

    return json({
      subscriptionId: subscription.id,
      keyId, // Client needs this for Razorpay checkout.js
    });
  } catch (error) {
    console.error('[Razorpay] Create subscription error:', error);
    return json({ error: 'Failed to create subscription. Please try again.' }, 500);
  }
}
