'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OAuthButton } from './oauth-button';
import { Mail, Lock, User } from 'lucide-react';

export function SignupForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const { signUp, loading, error } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await signUp(email, password, fullName);
    if (result.success) setSuccess(true);
  }

  if (success) {
    return (
      <div className="w-full max-w-sm mx-auto text-center space-y-4 animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
          <Mail className="w-8 h-8 text-accent" />
        </div>
        <h2 className="text-xl font-bold">Check your email</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We&apos;ve sent a confirmation link to{' '}
          <span className="text-white font-medium">{email}</span>.
          <br />
          Click it to activate your account.
        </p>
        <Link href="/login">
          <Button variant="secondary" className="mt-2">
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
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Start building your visual inspiration boards
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
          label="Full Name"
          type="text"
          placeholder="John Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          icon={<User className="w-4 h-4" />}
          required
          autoComplete="name"
        />
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
          placeholder="Min 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock className="w-4 h-4" />}
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
          Create Account
        </Button>
      </form>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
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
