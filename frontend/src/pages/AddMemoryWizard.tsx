import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useMembership } from '@/context/MembershipContext';
import { QuickMemoryComposer } from '@/components/composer/QuickMemoryComposer';
import { FeatureGate } from '@/components/membership/FeatureGate';
import { Button } from '@/components/ui/Button';
import {
  MapPin,
  Sparkles,
  LogIn,
  ShieldCheck,
  X,
} from 'lucide-react';

export const DEFAULT_CATEGORIES = [
  { id: 'c0000000-0000-0000-0000-000000000001', name: 'Family', slug: 'family', icon: 'Users', description: 'Family stories, ancestry & reunions', is_active: true, created_at: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000002', name: 'School', slug: 'school', icon: 'GraduationCap', description: 'School days, alumni memories & campus life', is_active: true, created_at: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000003', name: 'Business', slug: 'business', icon: 'Briefcase', description: 'Commercial history, shops & enterprises', is_active: true, created_at: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000004', name: 'Food', slug: 'food', icon: 'Utensils', description: 'Local cuisine, joints & culinary traditions', is_active: true, created_at: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000005', name: 'Landmark', slug: 'landmark', icon: 'Landmark', description: 'Monuments, iconic buildings & public spaces', is_active: true, created_at: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000006', name: 'Community', slug: 'community', icon: 'Heart', description: 'Neighborhood history, town halls & street life', is_active: true, created_at: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000007', name: 'Culture', slug: 'culture', icon: 'Palette', description: 'Arts, festivals, music & traditional heritage', is_active: true, created_at: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000008', name: 'Event', slug: 'event', icon: 'Calendar', description: 'Historical gatherings, celebrations & matches', is_active: true, created_at: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000009', name: 'Historical', slug: 'historical', icon: 'History', description: 'National history & archival milestones', is_active: true, created_at: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000010', name: 'Personal', slug: 'personal', icon: 'User', description: 'Personal reflections & childhood memories', is_active: true, created_at: new Date().toISOString() },
];

interface AddMemoryWizardProps {
  onOpenAuthModal?: () => void;
}

export const AddMemoryWizard: React.FC<AddMemoryWizardProps> = ({ onOpenAuthModal }) => {
  const { user } = useAuth();
  const { canCreateMemory } = useMembership();
  const navigate = useNavigate();

  const [monthlyCount, setMonthlyCount] = useState<number>(0);
  const [limitChecked, setLimitChecked] = useState<boolean>(false);

  useEffect(() => {
    const checkMonthlyLimit = async () => {
      if (user) {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { count } = await supabase
          .from('memories')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', startOfMonth);

        setMonthlyCount(count || 0);
        setLimitChecked(true);
      }
    };
    checkMonthlyLimit();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto my-16 px-4 text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-[#E8F5EE] text-[#0B6B3A] flex items-center justify-center mx-auto shadow-xs">
          <LogIn className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-black">Sign In to Pin Your Story</h2>
          <p className="text-charcoal-dark text-sm max-w-md mx-auto leading-relaxed">
            NaijaPins requires a free community account to ensure authentic, attributed Nigerian heritage contributions.
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={onOpenAuthModal}
          leftIcon={<LogIn className="w-5 h-5" />}
          className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold"
        >
          Sign In or Register
        </Button>
      </div>
    );
  }

  // Monthly Limit Gate
  if (limitChecked && !canCreateMemory(monthlyCount)) {
    return (
      <div className="max-w-xl mx-auto my-12 px-4 animate-fade-in">
        <FeatureGate
          inline
          title="Monthly Submissions Limit Reached"
          description={`You have reached your free tier monthly submission limit (${monthlyCount}/10 memories). Upgrade to Premium to publish up to 100 memories per month with up to 10 photos per submission!`}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 animate-fade-in font-body">
      {/* Mobile-First Screen Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100 sm:border-0">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
          title="Close / Go Back"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h1 className="text-base sm:text-2xl font-heading font-extrabold text-black tracking-tight text-center">
          New Memory
        </h1>

        <button
          onClick={() => navigate('/dashboard/drafts')}
          className="text-xs sm:text-sm font-bold text-[#0B6B3A] hover:underline"
        >
          Drafts
        </button>
      </div>

      {/* Modern Quick Memory Composer */}
      <QuickMemoryComposer
        onPostSuccess={(slug) => navigate(`/memory/${slug}`)}
        autoFocus={true}
        className="border border-border shadow-md"
      />

      {/* Helpful Quick Tips Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        <div className="p-4 rounded-2xl bg-white border border-border/80 space-y-2 shadow-2xs">
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#0B6B3A] flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-black">Fast & Freeform</h4>
          <p className="text-[11px] text-charcoal-muted leading-relaxed">
            Write freely. We automatically generate a title for you if left blank, so you can focus on storytelling.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-border/80 space-y-2 shadow-2xs">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <MapPin className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-black">Geographic Pinning</h4>
          <p className="text-[11px] text-charcoal-muted leading-relaxed">
            Tag any Nigerian town, LGA, state, or landmark to place your memory onto the interactive map.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-border/80 space-y-2 shadow-2xs">
          <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-black">Privacy Control</h4>
          <p className="text-[11px] text-charcoal-muted leading-relaxed">
            Choose whether to share with the public Nigerian community or keep private to your personal archive.
          </p>
        </div>
      </div>
    </div>
  );
};
