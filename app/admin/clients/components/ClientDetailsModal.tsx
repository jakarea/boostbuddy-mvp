"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { updateBillingInfoAction, updateClientStatusAction, updateClientNotesAction, approveClientAndVerifyEmailAction, verifyClientEmailAction } from "@/app/actions/clients";
import { ClientUser, BillingInfo } from "./types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Check, UserCheck, Loader2, ShieldCheck, Zap } from "lucide-react";

interface ClientDetailsModalProps {
  client: ClientUser;
  billingInfo: BillingInfo | null;
  assignedProfilesCount: number;
  onClose: () => void;
}

export default function ClientDetailsModal({
  client,
  billingInfo,
  assignedProfilesCount,
  onClose,
}: ClientDetailsModalProps) {
  const { t } = useTranslation("admin_clients");
  const { success, error } = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Billing form states
  const [billingType, setBillingType] = useState<"INDIVIDUAL" | "COMPANY">("INDIVIDUAL");
  const [country, setCountry] = useState("Italy");
  const [billingName, setBillingName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [fiscalCode, setFiscalCode] = useState("");
  const [sdiCode, setSdiCode] = useState("");

  // Admin notes & status states
  const [adminNotes, setAdminNotes] = useState("");
  const [adminNotesSaving, setAdminNotesSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [approving, setApproving] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(client.email_verified ?? false);

  // Sync isEmailVerified when client changes
  useEffect(() => {
    setIsEmailVerified(client.email_verified ?? false);
  }, [client.email_verified]);

  // Dedicated quick approval handler (without modifying or requiring billing data)
  const handleApproveRegistration = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setApproving(true);
    startTransition(async () => {
      const result = await updateClientStatusAction(client.id, "ACTIVE");
      if (result.success) {
        success(t("alert_approved_success", { defaultValue: "Registration approved successfully!" }));
      } else {
        error(result.error || t("alert_approved_failed", { defaultValue: "Failed to approve registration." }));
      }
      setApproving(false);
      router.refresh();
    });
  };

  // Dedicated email verification switch handler
  const handleVerifyEmailSwitch = (checked: boolean) => {
    if (!checked) return; // Cannot unverify email
    setVerifyingEmail(true);
    startTransition(async () => {
      const result = await verifyClientEmailAction(client.id);
      if (result.success) {
        setIsEmailVerified(true);
        success(t("alert_email_verified_success", { defaultValue: "Email marked as verified successfully!" }));
      } else {
        error(result.error || t("alert_email_verified_failed", { defaultValue: "Failed to verify email." }));
      }
      setVerifyingEmail(false);
      router.refresh();
    });
  };

  // Load billing info
  useEffect(() => {
    if (billingInfo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBillingType(billingInfo.billing_type as "INDIVIDUAL" | "COMPANY");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCountry(billingInfo.country);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBillingName(billingInfo.name);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAddress(billingInfo.address);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCity(billingInfo.city);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPostalCode(billingInfo.postal_code);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVatNumber(billingInfo.vat_number || "");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFiscalCode(billingInfo.fiscal_code || "");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSdiCode(billingInfo.sdi_code || "");
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBillingType("INDIVIDUAL");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCountry("Italy");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBillingName(client.name);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAddress("");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCity("");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPostalCode("");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVatNumber("");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFiscalCode("");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSdiCode("");
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAdminNotes(client.admin_notes || "");
  }, [billingInfo, client.id, client.name, client.admin_notes]);

  // Save client changes
  const handleSaveClientDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(false);

    startTransition(async () => {
      await updateBillingInfoAction(client.id, {
        billingType,
        country,
        name: billingName,
        address,
        city,
        postalCode,
        vatNumber: vatNumber || undefined,
        fiscalCode: fiscalCode || undefined,
        sdiCode: sdiCode || undefined,
      });

      setSavedSuccess(true);
      router.refresh();

      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1500);
    });
  };

  // Save admin notes
  const handleSaveNotes = () => {
    setAdminNotesSaving(true);
    startTransition(async () => {
      const result = await updateClientNotesAction(client.id, adminNotes);
      if (result.success) {
        success(t("alert_notes_success"));
      } else {
        error(result.error || t("alert_notes_failed"));
      }
      setAdminNotesSaving(false);
      router.refresh();
    });
  };

  // Toggle client status
  const handleToggleStatus = (checked: boolean) => {
    startTransition(async () => {
      const newStatus = checked ? "ACTIVE" : "DEACTIVATED";
      await updateClientStatusAction(client.id, newStatus);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Sub Header */}
      <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-500"
          onClick={onClose}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{t("edit_title", { name: client.name })}</h1>
          <p className="text-xs text-zinc-500 mt-1">
            {t("edit_subtitle")}
          </p>
        </div>
      </div>

      {/* Configuration Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form details (Col span 8) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base font-extrabold">{t("edit_card_billing")}</CardTitle>
              <CardDescription className="text-xs">
                {t("edit_card_billing_desc")}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveClientDetails}>
              <CardContent className="space-y-4">
                {savedSuccess && (
                  <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-md flex items-center gap-1.5 font-bold">
                    <Check className="h-4 w-4" />
                    {t("edit_success_redirect")}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Billing Type */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("edit_lbl_billing_type")}</Label>
                    <Select
                      value={billingType}
                      onValueChange={(val) => setBillingType(val as "INDIVIDUAL" | "COMPANY")}
                    >
                      <SelectTrigger className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs">
                        <SelectValue placeholder={t("select_type", { ns: "billing_form", defaultValue: "Select type" })} />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                        <SelectItem value="INDIVIDUAL">{t("individual", { ns: "billing_form", defaultValue: "Individual (Person)" })}</SelectItem>
                        <SelectItem value="COMPANY">{t("company", { ns: "billing_form", defaultValue: "Company / Business" })}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Country */}
                  <div className="space-y-1.5">
                    <Label htmlFor="country" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("edit_lbl_country")}</Label>
                    <Input
                      id="country"
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Billing Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="b-name" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    {t("edit_lbl_billing_name")}
                  </Label>
                  <Input
                    id="b-name"
                    type="text"
                    value={billingName}
                    onChange={(e) => setBillingName(e.target.value)}
                    className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                    required
                  />
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("edit_lbl_address")}</Label>
                  <Input
                    id="address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* City */}
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("edit_lbl_city")}</Label>
                    <Input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                      required
                    />
                  </div>

                  {/* Postal Code */}
                  <div className="space-y-1.5">
                    <Label htmlFor="zip" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("edit_lbl_postal")}</Label>
                    <Input
                      id="zip"
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                      required
                    />
                  </div>
                </div>

                {/* VAT / Fiscal Code / SDI */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="vat" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("edit_lbl_vat")}</Label>
                    <Input
                      id="vat"
                      type="text"
                      placeholder="IT12345678901"
                      value={vatNumber}
                      onChange={(e) => setVatNumber(e.target.value)}
                      className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fiscal" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("edit_lbl_fiscal")}</Label>
                    <Input
                      id="fiscal"
                      type="text"
                      placeholder="RSSMRA85M01H501U"
                      value={fiscalCode}
                      onChange={(e) => setFiscalCode(e.target.value)}
                      className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sdi" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("edit_lbl_sdi")}</Label>
                    <Input
                      id="sdi"
                      type="text"
                      placeholder="M5UXCR1"
                      value={sdiCode}
                      onChange={(e) => setSdiCode(e.target.value)}
                      className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-zinc-100 dark:border-zinc-800 p-4 justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-xs px-4 border-zinc-200"
                  onClick={onClose}
                >
                  {t("btn_cancel")}
                </Button>
                <Button
                  type="submit"
                  className="bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold h-9 text-xs px-6 cursor-pointer"
                >
                  {t("btn_save_changes")}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Status & notes (Col span 4) */}
        <div className="lg:col-span-4 space-y-6">

          {/* Pending Approval Notice Banner (Shown when PENDING) */}
          {client.status === "PENDING" && (
            <Card className="bg-amber-500/10 dark:bg-amber-950/20 border-2 border-amber-500/40 shadow-sm overflow-hidden">
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 shrink-0 text-amber-600" />
                    {t("card_approval_title", { defaultValue: "Registration Approval Required" })}
                  </CardTitle>
                  <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[9px] font-bold uppercase tracking-wider shrink-0">
                    Awaiting Approval
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-2">
                <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                  {t("card_approval_desc", { defaultValue: "This user has registered and is waiting for administrator approval before accessing the portal." })}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Status & Security Card */}
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-zinc-400">
                  {t("lbl_verification_security", { defaultValue: "Account Verification & Status Actions" })}
                </CardTitle>
                <Badge
                  className={
                    client.status === "ACTIVE"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-bold"
                      : client.status === "PENDING"
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[9px] font-bold"
                      : "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 text-[9px] font-bold"
                  }
                >
                  {client.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* SWITCH / CONTROL 1: Email Verification */}
              <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    {t("lbl_email_verification", { defaultValue: "Email Verification" })}
                  </Label>
                  <div className="text-[10px] text-zinc-500">
                    {isEmailVerified
                      ? t("desc_email_verified", { defaultValue: "User email address is confirmed" })
                      : t("desc_email_unverified", { defaultValue: "Click switch to verify user email" })}
                  </div>
                </div>
                {isEmailVerified ? (
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold px-2 py-0.5 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    {t("status_verified", { defaultValue: "Verified" })}
                  </Badge>
                ) : (
                  <Switch
                    checked={false}
                    disabled={verifyingEmail}
                    onCheckedChange={handleVerifyEmailSwitch}
                  />
                )}
              </div>

              {/* SWITCH / CONTROL 2: Account Approval & Portal Access */}
              <div className="flex items-center justify-between py-1">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    {client.status === "PENDING"
                      ? t("lbl_account_approval", { defaultValue: "Account Approval" })
                      : t("edit_lbl_access", { defaultValue: "Portal Login Access" })}
                  </Label>
                  <div className="text-[10px] text-zinc-500">
                    {client.status === "PENDING"
                      ? t("desc_pending_approval", { defaultValue: "Approve user registration to grant portal access" })
                      : t("edit_access_desc", { defaultValue: "Deactivating blocks dashboard access" })}
                  </div>
                </div>
                {client.status === "PENDING" ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApproveRegistration}
                    disabled={approving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    {t("btn_approve_registration", { defaultValue: "Approve Account" })}
                  </Button>
                ) : (
                  <Switch
                    checked={client.status === "ACTIVE"}
                    onCheckedChange={handleToggleStatus}
                  />
                )}
              </div>

              <div className="flex justify-between items-center text-xs pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">{t("edit_lbl_role")}</span>
                <Badge className="bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 text-[9px] font-bold">
                  {client.role}
                </Badge>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">{t("edit_lbl_assigned")}</span>
                <span className="font-extrabold text-zinc-800 dark:text-zinc-100">{assignedProfilesCount}</span>
              </div>
            </CardContent>
          </Card>

          {/* Internal Notes Card */}
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-zinc-400">{t("edit_card_notes")}</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full h-32 p-2.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-[#168BB0] text-zinc-800 dark:text-zinc-200"
                placeholder={t("edit_notes_placeholder")}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                disabled={adminNotesSaving}
              />
              <Button
                size="sm"
                className="mt-3 bg-zinc-950 text-white hover:bg-zinc-800 text-[10px] h-7 w-full cursor-pointer"
                onClick={handleSaveNotes}
                disabled={adminNotesSaving}
              >
                {adminNotesSaving ? t("btn_saving_notes") : t("btn_save_notes")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
