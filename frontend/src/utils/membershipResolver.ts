import { Plan } from '@/types/membership';

export interface RawMembershipRecord {
  id?: string;
  user_id?: string;
  status?: string | null;
  current_period_end?: string | null;
  created_at?: string;
  updated_at?: string;
  plan_slug?: string | null;
  plan_name?: string | null;
  plan?: Plan | { name?: string; slug?: string } | null;
}

export interface ResolvedUserMembership {
  planName: string;
  planSlug: string;
  status: string;
  isPremium: boolean;
  currentPeriodEnd: string | null;
}

/**
 * Evaluates whether an individual membership record represents an active Premium subscription.
 *
 * Rules:
 * - status = 'active'
 * - plans.slug IS NOT NULL and LOWER(plans.slug) <> 'free'
 * - current_period_end IS NULL or current_period_end > NOW()
 */
export function isMembershipPremium(record?: RawMembershipRecord | null): boolean {
  if (!record) return false;

  const status = (record.status || '').toLowerCase().trim();
  if (status !== 'active') return false;

  const planSlug = (
    (typeof record.plan === 'object' && record.plan?.slug) ||
    record.plan_slug ||
    ''
  )
    .toLowerCase()
    .trim();

  if (!planSlug || planSlug === 'free') return false;

  if (record.current_period_end) {
    const periodEnd = new Date(record.current_period_end);
    if (isNaN(periodEnd.getTime()) || periodEnd <= new Date()) {
      return false;
    }
  }

  return true;
}

/**
 * Resolves the effective membership for a user from one or more membership records.
 *
 * Priority Resolution Rules:
 * 1. Prefer active, non-expired paid memberships (isPremium = true).
 * 2. Prefer active memberships over cancelled/expired ones.
 * 3. Prefer the membership with the latest current_period_end / updated_at date.
 * 4. Only fall back to Free Tier when no valid active paid membership exists.
 *
 * @param userMemberships Single record, list of records, or null/undefined.
 */
export function resolveUserMembership(
  userMemberships?: RawMembershipRecord | RawMembershipRecord[] | null
): ResolvedUserMembership {
  if (!userMemberships) {
    return {
      planName: 'Free',
      planSlug: 'free',
      status: 'active',
      isPremium: false,
      currentPeriodEnd: null,
    };
  }

  const list: RawMembershipRecord[] = Array.isArray(userMemberships)
    ? userMemberships
    : [userMemberships];

  if (list.length === 0) {
    return {
      planName: 'Free',
      planSlug: 'free',
      status: 'active',
      isPremium: false,
      currentPeriodEnd: null,
    };
  }

  // Sort candidate memberships by priority
  const sorted = [...list].sort((a, b) => {
    const aPrem = isMembershipPremium(a) ? 1 : 0;
    const bPrem = isMembershipPremium(b) ? 1 : 0;
    if (aPrem !== bPrem) return bPrem - aPrem;

    const aActive = (a.status || '').toLowerCase() === 'active' ? 1 : 0;
    const bActive = (b.status || '').toLowerCase() === 'active' ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;

    const aTime = new Date(a.current_period_end || a.updated_at || a.created_at || 0).getTime();
    const bTime = new Date(b.current_period_end || b.updated_at || b.created_at || 0).getTime();
    return bTime - aTime;
  });

  const best = sorted[0];
  const isPrem = isMembershipPremium(best);

  const planName =
    (typeof best.plan === 'object' && best.plan?.name) ||
    best.plan_name ||
    (isPrem ? 'Premium' : 'Free');

  const planSlug =
    (typeof best.plan === 'object' && best.plan?.slug) ||
    best.plan_slug ||
    (isPrem ? 'premium' : 'free');

  return {
    planName: planName,
    planSlug: planSlug.toLowerCase(),
    status: best.status || 'active',
    isPremium: isPrem,
    currentPeriodEnd: best.current_period_end || null,
  };
}
