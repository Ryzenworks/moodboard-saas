import type { Metadata } from 'next';
import { MoodboardLogo } from '@/components/ui/logo';

export const metadata: Metadata = {
  title: 'Moodboard — Sign In',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[300px] bg-accent/[0.02] rounded-full blur-[100px]" />
      </div>

      {/* Logo */}
      <div className="mb-8 z-10 flex items-center gap-2.5">
        <MoodboardLogo size={20} className="text-white/90" />
        <span className="text-sm font-semibold tracking-[0.2em] text-white/90 uppercase">
          Moodboard
        </span>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-[420px] bg-card border border-white/[0.06] rounded-[var(--radius-xl)] p-8 shadow-2xl shadow-black/50">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-muted z-10">
        © {new Date().getFullYear()} Moodboard. All rights reserved.
      </p>
    </div>
  );
}
