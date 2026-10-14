'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  AppNotification,
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/notification-api';

export function useNotifications() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const data = await fetchNotifications(token);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Ignore background fetch failure
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const markRead = async (id: string) => {
    if (!token) return;
    await markNotificationAsRead(token, id);
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    if (!token) return;
    await markAllNotificationsAsRead(token);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
    refresh: loadNotifications,
  };
}
