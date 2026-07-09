"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert, Users, FolderKanban, ShoppingBag,
  Receipt, LogOut, Shield, Globe, User, Bell, CreditCard, Mail, Menu, X
} from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { TopHeader } from "@/components/TopHeader";
import { signOutAction } from "@/app/actions/auth";
import { useTranslation } from "react-i18next";
import { LoadingScreen } from "@/components/LoadingScreen";

const LOG_PREFIX = "[ADMIN-LAYOUT]";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("admin_layout");
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  console.log(`${LOG_PREFIX} Rendering | User:`, user?.email, "| Role:", user?.role, "| Loading:", isLoading);

  if (isLoading) {
    return <LoadingScreen message={t("loading", { defaultValue: "Loading..." })} />;
  }

  // Middleware ensures user is ADMIN, so we don't need to block rendering with a spinner on client-side initialization.
  const showAccessDenied = !isLoading && (!user || user.role !== "ADMIN");

  if (showAccessDenied) {
    console.warn(`${LOG_PREFIX} ⚠️ User is not ADMIN (middleware should have prevented this)`);
    return (
      <div className="flex-1 flex justify-center items-center bg-zinc-950 text-white">
        <div className="text-center">
          <p className="text-sm text-zinc-400">{t("access_denied")}</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: "/admin/dashboard", label: t("nav.dashboard"), icon: ShieldAlert },
    { href: "/admin/clients", label: t("nav.clients"), icon: Users },
    { href: "/admin/profiles", label: t("nav.profiles"), icon: FolderKanban },
    { href: "/admin/services", label: t("nav.services"), icon: ShoppingBag },
    { href: "/admin/orders", label: t("nav.orders"), icon: CreditCard },
    { href: "/admin/invoices", label: t("nav.invoices"), icon: Receipt },
    { href: "/admin/notifications", label: t("nav.notifications"), icon: Mail },
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation - Desktop */}
      <aside className="hidden md:flex w-56 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-col shrink-0 max-h-full">

        {/* Sidebar Header */}
        <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 bg-[#168BB0]/10 rounded-md text-[#168BB0] dark:text-[#45B0D2] shrink-0">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs sm:text-sm leading-none tracking-tight text-zinc-900 dark:text-white truncate">{t("title")}</div>
              <div className="text-[10px] text-zinc-500 mt-0.5 sm:mt-1">{t("subtitle")}</div>
            </div>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 p-1.5 sm:p-3 space-y-0.5 sm:space-y-1 overflow-y-auto flex flex-col md:flex-col">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} className="w-full">
                <span
                  className={`flex items-center justify-center md:justify-start gap-0 md:gap-2.5 px-2 md:px-3 py-2 md:py-2.5 rounded-md text-xs md:text-sm font-semibold transition-all cursor-pointer relative group ${
                    isActive
                      ? "bg-[#168BB0]/10 text-[#168BB0] dark:text-[#45B0D2] border-l-0 md:border-l-2 md:border-[#168BB0]"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                  title={item.label}
                >
                  <Icon className="h-4 w-4 md:h-4 md:w-4 shrink-0" />
                  <span className="hidden md:inline truncate">{item.label}</span>

                  {/* Tooltip on mobile icon-only view */}
                  <span className="absolute left-full ml-2 hidden max-md:group-hover:block bg-zinc-900 dark:bg-zinc-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                    {item.label}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-1.5 sm:p-3 space-y-2">
          <LanguageSwitcher />
          <Button
            variant="outline"
            className="w-full h-9 sm:h-10 text-xs sm:text-sm text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300 font-semibold gap-2 flex items-center justify-center md:justify-start px-2 md:px-3 bg-transparent"
            onClick={async () => {
              console.log(`${LOG_PREFIX} Sign out button clicked`);
              await signOutAction();
            }}
          >
            <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden md:inline">{t("sign_out")}</span>
          </Button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <aside className={`fixed left-0 top-0 h-full w-56 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transform transition-transform duration-300 z-50 flex flex-col md:hidden ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Drawer Header */}
        <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 bg-[#168BB0]/10 rounded-md text-[#168BB0] dark:text-[#45B0D2] shrink-0">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs sm:text-sm leading-none tracking-tight text-zinc-900 dark:text-white truncate">{t("title")}</div>
              <div className="text-[10px] text-zinc-500 mt-0.5 sm:mt-1">{t("subtitle")}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-500"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Drawer Nav Links */}
        <nav className="flex-1 p-1.5 sm:p-3 space-y-0.5 sm:space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} className="w-full" onClick={() => setSidebarOpen(false)}>
                <span
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#168BB0]/10 text-[#168BB0] dark:text-[#45B0D2] border-l-2 border-[#168BB0]"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Drawer Footer */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-3 space-y-2">
          <LanguageSwitcher />
          <Button
            variant="outline"
            className="w-full h-10 text-sm text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300 font-semibold gap-2 flex items-center justify-start px-3 bg-transparent"
            onClick={async () => {
              console.log(`${LOG_PREFIX} Sign out button clicked (mobile)`);
              await signOutAction();
              setSidebarOpen(false);
            }}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>{t("sign_out")}</span>
          </Button>
        </div>
      </aside>

      {/* Main Page Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/50">
        <TopHeader sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="w-full max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-6xl mx-auto space-y-4 sm:space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
