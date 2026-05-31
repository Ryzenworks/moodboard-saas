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
   * then performs a reliable DB update with retry.
   * Both must succeed for cross-browser/device correctness.
   */
  async completeOnboarding(userId: string): Promise<boolean> {
    // 1. Set cookie IMMEDIATELY — this is what the middleware reads
    if (typeof document !== 'undefined') {
      document.cookie = 'moodboard_onboarded=1; path=/; max-age=31536000; SameSite=Lax';
      console.log('[Profile] Onboarding cookie set ✓');
    }

    // 2. Reliable DB update — await with retry
    const supabase = createClient();
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('profiles') as any)
          .update({ onboarding_complete: true })
          .eq('id', userId);

        if (!error) {
          console.log('[Profile] DB onboarding update ✓');
          return true;
        }

        console.warn(`[Profile] DB onboarding update attempt ${attempt}/3 failed:`, error.message);
      } catch (err) {
        console.warn(`[Profile] DB onboarding update attempt ${attempt}/3 exception:`, err);
      }

      // Wait briefly before retry
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }

    // DB update failed after 3 attempts — cookie still works for this browser
    console.error('[Profile] DB onboarding update failed after 3 attempts. Cookie fallback in effect.');
    return false;
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
