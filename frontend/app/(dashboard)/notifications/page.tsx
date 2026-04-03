'use client';

import { useEffect, useMemo, useState, type ElementType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, ExternalLink, Briefcase, CalendarDays, FileText, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import api from '@/lib/axios';
import { toast } from 'react-hot-toast';
import { useNotificationStore } from '@/store/notificationStore';

type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  type: string;
  status: 'unread' | 'read' | 'archived';
  createdAt: string;
  data?: {
    url?: string;
    actionText?: string;
  };
};

const PAGE_SIZE = 10;

const typeIconMap: Record<string, ElementType> = {
  application_received: Briefcase,
  application_status_update: FileText,
  interview_scheduled: CalendarDays,
  interview_reminder: CalendarDays,
  job_recommended: Sparkles,
  message: MessageSquare,
  system: ShieldCheck,
  deadline_reminder: Bell,
  default: Bell,
};

const getIcon = (type: string) => typeIconMap[type] || typeIconMap.default;

const emptyIllustration = (
  <svg viewBox="0 0 420 220" className="mx-auto h-40 w-full max-w-sm text-text-tertiary/50" fill="none" aria-hidden="true">
    <rect x="60" y="40" width="300" height="140" rx="24" stroke="currentColor" strokeWidth="2" strokeDasharray="6 8" />
    <circle cx="128" cy="108" r="26" stroke="currentColor" strokeWidth="2" />
    <path d="M118 108l7 7 15-18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="178" y="82" width="120" height="12" rx="6" fill="currentColor" opacity="0.35" />
    <rect x="178" y="104" width="150" height="10" rx="5" fill="currentColor" opacity="0.2" />
    <rect x="178" y="126" width="90" height="10" rx="5" fill="currentColor" opacity="0.2" />
  </svg>
);

export default function NotificationsPage() {
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const notifications = useNotificationStore((state) => state.notifications);
  const setNotifications = useNotificationStore((state) => state.setNotifications);
  const markRead = useNotificationStore((state) => state.markRead);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/api/notifications?limit=${PAGE_SIZE}&page=${page}`);
      const list = res?.data?.data?.notifications || [];
      const normalized = list.map((notification: any) => ({
        _id: notification._id || notification.id,
        title: notification.title || 'Notification',
        message: notification.message || '',
        type: notification.type || 'system',
        status: notification.status || 'unread',
        createdAt: notification.createdAt || new Date().toISOString(),
        data: notification.data || {},
      }));
      setNotifications(normalized);
      setTotal(res?.data?.total || normalized.length);
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, [page]);

  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => filter === 'all' ? true : notification.status === filter),
    [notifications, filter]
  );

  const markOneRead = async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      markRead(id);
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const markAll = async () => {
    try {
      setIsMarkingAll(true);
      await api.patch('/api/notifications/read-all');
      markAllRead();
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight leading-none">
              Notifications
            </h1>
            <p className="text-text-secondary">Track all job and application updates in one place.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="default" className="bg-accent-primary/10 text-accent-primary border-accent-primary/20">
              {unreadCount} unread
            </Badge>
            <Button onClick={markAll} disabled={isMarkingAll || unreadCount === 0}>
              <CheckCheck size={16} />
              Mark all as read
            </Button>
          </div>
        </header>

        <Card className="border-border">
          <CardHeader className="space-y-4">
            <CardTitle className="text-white flex items-center gap-2">
              <Bell size={18} />
              Recent Notifications
            </CardTitle>

            <div className="flex flex-wrap gap-2">
              {(['all', 'unread', 'read'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${filter === item ? 'border-accent-primary bg-accent-primary/10 text-accent-primary' : 'border-border bg-bg-secondary/40 text-text-tertiary hover:text-white'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-24 rounded-2xl bg-bg-secondary/60 animate-pulse" />
                ))}
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-bg-secondary/30 px-6 py-14 text-center">
                {emptyIllustration}
                <h3 className="mt-4 text-lg font-bold text-white">No notifications here yet</h3>
                <p className="mt-2 text-sm text-text-secondary">New application and platform updates will appear here automatically.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence initial={false} mode="popLayout">
                  {visibleNotifications.map((notification) => {
                    const Icon = getIcon(notification.type);
                    return (
                      <motion.div
                        key={notification._id}
                        initial={{ opacity: 0, x: -20, scale: 0.98 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20, scale: 0.98 }}
                        className={`rounded-2xl border p-4 transition-colors ${notification.status === 'unread' ? 'border-accent-primary/40 bg-accent-primary/8 border-l-4 border-l-accent-primary' : 'border-border bg-bg-secondary/20'}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${notification.status === 'unread' ? 'bg-accent-primary/15 text-accent-primary' : 'bg-bg-elevated text-text-tertiary'}`}>
                            <Icon size={18} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-white">{notification.title}</p>
                                <p className="text-sm text-text-secondary leading-relaxed">{notification.message}</p>
                                <p className="text-xs text-text-tertiary">
                                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {notification.data?.url && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      window.location.href = notification.data?.url || '/';
                                    }}
                                  >
                                    <ExternalLink size={14} />
                                    {notification.data?.actionText || 'Open'}
                                  </Button>
                                )}

                                {notification.status === 'unread' && (
                                  <Button variant="secondary" size="sm" onClick={() => void markOneRead(notification._id)}>
                                    Mark read
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-4 text-sm text-text-secondary">
              <span>
                Showing {visibleNotifications.length} of {total}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
                  Previous
                </Button>
                <span className="rounded-full border border-border px-3 py-1 text-xs font-bold uppercase tracking-wider text-text-tertiary">
                  Page {page}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setPage((prev) => prev + 1)} disabled={page * PAGE_SIZE >= total}>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
