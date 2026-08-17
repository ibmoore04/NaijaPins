import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMembership } from '@/context/MembershipContext';
import { paymentService } from '@/services/payment.service';
import { membershipService } from '@/services/membership.service';
import { PaymentTransaction } from '@/types/membership';
import { PremiumBadge } from '@/components/membership/PremiumBadge';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { CreditCard, ShieldCheck, ArrowRight, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const { membership, isPremium, refreshMembership } = useMembership();
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const loadBillingData = async () => {
      if (!user) return;
      setLoading(true);
      const txs = await paymentService.getUserTransactions(user.id);
      setTransactions(txs);
      setLoading(false);
    };

    loadBillingData();
  }, [user]);

  const handleCancelSubscription = async () => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to cancel automatic renewal? You will retain Premium benefits until the end of your billing cycle.')) return;

    setCancelling(true);
    setMsg(null);
    const success = await membershipService.cancelMembership(user.id);
    if (success) {
      await refreshMembership();
      setMsg({ type: 'success', text: 'Automatic renewal cancelled. Your Premium status remains active until your period end date.' });
    } else {
      setMsg({ type: 'error', text: 'Failed to update subscription. Please try again.' });
    }
    setCancelling(false);
  };

  const handleReactivateSubscription = async () => {
    if (!user) return;
    setCancelling(true);
    setMsg(null);
    const success = await membershipService.reactivateMembership(user.id);
    if (success) {
      await refreshMembership();
      setMsg({ type: 'success', text: 'Subscription renewal reactivated successfully!' });
    } else {
      setMsg({ type: 'error', text: 'Failed to reactivate subscription.' });
    }
    setCancelling(false);
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">Membership & Billing</h1>
        <p className="text-xs sm:text-sm text-charcoal-muted font-normal mt-0.5">
          View active membership tier, renewal status, and payment transaction history.
        </p>
      </div>

      {msg && (
        <div
          className={`p-3 text-xs rounded-xl flex items-center gap-2 ${
            msg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Active Membership Status Card */}
      <Card className="border border-border bg-white p-6 shadow-sm">
        <CardContent className="p-0 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F5EE] text-[#0B6B3A] flex items-center justify-center font-bold shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-semibold text-black">
                    {membership?.plan_name || 'Free Contributor'}
                  </h3>
                  {isPremium && <PremiumBadge size="sm" />}
                </div>
                <p className="text-xs text-charcoal-muted font-normal">
                  {isPremium
                    ? `Status: Active (${membership?.cancel_at_period_end ? 'Cancels at period end' : 'Auto-renews'})`
                    : 'Free Tier (Basic limits applied)'}
                </p>
              </div>
            </div>

            <Link to="/premium">
              <Button
                variant={isPremium ? 'outline' : 'primary'}
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className={!isPremium ? 'bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold' : ''}
              >
                {isPremium ? 'Change Plan' : 'Upgrade to Premium'}
              </Button>
            </Link>
          </div>

          {/* Details & Cancellation Actions */}
          <div className="space-y-4 text-xs">
            {isPremium ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl border border-border gap-3">
                <div>
                  <p className="font-bold text-black">Current Billing Period End</p>
                  <p className="text-charcoal-muted">
                    {membership?.current_period_end
                      ? new Date(membership.current_period_end).toLocaleDateString()
                      : 'End of active period'}
                  </p>
                </div>

                {membership?.cancel_at_period_end ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReactivateSubscription}
                    isLoading={cancelling}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5 text-[#0B6B3A]" />}
                  >
                    Reactivate Auto-Renewal
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelSubscription}
                    isLoading={cancelling}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Cancel Auto-Renewal
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-4 bg-[#E8F5EE]/40 border border-[#A3D9BC]/60 rounded-xl space-y-2">
                <p className="font-bold text-[#0B6B3A]">Unlock Premium Capabilities</p>
                <p className="text-charcoal-dark leading-relaxed">
                  Upgrade to Premium for 100 monthly memory submissions, 10 photos per memory, advanced performance analytics, and your verified contributor badge.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment History Section */}
      <div className="space-y-4 pt-2">
        <h3 className="text-lg font-heading font-bold text-black flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#0B6B3A]" />
          <span>Payment History</span>
        </h3>

        {transactions.length === 0 ? (
          <Card className="border border-border bg-white p-6 text-center text-xs text-charcoal-muted">
            No payment transactions recorded yet.
          </Card>
        ) : (
          <Card className="border border-border bg-white overflow-hidden shadow-xs">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-border font-bold text-black">
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Plan</th>
                    <th className="p-3.5">Reference</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-charcoal-dark">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="p-3.5 font-medium">{new Date(tx.created_at).toLocaleDateString()}</td>
                      <td className="p-3.5 font-bold text-black">{tx.plan?.name || 'Premium'}</td>
                      <td className="p-3.5 font-mono text-[11px] text-charcoal-muted">{tx.reference}</td>
                      <td className="p-3.5 font-bold text-black">₦{tx.amount.toLocaleString()}</td>
                      <td className="p-3.5 text-right">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            tx.status === 'success'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : tx.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
