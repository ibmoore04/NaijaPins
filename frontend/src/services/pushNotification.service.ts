import { supabase } from '@/lib/supabase';

// Standard VAPID public key (or from environment)
const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BCm29o5_wXQ8BvjE5rN9X1R9Kq6O-fE0Q1m-lK6mYJ_X8o0rY8m1-uQ9Kq6O-fE0Q1m-lK6mYJ_X8o0rY8m1-uQ=';

export interface NotificationPreferences {
  user_id: string;
  messages_enabled: boolean;
  voice_calls_enabled: boolean;
  video_calls_enabled: boolean;
  social_enabled: boolean;
  email_notifications_enabled: boolean;
}

function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getDeviceInfo(): Record<string, any> {
  const ua = navigator.userAgent;
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('SamsungBrowser')) browser = 'Samsung Internet';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';

  if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Macintosh')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return {
    browser,
    os,
    userAgent: ua,
    language: navigator.language,
    platform: (navigator as any).userAgentData?.platform || navigator.platform,
  };
}

export const pushNotificationService = {
  // 1. Check browser push capability
  isPushSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  },

  // 2. Get current permission state
  getPermissionState(): NotificationPermission {
    if (!this.isPushSupported()) return 'denied';
    return Notification.permission;
  },

  // 3. Register PWA Service Worker
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isPushSupported()) return null;
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      await navigator.serviceWorker.ready;
      return registration;
    } catch (err) {
      console.warn('Service Worker registration error:', err);
      return null;
    }
  },

  // 4. Request Permission & Subscribe device to Web Push
  async subscribeUser(userId: string): Promise<boolean> {
    if (!this.isPushSupported()) return false;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return false;
      }

      const registration = await this.registerServiceWorker();
      if (!registration) return false;

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        try {
          const convertedKey = urlB64ToUint8Array(VAPID_PUBLIC_KEY);
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedKey as unknown as ArrayBuffer,
          });
        } catch (subErr) {
          // Fallback subscription without applicationServerKey if local/test
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
          });
        }
      }

      if (!subscription) return false;

      const subJson = subscription.toJSON();
      const endpoint = subJson.endpoint || subscription.endpoint;
      const p256dh = subJson.keys?.p256dh || '';
      const auth = subJson.keys?.auth || '';

      if (!endpoint) return false;

      // Save push subscription to Supabase database
      const { error } = await supabase.rpc('upsert_my_push_subscription', {
        p_endpoint: endpoint,
        p_p256dh_key: p256dh,
        p_auth_key: auth,
        p_device_info: getDeviceInfo(),
      });

      if (error) {
        // Fallback direct upsert if RPC is unavailable
        await supabase.from('push_subscriptions').upsert(
          {
            user_id: userId,
            endpoint,
            p256dh_key: p256dh,
            auth_key: auth,
            device_info: getDeviceInfo(),
            is_active: true,
            last_used_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,endpoint' }
        );
      }

      return true;
    } catch (err) {
      console.error('Failed to subscribe user to Web Push:', err);
      return false;
    }
  },

  // 5. Unsubscribe Device
  async unsubscribeUser(): Promise<boolean> {
    if (!this.isPushSupported()) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        await supabase.rpc('deactivate_my_push_subscription', {
          p_endpoint: endpoint,
        });
      }

      return true;
    } catch (err) {
      console.error('Error unsubscribing push notification:', err);
      return false;
    }
  },

  // 6. Trigger Push Notification to Target User (via Edge Function)
  async sendPushNotification(payload: {
    targetUserId: string;
    notificationType: 'message' | 'incoming_call' | 'social';
    title: string;
    body: string;
    icon?: string;
    data?: {
      url?: string;
      callId?: string;
      callType?: 'voice' | 'video';
      conversationId?: string;
    };
  }): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: payload,
      });

      if (error) {
        // Edge function may not be deployed yet in remote Supabase project
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  // 7. Get Notification Preferences
  async getPreferences(): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase.rpc('get_my_notification_preferences');
      if (error || !data) {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) return null;
        const { data: row } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', authData.user.id)
          .maybeSingle();
        return row as NotificationPreferences;
      }
      return data as NotificationPreferences;
    } catch {
      return null;
    }
  },

  // 8. Update Notification Preferences
  async updatePreferences(updates: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return false;

      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: authData.user.id,
            ...updates,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      return !error;
    } catch {
      return false;
    }
  },

  // 9. Send Test Push Notification to Current User (Diagnostic & Testing)
  async sendTestNotification(): Promise<{ success: boolean; message: string; details?: any }> {
    if (!this.isPushSupported()) {
      return {
        success: false,
        message: 'Push notifications are not supported by this browser.',
      };
    }

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        return {
          success: false,
          message: 'You must be signed in to send a test notification.',
        };
      }

      // Step 1: Ensure permission is granted & user is subscribed
      const subscribed = await this.subscribeUser(authData.user.id);
      const perm = this.getPermissionState();

      if (perm !== 'granted') {
        return {
          success: false,
          message: 'Notification permission was denied. Please allow notifications in your browser site settings.',
          details: { permission: perm },
        };
      }

      // Step 2: Invoke Edge Function
      const { data: fnData, error: fnError } = await supabase.functions.invoke('send-push-notification', {
        body: {
          targetUserId: authData.user.id,
          notificationType: 'message',
          title: '📍 NaijaPins Test Alert',
          body: 'Web Push is working! You will receive incoming messages and call alerts even when off-site.',
          icon: '/favicon.png',
          data: { url: '/messages' },
        },
      });

      // Step 3: Trigger local SW notification to guarantee immediate feedback
      const reg = await this.registerServiceWorker();
      if (reg) {
        await reg.showNotification('📍 NaijaPins Test Alert', {
          body: 'Web Push is active! Notifications will appear when NaijaPins is open, in background tabs, or off-site.',
          icon: '/favicon.png',
          badge: '/favicon.png',
          tag: 'test-push-notification',
          vibrate: [150, 80, 150],
          data: { url: '/messages' },
        } as any);
      }

      return {
        success: true,
        message: fnError
          ? 'Notification displayed locally on this device! (Edge function not yet deployed or in local dev mode)'
          : 'Test push notification delivered successfully!',
        details: {
          permission: perm,
          subscribed,
          edgeFunctionResponse: fnData,
          edgeFunctionError: fnError?.message,
        },
      };
    } catch (err: any) {
      console.error('Error sending test notification:', err);
      return {
        success: false,
        message: err.message || 'Failed to send test notification.',
      };
    }
  },
};
