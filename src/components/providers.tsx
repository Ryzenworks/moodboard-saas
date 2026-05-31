'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth';
import { useSubscriptionStore } from '@/store/subscription';
import { subscriptionService } from '@/services/subscription';

export function Providers({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setSubscription = useSubscriptionStore((s) => s.setSubscription);
  const reconcileUsage = useSubscriptionStore((s) => s.reconcileUsage);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const supabase = createClient();

    // FAST PATH: Use getSession() for initial render — reads from local storage (0ms).
    // The middleware already validated the session server-side via getUser(),
    // so the client doesn't need to repeat that network call.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const user = session.user;
        setUser({
          id: user.id,
          email: user.email ?? '',
          fullName: user.user_metadata?.full_name ?? null,
          avatarUrl: user.user_metadata?.avatar_url ?? null,
        });

        // Load subscription + usage in parallel — non-blocking
        loadSubscription(user.id);
      } else {
        setUser(null);
      }
    });

    // Background subscription loader — uses get() not getOrCreate()
    // Subscription is created by DB trigger on signup, no upsert needed
    function loadSubscription(userId: string) {
      Promise.all([
        subscriptionService.get(userId),
        subscriptionService.getUsage(userId),
      ])
        .then(([sub, usage]) => {
          if (sub) {
            setSubscription({
              plan: sub.plan,
              status: sub.status,
              razorpaySubscriptionId: sub.razorpay_subscription_id,
              currentPeriodEnd: sub.current_period_end,
            });
          } else {
            // No subscription row — keep free defaults
            setSubscription({
              plan: 'free',
              status: 'active',
              razorpaySubscriptionId: null,
              currentPeriodEnd: null,
            });
          }
          reconcileUsage(usage.boards, usage.images);
        })
        .catch(() => {
          setSubscription({
            plan: 'free',
            status: 'active',
            razorpaySubscriptionId: null,
            currentPeriodEnd: null,
          });
        });
    }

    // Listen for auth changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Only act on meaningful auth events
      if (event === 'INITIAL_SESSION') return; // Already handled above

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          fullName: session.user.user_metadata?.full_name ?? null,
          avatarUrl: session.user.user_metadata?.avatar_url ?? null,
        });

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          loadSubscription(session.user.id);
        }
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setSubscription, reconcileUsage]);

  return <>{children}</>;
}
