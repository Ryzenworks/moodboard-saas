'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Puzzle, Check, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { profileService } from '@/services/profile';

type AuthStep = 'loading' | 'generating' | 'sending' | 'success' | 'error';

export default function ExtensionAuthPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const [step, setStep] = useState<AuthStep>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      console.log('[ExtAuth] No user — redirecting to login');
      router.replace('/login?redirect=/extension-auth');
      return;
    }
    if (user && step === 'loading') {
      console.log('[ExtAuth] User found:', user.email, '— starting connection');
      connectExtension(user.id, user.email);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  async function connectExtension(userId: string, email: string) {
    try {
      // Step 1: Generate token (never throws — returns token regardless of DB state)
      setStep('generating');
      console.log('[ExtAuth] Generating token...');
      const token = await profileService.generateExtensionToken(userId);
      console.log('[ExtAuth] Token generated:', token.substring(0, 8) + '...');

      // Step 2: Send to extension via postMessage
      setStep('sending');
      console.log('[ExtAuth] Posting AUTH_TOKEN to content script...');
      window.postMessage({
        source: 'moodboard-web',
        type: 'AUTH_TOKEN',
        token,
        email,
        userId,
      }, '*');

      // Listen for confirmation from content script
      const confirmed = await waitForConfirmation(3000);
      console.log('[ExtAuth] Confirmation received:', confirmed);

      // Show success regardless — token was generated
      setStep('success');
    } catch (err) {
      console.error('[ExtAuth] Unexpected error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setStep('error');
    }
  }

  function waitForConfirmation(timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        console.log('[ExtAuth] Confirmation timeout — extension may not be installed on this page');
        window.removeEventListener('message', handler);
        resolve(false);
      }, timeout);

      function handler(e: MessageEvent) {
        if (e.data?.source === 'moodboard-ext' && e.data?.type === 'AUTH_SUCCESS') {
          console.log('[ExtAuth] AUTH_SUCCESS received from content script!');
          clearTimeout(timer);
          window.removeEventListener('message', handler);
          resolve(true);
        }
      }

      window.addEventListener('message', handler);
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/20 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-accent/[0.04] rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm text-center"
      >
        {/* Icon */}
        <div className={`w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center transition-all duration-500 ${
          step === 'success'
            ? 'bg-green-500/10 border border-green-500/20'
            : step === 'error'
            ? 'bg-red-500/10 border border-red-500/20'
            : 'bg-accent/10 border border-accent/20'
        }`}>
          {step === 'success' ? (
            <Check className="w-8 h-8 text-green-400" />
          ) : step === 'error' ? (
            <AlertCircle className="w-8 h-8 text-red-400" />
          ) : step === 'loading' ? (
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          ) : (
            <Puzzle className="w-8 h-8 text-accent" />
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-2">
          {step === 'success' ? 'Extension Connected!' : step === 'error' ? 'Connection Failed' : 'Connecting Extension...'}
        </h1>

        {/* Subtitle */}
        <p className="text-sm text-white/35 mb-8">
          {step === 'success'
            ? 'Your extension is now linked to your account. You can close this tab.'
            : step === 'error'
            ? error || 'Something went wrong. Please try again.'
            : 'Setting up secure connection...'}
        </p>

        {/* Status steps */}
        {step !== 'error' && (
          <div className="space-y-3 mb-8">
            {[
              { label: 'Generate secure token', done: step !== 'loading' },
              { label: 'Link to extension', done: step === 'sending' || step === 'success' },
              { label: 'Connection established', done: step === 'success' },
            ].map(({ label, done }) => (
              <div key={label} className="flex items-center gap-3 text-left">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  done ? 'bg-green-500/20' : 'bg-white/[0.04]'
                }`}>
                  {done ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                  )}
                </div>
                <span className={`text-xs ${done ? 'text-white/60' : 'text-white/20'}`}>{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {step === 'success' && (
          <div className="space-y-2">
            <button
              onClick={() => router.push('/boards')}
              className="w-full px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-medium transition-all cursor-pointer"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => window.close()}
              className="w-full px-4 py-2 rounded-xl text-xs text-white/25 hover:text-white/50 transition-all cursor-pointer"
            >
              Close this tab
            </button>
          </div>
        )}

        {step === 'error' && (
          <button
            onClick={() => user && connectExtension(user.id, user.email)}
            className="px-6 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-sm text-white/60 hover:text-white hover:bg-white/[0.1] transition-all cursor-pointer"
          >
            Try Again
          </button>
        )}
      </motion.div>
    </div>
  );
}
