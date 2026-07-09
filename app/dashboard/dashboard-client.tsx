"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestProfileChangeAction } from "@/app/actions/dashboard";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Pagination } from "@/components/ui/pagination";
import {
  Key, Copy, RefreshCw, AlertTriangle, ExternalLink,
  ShieldCheck, Mail, Server, MessageCircle, AlertCircle
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getServicesAction } from "@/app/actions/services";
import { calculateUpgradePriceAction } from "@/app/actions/stripe";

// Ticking 2FA Timer Component
const TwoFactorTimer: React.FC<{ secret: string }> = ({ secret }) => {
  const { t } = useTranslation("client_dashboard");
  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    const generateCode = () => {
      // Simulate TOTP generation based on secret string hash
      let sum = 0;
      for (let i = 0; i < secret.length; i++) {
        sum += secret.charCodeAt(i) * (i + 1);
      }
      // Mix with current epoch block (30 sec interval)
      const epochBlock = Math.floor(Date.now() / 30000);
      const codeNum = (sum * epochBlock) % 900000 + 100000;
      setCode(codeNum.toString());
    };

    generateCode();

    const interval = setInterval(() => {
      const sec = 30 - (Math.floor(Date.now() / 1000) % 30);
      setSecondsLeft(sec);
      if (sec === 30) {
        generateCode();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [secret]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 text-xs font-mono">
      <div className="flex items-center gap-2">
        <span className="text-zinc-400 font-bold uppercase tracking-wider text-[9px] block">{t("card_2fa")}</span>
        <span className="text-sm font-bold text-[#168BB0] dark:text-[#45B0D2] tracking-widest">{code}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-zinc-500 font-bold shrink-0">{secondsLeft}s</span>
        <Button size="icon" variant="ghost" title={t("btn_copy", { defaultValue: "Copy" })} className="h-6 w-6 text-zinc-500 hover:text-zinc-950 dark:hover:text-white" onClick={copyToClipboard}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export type ProfileAccountRecord = {
  id: string;
  profile_name: string;
  account_email: string;
  account_password?: string;
  email_password?: string | null;
  two_factor_secret?: string | null;
  ixbrowser_profile_id?: string | null;
  ixbrowser_group?: string | null;
  status: "AVAILABLE" | "ASSIGNED" | "ACTIVE" | "EXPIRED" | "BANNED" | "CANCELLED" | "REQUEST_CHANGE";
  admin_notes?: string | null;
  client_notes?: string | null;
  assigned_client_id?: string | null;
  assignment_date?: string | null;
  expiration_date?: string | null;
  renewal_count?: number | null;
  current_renewal_month?: number | null;
  client_name?: string;
  client_email?: string;
};

export default function DashboardClient({ initialProfiles }: { initialProfiles: ProfileAccountRecord[] }) {
  const { t } = useTranslation("client_dashboard");
  const { t: tStatus } = useTranslation("status");
  const { success, info, error } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Renewal/upgrade selection state
  const [services, setServices] = useState<any[]>([]);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [prorationDetails, setProrationDetails] = useState<{ credit: number; finalPrice: number; targetPrice: number } | null>(null);
  const [calculatingProration, setCalculatingProration] = useState(false);

  // Fetch active services list
  useEffect(() => {
    getServicesAction()
      .then((data: any) => {
        if (data) {
          setServices(data.filter((s: any) => s.is_active));
        }
      })
      .catch((err) => console.error("Error loading services:", err));
  }, []);

  // Update proration details dynamically when selection changes
  useEffect(() => {
    if (isRenewModalOpen && selectedProfile && selectedServiceId) {
      setCalculatingProration(true);
      calculateUpgradePriceAction(selectedProfile.id, selectedServiceId)
        .then((res: any) => {
          if (res.success) {
            setProrationDetails({
              credit: res.credit,
              finalPrice: res.finalPrice,
              targetPrice: res.targetPrice,
            });
          } else {
            console.error("Failed to calculate proration:", res.error);
          }
        })
        .catch((err) => console.error("Proration calculation error:", err))
        .finally(() => setCalculatingProration(false));
    }
  }, [isRenewModalOpen, selectedProfile, selectedServiceId]);

  const handleOpenRenewModal = (profile: any) => {
    setSelectedProfile(profile);
    setIsRenewModalOpen(true);
    const defaultSrvId = profile.service_id || (services.length > 0 ? services[0].id : "");
    setSelectedServiceId(defaultSrvId);
  };

  const handleProceedCheckout = () => {
    if (!selectedProfile || !selectedServiceId) return;
    router.push(`/checkout?type=renewal&profileId=${selectedProfile.id}&serviceId=${selectedServiceId}`);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      return `${d}-${m}-${y}`;
    } catch {
      return dateString;
    }
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleRequestChange = (profileId: string) => {
    if (confirm(t("alert_req_change_text"))) {
      startTransition(async () => {
        await requestProfileChangeAction(profileId);
        success(t("alert_requested_text"));
      });
    }
  };

  // The server action already filters for the current user and valid statuses
  const clientProfiles = initialProfiles;

  // Calculate paginated results
  const paginatedProfiles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return clientProfiles.slice(startIndex, startIndex + itemsPerPage);
  }, [clientProfiles, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(clientProfiles.length / itemsPerPage);

  // Expiration calculation helper
  const getDaysRemaining = (expDateStr?: string | null) => {
    if (!expDateStr) return null;
    const today = new Date();
    const expDate = new Date(expDateStr);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Check if any profiles are expiring soon
  const expiringSoonProfiles = clientProfiles.filter(p => {
    const days = getDaysRemaining(p.expiration_date);
    return p.status === "ACTIVE" && days !== null && days >= 0 && days <= 7;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4 sm:pb-5">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold tracking-tight">{t("title")}</h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            {t("subtitle")}
          </p>
        </div>
        <Button
          className="bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold cursor-pointer h-10 text-sm w-full sm:w-auto shrink-0"
          onClick={() => router.push("/dashboard/payments")}
        >
          {t("buy_new_service")}
        </Button>
      </div>

      {/* Expiring Alert Banner */}
      {expiringSoonProfiles.length > 0 && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-900 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div className="flex-1 min-w-0">
            <AlertTitle className="font-bold text-sm sm:text-base">{t("exp_warning_title")}</AlertTitle>
            <AlertDescription className="text-xs sm:text-sm mt-1 leading-relaxed">
              {t("exp_warning_desc", { count: expiringSoonProfiles.length })}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Instructions callout */}
      <Card className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/80">
        <CardContent className="p-3 sm:p-4 flex gap-3 sm:gap-3.5 items-start text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          <Server className="h-4 w-4 sm:h-5 sm:w-5 text-[#168BB0] dark:text-[#45B0D2] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-200">{t("instructions_title")}</h4>
            <p className="leading-relaxed">
              {t("instructions_desc")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Profiles Grid */}
      {clientProfiles.length === 0 ? (
        <div className="text-center py-8 sm:py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-4 sm:p-6 bg-white dark:bg-zinc-900/40">
          <ShieldCheck className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-zinc-400 mb-2 sm:mb-3" />
          <h3 className="font-bold text-sm sm:text-base text-zinc-800 dark:text-zinc-200">{t("no_profiles_title")}</h3>
          <p className="text-xs sm:text-sm text-zinc-500 max-w-sm mx-auto mt-1 sm:mt-2 leading-relaxed">
            {t("no_profiles_desc")}
          </p>
          <Button
            size="sm"
            className="mt-3 sm:mt-4 bg-[#168BB0] hover:bg-[#0F7493] text-white font-semibold cursor-pointer h-9 sm:h-10"
            onClick={() => router.push("/dashboard/payments")}
          >
            {t("go_to_store")}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {paginatedProfiles.map((p) => {
            const daysLeft = getDaysRemaining(p.expiration_date);
            const isExpiringSoon = p.status === "ACTIVE" && daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
            const isExpired = p.status === "EXPIRED" || (daysLeft !== null && daysLeft < 0);
            
            let statusBadgeColor = "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
            if (p.status === "ACTIVE") {
              statusBadgeColor = isExpiringSoon
                ? "bg-[#EAF7FB] text-[#0F7493] border-[#168BB0]/20 dark:bg-[#168BB0]/20 dark:text-[#45B0D2] dark:border-[#168BB0]/40"
                : "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60";
            } else if (p.status === "REQUEST_CHANGE") {
              statusBadgeColor = "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/60";
            } else if (p.status === "BANNED") {
              statusBadgeColor = "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60";
            } else if (isExpired) {
              statusBadgeColor = "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60 animate-pulse";
            }

            return (
              <Card key={p.id} className={`bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between overflow-hidden relative ${p.status === "REQUEST_CHANGE" ? "ring-2 ring-orange-500/30 bg-orange-50/50 dark:bg-orange-950/10" : isExpiringSoon || isExpired ? "ring-1 ring-[#168BB0]/20" : ""}`}>
                {/* REQUEST_CHANGE Banner */}
                {p.status === "REQUEST_CHANGE" && (
                  <div className="bg-orange-500/10 text-orange-700 dark:text-orange-300 border-b border-orange-500/15 px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold">
                    <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 inline mr-1.5" />
                    {t("banner_change_requested")}
                  </div>
                )}
                {/* Expiring Alert Banner inside Card */}
                {isExpiringSoon && (
                  <div className="bg-[#168BB0]/10 text-[#0F7493] dark:text-[#45B0D2] border-b border-[#168BB0]/15 px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    {daysLeft === 1 ? t("banner_expiring_one", { count: daysLeft }) : t("banner_expiring", { count: daysLeft })}
                  </div>
                )}
                {isExpired && (
                  <div className="bg-red-500/10 text-red-700 dark:text-red-300 border-b border-red-500/15 px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    {t("banner_expired")}
                  </div>
                )}

                <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-4 px-3 sm:px-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-0.5 sm:space-y-1 min-w-0">
                      <CardTitle className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white truncate">{p.profile_name}</CardTitle>
                      <CardDescription className="text-[10px] sm:text-[11px] text-zinc-500">
                        {t("assigned_on", { date: formatDate(p.assignment_date) || "N/A" })}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className={`${statusBadgeColor} font-bold text-[8px] sm:text-[9px] uppercase tracking-wider shrink-0`}>
                      {isExpired ? t("card_expired") : tStatus(p.status, { defaultValue: p.status })}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 sm:space-y-4 pb-3 sm:pb-4 px-3 sm:px-4">
                  {/* Account Details Block */}
                  <div className="space-y-2 sm:space-y-2.5">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                      {t("card_credentials")}
                    </span>

                    {/* Account Email */}
                    <div className="flex items-center justify-between text-xs sm:text-xs bg-zinc-50 dark:bg-zinc-950 p-2 sm:p-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-zinc-400 shrink-0" />
                        <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{p.account_email}</span>
                      </div>
                      <Button size="icon" variant="ghost" title={t("btn_copy", { defaultValue: "Copy" })} className="h-6 w-6 sm:h-7 sm:w-7 text-zinc-500 shrink-0" onClick={() => copyText(p.account_email, "Email")}>
                        <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </Button>
                    </div>

                  </div>

                  {/* 2FA Generator if present */}
                  {p.two_factor_secret && (
                    <div className="space-y-1 sm:space-y-1.5">
                      <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                        {t("card_2fa")}
                      </span>
                      <TwoFactorTimer secret={p.two_factor_secret} />
                    </div>
                  )}

                  {/* IXBrowser Details Block */}
                  <div className="space-y-2 bg-zinc-50 dark:bg-zinc-950 p-2 sm:p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                      {t("card_ixbrowser")}
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 sm:gap-4 text-xs">
                      <div>
                        <div className="text-[10px] text-zinc-500">{t("card_profile_id")}</div>
                        <div className="font-bold font-mono text-zinc-800 dark:text-zinc-200 flex items-center justify-between mt-0.5">
                          <span className="truncate">{p.ixbrowser_profile_id || t("card_not_set")}</span>
                          {p.ixbrowser_profile_id && (
                            <Button size="icon" variant="ghost" title={t("btn_copy", { defaultValue: "Copy" })} className="h-5 w-5 text-zinc-500" onClick={() => copyText(p.ixbrowser_profile_id || "", t("card_profile_id"))}>
                              <Copy className="h-2.5 w-2.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-500">{t("card_group")}</div>
                        <div className="font-bold font-mono text-zinc-800 dark:text-zinc-200 flex items-center justify-between mt-0.5">
                          <span className="truncate">{p.ixbrowser_group || t("card_not_set")}</span>
                          {p.ixbrowser_group && (
                            <Button size="icon" variant="ghost" title={t("btn_copy", { defaultValue: "Copy" })} className="h-5 w-5 text-zinc-500" onClick={() => copyText(p.ixbrowser_group || "", t("card_group"))}>
                              <Copy className="h-2.5 w-2.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expiration detail */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm border-t border-zinc-100 dark:border-zinc-800/80 pt-2 sm:pt-3">
                    <span className="text-zinc-500">{t("card_expires")}</span>
                    <span className={`font-bold ${isExpiringSoon || isExpired ? "text-[#168BB0] dark:text-[#45B0D2]" : "text-zinc-700 dark:text-zinc-300"}`}>
                      {formatDate(p.expiration_date) || "N/A"}
                      {p.expiration_date && (
                        <span className="text-[9px] sm:text-[10px] font-medium ml-1.5 text-zinc-400">
                          ({isExpired ? t("card_expired") : (daysLeft === 1 ? t("card_days_left_one", { count: daysLeft }) : t("card_days_left", { count: daysLeft }))})
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Client visible note */}
                  {p.client_notes && (
                    <div className="p-2 sm:p-2.5 rounded bg-[#168BB0]/5 text-[10px] sm:text-xs text-[#0F7493] dark:text-[#45B0D2]/80 border border-[#168BB0]/10 italic leading-relaxed">
                      Note: {p.client_notes}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 p-2 sm:p-3 flex flex-col gap-2">
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <Button
                      variant="outline"
                      className="flex-1 h-9 sm:h-10 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs sm:text-sm font-semibold"
                      disabled={!p.ixbrowser_profile_id}
                      onClick={() => info(t("alert_launch_text"))}
                    >
                      <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 text-zinc-400 shrink-0" />
                      <span className="hidden sm:inline">{t("btn_launch_how")}</span>
                      <span className="sm:hidden">{t("btn_launch")}</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-9 sm:h-10 border-[#168BB0]/20 bg-[#168BB0]/5 hover:bg-[#168BB0]/10 text-[#168BB0] dark:text-[#45B0D2] text-xs sm:text-sm font-semibold"
                      onClick={() => window.open("https://t.me/YOUR_HANDLE", "_blank")}
                    >
                      <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 shrink-0" />
                      {t("btn_support")}
                    </Button>
                    <Button
                      className="flex-1 h-9 sm:h-10 bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold text-xs sm:text-sm cursor-pointer"
                      onClick={() => handleOpenRenewModal(p)}
                    >
                      <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 shrink-0" />
                      <span className="hidden sm:inline">{t("btn_renew_profile")}</span>
                      <span className="sm:hidden">{t("btn_renew")}</span>
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full h-9 sm:h-10 border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs sm:text-sm font-semibold"
                    onClick={() => handleRequestChange(p.id)}
                    disabled={p.status === "REQUEST_CHANGE" || isPending}
                  >
                    <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 shrink-0" />
                    {p.status === "REQUEST_CHANGE" ? t("btn_change_requested") : t("btn_request_change")}
                  </Button>
                </CardFooter>
              </Card>
            );
            })}
          </div>

          {/* Renewal / Upgrade Package Selection Modal */}
          <Dialog open={isRenewModalOpen} onOpenChange={setIsRenewModalOpen}>
            <DialogContent className="sm:max-w-[450px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 p-6 rounded-xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-extrabold tracking-tight">
                  {t("modal_renew_title", { defaultValue: "Renew / Upgrade Profile" })}
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500 mt-1">
                  {t("modal_renew_desc", { defaultValue: "Select a package to extend or upgrade your profile account subscription." })}
                </DialogDescription>
              </DialogHeader>

              {selectedProfile && (
                <div className="space-y-4 py-4 text-xs">
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <div className="flex justify-between">
                      <span className="font-semibold text-zinc-500">{t("lbl_profile_name", { defaultValue: "Profile Name:" })}</span>
                      <span className="font-bold text-zinc-900 dark:text-white">{selectedProfile.profile_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-zinc-500">{t("lbl_current_expiration", { defaultValue: "Current Expiration:" })}</span>
                      <span className="font-bold text-zinc-900 dark:text-white">{formatDate(selectedProfile.expiration_date) || "N/A"}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-700 dark:text-zinc-300">{t("lbl_select_package", { defaultValue: "Choose Renewal Package" })}</label>
                    <Select value={selectedServiceId} onValueChange={(val) => setSelectedServiceId(val || "")}>
                      <SelectTrigger className="w-full bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs h-10">
                        <SelectValue placeholder="Select a package">
                          {(value) => {
                            const srv = services.find((s) => s.id === value);
                            return srv ? `${srv.name} — €${srv.price} (${srv.duration_days} Days)` : null;
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                        {services.map((srv) => (
                          <SelectItem key={srv.id} value={srv.id} className="text-xs">
                            {srv.name} — €{srv.price} ({srv.duration_days} Days)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {calculatingProration ? (
                    <div className="flex items-center justify-center p-4">
                      <span className="text-zinc-500 animate-pulse">{t("lbl_calculating", { defaultValue: "Calculating proration credit..." })}</span>
                    </div>
                  ) : (
                    prorationDetails && (
                      <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">{t("lbl_package_price", { defaultValue: "Package Price:" })}</span>
                          <span className="font-semibold">€{prorationDetails.targetPrice.toFixed(2)}</span>
                        </div>
                        {prorationDetails.credit > 0 && (
                          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                            <span>{t("lbl_unused_credit", { defaultValue: "Unused Credit (Applied):" })}</span>
                            <span className="font-semibold">- €{prorationDetails.credit.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 flex justify-between text-zinc-900 dark:text-white font-bold font-extrabold">
                          <span className="text-sm">{t("lbl_amount_due", { defaultValue: "Amount Due:" })}</span>
                          <span className="text-base">€{prorationDetails.finalPrice.toFixed(2)}</span>
                        </div>
                        {prorationDetails.credit > 0 && (
                          <p className="text-[10px] text-zinc-500 leading-normal mt-1">
                            * {t("lbl_proration_note", { defaultValue: "By upgrading, your subscription cycle starts today and the new validity period begins immediately." })}
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsRenewModalOpen(false)}
                  className="h-10 text-xs px-4 border-zinc-200"
                >
                  {t("btn_cancel", { defaultValue: "Cancel" })}
                </Button>
                <Button
                  onClick={handleProceedCheckout}
                  disabled={calculatingProration || !selectedServiceId}
                  className="bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold h-10 text-xs px-6 cursor-pointer"
                >
                  {t("btn_proceed_checkout", { defaultValue: "Proceed to Checkout" })}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Pagination */}
          {clientProfiles.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={clientProfiles.length}
              itemsPerPage={itemsPerPage}
            />
          )}
        </>
      )}
    </div>
  );
}
