"use client";

import React, { useState } from "react";
import { User, Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";

export function TopHeader({
  sidebarOpen,
  setSidebarOpen,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (val: boolean) => void;
}) {
  const { t } = useTranslation("top_header");
  const { user } = useAuth();
  const relevantNotifications: any[] = [];
  const unreadCount = 0;
  const markNotificationsAsRead = () => {};
  const [showNotifications, setShowNotifications] = useState(false);

  if (!user) return null;

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
            >
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex h-2 sm:h-2.5 w-2 sm:w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-zinc-900 animate-pulse"></span>
              )}
            </Button>
            
            {/* Notification Dropdown */}
            {showNotifications && (
              <>
                {/* Backdrop to close dropdown */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowNotifications(false)} 
                />
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 p-3 sm:p-4 text-xs space-y-2.5 max-h-96 overflow-y-auto">
                  <div className="sticky top-0 bg-white dark:bg-zinc-900 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2 gap-2">
                    <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1">
                      <Bell className="h-3.5 w-3.5 text-[#168BB0] shrink-0" />
                      <span className="truncate">{t("alerts")} ({unreadCount})</span>
                    </span>
                    {unreadCount > 0 && (
                      <button 
                        className="text-xs text-[#168BB0] dark:text-[#45B0D2] font-bold hover:underline cursor-pointer whitespace-nowrap shrink-0"
                        onClick={markNotificationsAsRead}
                      >
                        {t("read_all")}
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {relevantNotifications.length === 0 ? (
                      <div className="text-center py-4 text-zinc-500">{t("no_notifications")}</div>
                    ) : (
                      relevantNotifications.map(n => (
                        <div 
                          key={n.id} 
                          className={`p-2 rounded border text-left transition-all ${
                            !n.read 
                              ? "bg-[#168BB0]/5 border-[#168BB0]/10 text-zinc-800 dark:text-zinc-200 font-medium" 
                              : "bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-100 dark:border-zinc-800 text-zinc-500"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <span className="leading-tight text-[11px]">{n.message}</span>
                            {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-[#168BB0] shrink-0 mt-1"></span>}
                          </div>
                          {n.details && (
                            <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-1 font-medium">{n.details}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
