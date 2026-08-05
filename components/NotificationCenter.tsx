/**
 * Priority-based Notification Center Component
 * Works across all panels (Admin/Client/Employee)
 * Shows real-time HIGH priority notifications immediately
 * Displays MEDIUM/LOW priority notifications on load
 */

"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { Bell, Check, Trash2, AlertCircle, Clock, Loader2, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRealtimeNotifications, Notification } from '@/lib/hooks/useRealtimeNotifications';

interface NotificationCenterProps {
  userRole: 'ADMIN' | 'CLIENT' | 'EMPLOYEE';
  className?: string;
  userId?: string;
}

export default function NotificationCenter({ userRole, className = '', userId }: NotificationCenterProps) {
  const { t, i18n } = useTranslation('notifications');
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [userLanguage, setUserLanguage] = useState<'en' | 'it'>(i18n.language === 'it' ? 'it' : 'en');
  const isPending = useTransition();

  const {
    notifications,
    unreadCount,
    isConnected,
    error,
    markAsRead,
    markAllAsRead,
    refreshNotifications
  } = useRealtimeNotifications();

  // Filter notifications by priority
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'ALL') return true;
    return notification.priority === filter;
  });

  // Sort notifications: HIGH priority first, then by date
  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    // Sort by priority (HIGH first)
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch('/api/notifications/delete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });

      if (response.ok) {
        await refreshNotifications();
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleLanguageChange = async (language: 'en' | 'it') => {
    try {
      setUserLanguage(language);
      setLanguageMenuOpen(false);

      // Update UI language immediately
      if (i18n.language !== language) {
        await i18n.changeLanguage(language);
      }

      // Update user's preference in database if userId is provided
      if (userId) {
        try {
          await fetch('/api/user/language', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, language }),
          });
        } catch (err) {
          console.warn('Failed to save language preference:', err);
        }
      }

      // Refresh notifications to get translated content
      await refreshNotifications();
    } catch (err) {
      console.error('Failed to change language:', err);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'MEDIUM':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
      case 'LOW':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return <AlertCircle className="h-4 w-4" />;
      case 'MEDIUM':
        return <Clock className="h-4 w-4" />;
      case 'LOW':
        return <Bell className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    if (diffMs < 60000) return t('just_now', { defaultValue: 'Just now' });
    if (diffMs < 3600000) return t('minutes_ago', { defaultValue: 'minutes ago' }, Math.floor(diffMs / 60000));
    if (diffMs < 86400000) return t('hours_ago', { defaultValue: 'hours ago' }, Math.floor(diffMs / 3600000));
    return t('days_ago', { defaultValue: 'days ago' }, Math.floor(diffMs / 86400000));
  };

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Button with Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-[#168BB0]' : 'text-zinc-500'}`} />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping">
              <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          </span>
        )}

        {/* Realtime Connection Status */}
        {isConnected && (
          <span className="absolute -bottom-0 -right-0 h-2 w-2 rounded-full bg-green-500" title="Real-time connected" />
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {t('notifications_title', { defaultValue: 'Notifications' })}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            {/* Priority Filter Tabs */}
            <div className="flex gap-1 mt-2">
              {['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const priority => (
                <button
                  key={priority}
                  onClick={() => setFilter(priority as typeof filter)}
                  className={`px-3 py-1 text-[10px] font-medium rounded-md transition-colors ${
                    filter === priority
                      ? 'bg-[#168BB0] text-white'
                      : 'text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {priority}
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="text-[11px] text-[#168BB0] hover:text-[#0F7493] font-medium"
              >
                {isDropdownOpen ? 'Hide Filters' : 'Show Filters'}
              </button>

              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
                  className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1"
                  title="Change notification language"
                >
                  <Globe className="h-3 w-3" />
                  {userLanguage === 'it' ? '🇮🇹 IT' : '🇬🇧 EN'}
                </button>

                {languageMenuOpen && (
                  <div className="absolute right-0 mt-2 w-24 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-800 z-50">
                    <button
                      onClick={() => handleLanguageChange('en')}
                      className={`w-full px-3 py-2 text-xs text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-t-lg ${
                        userLanguage === 'en' ? 'bg-zinc-100 dark:bg-zinc-800' : ''
                      }`}
                    >
                      🇬🇧 English
                    </button>
                    <button
                      onClick={() => handleLanguageChange('it')}
                      className={`w-full px-3 py-2 text-xs text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-b-lg ${
                        userLanguage === 'it' ? 'bg-zinc-100 dark:bg-zinc-800' : ''
                      }`}
                    >
                      🇮🇹 Italiano
                    </button>
                  </div>
                )}
              </div>

              {sortedNotifications.length > 0 && unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  {t('mark_all_read', { defaultValue: 'Mark all read' })}
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {error ? (
              <div className="p-4 text-center text-red-500 text-sm">
                {error}
              </div>
            ) : sortedNotifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-sm">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                {t('no_notifications', { defaultValue: 'No notifications yet' })}
              </div>
            ) : (
              sortedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Priority Icon */}
                    <div className={`p-1 rounded ${getPriorityBadge(notification.priority)}`}>
                      {getPriorityIcon(notification.priority)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-xs font-bold ${
                          notification.is_read ? 'text-zinc-600' : 'text-zinc-900 dark:text-zinc-100'
                        }`}>
                          {notification.subject}
                        </h4>
                        {!notification.is_read && (
                          <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-600 dark:text-zinc-400 line-clamp-2">
                        {notification.body}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-zinc-400">
                          {formatTime(notification.created_at)}
                        </span>
                        {notification.related_order_id && (
                          <span className="text-[10px] text-zinc-400">
                            • Order #{notification.related_order_id.slice(0, 8)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {!notification.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500"
                          disabled={isPending}
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-400 hover:text-red-500"
                        disabled={isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => {
                setIsOpen(false);
                refreshNotifications();
              }}
              className="w-full py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {t('refresh', { defaultValue: 'Refresh' })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}