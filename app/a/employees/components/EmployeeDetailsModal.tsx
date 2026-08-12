"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { updateUserRoleAction, updateClientStatusAction, updateClientNotesAction, verifyClientEmailAction } from "@/app/actions/clients";
import { EmployeeUser } from "./types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Check, UserCheck, Loader2, ShieldCheck, Shield, UserCog, Zap } from "lucide-react";

interface EmployeeDetailsModalProps {
  employee: EmployeeUser;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function EmployeeDetailsModal({
  employee,
  onClose,
  onRefresh,
}: EmployeeDetailsModalProps) {
  const { t } = useTranslation("admin_employees");
  const { success, error } = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();

  // States
  const [adminNotes, setAdminNotes] = useState("");
  const [adminNotesSaving, setAdminNotesSaving] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(employee.email_verified ?? false);
  const [userRole, setUserRole] = useState<"ADMIN" | "CLIENT" | "EMPLOYEE">(employee.role);
  const [roleUpdating, setRoleUpdating] = useState(false);

  // Sync states when employee changes
  useEffect(() => {
    setIsEmailVerified(employee.email_verified ?? false);
    setUserRole(employee.role as "ADMIN" | "CLIENT" | "EMPLOYEE");
  }, [employee.email_verified, employee.role]);

  // Load admin notes
  useEffect(() => {
    setAdminNotes(employee.admin_notes || "");
  }, [employee.admin_notes]);

  // Save admin notes
  const handleSaveNotes = () => {
    setAdminNotesSaving(true);
    startTransition(async () => {
      const result = await updateClientNotesAction(employee.id, adminNotes);
      if (result.success) {
        success(t("alert_notes_success", { defaultValue: "Notes saved successfully" }));
        onRefresh?.();
      } else {
        error(result.error || t("alert_notes_failed", { defaultValue: "Failed to save notes" }));
      }
      setAdminNotesSaving(false);
      router.refresh();
    });
  };

  // Toggle employee status
  const handleToggleStatus = (checked: boolean) => {
    startTransition(async () => {
      const newStatus = checked ? "ACTIVE" : "DEACTIVATED";
      await updateClientStatusAction(employee.id, newStatus);
      onRefresh?.();
      router.refresh();
    });
  };

  // Update user role
  const handleRoleChange = (newRole: "ADMIN" | "CLIENT" | "EMPLOYEE") => {
    if (newRole === userRole) return;

    setRoleUpdating(true);
    startTransition(async () => {
      const result = await updateUserRoleAction(employee.id, newRole);
      if (result.success) {
        setUserRole(newRole);
        success(t("alert_role_success", { defaultValue: "Role updated successfully" }));
        onRefresh?.();

        // Redirect to appropriate page after role change
        setTimeout(() => {
          if (newRole === "CLIENT") {
            router.push("/a/clients");
          } else {
            router.push("/a/employees");
          }
        }, 1000);
      } else {
        error(result.error || t("alert_role_failed", { defaultValue: "Failed to update role" }));
      }
      setRoleUpdating(false);
    });
  };

  // Verify email
  const handleVerifyEmailSwitch = (checked: boolean) => {
    if (!checked) return;
    setVerifyingEmail(true);
    startTransition(async () => {
      const result = await verifyClientEmailAction(employee.id);
      if (result.success) {
        setIsEmailVerified(true);
        success(t("alert_email_success", { defaultValue: "Email verified successfully" }));
      } else {
        error(result.error || t("alert_email_failed", { defaultValue: "Failed to verify email" }));
      }
      setVerifyingEmail(false);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <h1 className="text-2xl font-extrabold tracking-tight">{employee.name}</h1>
          <p className="text-xs text-zinc-500 mt-1">{employee.email}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base font-extrabold">{t("card_details", { defaultValue: "Employee Details" })}</CardTitle>
              <CardDescription className="text-xs">
                {t("card_details_desc", { defaultValue: "Manage employee account settings" })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("lbl_name", { defaultValue: "Name" })}</Label>
                  <div className="text-sm mt-1">{employee.name}</div>
                </div>
                <div>
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("lbl_email", { defaultValue: "Email" })}</Label>
                  <div className="text-sm mt-1">{employee.email}</div>
                </div>
                <div>
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("lbl_role", { defaultValue: "Role" })}</Label>
                  <div className="text-sm mt-1">{employee.role}</div>
                </div>
                <div>
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("lbl_status", { defaultValue: "Status" })}</Label>
                  <div className="text-sm mt-1">{employee.status}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-zinc-400">
                {t("card_actions", { defaultValue: "Account Actions" })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email Verification */}
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    {t("lbl_email_verification", { defaultValue: "Email Verification" })}
                  </Label>
                  <div className="text-[10px] text-zinc-500">
                    {isEmailVerified
                      ? t("desc_verified", { defaultValue: "Email is verified" })
                      : t("desc_unverified", { defaultValue: "Click to verify email" })}
                  </div>
                </div>
                {isEmailVerified ? (
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs font-bold px-2 py-0.5 flex items-center gap-1">
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

              {/* Account Status */}
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    {t("lbl_account_status", { defaultValue: "Account Status" })}
                  </Label>
                  <div className="text-[10px] text-zinc-500">
                    {employee.status === "ACTIVE"
                      ? t("desc_active", { defaultValue: "Account is active" })
                      : t("desc_inactive", { defaultValue: "Account is deactivated" })}
                  </div>
                </div>
                <Switch
                  checked={employee.status === "ACTIVE"}
                  onCheckedChange={handleToggleStatus}
                />
              </div>

              {/* Role Selection */}
              <div className="py-2">
                <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 block">
                  {t("lbl_change_role", { defaultValue: "Change Role" })}
                </Label>
                <div className="flex items-center gap-2">
                  {roleUpdating ? (
                    <div className="bb-loading-sm"></div>
                  ) : (
                    <Select
                      value={userRole}
                      onValueChange={(value) => handleRoleChange(value as "ADMIN" | "CLIENT" | "EMPLOYEE")}
                      disabled={roleUpdating}
                    >
                      <SelectTrigger className="h-8 text-xs bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                        <SelectItem value="CLIENT">CLIENT</SelectItem>
                        <SelectItem value="EMPLOYEE">EMPLOYEE</SelectItem>
                        <SelectItem value="ADMIN">ADMIN</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-zinc-400">
                {t("card_notes", { defaultValue: "Internal Notes" })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full h-24 p-2.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-[#168BB0] text-zinc-800 dark:text-zinc-200"
                placeholder={t("notes_placeholder", { defaultValue: "Add internal notes..." })}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                disabled={adminNotesSaving}
              />
              <Button
                size="sm"
                className="mt-3 bg-zinc-950 text-white hover:bg-zinc-800 text-[10px] h-7 w-full"
                onClick={handleSaveNotes}
                disabled={adminNotesSaving}
              >
                {adminNotesSaving ? t("btn_saving", { defaultValue: "Saving..." }) : t("btn_save_notes", { defaultValue: "Save Notes" })}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
