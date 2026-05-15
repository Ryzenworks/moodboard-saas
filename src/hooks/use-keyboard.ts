'use client';

import { useEffect } from 'react';

interface KeyboardActions {
  onSearch?: () => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  onDelete?: () => void;
  onEscape?: () => void;
  onFavorite?: () => void;
}

export function useKeyboardShortcuts(actions: KeyboardActions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger if typing in input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        if (e.key === 'Escape') {
          (target as HTMLInputElement).blur();
          actions.onEscape?.();
        }
        return;
      }

      // / — Focus search
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        actions.onSearch?.();
        return;
      }

      // Ctrl+A — Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        actions.onSelectAll?.();
        return;
      }

      // Delete / Backspace — Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        actions.onDelete?.();
        return;
      }

      // Escape — Clear selection / close
      if (e.key === 'Escape') {
        actions.onEscape?.();
        return;
      }

      // F — Toggle favorite
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        actions.onFavorite?.();
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
}
