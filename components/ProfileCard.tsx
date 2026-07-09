"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { AlertCircle, Copy } from "lucide-react";
import { getDaysRemaining, isExpiringSoon, isExpired } from "@/lib/dateUtils";
import { useTranslation } from "react-i18next";

export interface ProfileCardData {
  id: string;
  profileName: string;
  accountEmail: string;
  status: string;
  expirationDate?: string;
  iXBrowserProfileId?: string;
  iXBrowserGroup?: string;
  assignmentDate?: string;
  assignedClientName?: string;
  renewalCount?: number;
  currentRenewalMonth?: number;
}

interface ProfileCardProps {
  profile: ProfileCardData;
  showCopyButtons?: boolean;
  onRequestChange?: (profileId: string) => void;
  onRenew?: (profileId: string) => void;
  onEdit?: (profileId: string) => void;
  onDelete?: (profileId: string) => void;
  onAssign?: (profileId: string) => void;
  onRelease?: (profileId: string) => void;
  currentDate?: Date;
  children?: React.ReactNode;
}

export function ProfileCard({
  profile,
  showCopyButtons = false,
  onRequestChange,
  onRenew,
  onEdit,
  onDelete,
  onAssign,
  onRelease,
  currentDate,
  children,
}: ProfileCardProps) {
  const { t } = useTranslation("profile_card");
  const daysLeft = getDaysRemaining(profile.expirationDate, currentDate);
  const expiringSoon = isExpiringSoon(profile.expirationDate, profile.status, 7, currentDate);
  const expired = isExpired(profile.expirationDate, profile.status, currentDate);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card
      className={`bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between overflow-hidden relative ${
        profile.status === "REQUEST_CHANGE"
          ? "ring-2 ring-orange-500/30 bg-orange-50/50 dark:bg-orange-950/10"
          : expiringSoon || expired
            ? "ring-1 ring-[#168BB0]/20"
            : ""
      }`}
    >
      {/* REQUEST_CHANGE Banner */}
      {profile.status === "REQUEST_CHANGE" && (
        <div className="bg-orange-500/10 text-orange-700 dark:text-orange-300 border-b border-orange-500/15 px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold">
          <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 inline mr-1.5" />
          {t("banner_change_requested")}
        </div>
      )}

      {/* Expiring Alert Banner */}
      {expiringSoon && (
        <div className="bg-[#168BB0]/10 text-[#0F7493] dark:text-[#45B0D2] border-b border-[#168BB0]/15 px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          {daysLeft === 1 ? t("banner_expiring_one", { count: daysLeft }) : t("banner_expiring", { count: daysLeft })}
        </div>
      )}

      {/* Card Header */}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-bold text-zinc-900 dark:text-white truncate">
              {profile.profileName}
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500 truncate mt-0.5">
              {profile.accountEmail}
            </CardDescription>
          </div>
          <StatusBadge
            status={profile.status}
            type="profile"
            isExpiringSoon={expiringSoon}
            isExpired={expired}
            className="shrink-0 mt-0.5"
          />
        </div>
      </CardHeader>

      {/* Card Content */}
      <CardContent className="space-y-2 pb-3">
        {/* IXBrowser ID */}
        {profile.iXBrowserProfileId && (
          <div className="flex items-center justify-between text-[11px] group">
            <span className="text-zinc-600 dark:text-zinc-400">{t("ixbrowser_id")}</span>
            <div className="flex items-center gap-1">
              <span className="font-mono text-zinc-900 dark:text-white truncate">{profile.iXBrowserProfileId}</span>
              {showCopyButtons && (
                <button
                  onClick={() => copyToClipboard(profile.iXBrowserProfileId || "")}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Copy className="h-3 w-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* IXBrowser Group */}
        {profile.iXBrowserGroup && (
          <div className="flex items-center justify-between text-[11px] group">
            <span className="text-zinc-600 dark:text-zinc-400">{t("group")}</span>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-zinc-900 dark:text-white">{profile.iXBrowserGroup}</span>
              {showCopyButtons && (
                <button
                  onClick={() => copyToClipboard(profile.iXBrowserGroup || "")}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Copy className="h-3 w-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Assigned Client */}
        {profile.assignedClientName && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-600 dark:text-zinc-400">{t("assigned_client")}</span>
            <span className="font-semibold text-zinc-900 dark:text-white">{profile.assignedClientName}</span>
          </div>
        )}

        {/* Assignment Date */}
        {profile.assignmentDate && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-600 dark:text-zinc-400">{t("assigned_on")}</span>
            <span className="text-zinc-900 dark:text-white">{profile.assignmentDate}</span>
          </div>
        )}

        {/* Expiration Date */}
        {profile.expirationDate && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-600 dark:text-zinc-400">{t("expires_on")}</span>
            <span className={`font-semibold ${expired ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-white"}`}>
              {profile.expirationDate}
            </span>
          </div>
        )}

        {/* Renewal Info */}
        {profile.renewalCount !== undefined && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-600 dark:text-zinc-400">{t("renewals")}</span>
            <span className="font-semibold text-zinc-900 dark:text-white">
              {profile.renewalCount > 0 ? (profile.renewalCount === 1 ? t("renewals_count_one", { count: profile.renewalCount }) : t("renewals_count", { count: profile.renewalCount })) : t("initial_period")}
            </span>
          </div>
        )}

        {/* Custom Content */}
        {children}
      </CardContent>

      {/* Card Footer with Actions */}
      <CardFooter className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-2">
        {/* Primary Actions */}
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          {onAssign && (
            <Button
              variant="outline"
              className="flex-1 h-9 sm:h-10 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs sm:text-sm font-semibold"
              onClick={() => onAssign(profile.id)}
            >
              {t("btn_assign")}
            </Button>
          )}

          {onRelease && (
            <Button
              variant="outline"
              className="flex-1 h-9 sm:h-10 border-red-200 dark:border-red-900/30 hover:bg-red-500/10 text-red-600 dark:text-red-400 text-xs sm:text-sm font-semibold"
              onClick={() => onRelease(profile.id)}
            >
              {t("btn_release")}
            </Button>
          )}

          {onRenew && (
            <Button
              className="flex-1 h-9 sm:h-10 bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold text-xs sm:text-sm cursor-pointer"
              onClick={() => onRenew(profile.id)}
            >
              {t("btn_renew")}
            </Button>
          )}

          {onEdit && (
            <Button
              variant="outline"
              className="flex-1 h-9 sm:h-10 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs sm:text-sm font-semibold"
              onClick={() => onEdit(profile.id)}
            >
              {t("btn_edit")}
            </Button>
          )}
        </div>

        {/* Secondary Actions */}
        {onRequestChange && (
          <Button
            variant="outline"
            className="w-full h-9 sm:h-10 border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs sm:text-sm font-semibold"
            onClick={() => onRequestChange(profile.id)}
            disabled={profile.status === "REQUEST_CHANGE"}
          >
            <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 shrink-0" />
            {profile.status === "REQUEST_CHANGE" ? t("btn_change_requested") : t("btn_request_change")}
          </Button>
        )}

        {onDelete && (
          <Button
            variant="outline"
            className="w-full h-9 sm:h-10 border-red-200 dark:border-red-900/30 hover:bg-red-500/10 text-red-600 dark:text-red-400 text-xs sm:text-sm font-semibold"
            onClick={() => onDelete(profile.id)}
          >
            {t("btn_delete")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
