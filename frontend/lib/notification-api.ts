const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export interface AppNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export async function fetchNotifications(token: string): Promise<{
  notifications: AppNotification[];
  unreadCount: number;
}> {
  const res = await fetch(`${API_URL}/api/notifications`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return await res.json();
}

export async function markNotificationAsRead(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/notifications/${id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to mark notification as read');
}

export async function markAllNotificationsAsRead(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/notifications/read-all`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to mark all as read');
}
