'use client';

import { motion } from 'framer-motion';
import { Check, Sparkles, Zap } from 'lucide-react';
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
}: PlanCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative rounded-2xl border p-6 transition-all duration-300',
        recommended
          ? 'bg-gradient-to-b from-accent/[0.08] to-card border-accent/30 shadow-[0_0_40px_rgba(5,109,250,0.08)]'
          : 'bg-card border-white/[0.06]',
        current && !recommended && 'border-white/[0.12]'
      )}
    >
      {/* Recommended badge */}
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-accent text-white text-[10px] font-semibold uppercase tracking-wider shadow-[0_0_20px_rgba(5,109,250,0.3)]">
            <Sparkles className="w-3 h-3" />
            Recommended
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          {recommended ? (
            <Zap className="w-5 h-5 text-accent" />
          ) : (
            <div className="w-5 h-5 rounded bg-white/[0.08] flex items-center justify-center text-[10px] text-white/40">
              ✦
            </div>
          )}
          <h3 className="text-sm font-semibold">{name}</h3>
          {current && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-white/[0.08] text-white/40">
              Current
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">{price}</span>
          {price !== 'Free' && (
            <span className="text-sm text-white/30">{period}</span>
          )}
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-2.5 mb-6">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-xs">
            <Check
              className={cn(
                'w-3.5 h-3.5 mt-0.5 shrink-0',
                recommended ? 'text-accent' : 'text-white/30'
              )}
            />
            <span className="text-white/60">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {current ? (
        <Button variant="secondary" fullWidth disabled>
          Current Plan
        </Button>
      ) : (
        <Button
          variant={recommended ? 'primary' : 'outline'}
          fullWidth
          onClick={onSelect}
          loading={loading}
        >
          {recommended ? 'Upgrade to Pro' : 'Downgrade'}
        </Button>
      )}
    </motion.div>
  );
}
