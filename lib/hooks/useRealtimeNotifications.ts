/**
 * Custom hook for Realtime notification subscription using Supabase Realtime
 * Only subscribes to HIGH priority notifications to minimize free tier usage
 */
"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Notification {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  type: string;
  channel: string;
  status: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  is_read: boolean;
  created_at: string;
  related_order_id?: string;
}

export interface UseRealtimeNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

export function useRealtimeNotifications(): UseRealtimeNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch initial notifications and setup unread count
  const refreshNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/user', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const userNotifications = data.success ? data.data : [];
        setNotifications(userNotifications);

        // Calculate unread count
        const unread = userNotifications.filter((n: Notification) => !n.is_read && n.priority === 'HIGH').length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('[REALTIME] Failed to fetch notifications:', err);
      setError('Failed to load notifications');
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
           notif.id === id ? { ...notif, is_read: true } : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('[REALTIME] Failed to mark as read:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, is_read: true }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('[REALTIME] Failed to mark all as read:', err);
    }
  }, []);

  // Subscribe to HIGH priority notifications via Supabase Realtime
  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const setupRealtime = async () => {
      try {
        const supabase = createClient();

        channel = supabase
          .channel('high-priority-notifications')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notification_logs',
              filter: 'priority=eq.HIGH', // Only HIGH priority notifications
            },
            (payload) => {
              console.log('[REALTIME] HIGH priority notification received:', payload.new);

              const newNotification = payload.new as Notification;

              // Play notification sound
              playNotificationSound();

              // Show browser notification (if permission granted)
              showBrowserNotification(newNotification);

              // Update notifications list with new notification
              setNotifications(prev => [newNotification, ...prev]);

              // Increment unread count for HIGH priority
              setUnreadCount(prev => prev + 1);
            }
          )
          .subscribe((status) => {
            console.log('[REALTIME] Subscription status:', status);
            if (status === 'SUBSCRIBED') {
              setIsConnected(true);
            } else {
              console.warn('[REALTIME] Subscription failed, falling back to polling');
              setIsConnected(false);
              // Start polling as fallback
              startPolling();
            }
          });

        channelRef.current = channel;
      } catch (err) {
        console.error('[REALTIME] Failed to setup Realtime:', err);
        setError('Failed to setup real-time notifications');
        // Start polling as fallback
        startPolling();
      }
    };

    setupRealtime();

    // Cleanup function
    return () => {
      if (channel) {
        const supabase = createClient();
        supabase.removeChannel(channel);
        channelRef.current = null;
      }
      stopPolling();
    };
  }, [stopPolling]);

  // Fallback polling system (only runs if Realtime fails)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Move polling functions before useEffect to fix "accessed before declared" error
  const startPolling = useCallback(() => {
    // Don't start polling if already active
    if (pollingInterval) return;

    console.log('[REALTIME] Starting fallback polling (30-second intervals)');
    setPollingInterval(setInterval(() => {
      refreshNotifications();
    }, 30000)); // Poll every 30 seconds
  }, [refreshNotifications]);

  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [pollingInterval]);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.3; // Low volume
      audio.play().catch(err => console.log('[REALTIME] Sound play blocked:', err));
    } catch (err) {
      console.log('[REALTIME] Failed to play notification sound:', err);
    }
  };

  // Show browser notification
  const showBrowserNotification = (notification: Notification) => {
    if (Notification.permission !== 'granted') {
      // Request permission on first HIGH priority notification
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          // Permission granted, show notification
          displayNotification(notification);
        }
      });
    } else {
      displayNotification(notification);
    }
  };

  const displayNotification = (notification: Notification) => {
    try {
      const notif = new Notification(notification.subject, {
        body: notification.body,
        icon: '/icon-192.png', // App icon
        badge: '/badge-72.png', // Badge icon
        tag: notification.id,
        requireInteraction: true,
      });

      // Handle notification click
      notif.onclick = () => {
        window.focus();
        notif.close();
        // Navigate to notifications page
        const userRole = getUserRole(); // Implement this function based on auth
        const notificationsUrl = getNotificationsUrl(userRole);
        window.location.href = notificationsUrl;
      };

      // Auto-close after 10 seconds
      setTimeout(() => notif.close(), 10000);
    } catch (err) {
      console.log('[REALTIME] Failed to show browser notification:', err);
    }
  };

  // Get notifications URL based on user role
  const getNotificationsUrl = (role: string | null): string => {
    switch (role) {
      case 'ADMIN':
        return '/a/notifications';
      case 'EMPLOYEE':
        return '/e/notifications';
      case 'CLIENT':
        return '/c/notifications';
      default:
        return '/c/notifications';
    }
  };

  // Get user role from localStorage (set by auth)
  const getUserRole = (): string | null => {
    return localStorage.getItem('userRole') || null;
  };

  return {
    notifications,
    unreadCount,
    isConnected,
    error,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  };
}