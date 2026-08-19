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
  const newNotifs = notifications.filter((n) => !n.is_read);
  const earlierNotifs = notifications.filter((n) => n.is_read);

  const renderNotifItem = (n: NotificationItemData) => (
    <div
      key={n.id}
      className={`p-3.5 sm:p-4 rounded-2xl border transition-colors flex items-center justify-between gap-3 ${
        n.is_read ? 'bg-white border-gray-100' : 'bg-[#E8F5EE]/40 border-[#A3D9BC]/80 font-medium'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
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
            <Megaphone className="w-5 h-5" />
          ) : n.type === 'rejection' ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <FileText className="w-5 h-5" />
          )}
        </div>

        <div className="min-w-0 space-y-0.5">
          <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">{n.title}</h4>
          <p className="text-xs text-gray-600 line-clamp-1">{n.message}</p>
          <p className="text-[10px] text-gray-400 font-medium">
            {new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {!n.is_read && (
        <button
          onClick={() => handleMarkAsRead(n.id)}
          className="p-2 rounded-xl text-[#0B6B3A] hover:bg-[#E8F5EE] shrink-0 transition-colors"
          title="Mark as read"
        >
          <Check className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in font-body">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-black tracking-tight">Notifications</h1>
          <p className="text-xs text-gray-400 font-normal mt-0.5">
            Activity, approvals, and updates across your memories.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            leftIcon={<CheckCheck className="w-4 h-4 text-[#0B6B3A]" />}
            className="text-xs font-semibold rounded-xl"
          >
            Mark all read
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
        <div className="space-y-6">
          {/* New / Unread Group */}
          {newNotifs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider px-1">New</h3>
              <div className="space-y-2">
                {newNotifs.map(renderNotifItem)}
              </div>
            </div>
          )}

          {/* Earlier Group */}
          {earlierNotifs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Earlier</h3>
              <div className="space-y-2">
                {earlierNotifs.map(renderNotifItem)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
