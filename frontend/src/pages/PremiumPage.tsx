import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMembership } from '@/context/MembershipContext';
import { Plan } from '@/types/membership';
import { plansService } from '@/services/plans.service';
import { paymentService } from '@/services/payment.service';
import { PricingCard } from '@/components/membership/PricingCard';
import { Card, CardContent } from '@/components/ui/Card';
import { Crown, Check, AlertCircle, X } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

export const PremiumPage: React.FC = () => {
  usePageTitle('Premium Heritage Membership');
  const { user } = useAuth();
  const { membership, refreshMembership } = useMembership();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadPlans = async () => {
      setLoading(true);
      const data = await plansService.getPlans();
      setPlans(data);
      setLoading(false);
    };

    loadPlans();
  }, []);

  const handleSelectPlan = async (plan: Plan) => {
    if (!user) {
      navigate('/dashboard');
      return;
    }

    if (plan.slug === 'free') {
      return;
    }

    setProcessingPlanId(plan.id);
    setErrorMsg(null);

    const result = await paymentService.initializePayment(user.id, user.email || '', plan);

    if (result.success) {
      await refreshMembership();
      navigate('/dashboard/billing');
    } else {
      setErrorMsg(result.error || 'Payment process cancelled or failed.');
    }

    setProcessingPlanId(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:px-6 lg:px-8 space-y-12 animate-fade-in">
      {/* Header Banner */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#E8F5EE] text-[#0B6B3A] text-xs font-semibold border border-[#A3D9BC]">
          <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-300" />
          <span>NaijaPins Membership</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-black tracking-tight leading-snug">
          Amplify Your Nigerian Heritage Contribution
        </h1>

        <p className="text-sm sm:text-base text-charcoal-dark leading-relaxed">
          Unlock higher memory submission limits, advanced analytics trends, premium contributor badges, and enhanced discovery tools.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl max-w-xl mx-auto flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Pricing Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={membership?.plan_id === plan.id}
              onSelectPlan={handleSelectPlan}
              isLoading={processingPlanId === plan.id}
            />
          ))}
        </div>
      )}

      {/* Feature Comparison Table */}
      <div className="space-y-6 pt-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-black">Detailed Feature Comparison</h2>
          <p className="text-xs text-charcoal-muted">Compare benefits across Free and Premium tiers</p>
        </div>

        <Card className="border border-border bg-white overflow-hidden shadow-xs">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-border font-semibold text-black">
                  <th className="p-4">Feature Capability</th>
                  <th className="p-4 text-center">Free Tier</th>
                  <th className="p-4 text-center text-[#0B6B3A] bg-[#E8F5EE]/40">Premium Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-charcoal-dark">
                <tr>
                  <td className="p-4 font-semibold">Monthly Memory Pin Submissions</td>
                  <td className="p-4 text-center">10 / month</td>
                  <td className="p-4 text-center font-bold text-[#0B6B3A] bg-[#E8F5EE]/20">100 / month</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Photos per Memory Submission</td>
                  <td className="p-4 text-center">Up to 3 photos</td>
                  <td className="p-4 text-center font-bold text-[#0B6B3A] bg-[#E8F5EE]/20">Up to 10 photos</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Interactive Map & Timeline Access</td>
                  <td className="p-4 text-center"><Check className="w-4 h-4 text-[#0B6B3A] mx-auto" /></td>
                  <td className="p-4 text-center bg-[#E8F5EE]/20"><Check className="w-4 h-4 text-[#0B6B3A] mx-auto" /></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Saved Memories Bookmarking</td>
                  <td className="p-4 text-center"><Check className="w-4 h-4 text-[#0B6B3A] mx-auto" /></td>
                  <td className="p-4 text-center bg-[#E8F5EE]/20"><Check className="w-4 h-4 text-[#0B6B3A] mx-auto" /></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Advanced Memory Analytics & Trends</td>
                  <td className="p-4 text-center text-charcoal-muted"><X className="w-4 h-4 text-charcoal-muted mx-auto" aria-label="Not included in free tier" /></td>
                  <td className="p-4 text-center bg-[#E8F5EE]/20"><Check className="w-4 h-4 text-[#0B6B3A] mx-auto font-bold" /></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Verified Premium Contributor Badge</td>
                  <td className="p-4 text-center text-charcoal-muted"><X className="w-4 h-4 text-charcoal-muted mx-auto" aria-label="Not included in free tier" /></td>
                  <td className="p-4 text-center bg-[#E8F5EE]/20"><Check className="w-4 h-4 text-[#0B6B3A] mx-auto font-bold" /></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Advanced Map & Era Filters</td>
                  <td className="p-4 text-center text-charcoal-muted"><X className="w-4 h-4 text-charcoal-muted mx-auto" aria-label="Not included in free tier" /></td>
                  <td className="p-4 text-center bg-[#E8F5EE]/20"><Check className="w-4 h-4 text-[#0B6B3A] mx-auto font-bold" /></td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
