import { apiRequest } from "./api";

export interface NotificationItem {
  _id: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, any> | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsPage {
  notifications: NotificationItem[];
  unreadCount: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface NotificationsListResponse {
  success: boolean;
  data: NotificationsPage;
}

export async function getNotifications(
  page = 1,
  limit = 20
): Promise<NotificationsPage> {
  const response = await apiRequest<NotificationsListResponse>(
    `/mobile/notifications?page=${page}&limit=${limit}`
  );
  return response.data;
}

interface UnreadCountResponse {
  success: boolean;
  count: number;
}

export async function getUnreadCount(): Promise<number> {
  const response = await apiRequest<UnreadCountResponse>(
    "/mobile/notifications/unread-count"
  );
  return response.count;
}

interface MarkReadResponse {
  success: boolean;
  data: NotificationItem;
}

export async function markNotificationRead(
  notificationId: string
): Promise<NotificationItem> {
  const response = await apiRequest<MarkReadResponse>(
    `/mobile/notifications/${notificationId}/read`,
    { method: "PATCH" }
  );
  return response.data;
}

interface MarkAllReadResponse {
  success: boolean;
  message?: string;
}

export async function markAllNotificationsRead(): Promise<MarkAllReadResponse> {
  return apiRequest<MarkAllReadResponse>(
    "/mobile/notifications/mark-all-read",
    { method: "PATCH" }
  );
}
