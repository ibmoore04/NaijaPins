import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { notificationsService, NotificationItem } from '@/services/notifications.service';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Bell, CheckCircle2 } from 'lucide-react';

export const AdminNotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    const data = await notificationsService.getNotifications(user.id);
    setNotifications(data);
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
  }, [user?.id]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    await notificationsService.markAllAsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <AdminPageHeader
        title="Admin Notifications & System Alerts"
        description="Platform operational notices, moderation triggers, user flags, and security events."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
            className="rounded-xl text-xs font-bold"
          >
            Mark All as Read
          </Button>
        }
      />

      <Card className="border border-border/80 bg-white rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-xs text-charcoal-muted">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#0B6B3A] flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-black">No unread notifications</p>
            <p className="text-xs text-charcoal-muted">You are up to date on all platform events.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 flex items-start gap-3.5 transition-colors ${
                  !n.is_read ? 'bg-emerald-50/40' : 'hover:bg-gray-50'
                }`}
              >
                <div className="p-2 rounded-xl bg-gray-100 text-charcoal-dark shrink-0 mt-0.5">
                  <Bell className="w-4 h-4 text-[#0B6B3A]" />
                </div>

                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-black">{n.title}</p>
                    <span className="text-[10px] text-charcoal-muted shrink-0">
                      {new Date(n.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-charcoal-dark leading-relaxed">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
