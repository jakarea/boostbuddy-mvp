"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Package,
  Bell,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LoadingScreen } from "@/components/LoadingScreen";
import { CollapsibleSidebar, type NavEntry } from "@/components/CollapsibleSidebar";
import { BoostBuddyIcon } from "@/components/BoostBuddyIcon";

const LOG_PREFIX = "[EMPLOYEE-LAYOUT]";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("employee_layout");
  const { user, isLoading } = useAuth();

  console.log(`${LOG_PREFIX} Rendering | User:`, user?.email, "| Loading:", isLoading);

  if (isLoading) {
    return <LoadingScreen message={t("loading", { defaultValue: "Loading..." })} />;
  }

  const showAuthError = !isLoading && !user;

  if (showAuthError) {
    console.warn(`${LOG_PREFIX} ⚠️ No user found`);
    return (
      <div className="flex-1 flex justify-center items-center bg-zinc-950 text-white">
        <div className="text-center">
          <p className="text-sm text-zinc-400">{t("auth_error")}</p>
        </div>
      </div>
    );
  }

  const navEntries: NavEntry[] = [
    // 📂 DASHBOARD
    {
      id: "dashboard",
      label: t("nav.dashboard", { defaultValue: "Dashboard" }),
      icon: LayoutDashboard,
      href: "/e/dashboard",
    },
    // 📂 AVAILABLE ORDERS
    {
      id: "orders",
      label: t("nav.available_orders", { defaultValue: "Available Orders" }),
      icon: Package,
      href: "/e/orders",
    },
    // 📂 NOTIFICATIONS
    {
      id: "notifications",
      label: t("nav.notifications", { defaultValue: "Notifications" }),
      icon: Bell,
      href: "/e/notifications",
    },
  ];

  return (
    <CollapsibleSidebar
      navEntries={navEntries}
      headerIcon={BoostBuddyIcon}
      title={t("title")}
      subtitle={t("subtitle")}
      signOutLabel={t("sign_out")}
      mainMaxWidth="md:max-w-4xl lg:max-w-6xl"
    >
      {children}
    </CollapsibleSidebar>
  );
}