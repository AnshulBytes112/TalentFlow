'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import api from '@/lib/axios';
import { toast } from 'react-hot-toast';

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  status: 'unread' | 'read' | 'archived';
  createdAt: string;
  data?: {
    url?: string;
  };
}

export default function NotificationsPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const unreadCount = useMemo(() => items.filter((n) => n.status === 'unread').length, [items]);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/api/notifications?limit=100&page=1');
      setItems(res?.data?.data?.notifications || []);
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      loadNotifications();
    }
  }, [session]);

  const markOneRead = async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, status: 'read' } : n)));
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllRead = async () => {
    try {
      setIsMarkingAll(true);
      await api.patch('/api/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, status: 'read' })));
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
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight leading-none">
              Notifications
            </h1>
            <p className="text-text-secondary mt-2">Track all job and application updates in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="default" className="bg-accent-primary/10 text-accent-primary border-accent-primary/20">
              {unreadCount} unread
            </Badge>
            <Button onClick={markAllRead} disabled={isMarkingAll || unreadCount === 0}>
              <CheckCheck size={16} />
              Mark all as read
            </Button>
          </div>
        </header>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Bell size={18} />
              Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && <p className="text-sm text-text-tertiary">Loading notifications...</p>}

            {!isLoading && items.length === 0 && (
              <p className="text-sm text-text-tertiary">No notifications yet.</p>
            )}

            {items.map((n) => (
              <div
                key={n._id}
                className={`border rounded-xl p-4 transition-colors ${
                  n.status === 'unread' ? 'border-accent-primary/40 bg-accent-primary/5' : 'border-border bg-bg-secondary/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">{n.title}</p>
                    <p className="text-sm text-text-secondary">{n.message}</p>
                    <p className="text-xs text-text-tertiary">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {n.data?.url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          window.location.href = n.data?.url || '/';
                        }}
                      >
                        <ExternalLink size={14} />
                        Open
                      </Button>
                    )}

                    {n.status === 'unread' && (
                      <Button variant="secondary" size="sm" onClick={() => markOneRead(n._id)}>
                        Mark read
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
