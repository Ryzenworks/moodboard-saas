'use client';

import { useState } from 'react';
import { Topbar } from '@/components/layout/topbar';
import { PlanCard } from '@/components/billing/plan-card';
import { UsageBar } from '@/components/billing/usage-bar';
import { UpgradeModal } from '@/components/billing/upgrade-modal';
import { usePlan } from '@/hooks/use-plan';
import { useSubscriptionStore } from '@/store/subscription';
import { PLAN_LIMITS } from '@/types';
import { Calendar, CreditCard } from 'lucide-react';

export default function BillingPage() {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { plan, isPro, boardCount, imageCount, limits } = usePlan();
  const { currentPeriodEnd, razorpaySubscriptionId, status } = useSubscriptionStore();

  return (
    <>
      <Topbar title="Billing & Subscription" />

      <div className="flex-1 p-6 max-w-4xl space-y-8">
        {/* Usage section */}
        <section>
          <h2 className="text-sm font-semibold mb-4 text-white/70">Your Usage</h2>
          <div className="bg-card border border-white/[0.06] rounded-xl p-5 space-y-4">
            <UsageBar
              label="Boards"
              current={boardCount}
              max={limits.maxBoards}
            />
            <UsageBar
              label="Uploads"
              current={imageCount}
              max={limits.maxUploads}
            />
          </div>
        </section>

        {/* Current plan info */}
        {isPro && (
          <section>
            <h2 className="text-sm font-semibold mb-4 text-white/70">Subscription</h2>
            <div className="bg-card border border-white/[0.06] rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-accent" />
                <div>
                  <p className="text-sm font-medium">Pro Plan</p>
                  <p className="text-xs text-white/30">Status: <span className="text-success capitalize">{status}</span></p>
                </div>
              </div>
              {currentPeriodEnd && (
                <div className="flex items-center gap-3 text-xs text-white/30">
                  <Calendar className="w-3.5 h-3.5" />
                  Next billing: {new Date(currentPeriodEnd).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              )}
              {razorpaySubscriptionId && (
                <p className="text-[10px] text-white/15 font-mono">
                  ID: {razorpaySubscriptionId}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Plans */}
        <section>
          <h2 className="text-sm font-semibold mb-4 text-white/70">Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <PlanCard
              name="Free"
              price="Free"
              current={plan === 'free'}
              features={[
                `${PLAN_LIMITS.free.maxBoards} board`,
                `${PLAN_LIMITS.free.maxUploads} uploads`,
                `${PLAN_LIMITS.free.maxStorageMB} MB storage`,
                'Browser extension',
                'Real-time sync',
              ]}
            />
            <PlanCard
              name="Pro"
              price="₹499"
              period="/month"
              current={plan === 'pro'}
              recommended={plan === 'free'}
              onSelect={() => setUpgradeOpen(true)}
              features={[
                'Up to 10 boards',
                'Unlimited uploads',
                'Unlimited storage',
                'Multi-board workflow',
                'Priority support',
              ]}
            />
          </div>
        </section>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  );
}
