"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import {
  Settings as SettingsIcon,
  User,
  Mail,
  Shield,
  Palette,
  Globe,
  KeyRound,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function SettingsPage() {
  const { t } = useTranslation("settings");
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <div className="p-1.5 rounded-lg bg-[#168BB0]/10 text-[#168BB0] shrink-0">
            <SettingsIcon className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              {t("title", { defaultValue: "Settings" })}
            </CardTitle>
            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
              {t("subtitle", {
                defaultValue: "Manage your account profile, security, and preferences.",
              })}
            </p>
          </div>
        </CardHeader>
      </Card>

      {/* Profile */}
      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <User className="h-4 w-4 text-[#168BB0]" />
          <CardTitle className="text-xs font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {t("profile.title", { defaultValue: "Profile" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 rounded-md bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <User className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                  {t("profile.name", { defaultValue: "Name" })}
                </div>
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {user?.name || "-"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <Mail className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                  {t("profile.email", { defaultValue: "Email" })}
                </div>
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {user?.email || "-"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <Shield className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                  {t("profile.role", { defaultValue: "Role" })}
                </div>
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  <Badge variant="outline" className="text-[10px]">{user?.role || "-"}</Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                  {t("profile.status", { defaultValue: "Status" })}
                </div>
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {user?.isActive
                    ? t("profile.active", { defaultValue: "Active" })
                    : t("profile.pending", { defaultValue: "Pending" })}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <KeyRound className="h-4 w-4 text-[#168BB0]" />
          <CardTitle className="text-xs font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {t("security.title", { defaultValue: "Security" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-md bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <div>
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {t("security.password", { defaultValue: "Password" })}
              </div>
              <div className="text-[11px] text-zinc-500">
                {t("security.password_desc", {
                  defaultValue: "Reset your password via email verification.",
                })}
              </div>
            </div>
            <Link href="/forgot-password">
              <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5">
                {t("security.reset", { defaultValue: "Reset" })}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Palette className="h-4 w-4 text-[#168BB0]" />
          <CardTitle className="text-xs font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {t("preferences.title", { defaultValue: "Preferences" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Theme */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Palette className="h-3.5 w-3.5 text-zinc-500" />
              <div>
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {t("preferences.theme", { defaultValue: "Theme" })}
                </div>
                <div className="text-[11px] text-zinc-500 capitalize">
                  {theme === "dark"
                    ? t("preferences.dark", { defaultValue: "Dark" })
                    : t("preferences.light", { defaultValue: "Light" })}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[11px]"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {t("preferences.toggle", { defaultValue: "Toggle" })}
            </Button>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-zinc-500" />
              <div>
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {t("preferences.language", { defaultValue: "Language" })}
                </div>
                <div className="text-[11px] text-zinc-500">
                  {t("preferences.language_desc", {
                    defaultValue: "Switch between available languages.",
                  })}
                </div>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
