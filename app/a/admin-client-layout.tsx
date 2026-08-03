"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Shield,
  Users,
  UserCog,
  Package,
  Inbox,
  Eye,
  FileText,
  History,
  Settings,
  Wallet as WalletIcon,
  Coins,
  Sliders,
  ArrowLeftRight,
  Tag,
  Bell,
  LayoutDashboard,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LoadingScreen } from "@/components/LoadingScreen";
import { CollapsibleSidebar, type NavEntry } from "@/components/CollapsibleSidebar";

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
    // 📂 OVERVIEW
    {
      id: "overview",
      label: t("nav.overview", { defaultValue: "Overview" }),
      icon: LayoutDashboard,
      items: [
        { href: "/a/dashboard", label: t("nav.dashboard", { defaultValue: "Dashboard" }), icon: LayoutDashboard },
      ],
    },
    // 📂 OPERATIONS
    {
      id: "operations",
      label: t("nav.operations", { defaultValue: "Operations" }),
      icon: Settings,
      items: [
        { href: "/a/clients", label: t("nav.clients", { defaultValue: "Clients" }), icon: Users },
        { href: "/a/employees", label: t("nav.employees", { defaultValue: "Employees" }), icon: UserCog },
        { href: "/a/orders", label: t("nav.orders", { defaultValue: "Orders" }), icon: Package },
        { href: "/a/profiles", label: t("nav.profiles", { defaultValue: "Profiles" }), icon: Inbox },
      ],
    },
    // 📂 REVIEWS MANAGEMENT
    {
      id: "reviews_management",
      label: t("nav.reviews_management", { defaultValue: "Reviews Management" }),
      icon: Eye,
      items: [
        { href: "/a/reviews/queue", label: t("nav.pending_queue", { defaultValue: "Pending Queue" }), icon: Inbox },
        { href: "/a/reviews/employees", label: t("nav.employee_submissions", { defaultValue: "Employee Submissions" }), icon: UserCog },
        { href: "/a/reviews", label: t("nav.active_reviews", { defaultValue: "Active Reviews" }), icon: FileText },
        { href: "/a/reviews/history", label: t("nav.complete_history", { defaultValue: "Complete History" }), icon: History },
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
        { href: "/wallet", label: t("nav.shared_wallet", { defaultValue: "Shared Wallet" }), icon: WalletIcon },
      ],
    },
    // 📂 SYSTEM
    {
      id: "system",
      label: t("nav.system", { defaultValue: "System" }),
      icon: Bell,
      items: [
        { href: "/a/notifications", label: t("nav.notifications", { defaultValue: "Notifications" }), icon: Bell },
      ],
    },
  ];

  return (
    <CollapsibleSidebar
      navEntries={navEntries}
      headerIcon={Shield}
      title={t("title")}
      subtitle={t("subtitle")}
      signOutLabel={t("sign_out")}
      mainMaxWidth="md:max-w-4xl lg:max-w-6xl"
    >
      {children}
    </CollapsibleSidebar>
  );
}
