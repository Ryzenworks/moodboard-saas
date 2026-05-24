import { createClient } from '@/lib/supabase/client';

export const profileService = {
  async getOnboardingStatus(userId: string): Promise<boolean> {
    // Fast path: check cookie first
    if (typeof document !== 'undefined' && document.cookie.includes('moodboard_onboarded=1')) {
      console.log('[Profile] Onboarding cookie found — skipping DB check');
      return true;
    }

    const supabase = createClient();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('profiles') as any)
        .select('onboarding_complete')
        .eq('id', userId)
        .single();
      if (error) {
        console.warn('[Profile] getOnboardingStatus error:', error.message);
        return true; // Fail open — don't block users
      }
      return data?.onboarding_complete ?? false;
    } catch (err) {
      console.warn('[Profile] getOnboardingStatus exception:', err);
      return true; // Fail open
    }
  },

  /**
   * Mark onboarding as complete.
   * Sets a client-side cookie immediately (middleware reads this),
   * then attempts DB update (may fail if column/migration missing — that's OK).
   */
  completeOnboarding(userId: string): boolean {
    // 1. Set cookie IMMEDIATELY — this is what the middleware reads
    if (typeof document !== 'undefined') {
      document.cookie = 'moodboard_onboarded=1; path=/; max-age=31536000; SameSite=Lax';
      console.log('[Profile] Onboarding cookie set ✓');
    }

    // 2. Attempt DB update in background — non-blocking
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('profiles') as any)
      .update({ onboarding_complete: true })
      .eq('id', userId)
      .then(({ error }: { error: { message: string } | null }) => {
        if (error) {
          console.warn('[Profile] DB onboarding update failed (non-critical):', error.message);
        } else {
          console.log('[Profile] DB onboarding update ✓');
        }
      })
      .catch((err: unknown) => {
        console.warn('[Profile] DB onboarding update exception:', err);
      });

    return true; // Always succeeds — cookie is the source of truth
  },

  async generateExtensionToken(userId: string): Promise<string> {
    const token = crypto.randomUUID();
    const supabase = createClient();
    try {
      console.log('[Profile] Generating extension token for:', userId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('profiles') as any)
        .update({
          extension_token: token,
          extension_token_created_at: new Date().toISOString(),
        })
        .eq('id', userId);
      if (error) {
        console.warn('[Profile] generateExtensionToken DB error:', error.message);
      }
      console.log('[Profile] Extension token generated:', token.substring(0, 8) + '...');
      return token;
    } catch (err) {
      console.warn('[Profile] generateExtensionToken exception:', err);
      return token;
    }
  },

  async revokeExtensionToken(userId: string): Promise<void> {
    const supabase = createClient();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('profiles') as any)
        .update({
          extension_token: null,
          extension_token_created_at: null,
        })
        .eq('id', userId);
      if (error) {
        console.warn('[Profile] revokeExtensionToken error:', error.message);
      }
    } catch (err) {
      console.warn('[Profile] revokeExtensionToken exception:', err);
    }
  },
};
