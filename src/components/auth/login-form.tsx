'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OAuthButton } from './oauth-button';
import { Mail, Lock } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, loading, error } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await signIn(email, password);
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your moodboard account
        </p>
      </div>

      {/* OAuth */}
      <OAuthButton />

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.08]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-3 text-muted">or continue with email</span>
        </div>
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
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock className="w-4 h-4" />}
          required
          autoComplete="current-password"
        />

        {error && (
          <div className="p-3 rounded-[var(--radius-md)] bg-danger/10 border border-danger/20 text-danger text-sm animate-scale-in">
            {error}
          </div>
        )}

        <Button type="submit" fullWidth loading={loading} className="h-11">
          Sign In
        </Button>
      </form>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          className="text-accent hover:text-accent-hover font-medium transition-colors"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
