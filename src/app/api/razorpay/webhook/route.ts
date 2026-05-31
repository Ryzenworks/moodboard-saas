import crypto from 'crypto';
import { createClient as createAdminClient } from '@supabase/supabase-js';

/**
 * POST /api/razorpay/webhook
 *
 * Handles Razorpay subscription lifecycle events.
 * This is the SOURCE OF TRUTH for plan state.
 *
 * Handled events:
 *   subscription.activated  → Pro active
 *   subscription.charged    → Pro active (renewal)
 *   subscription.cancelled  → Cancel at period end
 *   subscription.expired    → Downgrade to Free
 *   subscription.halted     → Downgrade to Free
 *   subscription.paused     → Mark paused
 *   subscription.resumed    → Pro active
 *   payment.failed          → Log (don't downgrade immediately)
 *
 * Security:
 *   - Signature verification (fail-closed in production)
 *   - DEV bypass when RAZORPAY_WEBHOOK_SECRET is empty
 *   - Idempotent upserts (safe for Razorpay retries)
 */

// Admin client — webhooks have no user session
// MUST use service role key in production to bypass RLS
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey && process.env.NODE_ENV === 'production') {
  console.error('[Webhook] ❌ SUPABASE_SERVICE_ROLE_KEY is required in production!');
}
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('x-razorpay-signature');
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // ── Signature verification ──
  if (webhookSecret) {
    // Production: verify signature
    if (!signature) {
      console.error('[Webhook] Missing x-razorpay-signature header');
      return json({ error: 'Missing signature' }, 401);
    }

    if (!verifySignature(body, signature, webhookSecret)) {
      console.error('[Webhook] ❌ Invalid signature');
      return json({ error: 'Invalid signature' }, 401);
    }

    console.log('[Webhook] ✅ Signature verified');
  } else {
    // FAIL CLOSED in production — reject if no secret configured
    if (process.env.NODE_ENV === 'production') {
      console.error('[Webhook] ❌ RAZORPAY_WEBHOOK_SECRET not configured in production!');
      return json({ error: 'Webhook not configured' }, 500);
    }
    // DEV mode only: allow without signature
    console.warn('[Webhook] ⚠️ DEV MODE — skipping signature verification');
  }

  // ── Parse event ──
  let event: { event: string; payload: Record<string, { entity: Record<string, unknown> }> };
  try {
    event = JSON.parse(body);
  } catch {
    console.error('[Webhook] Invalid JSON body');
    return json({ error: 'Invalid JSON' }, 400);
  }

  const eventType = event.event;
  const payload = event.payload;

  console.log(`[Webhook] Event: ${eventType}`);

  try {
    switch (eventType) {
      // ── Subscription activated / renewed ──
      case 'subscription.activated':
      case 'subscription.charged':
      case 'subscription.resumed': {
        const sub = payload.subscription?.entity;
        if (!sub) break;

        const userId = (sub.notes as Record<string, string>)?.user_id;
        if (!userId) {
          console.error('[Webhook] No user_id in subscription notes');
          break;
        }

        const currentEnd = sub.current_end
          ? new Date((sub.current_end as number) * 1000).toISOString()
          : null;

        // Upsert subscription — idempotent (safe for retries)
        const { error: subErr } = await supabaseAdmin
          .from('subscriptions')
          .upsert({
            user_id: userId,
            plan: 'pro',
            status: 'active',
            razorpay_subscription_id: sub.id as string,
            razorpay_customer_id: (sub.customer_id as string) || null,
            current_period_end: currentEnd,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (subErr) {
          console.error('[Webhook] Subscription upsert failed:', subErr);
        }

        // Update profile plan (dual-write for fast reads)
        const { error: profErr } = await supabaseAdmin
          .from('profiles')
          .update({ plan: 'pro', updated_at: new Date().toISOString() })
          .eq('id', userId);

        if (profErr) {
          console.error('[Webhook] Profile update failed:', profErr);
        }

        console.log(`[Webhook] ✅ User ${userId.slice(0, 8)}... → Pro (${eventType})`);
        break;
      }

      // ── Subscription cancelled (but still active until period end) ──
      case 'subscription.cancelled': {
        const sub = payload.subscription?.entity;
        if (!sub) break;

        const userId = (sub.notes as Record<string, string>)?.user_id;
        if (!userId) break;

        const endDate = sub.current_end
          ? new Date((sub.current_end as number) * 1000).toISOString()
          : sub.ended_at
            ? new Date((sub.ended_at as number) * 1000).toISOString()
            : null;

        // Mark as cancelled but keep Pro access until period end
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancel_at_period_end: true,
            current_period_end: endDate,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        // Keep plan as 'pro' until period end — a cron or the next
        // webhook (expired/halted) will downgrade when the time comes.
        console.log(`[Webhook] ⚠️ User ${userId.slice(0, 8)}... cancelled (access until ${endDate})`);
        break;
      }

      // ── Subscription expired / halted (no more access) ──
      case 'subscription.expired':
      case 'subscription.halted': {
        const sub = payload.subscription?.entity;
        if (!sub) break;

        const userId = (sub.notes as Record<string, string>)?.user_id;
        if (!userId) break;

        // Downgrade to Free
        await supabaseAdmin
          .from('subscriptions')
          .update({
            plan: 'free',
            status: eventType === 'subscription.expired' ? 'expired' : 'halted',
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        await supabaseAdmin
          .from('profiles')
          .update({ plan: 'free', updated_at: new Date().toISOString() })
          .eq('id', userId);

        console.log(`[Webhook] 🔻 User ${userId.slice(0, 8)}... → Free (${eventType})`);
        break;
      }

      // ── Subscription paused ──
      case 'subscription.paused': {
        const sub = payload.subscription?.entity;
        if (!sub) break;

        const userId = (sub.notes as Record<string, string>)?.user_id;
        if (!userId) break;

        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'paused',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        console.log(`[Webhook] ⏸ User ${userId.slice(0, 8)}... paused`);
        break;
      }

      // ── Payment failed (don't downgrade — Razorpay retries) ──
      case 'payment.failed': {
        const payment = payload.payment?.entity;
        console.log(`[Webhook] ❌ Payment failed: ${(payment?.id as string) || 'unknown'}`);
        // Razorpay will retry automatically and send subscription.halted if all retries fail
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event: ${eventType}`);
    }
  } catch (err) {
    console.error('[Webhook] Processing error:', err);
    // Return 200 anyway to prevent Razorpay from retrying indefinitely
    // The error is logged for debugging
  }

  return json({ received: true });
}
