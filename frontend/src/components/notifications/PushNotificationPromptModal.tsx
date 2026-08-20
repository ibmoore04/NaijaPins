import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { pushNotificationService } from '@/services/pushNotification.service';
import { Bell, X, ShieldCheck } from 'lucide-react';

export const PushNotificationPromptModal: React.FC = () => {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check if push is supported and not already decided
    if (!pushNotificationService.isPushSupported()) return;

    const currentPermission = pushNotificationService.getPermissionState();
    if (currentPermission === 'granted' || currentPermission === 'denied') {
      // Auto-register worker in background if granted
      if (currentPermission === 'granted') {
        pushNotificationService.subscribeUser(user.id);
      }
      return;
    }

    // Check local storage to avoid spamming "Not Now" users
    const dismissedAt = localStorage.getItem(`np_push_prompt_dismissed_${user.id}`);
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSince < 3) return; // Wait 3 days before reminding
    }

    // Show prompt after brief delay
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, [user?.id]);

  const handleEnable = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const success = await pushNotificationService.subscribeUser(user.id);
      if (success) {
        setShowPrompt(false);
      } else {
        setShowPrompt(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    if (user) {
      localStorage.setItem(`np_push_prompt_dismissed_${user.id}`, Date.now().toString());
    }
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 max-w-sm w-full bg-white rounded-3xl p-5 shadow-2xl border border-emerald-100 animate-slide-up font-body select-none">
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#0B6B3A] flex items-center justify-center shrink-0 shadow-2xs">
          <Bell className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900">Stay Updated</h4>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 -mr-1 text-gray-400 hover:text-black transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Get instant alerts when someone messages or calls you on NaijaPins, even when you're off-site.
          </p>

          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={handleEnable}
              disabled={loading}
              className="flex-1 py-2 px-3 rounded-full bg-[#0B6B3A] hover:bg-[#064D2A] text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{loading ? 'Enabling...' : 'Enable Alerts'}</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="py-2 px-3 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold transition-colors cursor-pointer"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
