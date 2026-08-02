"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2 } from "lucide-react";

interface PurchaseCreditsButtonProps {
  packageId: string;
  packageName: string;
  onComplete?: () => void;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function PurchaseCreditsButton({
  packageId,
  packageName,
  onComplete,
  className = "",
  variant = "default",
  size = "default",
}: PurchaseCreditsButtonProps) {
  const { t } = useTranslation("credits");
  const { error, success } = useToast();
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handlePurchase = async () => {
    try {
      setIsPurchasing(true);
      const { purchaseCreditsAction } = await import("@/app/actions/credits");
      const res = await purchaseCreditsAction(packageId);

      if (res.success && res.url) {
        // Redirect to Stripe checkout
        window.location.href = res.url;
      } else {
        error(res.error || t("failed_to_initiate_purchase", "Failed to initiate purchase"));
        setIsPurchasing(false);
      }
    } catch (err) {
      error(t("failed_to_initiate_purchase", "Failed to initiate purchase"));
      setIsPurchasing(false);
    }
  };

  return (
    <Button
      className={className}
      variant={variant}
      size={size}
      onClick={handlePurchase}
      disabled={isPurchasing}
    >
      {isPurchasing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("processing", "Processing...")}
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" />
          {t("purchase_with_package", "Purchase {{packageName}}", { packageName: packageName ? `(${packageName})` : "" })}
        </>
      )}
    </Button>
  );
}
