import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { pushNotificationService, NotificationPreferences } from '@/services/pushNotification.service';
import {
  Settings,
  Shield,
  Key,
  LogOut,
  Check,
  AlertCircle,
  Bell,
  MessageSquare,
  Phone,
  Video,
  Sparkles,
  Loader2,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const [resetRequested, setResetRequested] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Push Notifications State
  const [pushSupported, setPushSupported] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    user_id: user?.id || '',
    messages_enabled: true,
    voice_calls_enabled: true,
    video_calls_enabled: true,
    social_enabled: true,
    email_notifications_enabled: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSavedMsg, setPrefsSavedMsg] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setPushSupported(pushNotificationService.isPushSupported());
    setPermissionState(pushNotificationService.getPermissionState());

    const loadPrefs = async () => {
      if (!user) return;
      const data = await pushNotificationService.getPreferences();
      if (data) setPrefs(data);
    };

    loadPrefs();
  }, [user?.id]);

  const handleSendTestPush = async () => {
    setTestingPush(true);
    setTestResult(null);
    try {
      const res = await pushNotificationService.sendTestNotification();
      setTestResult(res);
      setPermissionState(pushNotificationService.getPermissionState());
    } finally {
      setTestingPush(false);
    }
  };

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

  const handleTogglePushDevice = async () => {
    if (!user) return;
    setSavingPrefs(true);
    try {
      if (permissionState === 'granted') {
        await pushNotificationService.unsubscribeUser();
        setPermissionState('default');
      } else {
        const success = await pushNotificationService.subscribeUser(user.id);
        if (success) {
          setPermissionState('granted');
        } else {
          setPermissionState(pushNotificationService.getPermissionState());
        }
      }
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleTogglePreference = async (key: keyof NotificationPreferences) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSavingPrefs(true);
    setPrefsSavedMsg(false);

    try {
      await pushNotificationService.updatePreferences({ [key]: updated[key] });
      setPrefsSavedMsg(true);
      setTimeout(() => setPrefsSavedMsg(false), 2500);
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl font-body select-none">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">Account Settings</h1>
        <p className="text-xs sm:text-sm text-charcoal-muted font-normal mt-0.5">
          Manage your account security, push notifications, and device preferences.
        </p>
      </div>

      {/* 1. Push & Incoming Call Notifications */}
      <Card className="border border-border bg-white p-6 shadow-sm rounded-3xl">
        <CardContent className="p-0 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-black flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#0B6B3A]" />
              <span>Push Notifications & Call Alerts</span>
            </h3>

            {prefsSavedMsg && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>

          <p className="text-xs text-charcoal-muted">
            Configure how and when you receive real-time notifications on your browser or mobile device when you are off-site.
          </p>

          {/* Device Push Status Banner */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <p className="font-bold text-emerald-950">
                Device Notification Status: {permissionState === 'granted' ? 'Active ✓' : permissionState === 'denied' ? 'Blocked ✕' : 'Not Enabled'}
              </p>
              <p className="text-emerald-700">
                {permissionState === 'granted'
                  ? 'This device will receive background notifications when someone messages or calls you.'
                  : permissionState === 'denied'
                  ? 'Notifications are blocked in your browser settings. Please allow notifications in site settings.'
                  : 'Enable browser notifications to stay alerted when you are not actively on NaijaPins.'}
              </p>
            </div>

            {pushSupported && permissionState !== 'denied' && (
              <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendTestPush}
                  disabled={testingPush}
                  className="rounded-full font-bold text-xs border-[#0B6B3A] text-[#0B6B3A] hover:bg-emerald-50"
                >
                  {testingPush ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Testing...
                    </span>
                  ) : (
                    '⚡ Send Test Alert'
                  )}
                </Button>

                <Button
                  variant={permissionState === 'granted' ? 'outline' : 'primary'}
                  size="sm"
                  onClick={handleTogglePushDevice}
                  disabled={savingPrefs}
                  className="rounded-full font-bold text-xs"
                >
                  {savingPrefs ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : permissionState === 'granted' ? (
                    'Unsubscribe Device'
                  ) : (
                    'Enable Device Push'
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Test Push Result Alert */}
          {testResult && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2 animate-fade-in ${
                testResult.success
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <span className="text-sm shrink-0">{testResult.success ? '✅' : '⚠️'}</span>
              <div className="space-y-0.5 min-w-0">
                <p className="font-bold">{testResult.success ? 'Test Push Triggered' : 'Test Push Notice'}</p>
                <p className="text-[11px] leading-relaxed">{testResult.message}</p>
              </div>
            </div>
          )}

          {/* Category Toggles */}
          <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
            {/* Messages */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-gray-100/80 transition-colors">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-[#0B6B3A]" />
                <div>
                  <p className="font-bold text-gray-900">Direct Messages</p>
                  <p className="text-gray-500 text-[11px]">Receive push alerts when someone sends you a message</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.messages_enabled}
                onChange={() => handleTogglePreference('messages_enabled')}
                className="w-4 h-4 accent-[#0B6B3A] rounded cursor-pointer"
              />
            </div>

            {/* Voice Calls */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-gray-100/80 transition-colors">
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#0B6B3A]" />
                <div>
                  <p className="font-bold text-gray-900">Voice Calls</p>
                  <p className="text-gray-500 text-[11px]">Ring and alert for incoming voice calls</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.voice_calls_enabled}
                onChange={() => handleTogglePreference('voice_calls_enabled')}
                className="w-4 h-4 accent-[#0B6B3A] rounded cursor-pointer"
              />
            </div>

            {/* Video Calls */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-gray-100/80 transition-colors">
              <div className="flex items-center gap-2.5">
                <Video className="w-4 h-4 text-[#0B6B3A]" />
                <div>
                  <p className="font-bold text-gray-900">Video Calls</p>
                  <p className="text-gray-500 text-[11px]">Ring and alert for incoming video calls</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.video_calls_enabled}
                onChange={() => handleTogglePreference('video_calls_enabled')}
                className="w-4 h-4 accent-[#0B6B3A] rounded cursor-pointer"
              />
            </div>

            {/* Social Interactions */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-gray-100/80 transition-colors">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[#0B6B3A]" />
                <div>
                  <p className="font-bold text-gray-900">Likes, Comments & Reposts</p>
                  <p className="text-gray-500 text-[11px]">Notifications when contributors interact with your memory pins</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.social_enabled}
                onChange={() => handleTogglePreference('social_enabled')}
                className="w-4 h-4 accent-[#0B6B3A] rounded cursor-pointer"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Account Credentials */}
      <Card className="border border-border bg-white p-6 shadow-sm rounded-3xl">
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

      {/* 3. Privacy & Public Profile Visibility */}
      <Card className="border border-border bg-white p-6 shadow-sm rounded-3xl">
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

      {/* 4. Danger Zone */}
      <Card className="border border-red-200 bg-red-50/40 p-6 shadow-sm rounded-3xl">
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
