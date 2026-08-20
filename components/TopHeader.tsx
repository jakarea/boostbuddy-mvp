"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { useRealtimeNotifications } from "@/lib/hooks/useRealtimeNotifications";
import { cn } from "@/lib/utils";

export function TopHeader({
  sidebarOpen,
  setSidebarOpen,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (val: boolean) => void;
}) {
  const { t } = useTranslation("top_header");
  const { user } = useAuth();
  const router = useRouter();

  // Use real notification data
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead
  } = useRealtimeNotifications();

  const [showNotifications, setShowNotifications] = useState(false);

  if (!user) return null;

  // Get notifications URL based on user role
  const getNotificationsUrl = () => {
    switch (user.role) {
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

  const handleViewAll = () => {
    setShowNotifications(false);
    router.push(getNotificationsUrl());
  };

  const handleNotificationClick = async (notificationId: string) => {
    await markAsRead(notificationId);
    // Optional: Navigate to related content if related_order_id exists
    // For now, just mark as read and close dropdown
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  // Show top 5 recent notifications, sorted by date
  const recentNotifications = notifications
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="sticky top-0 z-40 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 backdrop-blur-sm p-1.5 sm:p-2 md:p-2.5">
      <div className="w-full max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-6xl mx-auto flex items-center justify-between md:justify-end gap-1.5 sm:gap-2">

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:hidden text-zinc-500 hover:text-zinc-900 dark:hover:text-white shrink-0"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-4 w-4 shrink-0" />
        </Button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* User Info Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
            <div className="p-1.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-full shrink-0">
              <User className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 text-right">
              <div className="text-xs font-bold truncate leading-none text-zinc-900 dark:text-white">{user.name}</div>
              <div className="text-[10px] text-zinc-500 truncate leading-none">{user.email}</div>
            </div>
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white relative cursor-pointer shrink-0"
              onClick={() => setShowNotifications(!showNotifications)}
              title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
            >
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex h-2 sm:h-2.5 w-2 sm:w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-zinc-900 animate-pulse"></span>
              )}
              {/* Connection indicator */}
              <span
                className={cn(
                  "absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full",
                  isConnected ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-600"
                )}
                title={isConnected ? "Realtime connected" : "Using polling fallback"}
              />
            </Button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <>
                {/* Backdrop to close dropdown */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 p-3 sm:p-4 text-xs space-y-2.5 max-h-96 overflow-y-auto">
                  {/* Header */}
                  <div className="sticky top-0 bg-white dark:bg-zinc-900 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2 gap-2">
                    <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1">
                      <Bell className="h-3.5 w-3.5 text-[#168BB0] shrink-0" />
                      <span className="truncate">Notifications ({unreadCount})</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          className="text-xs text-[#168BB0] dark:text-[#45B0D2] font-bold hover:underline cursor-pointer whitespace-nowrap shrink-0"
                          onClick={handleMarkAllRead}
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer whitespace-nowrap shrink-0"
                        onClick={handleViewAll}
                      >
                        View all
                      </button>
                    </div>
                  </div>

                  {/* Notifications List */}
                  <div className="space-y-2">
                    {recentNotifications.length === 0 ? (
                      <div className="text-center py-6 text-zinc-500">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      recentNotifications.map(n => (
                        <div
                          key={n.id}
                          className={cn(
                            "p-2.5 rounded border text-left transition-all cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                            !n.is_read
                              ? "bg-[#168BB0]/5 border-[#168BB0]/10 text-zinc-800 dark:text-zinc-200"
                              : "bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-100 dark:border-zinc-800 text-zinc-500"
                          )}
                          onClick={() => handleNotificationClick(n.id)}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-xs text-zinc-900 dark:text-white mb-1 truncate">
                                {n.subject}
                              </div>
                              <div className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2">
                                {n.body}
                              </div>
                              <div className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-1">
                                {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </div>
                            </div>
                            <div className="flex flex-col items-center gap-1 shrink-0">
                              {/* Priority badge */}
                              <span className={cn(
                                "text-[9px] font-bold px-1.5 py-0.5 rounded",
                                n.priority === 'HIGH' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                n.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                              )}>
                                {n.priority === 'HIGH' ? '!' : n.priority === 'MEDIUM' ? '•' : '○'}
                              </span>
                              {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-[#168BB0] shrink-0"></span>}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  {recentNotifications.length > 0 && (
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-center">
                      <button
                        className="text-xs text-[#168BB0] dark:text-[#45B0D2] font-medium hover:underline"
                        onClick={handleViewAll}
                      >
                        View all notifications →
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
