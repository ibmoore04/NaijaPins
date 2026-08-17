import { supabase } from '@/lib/supabase';
import { Plan, PaymentTransaction } from '@/types/membership';

// Public Paystack Key (Safe for frontend init)
const PAYSTACK_PUBLIC_KEY =
  import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_05b08024001c6ff13354a9823702866e91afe7ab';

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: any) => { openIframe: () => void };
    };
  }
}

export const paymentService = {
  async initializePayment(
    userId: string,
    email: string,
    plan: Plan
  ): Promise<{ success: boolean; reference?: string; error?: string }> {
    try {
      const reference = `NP_${plan.slug.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      // 1. Create Pending Transaction Record
      const { error: txErr } = await supabase.from('payment_transactions').insert({
        user_id: userId,
        plan_id: plan.id,
        provider: 'paystack',
        reference: reference,
        amount: plan.price,
        currency: plan.currency || 'NGN',
        status: 'pending',
        metadata: { plan_slug: plan.slug, plan_name: plan.name },
      });

      if (txErr) {
        console.warn('Could not store initial transaction record:', txErr.message);
      }

      // 2. Dynamically Load Paystack JS Inline Script if needed
      if (!window.PaystackPop) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://js.paystack.co/v1/inline.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Paystack checkout script.'));
          document.body.appendChild(script);
        });
      }

      return new Promise((resolve) => {
        const handleSuccess = function (response: any) {
          const ref = response?.reference || response?.trxref || reference;
          paymentService
            .verifyAndActivatePayment(ref, userId, plan)
            .then((res) => resolve(res))
            .catch((err) => resolve({ success: false, error: err.message }));
        };

        const handleClose = function () {
          resolve({ success: false, error: 'Payment window closed by user.' });
        };

        const handler = window.PaystackPop?.setup({
          key: PAYSTACK_PUBLIC_KEY,
          email: email,
          amount: Math.round(plan.price * 100), // Paystack expects amount in Kobo
          currency: plan.currency || 'NGN',
          ref: reference,
          metadata: {
            custom_fields: [
              {
                display_name: 'Plan Name',
                variable_name: 'plan_name',
                value: plan.name,
              },
              {
                display_name: 'User ID',
                variable_name: 'user_id',
                value: userId,
              },
            ],
          },
          callback: handleSuccess,
          onSuccess: handleSuccess,
          onClose: handleClose,
          onCancel: handleClose,
        });

        handler?.openIframe();
      });
    } catch (err: any) {
      console.error('Error initializing payment:', err);
      return {
        success: false,
        error: err.message || 'Failed to initialize payment gateway.',
      };
    }
  },

  async verifyAndActivatePayment(
    reference: string,
    userId: string,
    plan: Plan
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. First try the atomic SECURITY DEFINER RPC function
      const { data: rpcSuccess, error: rpcError } = await supabase.rpc('record_and_activate_payment', {
        p_user_id: userId,
        p_plan_id: plan.id,
        p_reference: reference,
        p_amount: plan.price,
        p_provider: 'paystack',
        p_metadata: { plan_slug: plan.slug, plan_name: plan.name },
      });

      if (!rpcError && rpcSuccess) {
        return { success: true };
      }

      if (rpcError) {
        console.warn('RPC payment activation fallback to direct queries:', rpcError.message);
      }

      // 2. Direct Query Fallback
      // Update Payment Transaction status to success
      await supabase
        .from('payment_transactions')
        .update({
          status: 'success',
          updated_at: new Date().toISOString(),
        })
        .eq('reference', reference);

      // Compute current period end date
      const now = new Date();
      const periodEnd = new Date(now);
      if (plan.billing_interval === 'year') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      // Upsert User Membership record to ACTIVE
      const { error: memErr } = await supabase.from('user_memberships').upsert(
        {
          user_id: userId,
          plan_id: plan.id,
          status: 'active',
          provider: 'paystack',
          provider_subscription_id: reference,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          updated_at: now.toISOString(),
        },
        { onConflict: 'user_id' }
      );

      if (memErr) {
        throw new Error('Failed to activate membership record: ' + memErr.message);
      }

      // Send Welcome Notification (non-blocking)
      try {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'announcement',
          title: '🌟 Welcome to NaijaPins Premium!',
          message: `Your ${plan.name} subscription is now active until ${periodEnd.toLocaleDateString()}. Enjoy higher memory submission limits, advanced analytics, and your Premium profile badge!`,
        });
      } catch {
        // Notification failure shouldn't block activation
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error verifying payment:', err);
      return {
        success: false,
        error: err.message || 'Payment verification failed.',
      };
    }
  },

  async getUserTransactions(userId: string): Promise<PaymentTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*, plan:plans(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error || !data) {
        return [];
      }

      return data as PaymentTransaction[];
    } catch (err) {
      console.error('Error fetching transactions:', err);
      return [];
    }
  },
};
