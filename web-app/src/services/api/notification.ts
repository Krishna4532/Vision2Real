/**
 * Vision2Real – Notification API Client
 * Frontend service methods for managing notifications, unread counters, preferences,
 * push subscriptions, and VAPID keys.
 */

import { apiClient } from './client';
import { API_PREFIX } from './config';

export type NotificationCategory = 'VALIDATION' | 'REALITY_SPRINT' | 'BUILD_REQUEST' | 'MARKETING' | 'SYSTEM';
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH';
export type NotificationStatus = 'ACTIVE' | 'EXPIRED';

export interface NotificationItem {
  id: string;
  founder_id: string;
  notification_type: string;
  category: NotificationCategory;
  title: string;
  body: string;
  deep_link: string;
  action_label: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  source_module?: string | null;
  source_record_id?: string | null;
  is_read: boolean;
  read_at?: string | null;
  is_dismissed: boolean;
  dismissed_at?: string | null;
  expires_at?: string | null;
  extra_metadata: Record<string, any>;
  created_at: string;
}

export interface NotificationListParams {
  category?: string;
  is_read?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  unread_count: number;
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface NotificationPreference {
  founder_id: string;
  browser_push_enabled: boolean;
  email_enabled: boolean;
  validation_notifications: boolean;
  sprint_notifications: boolean;
  build_notifications: boolean;
  marketing_notifications: boolean;
  system_notifications: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  notification_frequency: 'INSTANT' | 'DAILY_DIGEST' | 'WEEKLY_DIGEST';
  updated_at: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent?: string;
}

export const notificationApi = {
  /**
   * Fetch founder's notification list with optional filtering, search, and pagination.
   */
  async listNotifications(params: NotificationListParams = {}, options?: { signal?: AbortSignal }): Promise<NotificationListResponse> {
    const res = await apiClient.get<NotificationListResponse>(`${API_PREFIX}/notifications`, {
      params,
      signal: options?.signal,
    });
    return res.data;
  },

  /**
   * Get instant unread notification count.
   */
  async getUnreadCount(options?: { signal?: AbortSignal }): Promise<number> {
    const res = await apiClient.get<{ unread_count: number }>(`${API_PREFIX}/notifications/unread-count`, {
      signal: options?.signal,
    });
    return res.data.unread_count;
  },

  /**
   * Mark a single notification as read.
   */
  async markAsRead(id: string): Promise<NotificationItem> {
    const res = await apiClient.patch<NotificationItem>(`${API_PREFIX}/notifications/${id}/read`);
    return res.data;
  },

  /**
   * Mark all active notifications as read.
   */
  async markAllAsRead(): Promise<{ marked_read_count: number }> {
    const res = await apiClient.patch<{ marked_read_count: number }>(`${API_PREFIX}/notifications/read-all`);
    return res.data;
  },

  /**
   * Bulk-dismiss all read notifications for founder.
   */
  async deleteReadNotifications(): Promise<{ deleted_count: number }> {
    const res = await apiClient.delete<{ deleted_count: number }>(`${API_PREFIX}/notifications/read`);
    return res.data;
  },

  /**
   * Soft-dismiss a notification from the list.
   */
  async dismissNotification(id: string): Promise<void> {
    await apiClient.delete(`${API_PREFIX}/notifications/${id}`);
  },

  /**
   * Fetch founder's notification preferences.
   */
  async getPreferences(): Promise<NotificationPreference> {
    const res = await apiClient.get<NotificationPreference>(`${API_PREFIX}/notifications/preferences`);
    return res.data;
  },

  /**
   * Update founder's notification preferences.
   */
  async updatePreferences(updates: Partial<NotificationPreference>): Promise<NotificationPreference> {
    const res = await apiClient.patch<NotificationPreference>(`${API_PREFIX}/notifications/preferences`, updates);
    return res.data;
  },

  /**
   * Save Web Push subscription to backend.
   */
  async savePushSubscription(data: PushSubscriptionData): Promise<void> {
    await apiClient.post(`${API_PREFIX}/notifications/subscriptions`, data);
  },

  /**
   * Unregister Web Push subscription from backend.
   */
  async deletePushSubscription(endpoint: string): Promise<void> {
    await apiClient.delete(`${API_PREFIX}/notifications/subscriptions`, {
      params: { endpoint },
    });
  },

  /**
   * Trigger a test push notification.
   */
  async sendTestNotification(title?: string, body?: string): Promise<NotificationItem> {
    const res = await apiClient.post<NotificationItem>(`${API_PREFIX}/notifications/test-notification`, { title, body });
    return res.data;
  },

  /**
   * Get VAPID public key for Web Push browser subscription.
   */
  async getVapidPublicKey(): Promise<string> {
    const res = await apiClient.get<{ public_key: string }>(`${API_PREFIX}/notifications/vapid-public-key`);
    return res.data.public_key;
  },
};
