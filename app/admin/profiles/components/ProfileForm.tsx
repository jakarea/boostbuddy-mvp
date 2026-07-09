"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { upsertProfileAction } from "@/app/actions/profiles";
import { ProfileAccountRecord } from "./types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

interface ProfileFormProps {
  initialProfile?: ProfileAccountRecord | null;
  onCancel: () => void;
  isEdit: boolean;
}

export default function ProfileForm({ initialProfile, onCancel, isEdit }: ProfileFormProps) {
  const { t } = useTranslation("admin_profiles");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [profileName, setProfileName] = useState(initialProfile?.profile_name || "");
  const [accountEmail, setAccountEmail] = useState(initialProfile?.account_email || "");
  const [accountPassword, setAccountPassword] = useState(initialProfile?.account_password || "");
  const [emailPassword, setEmailPassword] = useState(initialProfile?.email_password || "");
  const [twoFactorSecret, setTwoFactorSecret] = useState(initialProfile?.two_factor_secret || "");
  const [iXBrowserProfileId, setIXBrowserProfileId] = useState(initialProfile?.ixbrowser_profile_id || "");
  const [iXBrowserGroup, setIXBrowserGroup] = useState(initialProfile?.ixbrowser_group || "");
  const [status, setStatus] = useState<ProfileAccountRecord["status"]>(initialProfile?.status || "AVAILABLE");
  const [adminNotes, setAdminNotes] = useState(initialProfile?.admin_notes || "");
  const [clientNotes, setClientNotes] = useState(initialProfile?.client_notes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("profileName", profileName);
    formData.append("accountEmail", accountEmail);
    formData.append("accountPassword", accountPassword);
    if (emailPassword) formData.append("emailPassword", emailPassword);
    if (twoFactorSecret) formData.append("twoFactorSecret", twoFactorSecret);
    if (iXBrowserProfileId) formData.append("ixBrowserProfileId", iXBrowserProfileId);
    if (iXBrowserGroup) formData.append("ixBrowserGroup", iXBrowserGroup);
    if (adminNotes) formData.append("adminNotes", adminNotes);
    if (clientNotes) formData.append("clientNotes", clientNotes);

    startTransition(async () => {
      await upsertProfileAction(formData, initialProfile?.id || undefined);
      router.refresh();
      router.push("/admin/profiles");
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-500"
          onClick={onCancel}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {isEdit ? t("edit_title") : t("new_title")}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            {isEdit ? t("edit_subtitle") : t("new_subtitle")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Credentials Card */}
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base font-extrabold">{t("card_credentials_title")}</CardTitle>
              <CardDescription className="text-xs">
                {t("card_credentials_desc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-name" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("lbl_profile_name")}</Label>
                <Input
                  id="p-name"
                  type="text"
                  placeholder="Chrome-US-Proxy-10"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="p-email" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("lbl_account_email")}</Label>
                  <Input
                    id="p-email"
                    type="email"
                    placeholder="us-browser-10@gmail.com"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-pass" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("lbl_account_password")}</Label>
                  <Input
                    id="p-pass"
                    type="text"
                    placeholder="Pass123!"
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                    required
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="p-empass" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("lbl_email_password")}</Label>
                  <Input
                    id="p-empass"
                    type="text"
                    placeholder="RecoveryEmailPass"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className="bg-zinc-50 dark:bg-zinc-955 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-2fa" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("lbl_two_factor_secret")}</Label>
                  <Input
                    id="p-2fa"
                    type="text"
                    placeholder="JBSWY3DPEHPK3PXP"
                    value={twoFactorSecret}
                    onChange={(e) => setTwoFactorSecret(e.target.value)}
                    className="bg-zinc-50 dark:bg-zinc-955 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                    disabled={isPending}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* IXBrowser Card */}
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base font-extrabold">{t("card_ixbrowser_title")}</CardTitle>
              <CardDescription className="text-xs">
                {t("card_ixbrowser_desc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="p-ixid" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("lbl_ixbrowser_id")}</Label>
                  <Input
                    id="p-ixid"
                    type="text"
                    placeholder="ix-p-10022"
                    value={iXBrowserProfileId}
                    onChange={(e) => setIXBrowserProfileId(e.target.value)}
                    className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-ixgrp" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("lbl_ixbrowser_group")}</Label>
                  <Input
                    id="p-ixgrp"
                    type="text"
                    placeholder="US-Retail-Group"
                    value={iXBrowserGroup}
                    onChange={(e) => setIXBrowserGroup(e.target.value)}
                    className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                    disabled={isPending}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Status Card */}
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-zinc-400">{t("card_status_title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("lbl_pool_state")}</Label>
                <Select
                  value={status}
                  onValueChange={(val) => setStatus(val as ProfileAccountRecord["status"])}
                  disabled={isPending}
                >
                  <SelectTrigger className="bg-zinc-50 dark:bg-zinc-955 border-zinc-200 dark:border-zinc-800 h-9 text-xs">
                    <SelectValue placeholder={t("placeholder_select_status")} />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                    <SelectItem value="AVAILABLE">{t("status_option_available")}</SelectItem>
                    <SelectItem value="ASSIGNED">{t("status_option_assigned")}</SelectItem>
                    <SelectItem value="ACTIVE">{t("status_option_active")}</SelectItem>
                    <SelectItem value="EXPIRED">{t("status_option_expired")}</SelectItem>
                    <SelectItem value="REQUEST_CHANGE">{t("status_option_request_change")}</SelectItem>
                    <SelectItem value="BANNED">{t("status_option_banned")}</SelectItem>
                    <SelectItem value="CANCELLED">{t("status_option_cancelled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("lbl_admin_notes")}</Label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full h-24 p-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-[#168BB0] disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder={t("placeholder_admin_notes")}
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("lbl_client_notes")}</Label>
                <textarea
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  className="w-full h-24 p-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-[#168BB0] disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder={t("placeholder_client_notes")}
                  disabled={isPending}
                />
              </div>
            </CardContent>
            <CardFooter className="border-t border-zinc-100 dark:border-zinc-800 p-4 justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 text-xs px-4 border-zinc-200"
                onClick={onCancel}
                disabled={isPending}
              >
                {t("btn_cancel")}
              </Button>
              <Button
                type="submit"
                className="bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold h-9 text-xs px-6 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isPending}
              >
                {isPending ? "..." : t("btn_save_profile")}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
