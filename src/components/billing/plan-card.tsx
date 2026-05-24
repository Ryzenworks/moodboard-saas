'use client';

import { motion } from 'framer-motion';
import { Check, Zap } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';

interface PlanCardProps {
  name: string;
  price: string;
  period?: string;
  features: string[];
  current?: boolean;
  recommended?: boolean;
  onSelect?: () => void;
  loading?: boolean;
  /** Override default CTA label */
  ctaLabel?: string;
}

export function PlanCard({
  name,
  price,
  period = '/month',
  features,
  current = false,
  recommended = false,
  onSelect,
  loading = false,
  ctaLabel,
}: PlanCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative rounded-2xl border flex flex-col transition-all duration-300',
        recommended
          ? 'bg-gradient-to-b from-accent/[0.06] to-card border-accent/25 shadow-[0_0_32px_rgba(5,109,250,0.06)]'
          : 'bg-card border-white/[0.06]',
        current && !recommended && 'border-white/[0.1]'
      )}
    >
      {/* Recommended badge */}
      {recommended && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent text-white text-[9px] font-semibold uppercase tracking-widest shadow-[0_0_16px_rgba(5,109,250,0.25)]">
            <Zap className="w-2.5 h-2.5" />
            Recommended
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-2.5">
          {recommended ? (
            <Zap className="w-4 h-4 text-accent" />
          ) : (
            <div className="w-4 h-4 rounded bg-white/[0.06] flex items-center justify-center text-[9px] text-white/30">
              ✦
            </div>
          )}
          <h3 className="text-[13px] font-semibold tracking-wide">{name}</h3>
          {current && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-medium bg-white/[0.06] text-white/35 uppercase tracking-wider">
              Current
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-2xl font-bold tracking-tight">{price}</span>
          {price !== 'Free' && (
            <span className="text-xs text-white/25">{period}</span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-white/[0.04]" />

      {/* Features */}
      <ul className="px-5 py-4 space-y-2 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-[12px]">
            <Check
              className={cn(
                'w-3 h-3 shrink-0',
                recommended ? 'text-accent/70' : 'text-white/20'
              )}
              strokeWidth={2.5}
            />
            <span className={cn(
              recommended ? 'text-white/55' : 'text-white/45'
            )}>{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="px-5 pb-5">
        {current ? (
          <Button variant="secondary" fullWidth disabled className="!h-9 !text-[12px]">
            Current Plan
          </Button>
        ) : (
          <Button
            variant={recommended ? 'primary' : 'outline'}
            fullWidth
            onClick={onSelect}
            loading={loading}
            className="!h-9 !text-[12px]"
          >
            {ctaLabel || (recommended ? 'Upgrade to Pro' : 'Downgrade')}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
