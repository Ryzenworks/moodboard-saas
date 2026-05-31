'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  // Check that we have a valid session (from the reset link)
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        setSessionError(true);
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        // Handle specific error messages
        if (updateError.message.includes('same')) {
          setError('New password must be different from your current password.');
        } else if (updateError.message.includes('expired') || updateError.message.includes('invalid')) {
          setError('This reset link has expired. Please request a new one.');
        } else {
          throw updateError;
        }
        return;
      }

      setSuccess(true);

      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        router.push('/boards');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Invalid/expired link state
  if (sessionError) {
    return (
      <div className="w-full max-w-sm mx-auto text-center space-y-4 animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-danger" />
        </div>
        <h2 className="text-xl font-bold">Link expired</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This password reset link has expired or is invalid.
          <br />
          Please request a new one.
        </p>
        <Link href="/forgot-password">
          <Button className="mt-2">
            Request New Link
          </Button>
        </Link>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="w-full max-w-sm mx-auto text-center space-y-4 animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-accent" />
        </div>
        <h2 className="text-xl font-bold">Password updated</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your password has been successfully reset.
          <br />
          Redirecting you to your dashboard...
        </p>
      </div>
    );
  }

  // Loading session check
  if (!sessionReady) {
    return (
      <div className="w-full max-w-sm mx-auto text-center space-y-4">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Verifying reset link...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Set new password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your new password below
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="New Password"
          type="password"
          placeholder="Min 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock className="w-4 h-4" />}
          showPasswordToggle
          required
          minLength={6}
          autoComplete="new-password"
          autoFocus
        />
        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          icon={<Lock className="w-4 h-4" />}
          showPasswordToggle
          required
          minLength={6}
          autoComplete="new-password"
        />

        {error && (
          <div className="p-3 rounded-[var(--radius-md)] bg-danger/10 border border-danger/20 text-danger text-sm animate-scale-in">
            {error}
          </div>
        )}

        <Button type="submit" fullWidth loading={loading} className="h-11">
          Reset Password
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
