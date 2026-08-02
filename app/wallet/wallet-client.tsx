"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useTranslation } from "react-i18next";
import { CreditsBalanceCard } from "@/components/credits/CreditsBalanceCard";
import { CreditPackagesList } from "@/components/credits/CreditPackagesList";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wallet, RefreshCw } from "lucide-react";

export default function WalletClient({
  initialBalance,
  initialPackages,
}: {
  initialBalance: number;
  initialPackages: any[];
}) {
  const { user } = useAuth();
  const { t } = useTranslation("wallet");
  const { error: toastError } = useToast();
  const [balance, setBalance] = useState(initialBalance);
  const [packages, setPackages] = useState(initialPackages);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Re-fetch data
      const { getUserCreditsBalanceAction, getActiveCreditPackagesAction } = await import("@/app/actions/credits");
      const [balanceRes, packagesRes] = await Promise.all([
        getUserCreditsBalanceAction(),
        getActiveCreditPackagesAction(),
      ]);

      if (balanceRes.success) setBalance(balanceRes.balance);
      if (packagesRes.success && packagesRes.data) setPackages(packagesRes.data);
    } catch (error) {
      console.error(t("refresh_failed_log", "Failed to refresh wallet data:"), error);
      toastError(t("refresh_failed", "Failed to refresh wallet data"));
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#168BB0]/10 rounded-lg">
                <Wallet className="h-6 w-6 text-[#168BB0]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {t("title", "Wallet")}
                </h1>
                <p className="text-sm text-zinc-500">
                  {t("subtitle", "Manage your credits and view transaction history")}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t("refresh", "Refresh")}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Balance & Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Credits Balance Card */}
            <CreditsBalanceCard balance={balance} onUpdate={handleRefresh} />

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">{t("quick_actions", "Quick Actions")}</h3>
              <div className="space-y-3">
                <Button
                  className="w-full justify-start gap-3"
                  variant="outline"
                  onClick={() => window.location.href = '/wallet/transactions'}
                >
                  <span>💳</span>
                  {t("view_transaction_history", "View Transaction History")}
                </Button>
                <Button
                  className="w-full justify-start gap-3"
                  variant="outline"
                  onClick={() => window.location.href = '/dashboard/services/reviews'}
                >
                  <span>⭐</span>
                  {t("create_review_order", "Create Review Order")}
                </Button>
              </div>
            </Card>

            {/* Help Card */}
            <Card className="p-6 bg-[#168BB0]/5 border-[#168BB0]/20">
              <h3 className="text-lg font-semibold mb-3 text-[#168BB0]">{t("how_credits_work", "How Credits Work")}</h3>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li className="flex gap-2">
                  <span>•</span>
                  <span>{t("credits_help_1", "Purchase credit packages to top up your balance")}</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>{t("credits_help_2", "Credits are deducted when you create review orders")}</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>{t("credits_help_3", "Different review types require different credit amounts")}</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>{t("credits_help_4", "Credits never expire")}</span>
                </li>
              </ul>
            </Card>
          </div>

          {/* Right Column - Credit Packages */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                {t("available_packages", "Available Credit Packages")}
              </h2>
              <p className="text-zinc-500">
                {t("available_packages_desc", "Choose a package that suits your needs. Instant delivery after purchase.")}
              </p>
            </div>

            {packages.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-semibold mb-2">{t("no_packages_available", "No Packages Available")}</h3>
                <p className="text-zinc-500">
                  {t("no_packages_desc", "Check back later for new credit packages.")}
                </p>
              </Card>
            ) : (
              <CreditPackagesList
                packages={packages}
                onPurchased={handleRefresh}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
