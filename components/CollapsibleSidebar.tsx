"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogOut, X, ChevronDown, type LucideIcon } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { TopHeader } from "@/components/TopHeader";
import { signOutAction } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";

// ---------- Public types ----------

export type NavChild = {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
};

export type NavEntry = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;            // present for single-link entries
  items?: NavChild[];       // present for collapsible groups
};

// ---------- Accent color variants ----------
// Tailwind requires complete class strings, so each accent is a fixed set.

export type AccentColor = "blue" | "green";

type AccentClasses = {
  activeItem: string;       // bg + text for active nav items / children
  activeBorderMobile: string;
  activeBorderDesktop: string;
  groupActiveText: string;  // group header color when a child is active
};

const ACCENTS: Record<AccentColor, AccentClasses> = {
  blue: {
    activeItem: "bg-[#168BB0]/10 text-[#168BB0] dark:text-[#45B0D2]",
    activeBorderMobile: "border-l-2 border-[#168BB0]",
    activeBorderDesktop: "md:border-l-2 md:border-[#168BB0]",
    groupActiveText: "text-[#168BB0] dark:text-[#45B0D2]",
  },
  green: {
    activeItem: "bg-green-500/10 text-green-600 dark:text-green-400",
    activeBorderMobile: "border-l-2 border-green-500",
    activeBorderDesktop: "md:border-l-2 md:border-green-500",
    groupActiveText: "text-green-600 dark:text-green-400",
  },
};

// ---------- Component ----------

export type CollapsibleSidebarProps = {
  /** Nav entries — single-link entries use `href`, collapsible groups use `items`. */
  navEntries: NavEntry[];
  /** Header icon component (e.g., BoostBuddyIcon, or any LucideIcon). */
  headerIcon: React.ComponentType<{ className?: string }>;
  /** Header title. */
  title: string;
  /** Optional header subtitle. */
  subtitle?: string;
  /** Tailwind classes for the header icon container (background + text color). */
  headerIconClass?: string;
  /** Accent color for active items. Defaults to "blue". */
  accent?: AccentColor;
  /** Label for the sign-out button. */
  signOutLabel: string;
  /** Label for the "Soon" badge (only used if a child has `soon: true`). */
  soonBadgeLabel?: string;
  /** Tailwind max-width classes for the main content area. */
  mainMaxWidth?: string;
  /** Page content rendered inside <main>. */
  children: React.ReactNode;
};

export function CollapsibleSidebar({
  navEntries,
  headerIcon: HeaderIcon,
  title,
  subtitle,
  headerIconClass = "bg-[#168BB0]/10 rounded-md text-[#168BB0] dark:text-[#45B0D2]",
  accent = "blue",
  signOutLabel,
  soonBadgeLabel = "Soon",
  mainMaxWidth = "md:max-w-4xl lg:max-w-5xl",
  children,
}: CollapsibleSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Mobile drawer open state (desktop sidebar is always visible on md+).
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Tracks only groups the user has explicitly toggled.
  // Groups not in this map auto-expand when active, collapse when inactive.
  const [userToggles, setUserToggles] = useState<Record<string, boolean>>({});

  const a = ACCENTS[accent];

  const isChildActive = (href: string) => {
    if (!pathname) return false;
    // Only exact match - no partial matching
    // This prevents highlighting parent directories and sibling pages
    return pathname === href;
  };

  // A group is expanded if:
  //   - the user explicitly toggled it open, OR
  //   - the user hasn't touched it AND it contains the current route.
  // Groups are collapsed by default; only the active one auto-opens.
  const isGroupExpanded = (entry: NavEntry): boolean => {
    if (!entry.items) return false;
    if (entry.id in userToggles) return userToggles[entry.id];
    return entry.items.some((i) => isChildActive(i.href));
  };

  const toggleGroup = (entry: NavEntry) => {
    const currentlyExpanded = isGroupExpanded(entry);
    setUserToggles((prev) => ({ ...prev, [entry.id]: !currentlyExpanded }));
  };

  const handleSignOut = () => {
    setSidebarOpen(false);
    router.push("/");
    const supabase = createClient();
    supabase.auth.signOut();
    signOutAction().catch(() => {});
  };

  const renderSidebarFooter = (mobile = false) => (
    <div className="border-t border-zinc-200 dark:border-zinc-800 p-1.5 sm:p-3 space-y-2">
      <LanguageSwitcher />
      <Button
        variant="outline"
        className={`w-full ${
          mobile ? "h-10 text-sm" : "h-9 sm:h-10 text-xs sm:text-sm"
        } text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300 font-semibold gap-2 flex items-center justify-center md:justify-start px-2 md:px-3 bg-transparent`}
        onClick={handleSignOut}
      >
        <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
        <span className={mobile ? "" : "hidden md:inline"}>{signOutLabel}</span>
      </Button>
    </div>
  );

  const renderNavEntries = (mobile = false) => (
    <>
      {navEntries.map((entry) => {
        // Single-link entry
        if (entry.href) {
          const active = isChildActive(entry.href);
          const LinkIcon = entry.icon;
          const activeClasses = active
            ? `${a.activeItem} ${mobile ? a.activeBorderMobile : a.activeBorderDesktop}`
            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100";
          return (
            <Link
              key={entry.id}
              href={entry.href}
              className="w-full"
              prefetch={entry.href === "/c/dashboard" || entry.href === "/a/dashboard" ? true : false}
              onClick={mobile ? () => setSidebarOpen(false) : undefined}
            >
              <span
                className={`flex items-center ${
                  mobile ? "gap-2.5 px-3 py-2.5 text-sm" : "justify-center md:justify-start gap-0 md:gap-2.5 px-2 md:px-3 py-2 text-xs md:text-sm"
                } rounded-md font-semibold transition-all cursor-pointer relative group ${activeClasses}`}
                title={entry.label}
              >
                <LinkIcon className="h-4 w-4 shrink-0" />
                <span className={mobile ? "" : "hidden md:inline truncate"}>{entry.label}</span>
                {!mobile && (
                  <span className="absolute left-full ml-2 hidden max-md:group-hover:block bg-zinc-900 dark:bg-zinc-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                    {entry.label}
                  </span>
                )}
              </span>
            </Link>
          );
        }

        // Collapsible group entry
        const groupActive = !!entry.items?.some((i) => isChildActive(i.href));
        const expanded = isGroupExpanded(entry);
        const GroupIcon = entry.icon;
        return (
          <div key={entry.id} className="space-y-0.5">
            <button
              type="button"
              onClick={() => toggleGroup(entry)}
              aria-expanded={expanded}
              className={`w-full flex items-center ${
                mobile ? "gap-2.5 px-3 py-2.5 text-sm" : "justify-center md:justify-start gap-0 md:gap-2.5 px-2 md:px-3 py-2 text-xs md:text-sm"
              } rounded-md font-bold uppercase tracking-wider transition-all cursor-pointer ${
                groupActive
                  ? a.groupActiveText
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
              title={entry.label}
            >
              <GroupIcon className="h-4 w-4 shrink-0" />
              <span className={`${mobile ? "flex-1 text-left" : "hidden md:inline flex-1 text-left truncate"}`}>{entry.label}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""} ${mobile ? "" : "hidden md:inline"}`}
              />
            </button>

            {expanded && (
              <div className={`space-y-0.5 ${mobile ? "pl-3" : "md:pl-3"}`}>
                {entry.items?.map((child, index) => {
                  const Icon = child.icon;
                  const active = isChildActive(child.href);
                  return (
                    <Link
                      key={`${child.href}-${index}`}
                      href={child.href}
                      prefetch={child.href === "/c/dashboard" ? true : false}
                      className="w-full"
                      onClick={mobile ? () => setSidebarOpen(false) : undefined}
                    >
                      <span
                        className={`flex items-center ${
                          mobile ? "gap-2.5 px-3 py-2 text-sm" : "justify-center md:justify-start gap-0 md:gap-2.5 px-2 md:px-3 py-1.5 text-xs md:text-sm"
                        } rounded-md font-medium transition-all cursor-pointer ${
                          active
                            ? a.activeItem
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                        }`}
                        title={child.label}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className={`${mobile ? "flex-1" : "hidden md:inline flex-1 truncate"}`}>{child.label}</span>
                        {child.soon && (
                          <span className="text-[9px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            {soonBadgeLabel}
                          </span>
                        )}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );

  const renderHeader = () => (
    <div className="flex items-center gap-2.5 min-w-0">
      {/* BoostBuddy Logo Icon */}
      <div className="shrink-0">
        <HeaderIcon className="h-8 w-8 sm:h-10 sm:w-10" />
      </div>
      <div className="min-w-0">
        <div className="bb-logo-text text-xs sm:text-sm leading-none tracking-tight text-zinc-900 dark:text-white truncate">
          BOOSTBUDDY
        </div>
        {subtitle && <div className="text-[10px] text-zinc-500 mt-0.5 sm:mt-1">{subtitle}</div>}
      </div>
    </div>
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
      <aside className="hidden md:flex w-56 lg:w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-col shrink-0 max-h-full">
        <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
          {renderHeader()}
        </div>

        <nav className="flex-1 p-1.5 sm:p-2 space-y-0.5 sm:space-y-1 overflow-y-auto flex flex-col">
          {renderNavEntries(false)}
        </nav>

        {renderSidebarFooter(false)}
      </aside>

      {/* Mobile Drawer */}
      <aside className={`fixed left-0 top-0 h-full w-64 sm:w-56 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transform transition-transform duration-300 z-50 flex flex-col md:hidden ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
          {renderHeader()}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-500"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 p-1.5 sm:p-3 space-y-0.5 sm:space-y-1 overflow-y-auto">
          {renderNavEntries(true)}
        </nav>

        {renderSidebarFooter(true)}
      </aside>

      {/* Main Page Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/50">
        <TopHeader sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <div className="flex-1 overflow-y-auto">
          <div className={`w-full mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 ${mainMaxWidth}`}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
