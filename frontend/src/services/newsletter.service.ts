import { supabase } from '@/lib/supabase';

export interface NewsletterSubscribeResult {
  success: boolean;
  message: string;
  error?: string;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const newsletterService = {
  async subscribe(email: string, source: string = 'homepage_footer'): Promise<NewsletterSubscribeResult> {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      return {
        success: false,
        message: 'Please enter a valid email address.',
        error: 'EMAIL_EMPTY',
      };
    }

    if (!EMAIL_REGEX.test(trimmedEmail) || trimmedEmail.includes('..') || trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) {
      return {
        success: false,
        message: 'Please enter a valid email address format (e.g. you@example.com).',
        error: 'EMAIL_INVALID',
      };
    }

    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert([
          {
            email: trimmedEmail,
            source,
            is_active: true,
          },
        ]);

      if (error) {
        // Unique violation (duplicate email) in Postgres
        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique')) {
          return {
            success: true,
            message: "You are already subscribed to NaijaPins updates!",
          };
        }

        console.error('[Newsletter subscribe error]:', error);
        return {
          success: false,
          message: 'Unable to complete subscription right now. Please try again.',
          error: error.message,
        };
      }

      return {
        success: true,
        message: "You're subscribed! Welcome to NaijaPins stories.",
      };
    } catch (err: any) {
      console.error('[Newsletter unexpected error]:', err);
      return {
        success: false,
        message: 'An unexpected error occurred. Please try again later.',
        error: err?.message || 'UNKNOWN_ERROR',
      };
    }
  },
};
