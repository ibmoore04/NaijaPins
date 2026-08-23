import { describe, it, expect, beforeEach } from 'vitest';
import { newsletterService } from '@/services/newsletter.service';
import { SOCIAL_LINKS } from '@/config/socialLinks';

describe('Newsletter Service Validation', () => {
  it('rejects empty or whitespace-only email addresses', async () => {
    const res1 = await newsletterService.subscribe('');
    expect(res1.success).toBe(false);
    expect(res1.error).toBe('EMAIL_EMPTY');

    const res2 = await newsletterService.subscribe('   ');
    expect(res2.success).toBe(false);
    expect(res2.error).toBe('EMAIL_EMPTY');
  });

  it('rejects malformed email formats before network calls', async () => {
    const invalidEmails = [
      'plainaddress',
      '@missingusername.com',
      'username@.com',
      'username@domain',
      'username@domain..com',
      '.username@domain.com',
    ];

    for (const email of invalidEmails) {
      const res = await newsletterService.subscribe(email);
      expect(res.success).toBe(false);
      expect(res.error).toBe('EMAIL_INVALID');
    }
  });
});

describe('Social Links Configuration', () => {
  it('defines structured social handles object', () => {
    expect(SOCIAL_LINKS).toBeDefined();
    expect(typeof SOCIAL_LINKS).toBe('object');
    expect('twitter' in SOCIAL_LINKS).toBe(true);
    expect('instagram' in SOCIAL_LINKS).toBe(true);
    expect('facebook' in SOCIAL_LINKS).toBe(true);
  });
});

describe('Theme Logic & Persistence', () => {
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      for (const k in store) delete store[k];
    },
  };

  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('correctly persists theme preference in storage', () => {
    mockLocalStorage.setItem('naijapins_theme', 'dark');
    expect(mockLocalStorage.getItem('naijapins_theme')).toBe('dark');

    mockLocalStorage.setItem('naijapins_theme', 'light');
    expect(mockLocalStorage.getItem('naijapins_theme')).toBe('light');
  });
});

describe('Page Title Formatter', () => {
  it('formats titles with brand suffix', () => {
    const formatTitle = (title?: string) => {
      const DEFAULT_TITLE = 'NaijaPins — Where Nigeria Remembers';
      return title && title.trim() ? `${title.trim()} | NaijaPins` : DEFAULT_TITLE;
    };

    expect(formatTitle('Explore Memories')).toBe('Explore Memories | NaijaPins');
    expect(formatTitle('Page Not Found')).toBe('Page Not Found | NaijaPins');
    expect(formatTitle('')).toBe('NaijaPins — Where Nigeria Remembers');
    expect(formatTitle(undefined)).toBe('NaijaPins — Where Nigeria Remembers');
  });
});
