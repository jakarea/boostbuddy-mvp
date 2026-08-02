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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link href="/c/wallet">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t("credits.backToWallet", "Back to Wallet")}
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#168BB0]/10 rounded-lg">
                <Wallet className="h-6 w-6 text-[#168BB0]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {t("credits.purchaseCredits", "Purchase Credits")}
                </h1>
                <p className="text-sm text-zinc-500">
                  {t("credits.purchaseDescription", "Top up your balance with credit packages")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Packages Grid - Full Width */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#168BB0] mx-auto mb-4"></div>
            <p className="text-zinc-500">{t("credits.loadingPackages", "Loading packages...")}</p>
          </div>
        ) : packages.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold mb-2">{t("credits.noPackagesAvailable", "No Packages Available")}</h3>
            <p className="text-zinc-500">
              {t("credits.noPackagesMessage", "There are currently no credit packages available for purchase.")}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
    </div>
  );
}
