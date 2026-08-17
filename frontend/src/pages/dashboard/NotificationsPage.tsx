import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { notificationsService, NotificationItemData } from '@/services/notifications.service';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { Button } from '@/components/ui/Button';
import { Bell, Check, CheckCheck, FileText, AlertTriangle, Megaphone } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItemData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNotifs = async () => {
      if (!user) return;
      setLoading(true);
      const data = await notificationsService.getNotifications(user.id);
      setNotifications(data);
      setLoading(false);
    };

    loadNotifs();
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    if (!user) return;
    const success = await notificationsService.markAsRead(user.id, id);
    if (success) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    const success = await notificationsService.markAllAsRead(user.id);
    if (success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">Notifications</h1>
          <p className="text-xs sm:text-sm text-charcoal-muted font-normal mt-0.5">
            Stay updated on your submission approvals, status changes, and community news.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            leftIcon={<CheckCheck className="w-4 h-4 text-[#0B6B3A]" />}
          >
            Mark All as Read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="You're all caught up"
          description="There are no notifications to display right now."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-xl border transition-colors flex items-start justify-between gap-4 ${
                n.is_read ? 'bg-white border-border' : 'bg-[#E8F5EE]/40 border-[#A3D9BC]/80 font-medium'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    n.type === 'approval'
                      ? 'bg-emerald-100 text-emerald-700'
                      : n.type === 'rejection'
                      ? 'bg-red-100 text-red-700'
                      : n.type === 'announcement'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-charcoal-dark'
                  }`}
                >
                  {n.type === 'announcement' ? (
                    <Megaphone className="w-4 h-4" />
                  ) : n.type === 'rejection' ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </div>

                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-black">{n.title}</h4>
                  <p className="text-xs text-charcoal-dark leading-relaxed">{n.message}</p>
                  <p className="text-[11px] text-charcoal-muted pt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {!n.is_read && (
                <button
                  onClick={() => handleMarkAsRead(n.id)}
                  className="p-1.5 rounded-lg text-[#0B6B3A] hover:bg-[#E8F5EE] shrink-0"
                  title="Mark as read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
