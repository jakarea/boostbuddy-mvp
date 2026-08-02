"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, ShoppingCart, CheckCircle2, Star } from "lucide-react";

interface CreditPackageCardProps {
  package: any;
  onPurchased?: () => void;
}

export function CreditPackageCard({ package: pkg, onPurchased }: CreditPackageCardProps) {
  const { t } = useTranslation("credits");
  const { success, error } = useToast();
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Ensure numeric values for calculations
  const price = typeof pkg.price === 'string' ? parseFloat(pkg.price) : pkg.price;
  const creditsAmount = typeof pkg.creditsAmount === 'string' ? parseInt(pkg.creditsAmount) : pkg.creditsAmount;
  const safePackage = { ...pkg, price, creditsAmount };

  const handlePurchase = async () => {
    try {
      setIsPurchasing(true);
      console.log("📍 [CLIENT#1] Starting purchase for package:", safePackage.name);
      console.log("📍 [CLIENT#2] Package ID:", safePackage.id);

      const { purchaseCreditsAction } = await import("@/app/actions/credits");
      const res = await purchaseCreditsAction(safePackage.id);

      console.log("📍 [CLIENT#3] Purchase response:", res);

      if (res.success && res.url) {
        // Redirect to Stripe checkout
        console.log("📍 [CLIENT#4] Redirecting to Stripe:", res.url);
        window.location.href = res.url;
      } else {
        console.log("📍 [CLIENT#5] Purchase failed with error:", res.error);
        error(res.error || t("failed_to_initiate_purchase", "Failed to initiate purchase"));
      }
    } catch (err) {
      console.error("📍 [CLIENT#6] Purchase exception:", err);
      error(t("failed_to_initiate_purchase", "Failed to initiate purchase"));
    } finally {
      setIsPurchasing(false);
    }
  };

  const getBestValueBadge = () => {
    // Simple logic: show "Best Value" for packages with highest credit-per-euro ratio
    const creditPerEuro = safePackage.creditsAmount / safePackage.price;
    if (creditPerEuro > 10) {
      return (
        <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 mb-3">
          {t("best_value_badge", "⭐ Best Value")}
        </Badge>
      );
    }
    return null;
  };

  const getPopularBadge = () => {
    // Show "Popular" for mid-range packages
    if (safePackage.creditsAmount >= 25 && safePackage.creditsAmount <= 50) {
      return (
        <Badge className="bg-[#168BB0]/10 text-[#168BB0] dark:text-[#45B0D2] border-[#168BB0]/20 mb-3">
          {t("popular_badge", "🔥 Popular")}
        </Badge>
      );
    }
    return null;
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#168BB0] to-[#0F7493] p-6 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold mb-1">{safePackage.name}</h3>
            {safePackage.description && (
              <p className="text-white/80 text-sm">{safePackage.description}</p>
            )}
          </div>
          <div className="p-2 bg-white/20 rounded-lg">
            <Coins className="h-6 w-6" />
          </div>
        </div>

        {/* Credits Amount */}
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">{safePackage.creditsAmount}</span>
          <span className="text-white/80">{t("credits", "credits")}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Badges */}
        <div className="flex gap-2 mb-4">
          {getBestValueBadge()}
          {getPopularBadge()}
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-baseline justify-center gap-2 mb-2">
            <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              €{safePackage.price.toFixed(2)}
            </span>
            <span className="text-zinc-500">{t("eur", "EUR")}</span>
          </div>
          <p className="text-center text-sm text-zinc-500">
            {t("price_per_credit", "≈ €{{price}} per credit", { price: (safePackage.price / safePackage.creditsAmount).toFixed(2) })}
          </p>
        </div>

        {/* Features */}
        <ul className="space-y-2 mb-6">
          <li className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>{t("instant_delivery", "Instant delivery after purchase")}</span>
          </li>
          <li className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>{t("use_for_review_orders", "Use for review orders")}</span>
          </li>
          <li className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>{t("credits_never_expire", "Credits never expire")}</span>
          </li>
        </ul>

        {/* Purchase Button */}
        <Button
          className="w-full bg-[#168BB0] hover:bg-[#0F7493] gap-2"
          size="lg"
          onClick={handlePurchase}
          disabled={isPurchasing}
        >
          {isPurchasing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              {t("processing", "Processing...")}
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              {t("purchase_package", "Purchase Package")}
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
