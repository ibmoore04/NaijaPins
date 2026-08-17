import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { subscriptionsService, SubscriptionPreferences } from '@/services/subscriptions.service';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Mail, Check, AlertCircle, Loader2 } from 'lucide-react';

export const SubscriptionsPage: React.FC = () => {
  const { user } = useAuth();
  
  const [initialPrefs, setInitialPrefs] = useState<SubscriptionPreferences | null>(null);
  const [currentPrefs, setCurrentPrefs] = useState<{
    newsletter_subscribed: boolean;
    submission_updates: boolean;
    community_updates: boolean;
  }>({
    newsletter_subscribed: true,
    submission_updates: true,
    community_updates: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Fetch user's subscription preferences from Supabase on mount
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;
      setLoading(true);

      const prefs = await subscriptionsService.getSubscriptionPreferences(user.id);
      setInitialPrefs(prefs);
      setCurrentPrefs({
        newsletter_subscribed: prefs.newsletter_subscribed,
        submission_updates: prefs.submission_updates,
        community_updates: prefs.community_updates,
      });

      setLoading(false);
    };

    loadPreferences();
  }, [user]);

  // 2. Determine if user has made unsaved changes
  const hasChanges = initialPrefs
    ? currentPrefs.newsletter_subscribed !== initialPrefs.newsletter_subscribed ||
      currentPrefs.submission_updates !== initialPrefs.submission_updates ||
      currentPrefs.community_updates !== initialPrefs.community_updates
    : false;

  // 3. Handle Save Preferences click
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !hasChanges) return;

    setSaving(true);
    setSaveSuccess(false);
    setErrorMsg(null);

    const result = await subscriptionsService.saveSubscriptionPreferences(user.id, currentPrefs);

    if (result.success) {
      setInitialPrefs({
        user_id: user.id,
        ...currentPrefs,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setErrorMsg(result.error || 'Unable to save your subscription preferences. Please try again.');
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 text-[#0B6B3A] animate-spin" />
        <p className="text-sm font-semibold text-charcoal-dark">Loading subscription preferences...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">Communication Subscriptions</h1>
        <p className="text-xs sm:text-sm text-charcoal-muted font-normal mt-0.5">
          Manage your email digest and notification update preferences.
        </p>
      </div>

      <Card className="border border-border bg-white p-6 shadow-sm">
        <CardContent className="p-0 space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="w-10 h-10 rounded-full bg-[#E8F5EE] text-[#0B6B3A] flex items-center justify-center font-bold shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-black">Email & Digest Subscriptions</h3>
              <p className="text-xs text-charcoal-muted">Choose what emails you receive from NaijaPins.</p>
            </div>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Subscription preferences saved successfully.</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            {/* Option 1: Newsletter */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={currentPrefs.newsletter_subscribed}
                onChange={(e) =>
                  setCurrentPrefs({ ...currentPrefs, newsletter_subscribed: e.target.checked })
                }
                className="mt-1 accent-[#0B6B3A] w-4 h-4"
              />
              <div>
                <p className="text-xs font-bold text-black">NaijaPins Heritage Newsletter</p>
                <p className="text-xs text-charcoal-muted leading-relaxed">
                  Monthly digest of newly pinned historical memories and story highlights across Nigeria.
                </p>
              </div>
            </label>

            {/* Option 2: Submission Updates */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={currentPrefs.submission_updates}
                onChange={(e) =>
                  setCurrentPrefs({ ...currentPrefs, submission_updates: e.target.checked })
                }
                className="mt-1 accent-[#0B6B3A] w-4 h-4"
              />
              <div>
                <p className="text-xs font-bold text-black">Submission & Moderation Updates</p>
                <p className="text-xs text-charcoal-muted leading-relaxed">
                  Get notified when your memory pin submissions are reviewed or published.
                </p>
              </div>
            </label>

            {/* Option 3: Community Announcements */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={currentPrefs.community_updates}
                onChange={(e) =>
                  setCurrentPrefs({ ...currentPrefs, community_updates: e.target.checked })
                }
                className="mt-1 accent-[#0B6B3A] w-4 h-4"
              />
              <div>
                <p className="text-xs font-bold text-black">Community Announcements</p>
                <p className="text-xs text-charcoal-muted leading-relaxed">
                  Important announcements regarding new platform features and community guidelines.
                </p>
              </div>
            </label>

            {/* Informational Note */}
            <p className="text-[11px] text-charcoal-muted italic pt-1">
              These preferences control the emails and community updates you receive from NaijaPins. You can change them at any time.
            </p>

            {/* Primary Save Button */}
            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!hasChanges || saving}
                isLoading={saving}
                leftIcon={saveSuccess ? <Check className="w-4 h-4" /> : undefined}
                className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold px-6"
              >
                {saving
                  ? 'Saving...'
                  : saveSuccess
                  ? 'Saved ✓'
                  : 'Save Preferences'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
