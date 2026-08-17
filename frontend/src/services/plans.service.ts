import { supabase } from '@/lib/supabase';
import { Plan } from '@/types/membership';

export const DEFAULT_PLANS: Plan[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'Free Contributor',
    slug: 'free',
    description: 'Essential heritage memory pinning & community access across Nigeria.',
    price: 0,
    currency: 'NGN',
    billing_interval: 'free',
    features: {
      monthly_memory_limit: 10,
      max_photos_per_memory: 3,
      max_photo_size_mb: 5,
      advanced_analytics: false,
      premium_profile_badge: false,
      advanced_map_filters: false,
      featured_memory_eligibility: false,
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    name: 'Premium Monthly',
    slug: 'premium-monthly',
    description: 'High submission limits, advanced performance analytics, premium badge & priority discovery.',
    price: 2500,
    currency: 'NGN',
    billing_interval: 'month',
    features: {
      monthly_memory_limit: 100,
      max_photos_per_memory: 10,
      max_photo_size_mb: 15,
      advanced_analytics: true,
      premium_profile_badge: true,
      advanced_map_filters: true,
      featured_memory_eligibility: true,
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    name: 'Premium Yearly',
    slug: 'premium-yearly',
    description: 'Save 17% with annual billing! Full premium analytics, higher memory pinning & priority support.',
    price: 25000,
    currency: 'NGN',
    billing_interval: 'year',
    features: {
      monthly_memory_limit: 100,
      max_photos_per_memory: 10,
      max_photo_size_mb: 15,
      advanced_analytics: true,
      premium_profile_badge: true,
      advanced_map_filters: true,
      featured_memory_eligibility: true,
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const plansService = {
  async getPlans(): Promise<Plan[]> {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error || !data || data.length === 0) {
        return DEFAULT_PLANS;
      }

      return data as Plan[];
    } catch (err) {
      console.error('Error fetching plans:', err);
      return DEFAULT_PLANS;
    }
  },
};
