"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Lock, ArrowLeft, ShieldCheck, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { createCheckoutSessionAction, calculateUpgradePriceAction } from "@/app/actions/stripe";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";

interface CheckoutClientProps {
  services: any[];
  profiles: any[];
  userName: string;
}

export default function CheckoutClient({ services, profiles, userName }: CheckoutClientProps) {
  const { t } = useTranslation("checkout");
  const { error } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const checkoutType = searchParams.get("type"); // "purchase" or "renewal"
  const serviceId = searchParams.get("serviceId");
  const profileId = searchParams.get("profileId");

  // Local states
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPrice, setItemPrice] = useState(0);

  useEffect(() => {
    if (checkoutType === "purchase" && serviceId) {
      const srv = services.find(s => s.id === serviceId);
      if (srv) {
        setItemName(srv.name);
        setItemDescription(srv.description || "");
        setItemPrice(srv.price);
      }
    } else if (checkoutType === "renewal" && profileId) {
      const prf = profiles.find(p => p.id === profileId);
      if (prf) {
        setItemName(t("renewal_item_name", { profileName: prf.profile_name }));
        setItemDescription(t("renewal_item_desc"));
        
        const targetSrvId = serviceId || prf.service_id || (services.length > 0 ? services[0].id : "");
        if (targetSrvId) {
          calculateUpgradePriceAction(profileId, targetSrvId)
            .then((res: any) => {
              if (res.success) {
                setItemName(`Renewal/Upgrade: ${res.targetName}`);
                setItemDescription(res.credit > 0 
                  ? `Prorated upgrade. €${res.credit} credit applied for remaining days.`
                  : `Standard subscription renewal.`
                );
                setItemPrice(res.finalPrice);
              } else {
                error(res.error || "Failed to load pricing info");
              }
            })
            .catch((err) => {
              console.error("Error fetching checkout price details:", err);
            });
        } else {
          setItemPrice(15.00); // Fallback
        }
      }
    }
  }, [checkoutType, serviceId, profileId, services, profiles, t, error]);

  const handlePay = () => {
    startTransition(async () => {
      const typeEnum = checkoutType === "renewal" ? "RENEWAL" : "PURCHASE";
      const result = await createCheckoutSessionAction(
        typeEnum, 
        itemPrice, 
        itemName, 
        itemDescription, 
        serviceId || undefined, 
        profileId || undefined
      );

      if (result.success && result.url) {
        // Redirect to Stripe Checkout
        window.location.href = result.url;
      } else {
        error(result.error || t("alert_failed"));
      }
    });
  };

  const handleReturnToDashboard = () => {
    router.push("/dashboard/payments");
  };

  if (!checkoutType || (!serviceId && !profileId)) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">{t("invalid_title")}</h1>
        <p className="text-zinc-500 mb-6 max-w-md">{t("invalid_desc")}</p>
        <Button onClick={handleReturnToDashboard} className="bg-[#168BB0] hover:bg-[#0F7493] text-white">{t("btn_return")}</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Top Navigation */}
      <div className="w-full max-w-2xl mb-6 flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("btn_back")}
        </Button>
        <div className="flex items-center gap-2 font-extrabold tracking-tight text-xl">
          <Globe className="h-6 w-6 text-[#168BB0]" />
          <span>Boost<span className="text-[#168BB0]">Buddy</span></span>
        </div>
      </div>

      <div className="w-full max-w-2xl relative">
        {/* Loading Overlay */}
        {isPending && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-50/50 dark:bg-zinc-950/50 backdrop-blur-sm rounded-xl">
            <Loader2 className="h-10 w-10 text-[#168BB0] animate-spin" />
            <span className="ml-3 font-semibold text-[#168BB0]">{t("overlay_loading")}</span>
          </div>
        )}

        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-xl shadow-black/5 overflow-hidden">
          <div className="bg-[#168BB0]/5 dark:bg-[#168BB0]/10 p-6 flex items-start gap-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="p-3 bg-white dark:bg-zinc-800 rounded-full shadow-sm">
              <Lock className="h-6 w-6 text-[#168BB0]" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">{t("secure_checkout")}</h2>
              <p className="text-sm text-zinc-500 mt-1">{t("secure_checkout_desc")}</p>
            </div>
          </div>
          
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100">{itemName}</h3>
                  <p className="text-sm text-zinc-500 mt-1">{itemDescription}</p>
                </div>
                <div className="font-extrabold text-2xl text-zinc-900 dark:text-zinc-100">
                  ${itemPrice.toFixed(2)}
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{t("total_due")}</span>
                  <span className="font-extrabold text-3xl text-[#168BB0] dark:text-[#45B0D2]">${itemPrice.toFixed(2)}</span>
                </div>
              </div>

              <Button 
                onClick={handlePay}
                disabled={isPending || itemPrice <= 0}
                className="w-full h-14 bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold text-lg mt-6 shadow-lg shadow-[#168BB0]/20"
              >
                {t("btn_stripe")}
              </Button>
              
              <div className="flex justify-center items-center gap-2 text-xs text-zinc-400 mt-4">
                <ShieldCheck className="h-4 w-4" />
                <span>{t("stripe_processing_badge")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
