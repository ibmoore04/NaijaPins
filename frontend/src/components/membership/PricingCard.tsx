import React from 'react';
import { Plan } from '@/types/membership';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Check, Sparkles, ShieldCheck } from 'lucide-react';

interface PricingCardProps {
  plan: Plan;
  isCurrentPlan: boolean;
  onSelectPlan: (plan: Plan) => void;
  isLoading?: boolean;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  plan,
  isCurrentPlan,
  onSelectPlan,
  isLoading = false,
}) => {
  const isPremium = plan.slug !== 'free';

  return (
    <Card
      className={`relative p-6 border-2 transition-all flex flex-col justify-between ${
        isPremium
          ? 'border-[#0B6B3A] shadow-xl bg-white ring-1 ring-[#0B6B3A]/20'
          : 'border-border bg-gray-50/70 shadow-sm'
      }`}
    >
      {isPremium && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#0B6B3A] text-white text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-sm">
          <Sparkles className="w-3 h-3 text-amber-300" />
          <span>Most Popular</span>
        </div>
      )}

      <CardContent className="p-0 space-y-6">
        {/* Header */}
        <div className="space-y-2 text-center sm:text-left">
          <h3 className="text-xl font-heading font-extrabold text-black">{plan.name}</h3>
          <p className="text-xs text-charcoal-muted leading-relaxed min-h-[36px]">{plan.description}</p>
        </div>

        {/* Price */}
        <div className="py-2 border-y border-border text-center sm:text-left">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-heading font-extrabold text-black">
              ₦{plan.price.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-charcoal-muted">
              {plan.billing_interval === 'free'
                ? '/ forever'
                : plan.billing_interval === 'year'
                ? '/ year'
                : '/ month'}
            </span>
          </div>
        </div>

        {/* Features checklist */}
        <ul className="space-y-2.5 text-xs text-charcoal-dark">
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#0B6B3A] shrink-0 font-bold" />
            <span>Up to {plan.features.monthly_memory_limit} memory submissions per month</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#0B6B3A] shrink-0 font-bold" />
            <span>Up to {plan.features.max_photos_per_memory} photos per memory submission</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#0B6B3A] shrink-0 font-bold" />
            <span>Full interactive map & timeline discovery</span>
          </li>

          {plan.features.advanced_analytics ? (
            <li className="flex items-center gap-2 font-semibold text-black">
              <Check className="w-4 h-4 text-[#0B6B3A] shrink-0 font-bold" />
              <span>Advanced Memory Performance Analytics & Trends</span>
            </li>
          ) : (
            <li className="flex items-center gap-2 text-charcoal-muted line-through opacity-70">
              <span className="w-4 text-center shrink-0">—</span>
              <span>Advanced Memory Analytics</span>
            </li>
          )}

          {plan.features.premium_profile_badge ? (
            <li className="flex items-center gap-2 font-semibold text-black">
              <Check className="w-4 h-4 text-[#0B6B3A] shrink-0 font-bold" />
              <span>Verified Premium Contributor Badge</span>
            </li>
          ) : (
            <li className="flex items-center gap-2 text-charcoal-muted line-through opacity-70">
              <span className="w-4 text-center shrink-0">—</span>
              <span>Premium Contributor Badge</span>
            </li>
          )}

          {plan.features.advanced_map_filters ? (
            <li className="flex items-center gap-2 font-semibold text-black">
              <Check className="w-4 h-4 text-[#0B6B3A] shrink-0 font-bold" />
              <span>Advanced Map & Era Discovery Filters</span>
            </li>
          ) : (
            <li className="flex items-center gap-2 text-charcoal-muted line-through opacity-70">
              <span className="w-4 text-center shrink-0">—</span>
              <span>Advanced Map Filters</span>
            </li>
          )}
        </ul>

        {/* CTA Button */}
        <div className="pt-2">
          {isCurrentPlan ? (
            <Button
              variant="outline"
              size="md"
              disabled
              leftIcon={<ShieldCheck className="w-4 h-4 text-[#0B6B3A]" />}
              className="w-full justify-center bg-emerald-50 text-emerald-800 border-emerald-300 font-bold"
            >
              Current Active Plan
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={() => onSelectPlan(plan)}
              isLoading={isLoading}
              className={`w-full justify-center font-bold ${
                isPremium
                  ? 'bg-[#0B6B3A] hover:bg-[#064D2A] text-white shadow-md'
                  : 'bg-charcoal-dark hover:bg-black text-white'
              }`}
            >
              {isPremium ? `Upgrade to ${plan.name}` : 'Stay on Free Tier'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
