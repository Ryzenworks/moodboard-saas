'use client';

import { AlertTriangle, Trash2 } from 'lucide-react';
import { ModalShell } from '@/components/ui/modal-shell';
import { Button } from '@/components/ui/button';
import { useEffect, useRef } from 'react';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  danger = true,
}: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => confirmRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm();
      onClose();
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} width="max-w-sm">
      <div className="p-6 text-center" onKeyDown={handleKeyDown}>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-4 ${danger ? 'bg-danger/10' : 'bg-accent/10'}`}>
          {danger ? (
            <Trash2 className="w-5 h-5 text-danger" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-accent" />
          )}
        </div>

        <h3 className="text-[15px] font-semibold text-white mb-1.5">{title}</h3>
        <p className="text-xs text-white/40 leading-relaxed mb-6">{message}</p>

        <div className="flex gap-2.5">
          <Button variant="ghost" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            ref={confirmRef}
            fullWidth
            onClick={() => { onConfirm(); onClose(); }}
            className={danger ? '!bg-danger/90 hover:!bg-danger !shadow-danger/20' : ''}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
