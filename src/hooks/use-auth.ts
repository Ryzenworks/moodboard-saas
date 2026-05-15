'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth';

export function useAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clear = useAuthStore((s) => s.clear);

  const supabase = createClient();

  async function signUp(email: string, password: string, fullName: string) {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) throw authError;
      return { success: true, message: 'Check your email for a confirmation link.' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;
      router.push('/boards');
      router.refresh();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) throw authError;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign in failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    setLoading(true);
    await supabase.auth.signOut();
    clear();
    router.push('/login');
    router.refresh();
    setLoading(false);
  }

  return {
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    loading,
    error,
    setError,
  };
}
