"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
   Users, ShieldAlert, FolderKey, Clock, 
   Check, X, AlertTriangle, ArrowRight, Loader2
} from "lucide-react";
import { updateClientStatusAction } from "@/app/actions/clients";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import { useToast } from "@/context/ToastContext";

// --- DTOs (Data Transfer Objects) ---
export interface PendingClientDTO {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface ExpiringProfileDTO {
  id: string;
  profile_name: string;
  expiration_date: string;
  assigned_client_id: string | null;
  users?: { name: string };
}

export interface DashboardStatsDTO {
  activeClientsCount: number;
  pendingClientsCount: number;
  pendingClients: PendingClientDTO[];
  availableProfilesCount: number;
  expiringProfilesCount: number;
  expiringProfiles: ExpiringProfileDTO[];
}

interface DashboardClientProps {
  initialStats: DashboardStatsDTO;
}

// --- PURE HELPER FUNCTIONS ---
const calculateDaysRemaining = (expDateStr?: string): number | null => {
  if (!expDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today
  
  const expDate = new Date(expDateStr);
  expDate.setHours(0, 0, 0, 0); // Normalize expiration

  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getClientNameFromProfile = (profile: ExpiringProfileDTO): string => {
  return profile.users?.name || "Unknown Client";
};

export default function DashboardClient({ initialStats }: DashboardClientProps) {
  const { t } = useTranslation("admin_dashboard");
  const { success, error, warning } = useToast();
  const [isPending, startTransition] = useTransition();

  const {
    activeClientsCount,
    pendingClientsCount,
    pendingClients,
    availableProfilesCount,
    expiringProfilesCount,
    expiringProfiles
  } = initialStats;

  useEffect(() => {
    if (expiringProfilesCount > 0) {
      warning(`${t("alert_required")} ${t("alert_desc", { count: expiringProfilesCount })}`, 8000);
    }
  }, [expiringProfilesCount, t, warning]);

  const handleApproveClient = (clientId: string) => {
    startTransition(async () => {
      const result = await updateClientStatusAction(clientId, "ACTIVE");
      if (result.success) {
        success(t('alert_approved_text'));
      } else {
        error(result.error || "An error occurred");
      }
    });
  };

  const handleRejectClient = async (clientId: string) => {
    const result = await Swal.fire({
      title: t("are_you_sure", { defaultValue: "Are you sure?" }),
      text: t('alert_reject_text'),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#168BB0",
      cancelButtonColor: "#d33",
      confirmButtonText: t("yes", { defaultValue: "Yes" })
    });

    if (result.isConfirmed) {
      startTransition(async () => {
        const res = await updateClientStatusAction(clientId, "DEACTIVATED");
        if (res.success) {
          success(t('alert_rejected_title'));
        } else {
          error(res.error || "An error occurred");
        }
      });
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Loading Overlay for Server Actions */}
      {isPending && (
        <div className="absolute inset-0 bg-white/50 dark:bg-zinc-950/50 z-50 flex items-center justify-center rounded-lg backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-[#168BB0]" />
        </div>
      )}

      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">{t("title")}</h1>
        <p className="text-xs text-zinc-500 mt-1">
          {t("subtitle")}
        </p>
      </div>


      {/* Stats Counter Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Clients */}
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              {t("card_active_clients")}
            </span>
            <Users className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{activeClientsCount}</div>
            <p className="text-[10px] text-zinc-500 mt-1">{t("card_active_desc")}</p>
          </CardContent>
        </Card>

        {/* Card 2: Pending Approvals */}
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              {t("card_pending_registrations")}
            </span>
            <Clock className="h-4 w-4 text-[#168BB0]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{pendingClientsCount}</div>
            {pendingClientsCount > 0 ? (
              <p className="text-[10px] text-[#168BB0] font-semibold mt-1 animate-pulse">{t("card_pending_desc")}</p>
            ) : (
              <p className="text-[10px] text-zinc-500 mt-1">{t("card_pending_desc_empty")}</p>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Available Profiles */}
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              {t("card_available_profiles")}
            </span>
            <FolderKey className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{availableProfilesCount}</div>
            <p className="text-[10px] text-zinc-500 mt-1">{t("card_available_desc")}</p>
          </CardContent>
        </Card>

        {/* Card 4: Expiring Alert */}
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              {t("card_expiring_profiles")}
            </span>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{expiringProfilesCount}</div>
            {expiringProfilesCount > 0 ? (
              <p className="text-[10px] text-red-500 font-semibold mt-1">{t("card_expiring_desc")}</p>
            ) : (
              <p className="text-[10px] text-zinc-500 mt-1">{t("card_expiring_desc_empty")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grid: Pending Approvals & Expiring Profiles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Pending Approvals Table (Col span 7) */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-[#168BB0] dark:text-[#45B0D2]" />
            {t("pending_title", { count: pendingClientsCount })}
          </h3>

          <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {pendingClientsCount === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                {t("pending_empty")}
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                      <TableRow>
                        <TableHead className="text-xs font-bold text-zinc-500 h-9">{t("col_client_name")}</TableHead>
                        <TableHead className="text-xs font-bold text-zinc-500 h-9">{t("col_email")}</TableHead>
                        <TableHead className="text-xs font-bold text-zinc-500 h-9 text-right">{t("col_action")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingClients.map((client) => (
                        <TableRow key={client.id} className="border-b border-zinc-200 dark:border-zinc-800">
                          <TableCell className="text-xs font-bold text-zinc-800 dark:text-zinc-100">{client.name}</TableCell>
                          <TableCell className="text-xs text-zinc-500">{client.email}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer flex items-center gap-1"
                                onClick={() => handleApproveClient(client.id)}
                              >
                                <Check className="h-3.5 w-3.5" />
                                {t("btn_approve")}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 font-semibold text-[11px]"
                                onClick={() => handleRejectClient(client.id)}
                              >
                                <X className="h-3.5 w-3.5" />
                                {t("btn_reject")}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Mobile Cards View */}
                <div className="md:hidden flex flex-col gap-3 p-3">
                  {pendingClients.map((client) => (
                    <div key={client.id} className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 flex flex-col gap-3">
                      <div>
                        <div className="text-xs font-bold text-zinc-800 dark:text-zinc-100">{client.name}</div>
                        <div className="text-[11px] text-zinc-500">{client.email}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer flex items-center justify-center gap-1"
                          onClick={() => handleApproveClient(client.id)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {t("btn_approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 h-8 text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-red-200 dark:border-red-900/30 font-semibold text-[11px] flex items-center justify-center gap-1"
                          onClick={() => handleRejectClient(client.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                          {t("btn_reject")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Expiring Profiles Table (Col span 5) */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            {t("expiring_title", { count: expiringProfilesCount })}
          </h3>

          <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {expiringProfilesCount === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                {t("expiring_empty")}
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                      <TableRow>
                        <TableHead className="text-xs font-bold text-zinc-500 h-9">{t("col_profile")}</TableHead>
                        <TableHead className="text-xs font-bold text-zinc-500 h-9">{t("col_client")}</TableHead>
                        <TableHead className="text-xs font-bold text-zinc-500 h-9 text-right">{t("col_days_left")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expiringProfiles.map((p) => {
                        const days = calculateDaysRemaining(p.expiration_date);
                        return (
                          <TableRow key={p.id} className="border-b border-zinc-200 dark:border-zinc-800">
                            <TableCell className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              <Link href={`/admin/profiles?action=edit&id=${p.id}`} className="hover:underline flex items-center gap-1 text-[#168BB0] dark:text-[#45B0D2]">
                                {p.profile_name}
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            </TableCell>
                            <TableCell className="text-xs text-zinc-500 font-medium">
                              {getClientNameFromProfile(p)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25 shadow-none text-[9px] font-bold">
                                {days !== null ? t("days_remaining_suffix", { count: days }) : "N/A"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Mobile Cards View */}
                <div className="md:hidden flex flex-col gap-3 p-3">
                  {expiringProfiles.map((p) => {
                    const days = calculateDaysRemaining(p.expiration_date);
                    return (
                      <div key={p.id} className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <Link href={`/admin/profiles?action=edit&id=${p.id}`} className="font-bold text-xs hover:underline flex items-center gap-1 text-[#168BB0] dark:text-[#45B0D2]">
                            {p.profile_name}
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                          <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25 shadow-none text-[9px] font-bold">
                            {days !== null ? t("days_remaining_suffix", { count: days }) : "N/A"}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-zinc-500 font-medium">
                          {getClientNameFromProfile(p)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
