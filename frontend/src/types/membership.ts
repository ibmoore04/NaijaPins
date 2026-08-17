export type MembershipStatus = 'pending' | 'active' | 'cancelled' | 'expired' | 'failed';
export type BillingInterval = 'free' | 'month' | 'year' | 'lifetime';
export type TransactionStatus = 'pending' | 'success' | 'failed' | 'refunded';

export interface PlanFeatures {
  monthly_memory_limit: number;
  max_photos_per_memory: number;
  max_photo_size_mb: number;
  advanced_analytics: boolean;
  premium_profile_badge: boolean;
  advanced_map_filters: boolean;
  featured_memory_eligibility: boolean;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  billing_interval: BillingInterval;
  paystack_plan_code?: string | null;
  features: PlanFeatures;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserMembership {
  id: string;
  user_id: string;
  plan_id: string;
  status: MembershipStatus;
  provider: string;
  provider_customer_id?: string | null;
  provider_subscription_id?: string | null;
  current_period_start: string;
  current_period_end?: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  plan_slug?: string;
  plan_name?: string;
  plan_features?: PlanFeatures;
  plan?: Plan;
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  plan_id: string;
  provider: string;
  reference: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  provider_transaction_id?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined fields
  plan?: Plan;
}
