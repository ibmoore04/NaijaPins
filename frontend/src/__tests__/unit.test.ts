import { describe, it, expect } from 'vitest';
import { DatePrecision, UserRole } from '@/types/database';

describe('NaijaPins Data Types & Formatters', () => {
  it('validates date precision type values', () => {
    const precisions: DatePrecision[] = ['EXACT_DATE', 'EXACT_YEAR', 'DECADE', 'DATE_RANGE'];
    expect(precisions).toHaveLength(4);
    expect(precisions).toContain('DECADE');
  });

  it('validates user role hierarchy', () => {
    const roles: UserRole[] = ['visitor', 'authenticated_user', 'moderator', 'admin'];
    expect(roles).toContain('moderator');
    expect(roles).toContain('admin');
  });

  it('formats year era display text accurately', () => {
    const formatEra = (year: number, precision: DatePrecision) => {
      if (precision === 'DECADE') {
        const decadeStart = Math.floor(year / 10) * 10;
        return `${decadeStart}s Era`;
      }
      return `${year} Era`;
    };

    expect(formatEra(1984, 'EXACT_YEAR')).toBe('1984 Era');
    expect(formatEra(1975, 'DECADE')).toBe('1970s Era');
  });
});
