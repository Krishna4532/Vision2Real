/**
 * Vision2Real – useNotifications Hook (Stage 6.4 Refined)
 * Manages unread counters, notification list, filters, search, soft dismissal, bulk clear-read,
 * document title synchronization, smart 30s polling (with visibility pause/resume), and
 * multi-channel real-time sync via BroadcastChannel & storage events.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationApi, type NotificationItem, type NotificationListParams } from '@/services/api/notification';

export interface UseNotificationsReturn {
  notifications: NotificationItem[];
  unreadCount: number;
  total: number;
  totalPages: number;
  currentPage: number;
  isLoading: boolean;
  error: string | null;
  categoryFilter: string;
  readFilter: string; // 'ALL' | 'UNREAD' | 'READ'
  searchQuery: string;
  setCategoryFilter: (cat: string) => void;
  setReadFilter: (filter: string) => void;
  setSearchQuery: (q: string) => void;
  setPage: (page: number) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteReadNotifications: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  refresh: () => void;
}

const BROADCAST_CHANNEL_NAME = 'v2r_notifications';

export function useNotifications(initialParams: NotificationListParams = {}): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(initialParams.page || 1);
  const [categoryFilter, setCategoryFilterState] = useState<string>(initialParams.category || 'ALL');
  const [readFilter, setReadFilterState] = useState<string>('ALL');
  const [searchQuery, setSearchQueryState] = useState<string>(initialParams.search || '');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const baseTitleRef = useRef<string>(document.title);

  // Helper to notify other tabs
  const broadcastUpdate = useCallback(() => {
    try {
      localStorage.setItem('v2r_notifications_last_updated', Date.now().toString());
      if (channelRef.current) {
        channelRef.current.postMessage({ type: 'NOTIFICATIONS_UPDATED', timestamp: Date.now() });
      }
    } catch {
      // silent
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationApi.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // silent
    }
  }, []);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const isReadParam = readFilter === 'UNREAD' ? false : readFilter === 'READ' ? true : undefined;
      const catParam = categoryFilter !== 'ALL' ? categoryFilter : undefined;

      const res = await notificationApi.listNotifications(
        {
          category: catParam,
          is_read: isReadParam,
          search: searchQuery.trim() || undefined,
          page: currentPage,
          page_size: 15,
        },
        { signal: controller.signal }
      );

      if (controller.signal.aborted) return;

      setNotifications(res.items);
      setUnreadCount(res.unread_count);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err: any) {
      if (controller.signal.aborted) return;
      setError(err?.message || 'Failed to load notifications.');
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [categoryFilter, readFilter, searchQuery, currentPage]);

  // Initial load & params change
  useEffect(() => {
    fetchNotifications(false);
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchNotifications]);

  // Synchronize document title with unread counter (e.g. "(3) Founder Workspace")
  useEffect(() => {
    const rawTitle = baseTitleRef.current.replace(/^\(\d+\)\s*/, '');
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${rawTitle}`;
    } else {
      document.title = rawTitle;
    }
  }, [unreadCount]);

  // Smart 30-second polling (pauses when document is hidden)
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) {
        fetchNotifications(true);
        fetchUnreadCount();
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [fetchNotifications, fetchUnreadCount]);

  // Real-time synchronization listeners (BroadcastChannel + Storage + Focus + Visibility)
  useEffect(() => {
    if ('BroadcastChannel' in window) {
      channelRef.current = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channelRef.current.onmessage = (event) => {
        if (event.data?.type === 'NOTIFICATIONS_UPDATED') {
          fetchNotifications(true);
          fetchUnreadCount();
        }
      };
    }

    const handleFocus = () => {
      fetchNotifications(true);
      fetchUnreadCount();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(true);
        fetchUnreadCount();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'v2r_notifications_last_updated') {
        fetchNotifications(true);
        fetchUnreadCount();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('storage', handleStorage);
      channelRef.current?.close();
    };
  }, [fetchNotifications, fetchUnreadCount]);

  // Actions
  const markAsRead = useCallback(async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      await notificationApi.markAsRead(id);
      broadcastUpdate();
    } catch {
      fetchNotifications(true);
    }
  }, [fetchNotifications, broadcastUpdate]);

  const markAllAsRead = useCallback(async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      await notificationApi.markAllAsRead();
      broadcastUpdate();
    } catch {
      fetchNotifications(true);
    }
  }, [fetchNotifications, broadcastUpdate]);

  const deleteReadNotifications = useCallback(async () => {
    try {
      setNotifications((prev) => prev.filter((n) => !n.is_read));
      await notificationApi.deleteReadNotifications();
      broadcastUpdate();
    } catch {
      fetchNotifications(true);
    }
  }, [fetchNotifications, broadcastUpdate]);

  const dismissNotification = useCallback(async (id: string) => {
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      await notificationApi.dismissNotification(id);
      broadcastUpdate();
    } catch {
      fetchNotifications(true);
    }
  }, [fetchNotifications, broadcastUpdate]);

  const setCategoryFilter = useCallback((cat: string) => {
    setCategoryFilterState(cat);
    setCurrentPage(1);
  }, []);

  const setReadFilter = useCallback((filter: string) => {
    setReadFilterState(filter);
    setCurrentPage(1);
  }, []);

  const setSearchQuery = useCallback((q: string) => {
    setSearchQueryState(q);
    setCurrentPage(1);
  }, []);

  const setPage = useCallback((p: number) => {
    setCurrentPage(p);
  }, []);

  const refresh = useCallback(() => {
    fetchNotifications(false);
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    total,
    totalPages,
    currentPage,
    isLoading,
    error,
    categoryFilter,
    readFilter,
    searchQuery,
    setCategoryFilter,
    setReadFilter,
    setSearchQuery,
    setPage,
    markAsRead,
    markAllAsRead,
    deleteReadNotifications,
    dismissNotification,
    refresh,
  };
}
