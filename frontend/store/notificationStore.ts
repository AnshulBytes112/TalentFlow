import { create } from 'zustand';

export type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  type: string;
  status: 'unread' | 'read' | 'archived';
  createdAt: string;
  data?: {
    url?: string;
    jobId?: string;
    applicationId?: string;
    actionText?: string;
    metadata?: Record<string, unknown>;
  };
};

type NotificationState = {
  unreadCount: number;
  notifications: NotificationItem[];
  setNotifications: (notifications: NotificationItem[]) => void;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  addNotification: (notification: NotificationItem) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

const getNotificationId = (notification: NotificationItem) => notification._id;

const countUnread = (notifications: NotificationItem[]) =>
  notifications.filter((notification) => notification.status === 'unread').length;

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  notifications: [],
  setNotifications: (notifications) => set({
    notifications,
    unreadCount: countUnread(notifications),
  }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  addNotification: (notification) => set((state) => {
    const existingIndex = state.notifications.findIndex((item) => getNotificationId(item) === getNotificationId(notification));
    const nextNotifications = existingIndex >= 0
      ? [notification, ...state.notifications.filter((item) => getNotificationId(item) !== getNotificationId(notification))]
      : [notification, ...state.notifications];

    return {
      notifications: nextNotifications.slice(0, 50),
      unreadCount: countUnread(nextNotifications),
    };
  }),
  markRead: (id) => set((state) => {
    const notifications = state.notifications.map((notification) => (
      getNotificationId(notification) === id
        ? { ...notification, status: 'read' as const }
        : notification
    ));

    return {
      notifications,
      unreadCount: countUnread(notifications),
    };
  }),
  markAllRead: () => set((state) => ({
    notifications: state.notifications.map((notification) => ({ ...notification, status: 'read' as const })),
    unreadCount: 0,
  })),
}));
