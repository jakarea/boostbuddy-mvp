"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useTranslation } from "react-i18next";
import { CreditPackageCard } from "@/components/credits/CreditPackageCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Wallet } from "lucide-react";
import Link from "next/link";

export default function TopUpPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { success, error } = useToast();
  const { t } = useTranslation();
  const [packages, setPackages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFulfilling, setIsFulfilling] = useState(false);

  // Check for successful purchase and trigger fulfillment
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    console.log("📍 [CLIENT#1] URL Session ID:", sessionId);
    console.log("📍 [CLIENT#2] User:", user?.email);
    console.log("📍 [CLIENT#3] isFulfilling:", isFulfilling);

    if (sessionId && user && !isFulfilling) {
      console.log("📍 [CLIENT#4] Starting fulfillment process...");
      setIsFulfilling(true);

      const fulfillAndRefresh = async () => {
        try {
          console.log("📍 [CLIENT#5] Calling fulfillment API...");
          console.log("📍 [CLIENT#6] Request body:", JSON.stringify({ sessionId }));

          // Call fulfillment endpoint
          const response = await fetch('/api/fulfill-credits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });

          console.log("📍 [CLIENT#7] API response status:", response.status);
          console.log("📍 [CLIENT#8] API response OK:", response.ok);

          const responseData = await response.json();
          console.log("📍 [CLIENT#9] API response data:", responseData);

          if (response.ok) {
            console.log("📍 [CLIENT#10] ✅ Fulfillment API success");
            success(t("credits.purchaseSuccess", "Credits purchased successfully!"));

            // Check database state after fulfillment
            console.log("📍 [CLIENT#11] Checking database state...");
            setTimeout(async () => {
              const debugRes = await fetch('/api/debug-credits');
              const debugData = await debugRes.json();
              console.log("📍 [CLIENT#12] 🗄️ Database state:", debugData);
            }, 1000);
          } else {
            console.log("📍 [CLIENT#13] ❌ Fulfillment API failed");
            console.error("📍 [CLIENT#14] Error data:", responseData);

            if (responseData.error?.includes('already fulfilled')) {
              console.log("📍 [CLIENT#15] Already fulfilled");
              success(t("credits.purchaseSuccess", "Credits purchased successfully!"));
            } else {
              error(responseData.error || "Failed to process purchase");
            }
          }
        } catch (err) {
          console.error("📍 [CLIENT#20] ❌ Fulfillment error:", err);
          error("Failed to process purchase");
        } finally {
          console.log("📍 [CLIENT#21] Fulfillment process complete");
          setIsFulfilling(false);
        }
      };

      fulfillAndRefresh();
    } else {
      console.log("📍 [CLIENT#22] Skipping fulfillment (sessionId:", !!sessionId, "user:", !!user, "isFulfilling:", isFulfilling, ")");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const packagesRes = await import("@/app/actions/credits").then(m => m.getActiveCreditPackagesAction());

        if (packagesRes.success && packagesRes.data) {
          setPackages(packagesRes.data);
        } else {
          error(packagesRes.error || "Failed to load packages");
        }
      } catch (err) {
        error("Failed to load packages");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [error]);

  const handlePurchased = () => {
    // Refresh packages list after purchase
    import("@/app/actions/credits").then(m => m.getActiveCreditPackagesAction())
      .then(res => {
        if (res.success && res.data) {
          setPackages(res.data);
        }
      });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/c/wallet">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {t("credits.purchaseCredits", "Purchase Credits")}
            </h1>
          </div>
        </div>
      </div>

      {/* Packages Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="bb-loading">
            <span></span><span></span><span></span><span></span>
            <span className="bb-center"></span>
            <span></span><span></span><span></span><span></span>
          </div>
        </div>
      ) : packages.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-3">📦</div>
          <h3 className="text-lg font-semibold mb-1">{t("credits.noPackagesAvailable", "No Packages Available")}</h3>
          <p className="text-sm text-zinc-500">
            {t("credits.noPackagesMessage", "There are currently no credit packages available for purchase.")}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {packages.map((pkg) => (
            <CreditPackageCard
              key={pkg.id}
              package={pkg}
              onPurchased={handlePurchased}
            />
          ))}
        </div>
      )}
    </div>
  );
}
