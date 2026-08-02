"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Plus, RefreshCw, TrendingUp } from "lucide-react";

interface CreditsBalanceCardProps {
  balance: number;
  onUpdate?: () => void;
  hidePurchaseButton?: boolean;
}

export function CreditsBalanceCard({ balance, onUpdate, hidePurchaseButton }: CreditsBalanceCardProps) {
  const { t } = useTranslation("credits");
  const { user } = useAuth();
  const { success, error } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { getUserCreditsBalanceAction } = await import("@/app/actions/credits");
      const res = await getUserCreditsBalanceAction();

      if (res.success && onUpdate) {
        onUpdate();
      }
    } catch (err) {
      error(t("failed_to_refresh_balance", "Failed to refresh balance"));
    } finally {
      setIsRefreshing(false);
    }
  };

  const getBalanceStatus = () => {
    if (balance === 0) return { label: t("no_credits", "No Credits"), color: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20" };
    if (balance < 10) return { label: t("low_balance", "Low Balance"), color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20" };
    if (balance < 50) return { label: t("good_balance", "Good Balance"), color: "bg-[#168BB0]/10 text-[#168BB0] dark:text-[#45B0D2] border-[#168BB0]/20" };
    return { label: t("high_balance", "High Balance"), color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" };
  };

  const status = getBalanceStatus();

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#168BB0] to-[#0F7493] p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Wallet className="h-6 w-6" />
            <h2 className="font-semibold">{t("credits_balance", "Credits Balance")}</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-white hover:bg-white/20"
            aria-label={t("refresh", "Refresh")}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Balance Display */}
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">{balance}</span>
          <span className="text-white/80">{t("credits", "credits")}</span>
        </div>

        {/* Status Badge */}
        <div className="mt-4">
          <Badge className={status.color}>
            {status.label}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 space-y-3">
        {!hidePurchaseButton && (
          <Button
            className="w-full justify-start gap-3 bg-[#168BB0] hover:bg-[#0F7493]"
            onClick={() => window.location.href = '/c/wallet/top-up'}
          >
            <Plus className="h-4 w-4" />
            {t("purchase_credits", "Purchase Credits")}
          </Button>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="justify-start gap-2 text-sm"
            onClick={() => window.location.href = '/c/wallet/transactions'}
          >
            <TrendingUp className="h-4 w-4" />
            {t("history", "History")}
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-2 text-sm"
            onClick={() => window.location.href = '/c/services/reviews'}
          >
            <span>⭐</span>
            {t("spend_credits", "Spend Credits")}
          </Button>
        </div>

        {/* Info Text */}
        <div className="text-center pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <p className="text-xs text-zinc-500">
            {t("credits_used_for_reviews", "Credits are used for creating review orders.")}
            {!hidePurchaseButton && (
              <>
                <br />
                <a href="/c/wallet/top-up" className="text-[#168BB0] hover:underline">
                  {t("get_started", "Get started →")}
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </Card>
  );
}
