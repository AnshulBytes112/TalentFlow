'use client';

import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useSocket } from '@/lib/socket';
import { NotificationItem, useNotificationStore } from '@/store/notificationStore';

const normalizeNotification = (notification: any): NotificationItem => ({
  _id: notification._id || notification.id,
  title: notification.title || 'Notification',
  message: notification.message || '',
  type: notification.type || 'system',
  status: notification.status || 'unread',
  createdAt: notification.createdAt || new Date().toISOString(),
  data: notification.data || {},
});

export const useNotifications = () => {
  const socket = useSocket();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const notifications = useNotificationStore((state) => state.notifications);
  const markRead = useNotificationStore((state) => state.markRead);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const setNotifications = useNotificationStore((state) => state.setNotifications);

  useEffect(() => {
    if (!socket) return;

    const handleIncomingNotification = (payload: any) => {
      const next = normalizeNotification(payload);
      addNotification(next);
      toast.success(next.title || 'New Notification', {
        icon: '🔔',
      });
    };

    socket.on('notification:new', handleIncomingNotification);
    socket.on('notification', handleIncomingNotification);

    return () => {
      socket.off('notification:new', handleIncomingNotification);
      socket.off('notification', handleIncomingNotification);
    };
  }, [socket, addNotification]);

  return {
    unreadCount,
    notifications,
    setNotifications,
    markRead,
    markAllRead,
  };
};
