"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { createClientAction } from "@/app/actions/clients";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Check } from "lucide-react";

interface ClientFormProps {
  onCancel: () => void;
  onRefresh?: () => void;
}

export default function ClientForm({ onCancel, onRefresh }: ClientFormProps) {
  const { t } = useTranslation("admin_clients");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form states
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPassword, setNewClientPassword] = useState("");
  const [newClientConfirmPassword, setNewClientConfirmPassword] = useState("");
  const [newClientRole, setNewClientRole] = useState("CLIENT");
  const [newClientError, setNewClientError] = useState("");
  const [newClientSuccess, setNewClientSuccess] = useState("");

  // Handle client creation
  const handleCreateClient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNewClientError("");
    setNewClientSuccess("");

    if (!newClientName || !newClientEmail || !newClientPassword) {
      setNewClientError(t("err_required", { defaultValue: "All fields are required" }));
      return;
    }

    if (newClientPassword.length < 6) {
      setNewClientError("Password must be at least 6 characters");
      return;
    }

    if (newClientPassword !== newClientConfirmPassword) {
      setNewClientError("Passwords do not match");
      return;
    }

    startTransition(async () => {
      const result = await createClientAction({
        name: newClientName,
        email: newClientEmail,
        password: newClientPassword,
        role: newClientRole as "CLIENT" | "ADMIN" | "EMPLOYEE"
      });

      if (!result.success) {
        setNewClientError(result.error || t("err_failed_create", { defaultValue: "Failed to create account." }));
      } else {
        setNewClientSuccess("Account created successfully! User can log in immediately.");
        onRefresh?.();
        setTimeout(() => {
          setNewClientName("");
          setNewClientEmail("");
          setNewClientPassword("");
          setNewClientConfirmPassword("");
          setNewClientRole("CLIENT");
          setNewClientSuccess("");
          router.push("/a/clients");
        }, 1500);
      }
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
          <h1 className="text-2xl font-extrabold tracking-tight">{t("new_title")}</h1>
          <p className="text-xs text-zinc-500 mt-1">
            {t("new_subtitle")}
          </p>
        </div>
      </div>

      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 max-w-md">
        <CardHeader>
          <CardTitle className="text-base font-extrabold">{t("new_card_title")}</CardTitle>
          <CardDescription className="text-xs">
            Create a new account that will be immediately active. No email verification required.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleCreateClient}>
          <CardContent className="space-y-4">
            {newClientError && (
              <div className="p-3 text-xs bg-red-950/50 border border-red-500/30 text-red-300 rounded-md">
                {newClientError}
              </div>
            )}
            {newClientSuccess && (
              <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-md flex items-center gap-1.5 font-bold">
                <Check className="h-4 w-4" />
                {newClientSuccess}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="c-name" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("new_lbl_name")}</Label>
              <Input
                id="c-name"
                name="name"
                type="text"
                placeholder="John Doe"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-email" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("new_lbl_email")}</Label>
              <Input
                id="c-email"
                name="email"
                type="email"
                placeholder="john@example.com"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-password" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Password *</Label>
              <Input
                id="c-password"
                name="password"
                type="password"
                placeholder="Min. 6 characters"
                value={newClientPassword}
                onChange={(e) => setNewClientPassword(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-confirm-password" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Confirm Password *</Label>
              <Input
                id="c-confirm-password"
                name="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                value={newClientConfirmPassword}
                onChange={(e) => setNewClientConfirmPassword(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("new_lbl_role")}</Label>
              <Select
                value={newClientRole}
                onValueChange={(val) => setNewClientRole(val || "CLIENT")}
                disabled={isPending}
              >
                <SelectTrigger className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs">
                  <SelectValue placeholder={t("select_type", { ns: "billing_form", defaultValue: "Select type" })} />
                </SelectTrigger>
                <SelectContent className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                  <SelectItem value="CLIENT">{t("filter_active", { defaultValue: "Client" })}</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
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
              className="bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold h-9 text-xs px-6 cursor-pointer"
              disabled={isPending}
            >
              {isPending ? "Creating..." : "Create Account"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
