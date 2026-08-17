"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Users,
  UserCog,
  Package,
  Inbox,
  Eye,
  FileText,
  Settings,
  Wallet as WalletIcon,
  Sliders,
  ArrowLeftRight,
  Tag,
  Bell,
  LayoutDashboard,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LoadingScreen } from "@/components/LoadingScreen";
import { CollapsibleSidebar, type NavEntry } from "@/components/CollapsibleSidebar";
import { BoostBuddyIcon } from "@/components/BoostBuddyIcon";

const LOG_PREFIX = "[ADMIN-LAYOUT]";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("admin_layout");
  const { user, isLoading } = useAuth();

  console.log(`${LOG_PREFIX} Rendering | User:`, user?.email, "| Role:", user?.role, "| Loading:", isLoading);

  if (isLoading) {
    return <LoadingScreen message={t("loading", { defaultValue: "Loading..." })} />;
  }

  // Middleware ensures user is ADMIN, so we don't block render with a spinner on client-side init.
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

  const navEntries: NavEntry[] = [
    // 📂 DASHBOARD
    {
      id: "dashboard",
      label: t("nav.dashboard", { defaultValue: "Dashboard" }),
      icon: LayoutDashboard,
      href: "/a/dashboard",
    },
    // 📂 OPERATIONS
    {
      id: "operations",
      label: t("nav.operations", { defaultValue: "Operations" }),
      icon: Settings,
      items: [
        { href: "/a/clients", label: t("nav.clients", { defaultValue: "Clients" }), icon: Users },
        { href: "/a/employees", label: t("nav.employees", { defaultValue: "Employees" }), icon: UserCog },
        { href: "/a/profiles", label: t("nav.profiles", { defaultValue: "Profiles" }), icon: Inbox },
      ],
    },
    // 📂 REVIEWS MANAGEMENT
    {
      id: "reviews_management",
      label: t("nav.reviews_management", { defaultValue: "Reviews Management" }),
      icon: Eye,
      items: [
        { href: "/a/orders", label: t("nav.orders", { defaultValue: "Orders" }), icon: Package },
        { href: "/a/reviews", label: t("nav.reviews_overview", { defaultValue: "Reviews Overview" }), icon: FileText },
        { href: "/a/reviews/employees", label: t("nav.employee_submissions", { defaultValue: "Employee Submissions" }), icon: UserCog },
      ],
    },
    // 📂 SERVICES & PRICING
    {
      id: "services_pricing",
      label: t("nav.services_pricing", { defaultValue: "Services & Pricing" }),
      icon: Tag,
      items: [
        { href: "/a/services", label: t("nav.catalog", { defaultValue: "Catalog" }), icon: Package },
        { href: "/a/services/reviews/pricing", label: t("nav.review_pricing", { defaultValue: "Review Pricing" }), icon: Tag },
        { href: "/a/services/credits", label: t("nav.configuration", { defaultValue: "Configuration" }), icon: Sliders },
        { href: "/a/services/credits/adjust", label: t("nav.adjustments", { defaultValue: "Adjustments" }), icon: Sliders },
        { href: "/a/services/credits/transactions", label: t("nav.transactions", { defaultValue: "Transactions" }), icon: ArrowLeftRight },
      ],
    },
    // 📂 FINANCE
    {
      id: "finance",
      label: t("nav.finance", { defaultValue: "Finance" }),
      icon: WalletIcon,
      items: [
        { href: "/a/invoices", label: t("nav.invoices", { defaultValue: "Invoices" }), icon: FileText },
      ],
    },
    // 📂 NOTIFICATIONS
    {
      id: "notifications",
      label: t("nav.notifications", { defaultValue: "Notifications" }),
      icon: Bell,
      href: "/a/notifications",
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
