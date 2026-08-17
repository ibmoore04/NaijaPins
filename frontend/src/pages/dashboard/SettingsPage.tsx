import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Settings, Shield, Key, LogOut, Check, AlertCircle } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const [resetRequested, setResetRequested] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setResetError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/dashboard/settings`,
    });

    if (!error) {
      setResetRequested(true);
    } else {
      setResetError(error.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">Account Settings</h1>
        <p className="text-xs sm:text-sm text-charcoal-muted font-normal mt-0.5">
          Manage your account security, authentication credentials, and preferences.
        </p>
      </div>

      {/* 1. Account Credentials */}
      <Card className="border border-border bg-white p-6 shadow-sm">
        <CardContent className="p-0 space-y-4">
          <h3 className="text-base font-semibold text-black flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#0B6B3A]" />
            <span>Account Security</span>
          </h3>

          <div className="space-y-3 pt-2 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-xl border border-border gap-2">
              <div>
                <p className="font-bold text-black">Email Address</p>
                <p className="text-charcoal-muted">{user?.email}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 self-start sm:self-auto text-[11px]">
                Verified Account
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-xl border border-border gap-2">
              <div>
                <p className="font-bold text-black">Password</p>
                <p className="text-charcoal-muted">Request a secure password reset link sent to your email.</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePasswordReset}
                leftIcon={<Key className="w-4 h-4 text-[#0B6B3A]" />}
                className="self-start sm:self-auto"
              >
                Reset Password
              </Button>
            </div>

            {resetRequested && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Password reset link sent to {user?.email}! Please check your inbox.</span>
              </div>
            )}

            {resetError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Privacy & Public Profile Visibility */}
      <Card className="border border-border bg-white p-6 shadow-sm">
        <CardContent className="p-0 space-y-4">
          <h3 className="text-base font-heading font-bold text-black flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#0B6B3A]" />
            <span>Privacy & Public Contributor Profile</span>
          </h3>

          <div className="space-y-3 pt-1 text-xs text-charcoal-dark">
            <p>
              Your public contributor profile displays your name, bio, and pinned public memories. Account credentials such as email and password remain strictly private and protected by Supabase Row Level Security (RLS).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 3. Danger Zone */}
      <Card className="border border-red-200 bg-red-50/40 p-6 shadow-sm">
        <CardContent className="p-0 space-y-4">
          <h3 className="text-base font-heading font-bold text-red-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span>Session & Account Danger Zone</span>
          </h3>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="text-xs">
              <p className="font-bold text-black">Sign Out of Session</p>
              <p className="text-charcoal-muted">Sign out of your active NaijaPins session on this device.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut()}
              leftIcon={<LogOut className="w-4 h-4 text-red-600" />}
              className="text-red-700 border-red-300 hover:bg-red-100 self-start sm:self-auto"
            >
              Sign Out Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
