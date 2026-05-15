'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-muted-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-10 px-3 text-sm',
              'bg-input text-foreground placeholder:text-muted',
              'border border-white/[0.08] rounded-[var(--radius-md)]',
              'outline-none transition-all duration-200',
              'focus:bg-input-focus focus:border-accent/50',
              'focus:ring-1 focus:ring-accent/30',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              icon && 'pl-10',
              error && 'border-danger/50 focus:border-danger focus:ring-danger/30',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-danger animate-fade-in">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
