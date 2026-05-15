'use client';

import { useState, useEffect, useRef } from 'react';
import { ModalShell } from '@/components/ui/modal-shell';
import { Button } from '@/components/ui/button';

interface PromptModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  label?: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
}

export function PromptModal({
  open,
  onClose,
  onSubmit,
  title,
  label,
  placeholder = '',
  initialValue = '',
  submitLabel = 'Save',
}: PromptModalProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      const t = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
      return () => clearTimeout(t);
    }
  }, [open, initialValue]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
    onClose();
  }

  return (
    <ModalShell open={open} onClose={onClose} width="max-w-sm">
      <form onSubmit={handleSubmit} className="p-5">
        <h3 className="text-[14px] font-semibold text-white mb-4">{title}</h3>

        {label && (
          <label className="text-xs text-white/40 mb-1.5 block">{label}</label>
        )}

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm bg-white/[0.04] text-white placeholder:text-white/20 border border-white/[0.08] rounded-xl outline-none transition-all duration-200 focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
        />

        <div className="flex gap-2 mt-4 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} type="button">Cancel</Button>
          <Button size="sm" type="submit" disabled={!value.trim()}>{submitLabel}</Button>
        </div>
      </form>
    </ModalShell>
  );
}
