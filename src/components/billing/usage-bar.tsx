'use client';

import { cn } from '@/utils/cn';
import { motion } from 'framer-motion';

interface UsageBarProps {
  label: string;
  current: number;
  max: number;
  unit?: string;
}

export function UsageBar({ label, current, max, unit = '' }: UsageBarProps) {
  const isUnlimited = max === Infinity;
  const percent = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
  const isHigh = percent > 80;
  const isFull = percent >= 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white/60">{label}</span>
        <span className={cn('text-xs font-mono', isFull ? 'text-danger' : isHigh ? 'text-warning' : 'text-white/40')}>
          {current}{unit} / {isUnlimited ? '∞' : `${max}${unit}`}
        </span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        {!isUnlimited && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={cn(
              'h-full rounded-full transition-colors',
              isFull ? 'bg-danger' : isHigh ? 'bg-warning' : 'bg-accent'
            )}
          />
        )}
        {isUnlimited && (
          <div className="h-full w-full bg-accent/20 rounded-full relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-accent/40 to-accent/10 animate-pulse-soft" />
          </div>
        )}
      </div>
    </div>
  );
}
