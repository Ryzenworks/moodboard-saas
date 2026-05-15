'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Check, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { subscriptionService } from '@/services/subscription';
import { useSubscriptionStore } from '@/store/subscription';
import { useAuthStore } from '@/store/auth';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: () => void) => void;
    };
  }
}

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  trigger?: string;
}

const PRO_FEATURES = [
  'Unlimited boards',
  'Unlimited uploads',
  'Unlimited storage',
  'Priority support',
  'Advanced analytics',
  'Custom branding',
];

/** Lazily inject Razorpay checkout.js — only when needed, never during SSR */
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('SSR'));
    if (window.Razorpay) return resolve();
    if (document.querySelector('script[src*="checkout.razorpay.com"]')) {
      // Already loading, wait for it
      const check = setInterval(() => {
        if (window.Razorpay) { clearInterval(check); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(check); reject(new Error('Razorpay script timeout')); }, 10000);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.head.appendChild(script);
  });
}

export function UpgradeModal({ open, onClose, trigger }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);
  const setPlan = useSubscriptionStore((s) => s.setPlan);

  // Preload script when modal opens
  useEffect(() => {
    if (open) {
      loadRazorpayScript().catch(() => {});
    }
  }, [open]);

  const triggerMessages: Record<string, string> = {
    board_limit: "You've reached the maximum boards on the Free plan.",
    upload_limit: "You've reached the maximum uploads on the Free plan.",
  };

  const handleUpgrade = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // Get Razorpay plan ID from env
      const planId = process.env.NEXT_PUBLIC_RAZORPAY_PLAN_ID;
      if (!planId) {
        setError('Payment configuration is not set up yet. Please contact support.');
        setLoading(false);
        return;
      }

      const { subscriptionId } = await subscriptionService.createCheckout(planId);

      // Ensure Razorpay script is loaded
      await loadRazorpayScript();

      const options: Record<string, unknown> = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: subscriptionId,
        name: 'Moodboard Pro',
        description: 'Pro Plan - Monthly Subscription',
        theme: {
          color: '#056dfa',
          backdrop_color: 'rgba(0,0,0,0.85)',
        },
        prefill: {
          email: user.email,
          name: user.fullName || '',
        },
        handler: () => {
          // Payment successful — webhook will update the plan
          setPlan('pro');
          onClose();
          // Reload to get fresh data
          window.location.reload();
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
        notes: {
          user_id: user.id,
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        setError('Payment failed. Please try again.');
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }, [user, setPlan, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
            className="relative w-full max-w-md bg-gradient-to-b from-[#141414] to-[#0e0e0e] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-accent/10 rounded-full blur-[60px] pointer-events-none" />

            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-7 h-7 rounded-md flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="relative p-8 text-center">
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-7 h-7 text-accent" />
              </div>

              <h2 className="text-xl font-bold mb-2">Upgrade to Pro</h2>

              {trigger && triggerMessages[trigger] && (
                <p className="text-sm text-warning/80 mb-3">
                  {triggerMessages[trigger]}
                </p>
              )}

              <p className="text-sm text-white/40 mb-6">
                Unlock unlimited boards, uploads, and premium features.
              </p>

              {/* Features */}
              <div className="grid grid-cols-2 gap-2 mb-6 text-left">
                {PRO_FEATURES.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs text-white/60">
                    <Check className="w-3 h-3 text-accent shrink-0" />
                    {f}
                  </div>
                ))}
              </div>

              {/* Price */}
              <div className="flex items-baseline justify-center gap-1 mb-6">
                <span className="text-3xl font-bold">₹499</span>
                <span className="text-sm text-white/30">/month</span>
              </div>

              {error && (
                <div className="p-3 mb-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs">
                  {error}
                </div>
              )}

              <Button
                fullWidth
                size="lg"
                loading={loading}
                onClick={handleUpgrade}
                className="shadow-[0_0_30px_rgba(5,109,250,0.2)]"
              >
                <Zap className="w-4 h-4" />
                Subscribe to Pro
              </Button>

              <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] text-white/25">
                <Shield className="w-3 h-3" />
                Secured by Razorpay · Cancel anytime
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
