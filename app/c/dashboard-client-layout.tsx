"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  CreditCard,
  Settings,
  User,
  Bell,
  Star,
  ShoppingBag,
  PlusCircle,
  ArrowLeftRight,
  BookOpen,
  Clock,
  MessageSquare,
  Receipt,
  FileText,
  Wallet as WalletIcon,
  Package,
  List,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LoadingScreen } from "@/components/LoadingScreen";
import { CollapsibleSidebar, type NavEntry } from "@/components/CollapsibleSidebar";
import { BoostBuddyIcon } from "@/components/BoostBuddyIcon";

const LOG_PREFIX = "[DASHBOARD-LAYOUT]";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("client_layout");
  const { user, isLoading } = useAuth();

  console.log(`${LOG_PREFIX} Rendering | User:`, user?.email, "| Loading:", isLoading);

  if (isLoading) {
    return <LoadingScreen message={t("loading", { defaultValue: "Loading..." })} />;
  }

  // Middleware ensures user is authenticated, so we don't block render with a spinner on client-side init.
  const showAuthError = !isLoading && !user;

  if (showAuthError) {
    // Graceful error handling - no console warnings, just secure validation message
    return (
      <div className="flex-1 flex justify-center items-center bg-zinc-950 text-white min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <User className="w-16 h-16 mx-auto mb-4 text-zinc-400" />
          <h2 className="text-xl font-semibold mb-2">
            {t("session_refresh_required", { defaultValue: "Session Refresh Required" })}
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            {t("session_expired_message", { defaultValue: "Your session has expired. Please sign in again to continue." })}
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-white text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors font-medium"
          >
            {t("return_to_login", { defaultValue: "Return to Login" })}
          </a>
        </div>
      </div>
    );
  }

  const navEntries: NavEntry[] = [
    // 📊 DASHBOARD
    {
      id: "dashboard",
      label: t("nav.dashboard", { defaultValue: "Dashboard" }),
      icon: LayoutDashboard,
      href: "/c/dashboard",
    },
    // 📦 BOXES
    {
      id: "boxes",
      label: t("nav.boxes", { defaultValue: "Boxes" }),
      icon: Package,
      items: [
        { href: "/c/boxes", label: t("nav.my_boxes", { defaultValue: "My Boxes" }), icon: Package },
        { href: "/c/boxes/buy", label: t("nav.buy_boxes", { defaultValue: "Buy Boxes" }), icon: ShoppingBag },
      ],
    },
    // 📂 SERVICES
    {
      id: "services",
      label: t("nav.services", { defaultValue: "Services" }),
      icon: ShoppingBag,
      items: [
        { href: "/c/services/reviews", label: t("nav.services_overview", { defaultValue: "Reviews" }), icon: ShoppingBag },
        { href: "#", label: t("nav.clocker", { defaultValue: "Clocker" }), icon: Clock, soon: true },
      ],
    },
    // 📂 FINANCE & BILLING
    {
      id: "finance_billing",
      label: t("nav.finance_billing", { defaultValue: "Finance & Billing" }),
      icon: WalletIcon,
      items: [
        { href: "/c/wallet/top-up", label: t("nav.top_up", { defaultValue: "Top-Up" }), icon: PlusCircle },
        { href: "/c/wallet/transactions", label: t("nav.transactions", { defaultValue: "Transactions" }), icon: ArrowLeftRight },
        { href: "/c/billing", label: t("nav.billing_details", { defaultValue: "Billing Details" }), icon: FileText },
        { href: "/c/invoices", label: t("nav.invoices", { defaultValue: "Invoices" }), icon: Receipt },
        { href: "/c/payments", label: t("nav.payments", { defaultValue: "Payments" }), icon: CreditCard },
      ],
    },
    // 📂 SUPPORT & ACCOUNT
    {
      id: "support_account",
      label: t("nav.support_account", { defaultValue: "Support & Account" }),
      icon: User,
      items: [
        { href: "/c/notifications", label: t("nav.notifications", { defaultValue: "Notifications" }), icon: Bell },
        { href: "/c/settings", label: t("nav.settings", { defaultValue: "Settings" }), icon: Settings },
      ],
    },
  ];

  return (
    <CollapsibleSidebar
      navEntries={navEntries}
      headerIcon={BoostBuddyIcon}
      title={t("title")}
      subtitle={t("subtitle")}
      signOutLabel={t("sign_out")}
      soonBadgeLabel={t("soon_badge", { defaultValue: "Coming soon" })}
      mainMaxWidth="md:max-w-4xl lg:max-w-6xl"
    >
      {children}
    </CollapsibleSidebar>
  );
}
