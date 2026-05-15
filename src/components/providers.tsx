'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth';
import { useSubscriptionStore } from '@/store/subscription';
import { subscriptionService } from '@/services/subscription';

export function Providers({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const setSubscription = useSubscriptionStore((s) => s.setSubscription);
  const setUsage = useSubscriptionStore((s) => s.setUsage);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUser({
          id: user.id,
          email: user.email ?? '',
          fullName: user.user_metadata?.full_name ?? null,
          avatarUrl: user.user_metadata?.avatar_url ?? null,
        });

        // Load subscription + usage
        try {
          const [sub, usage] = await Promise.all([
            subscriptionService.getOrCreate(user.id),
            subscriptionService.getUsage(user.id),
          ]);
          setSubscription({
            plan: sub.plan,
            status: sub.status,
            razorpaySubscriptionId: sub.razorpay_subscription_id,
            currentPeriodEnd: sub.current_period_end,
          });
          setUsage(usage.boards, usage.images);
        } catch {
          setSubscription({
            plan: 'free',
            status: 'active',
            razorpaySubscriptionId: null,
            currentPeriodEnd: null,
          });
        }
      } else {
        setUser(null);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          fullName: session.user.user_metadata?.full_name ?? null,
          avatarUrl: session.user.user_metadata?.avatar_url ?? null,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading, setSubscription, setUsage]);

  return <>{children}</>;
}
