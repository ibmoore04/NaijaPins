import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { UserMembership } from '@/types/membership';
import { membershipService } from '@/services/membership.service';
import { DEFAULT_PLANS } from '@/services/plans.service';

interface MembershipContextType {
  membership: UserMembership | null;
  loading: boolean;
  isPremium: boolean;
  refreshMembership: () => Promise<void>;
  canCreateMemory: (currentCount: number) => boolean;
  maxPhotosPerMemory: number;
}

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

export const MembershipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [membership, setMembership] = useState<UserMembership | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMembership = useCallback(async () => {
    if (!user) {
      setMembership(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const data = await membershipService.getUserMembership(user.id);
    setMembership(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchMembership();
  }, [fetchMembership]);

  const isPremium =
    !!membership &&
    membership.status === 'active' &&
    (membership.plan_slug === 'premium-monthly' || membership.plan_slug === 'premium-yearly');

  const features = membership?.plan_features || DEFAULT_PLANS[0].features;

  const canCreateMemory = (currentCount: number) => {
    return currentCount < features.monthly_memory_limit;
  };

  const maxPhotosPerMemory = features.max_photos_per_memory || 3;

  return (
    <MembershipContext.Provider
      value={{
        membership,
        loading,
        isPremium,
        refreshMembership: fetchMembership,
        canCreateMemory,
        maxPhotosPerMemory,
      }}
    >
      {children}
    </MembershipContext.Provider>
  );
};

export const useMembership = () => {
  const context = useContext(MembershipContext);
  if (!context) {
    throw new Error('useMembership must be used within a MembershipProvider');
  }
  return context;
};
