'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;

      console.log('[ForgotPassword] Sending reset email:', {
        email,
        redirectTo,
        origin: window.location.origin,
      });

      const { data, error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      console.log('[ForgotPassword] Supabase response:', {
        data,
        error: resetError,
        hasError: !!resetError,
      });

      if (resetError) {
        console.error('[ForgotPassword] Supabase error:', resetError.message, resetError.status, resetError);
        throw resetError;
      }

      console.log('[ForgotPassword] ✅ Reset email sent successfully');
      setSent(true);
    } catch (err) {
      console.error('[ForgotPassword] Exception:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm mx-auto text-center space-y-4 animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-accent" />
        </div>
        <h2 className="text-xl font-bold">Check your email</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We&apos;ve sent a password reset link to{' '}
          <span className="text-white font-medium">{email}</span>.
          <br />
          Click the link in the email to reset your password.
        </p>
        <p className="text-xs text-muted leading-relaxed">
          Didn&apos;t receive the email? Check your spam folder, or{' '}
          <button
            type="button"
            onClick={() => { setSent(false); setError(null); }}
            className="text-accent hover:text-accent-hover transition-colors cursor-pointer"
          >
            try again
          </button>.
        </p>
        <Link href="/login">
          <Button variant="secondary" className="mt-2">
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail className="w-4 h-4" />}
          required
          autoComplete="email"
          autoFocus
        />

        {error && (
          <div className="p-3 rounded-[var(--radius-md)] bg-danger/10 border border-danger/20 text-danger text-sm animate-scale-in">
            {error}
          </div>
        )}

        <Button type="submit" fullWidth loading={loading} className="h-11">
          Send Reset Link
        </Button>
      </form>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{' '}
        <Link
          href="/login"
          className="text-accent hover:text-accent-hover font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
