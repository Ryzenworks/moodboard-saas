import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Use service role for webhook (no user session)
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function verifySignature(body: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    // Verify webhook signature
    if (process.env.RAZORPAY_WEBHOOK_SECRET && signature) {
      const isValid = verifySignature(
        body,
        signature,
        process.env.RAZORPAY_WEBHOOK_SECRET
      );
      if (!isValid) {
        console.error('Invalid Razorpay webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    const event = JSON.parse(body);
    const eventType = event.event;
    const payload = event.payload;

    console.log(`Razorpay webhook: ${eventType}`);

    switch (eventType) {
      case 'subscription.activated':
      case 'subscription.charged': {
        const subscription = payload.subscription?.entity;
        if (!subscription) break;

        const userId = subscription.notes?.user_id;
        if (!userId) {
          console.error('No user_id in subscription notes');
          break;
        }

        // Update subscription in database
        await supabaseAdmin
          .from('subscriptions')
          .upsert(
            {
              user_id: userId,
              plan: 'pro',
              status: 'active',
              razorpay_subscription_id: subscription.id,
              razorpay_customer_id: subscription.customer_id || null,
              current_period_end: subscription.current_end
                ? new Date(subscription.current_end * 1000).toISOString()
                : null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

        // Update profile plan
        await supabaseAdmin
          .from('profiles')
          .update({ plan: 'pro', updated_at: new Date().toISOString() })
          .eq('id', userId);

        console.log(`User ${userId} upgraded to Pro`);
        break;
      }

      case 'subscription.cancelled':
      case 'subscription.expired':
      case 'subscription.halted': {
        const subscription = payload.subscription?.entity;
        if (!subscription) break;

        const userId = subscription.notes?.user_id;
        if (!userId) break;

        // Downgrade to free
        await supabaseAdmin
          .from('subscriptions')
          .update({
            plan: 'free',
            status: eventType === 'subscription.cancelled' ? 'cancelled' : 'expired',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        await supabaseAdmin
          .from('profiles')
          .update({ plan: 'free', updated_at: new Date().toISOString() })
          .eq('id', userId);

        console.log(`User ${userId} downgraded to Free (${eventType})`);
        break;
      }

      case 'payment.failed': {
        const payment = payload.payment?.entity;
        console.log(`Payment failed: ${payment?.id}`);
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
