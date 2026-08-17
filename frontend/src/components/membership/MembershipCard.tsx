import React from 'react';
import { Link } from 'react-router-dom';
import { useMembership } from '@/context/MembershipContext';
import { PremiumBadge } from './PremiumBadge';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export const MembershipCard: React.FC = () => {
  const { membership, isPremium } = useMembership();

  return (
    <Card className="border border-border bg-white p-5 shadow-xs">
      <CardContent className="p-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              isPremium
                ? 'bg-gradient-to-br from-amber-400 to-[#0B6B3A] text-white shadow-md'
                : 'bg-gray-100 text-charcoal-dark border border-border'
            }`}
          >
            {isPremium ? <Sparkles className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5 text-charcoal-muted" />}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-heading font-extrabold text-black">
                {membership?.plan_name || 'Free Contributor'}
              </h4>
              {isPremium && <PremiumBadge size="sm" />}
            </div>

            <p className="text-xs text-charcoal-muted font-medium">
              {isPremium
                ? `Active subscription until ${
                    membership?.current_period_end
                      ? new Date(membership.current_period_end).toLocaleDateString()
                      : 'end of period'
                  }`
                : 'Free tier (10 memories/mo & 3 photos/submission)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isPremium ? (
            <Link to="/dashboard/billing">
              <Button variant="outline" size="sm" className="text-xs font-bold">
                Manage Subscription
              </Button>
            </Link>
          ) : (
            <Link to="/premium">
              <Button
                variant="primary"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold text-xs"
              >
                Upgrade to Premium
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
