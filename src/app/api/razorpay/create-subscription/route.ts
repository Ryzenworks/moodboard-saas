import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    // Lazy-import Razorpay to avoid build-time errors when keys aren't set
    const Razorpay = (await import('razorpay')).default;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: 'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local' },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId } = await request.json();

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Check if user already has a subscription with a customer ID
    let customerId: string | undefined;
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('razorpay_customer_id')
      .eq('user_id', user.id)
      .single() as { data: { razorpay_customer_id: string | null } | null };

    if (existingSub?.razorpay_customer_id) {
      customerId = existingSub.razorpay_customer_id;
    }

    // Create Razorpay subscription
    const subscriptionOptions: Record<string, unknown> = {
      plan_id: planId,
      total_count: 120,
      notes: {
        user_id: user.id,
        email: user.email,
      },
    };

    if (customerId) {
      subscriptionOptions.customer_id = customerId;
    }

    const subscription = await razorpay.subscriptions.create(
      subscriptionOptions as unknown as Parameters<typeof razorpay.subscriptions.create>[0]
    );

    return NextResponse.json({
      subscriptionId: subscription.id,
      orderId: subscription.id,
    });
  } catch (error) {
    console.error('Razorpay create subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
