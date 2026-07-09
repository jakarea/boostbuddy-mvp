"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X, Globe } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  branding: {
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
  };
  userInfo?: {
    name: string;
    email: string;
  };
  onLogout?: () => void;
  showLanguageSwitcher?: boolean;
}

export function SidebarLayout({
  children,
  navItems,
  branding,
  userInfo,
  onLogout,
  showLanguageSwitcher = true,
}: SidebarLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const BrandIcon = branding.icon;

  const NavContent = () => (
    <>
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

              {/* Tooltip on mobile */}
              <span className="absolute left-full ml-2 hidden group-hover:block md:hidden bg-zinc-900 dark:bg-zinc-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                {item.label}
              </span>
            </span>
          </Link>
        );
      })}
    </>
  );

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
              <BrandIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs sm:text-sm leading-none tracking-tight text-zinc-900 dark:text-white truncate">
                {branding.title}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5 sm:mt-1">{branding.subtitle}</div>
            </div>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 p-1.5 sm:p-3 space-y-0.5 sm:space-y-1 overflow-y-auto flex flex-col md:flex-col">
          <NavContent />
        </nav>

        {/* Sidebar Footer - User Card & Language & Logout */}
        <div className="p-2 sm:p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-2">
          {userInfo && (
            <div className="flex items-center gap-2 px-2 py-1.5 sm:py-2 rounded-md">
              <div className="p-1.5 sm:p-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-full shrink-0">
                <span className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline-block">👤</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-bold truncate leading-none mb-0.5 sm:mb-1">
                  {userInfo.name}
                </div>
                <div className="text-[10px] sm:text-xs text-zinc-500 truncate leading-none">
                  {userInfo.email}
                </div>
              </div>
            </div>
          )}

          {showLanguageSwitcher && <LanguageSwitcher />}

          {onLogout && (
            <Button
              size="sm"
              variant="ghost"
              className="w-full h-9 sm:h-10 text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 justify-start px-2 font-semibold gap-2"
              onClick={onLogout}
            >
              <span>Sign Out</span>
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile Drawer */}
      <aside
        className={`fixed left-0 top-0 h-full w-56 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transform transition-transform duration-300 z-50 flex flex-col md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 bg-[#168BB0]/10 rounded-md text-[#168BB0] dark:text-[#45B0D2] shrink-0">
              <BrandIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs sm:text-sm leading-none tracking-tight text-zinc-900 dark:text-white truncate">
                {branding.title}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5 sm:mt-1">{branding.subtitle}</div>
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
        <div className="p-2 sm:p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-2">
          {userInfo && (
            <div className="flex items-center gap-2 px-2 py-1.5 sm:py-2 rounded-md">
              <div className="p-1.5 sm:p-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-full shrink-0">
                <span className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline-block">👤</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-bold truncate leading-none mb-0.5 sm:mb-1">
                  {userInfo.name}
                </div>
                <div className="text-[10px] sm:text-xs text-zinc-500 truncate leading-none">
                  {userInfo.email}
                </div>
              </div>
            </div>
          )}

          {showLanguageSwitcher && <LanguageSwitcher />}

          {onLogout && (
            <Button
              size="sm"
              variant="ghost"
              className="w-full h-9 sm:h-10 text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 justify-start px-2 font-semibold gap-2"
              onClick={() => {
                onLogout();
                setSidebarOpen(false);
              }}
            >
              <span>Sign Out</span>
            </Button>
          )}
        </div>
      </aside>

      {/* Main Page Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/50">
        {/* Mobile Header with Menu Button */}
        <div className="sticky top-0 z-40 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 backdrop-blur-sm p-1.5 sm:p-2 md:hidden">
          <div className="flex items-center justify-start px-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="w-full max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto space-y-4 sm:space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
