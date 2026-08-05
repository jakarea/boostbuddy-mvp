"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestProfileChangeAction } from "@/app/actions/dashboard";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import {
  Key, Copy, RefreshCw, AlertTriangle, ExternalLink,
  ShieldCheck, Mail, Server, MessageCircle, AlertCircle,
  ShoppingBag, PlusCircle, Settings, Receipt
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { showConfirm } from "@/lib/utils/swal";
import { StatCardSkeleton } from "@/components/ui/skeleton-card";
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
    let generateCode: () => void;
    
    try {
      // Clean up the secret (remove spaces, etc. common in Meta BM secrets)
      const cleanSecret = secret.replace(/\s+/g, '').toUpperCase();
      
      // Dynamic import to avoid SSR issues if otpauth relies on browser APIs
      import('otpauth').then((module) => {
        const OTPAuth = (module as any).default || module;
        const totp = new OTPAuth.TOTP({
          issuer: "BoostBuddy",
          label: "Profile",
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(cleanSecret),
        });

        generateCode = () => {
          try {
            setCode(totp.generate());
          } catch (e) {
            console.error("Failed to generate TOTP", e);
            setCode("ERROR");
          }
        };

        generateCode();

        const interval = setInterval(() => {
          const sec = 30 - (Math.floor(Date.now() / 1000) % 30);
          setSecondsLeft(sec);
          if (sec === 30 || sec === 0) {
            generateCode();
          }
        }, 1000);
        
        // Clean up internal interval when component unmounts
        // or secret changes
        return () => clearInterval(interval);
      }).catch(err => {
        console.error("Failed to load OTPAuth", err);
        setCode("ERROR");
      });
    } catch (e) {
      console.error("Invalid TOTP secret", e);
      setCode("INVALID");
    }

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

export default function DashboardClient({ initialProfiles, creditsBalance = 0 }: { initialProfiles: ProfileAccountRecord[]; creditsBalance?: number }) {
  const { t } = useTranslation("client_dashboard");
  const { t: tStatus } = useTranslation("status");
  const { success, info, error, warning } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Renewal/upgrade selection state
  const [services, setServices] = useState<any[]>([]);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [prorationDetails, setProrationDetails] = useState<{ credit: number; finalPrice: number; targetPrice: number } | null>(null);
  const [calculatingProration, setCalculatingProration] = useState(false);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);

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

  const handleRequestChange = async (profileId: string) => {
    const result = await showConfirm({
      title: t("are_you_sure", { defaultValue: "Are you sure?" }),
      text: t("alert_req_change_text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#168BB0",
      cancelButtonColor: "#d33",
      confirmButtonText: t("yes", { defaultValue: "Yes" })
    });

    if (result.isConfirmed) {
      startTransition(async () => {
        await requestProfileChangeAction(profileId);
        success(t("alert_requested_text"));
      });
    }
  };

  // Expiration calculation helper - must be defined before accountStats
  const getDaysRemaining = (expDateStr?: string | null) => {
    if (!expDateStr) return null;
    const today = new Date();
    const expDate = new Date(expDateStr);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // The server action already filters for the current user and valid statuses
  const clientProfiles = initialProfiles;

  // Calculate statistics for account summary
  const accountStats = useMemo(() => {
    const total = clientProfiles.length;
    const active = clientProfiles.filter(p => p.status === "ACTIVE").length;
    const expiring = clientProfiles.filter(p => {
      const days = getDaysRemaining(p.expiration_date);
      return p.status === "ACTIVE" && days !== null && days >= 0 && days <= 7;
    }).length;
    const expired = clientProfiles.filter(p => p.status === "EXPIRED" || (getDaysRemaining(p.expiration_date) || 0) < 0).length;
    const requestChange = clientProfiles.filter(p => p.status === "REQUEST_CHANGE").length;

    return { total, active, expiring, expired, requestChange };
  }, [clientProfiles]);

  // Calculate paginated results
  const paginatedProfiles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return clientProfiles.slice(startIndex, startIndex + itemsPerPage);
  }, [clientProfiles, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(clientProfiles.length / itemsPerPage);

  // Check if any profiles are expiring soon
  const expiringSoonProfiles = clientProfiles.filter(p => {
    const days = getDaysRemaining(p.expiration_date);
    return p.status === "ACTIVE" && days !== null && days >= 0 && days <= 7;
  });

  // Trigger warning toast for expiring soon profiles
  useEffect(() => {
    if (expiringSoonProfiles.length > 0) {
      warning(`${t("exp_warning_title")} ${t("exp_warning_desc", { count: expiringSoonProfiles.length })}`, 8000);
    }
  }, [expiringSoonProfiles.length, t, warning]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4 sm:pb-5">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold tracking-tight">{t("title", { defaultValue: "Dashboard" })}</h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            {t("subtitle", { defaultValue: "Welcome back! Here's your account overview." })}
          </p>
        </div>
      </div>

      {/* Account Summary Statistics - Show skeleton during loading */}
      {isLoadingProfiles ? (
        <StatCardSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 sm:p-4 shadow-sm border border-zinc-200 dark:border-zinc-700">
          <div className="text-xs text-zinc-500 mb-1">{t("stats.total", { defaultValue: "Total Profiles" })}</div>
          <div className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">{accountStats.total}</div>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 sm:p-4 shadow-sm border border-zinc-200 dark:border-zinc-700">
          <div className="text-xs text-zinc-500 mb-1">{t("stats.active", { defaultValue: "Active" })}</div>
          <div className="text-2xl sm:text-3xl font-bold text-green-600">{accountStats.active}</div>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 sm:p-4 shadow-sm border border-zinc-200 dark:border-zinc-700">
          <div className="text-xs text-zinc-500 mb-1">{t("stats.expiring", { defaultValue: "Expiring Soon" })}</div>
          <div className="text-2xl sm:text-3xl font-bold text-yellow-600">{accountStats.expiring}</div>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 sm:p-4 shadow-sm border border-zinc-200 dark:border-zinc-700">
          <div className="text-xs text-zinc-500 mb-1">{t("stats.expired", { defaultValue: "Expired" })}</div>
          <div className="text-2xl sm:text-3xl font-bold text-red-600">{accountStats.expired}</div>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 sm:p-4 shadow-sm border border-zinc-200 dark:border-zinc-700">
          <div className="text-xs text-zinc-500 mb-1">{t("stats.requests", { defaultValue: "Change Requests" })}</div>
          <div className="text-2xl sm:text-3xl font-bold text-orange-600">{accountStats.requestChange}</div>
        </div>
        <div className="bg-gradient-to-br from-[#168BB0] to-[#0F7493] rounded-lg p-3 sm:p-4 shadow-sm border border-[#168BB0]/20">
          <div className="text-xs text-white/80 mb-1">{t("stats.credits", { defaultValue: "Credits Balance" })}</div>
          <div className="text-2xl sm:text-3xl font-bold text-white">{creditsBalance}</div>
        </div>
      </div>
      )}
    </div>
  );
}
