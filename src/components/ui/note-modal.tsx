'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';
import { ModalShell } from '@/components/ui/modal-shell';
import { Button } from '@/components/ui/button';

interface NoteModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (note: string) => void;
  initialNote: string;
  imageUrl?: string;
  filename?: string;
}

export function NoteModal({ open, onClose, onSave, initialNote, imageUrl, filename }: NoteModalProps) {
  const [note, setNote] = useState(initialNote);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setNote(initialNote);
      const t = setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 100);
      return () => clearTimeout(t);
    }
  }, [open, initialNote]);

  function handleSave() {
    onSave(note);
    onClose();
  }



  return (
    <ModalShell open={open} onClose={onClose} width="max-w-md">
      <div className="p-5">
        {/* Header with optional thumbnail */}
        <div className="flex items-center gap-3 mb-4">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="w-10 h-10 rounded-lg object-cover border border-white/[0.06]"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <FileText className="w-4 h-4 text-white/20" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold text-white">Edit Note</h3>
            {filename && (
              <p className="text-[10px] text-white/25 truncate">{filename}</p>
            )}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
          placeholder="Add a note..."
          rows={4}
          className="w-full px-3 py-2.5 text-sm bg-white/[0.04] text-white placeholder:text-white/20 border border-white/[0.08] rounded-xl outline-none transition-all duration-200 focus:border-accent/40 focus:ring-1 focus:ring-accent/20 resize-none leading-relaxed"
        />

        <div className="flex items-center justify-between mt-3">
          <span className="text-[10px] text-white/15">Esc to close</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Save Note</Button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
