"use client";

import React, { useState, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Lock, ArrowLeft, KeyRound, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { updatePasswordAction } from "@/app/actions/auth";
import { useTranslation } from "react-i18next";

export default function ResetPasswordPage() {
  const { t } = useTranslation("reset_password");
  const router = useRouter();

  // Input states
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [state, formAction, pending] = useActionState(updatePasswordAction, undefined);

  useEffect(() => {
    if (state) {
      if (state.success) {
        setSuccessMsg(t("success_redirect"));
        setErrorMsg("");
      } else {
        setErrorMsg(state.error || t("failed_reset"));
        setSuccessMsg("");
      }
    }
  }, [state, t]);

  return (
    <div className="flex-grow grid lg:grid-cols-2 min-h-0 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50">
      
      {/* LEFT COLUMN: Brand Hero */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-zinc-950 text-zinc-50 border-r border-zinc-900 relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#168BB0]/10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 font-bold text-base tracking-tight text-[#168BB0]">
            <Globe className="h-5 w-5 animate-spin-slow" />
            <span>BOOSTBUDDY</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg my-auto">
          <blockquote className="space-y-2">
            <p className="text-xl font-bold tracking-tight leading-relaxed">
              &ldquo;{t("quote")}&rdquo;
            </p>
            <footer className="text-xs text-zinc-500 font-semibold tracking-wider uppercase mt-2">
              {t("quote_footer")}
            </footer>
          </blockquote>
        </div>

        <div className="relative z-10 text-[10px] text-zinc-500">
          {t("copyright")}
        </div>
      </div>

      {/* RIGHT COLUMN: Reset Form Card */}
      <div className="flex flex-col p-6 sm:p-12 justify-center items-center relative bg-zinc-50 dark:bg-zinc-950">
        
        {/* Toggles top right */}
        <div className="absolute top-6 right-6 flex items-center gap-2">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm space-y-6">
          
          {/* Header Mobile Brand */}
          <div className="lg:hidden text-center space-y-2 mb-4">
            <div className="inline-flex items-center gap-1.5 text-[#168BB0] dark:text-[#45B0D2] font-bold text-xs uppercase tracking-wider">
              <Globe className="h-4 w-4" />
              BoostBuddy Networks
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">{t("mobile_title")}</h1>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-xl font-extrabold tracking-tight">{t("create_title")}</h2>
            <p className="text-xs text-zinc-500 leading-normal">
              {t("create_desc")}
            </p>
          </div>

          <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-900 shadow-sm overflow-hidden">
            <CardContent className="p-5 space-y-4">
              
              {/* Messages */}
              {errorMsg && (
                <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 rounded-md flex items-start gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-md flex items-start gap-1.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form action={formAction} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="r-password" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    {t("new_password")}
                  </Label>
                  <Input
                    id="r-password"
                    name="password"
                    type="password"
                    placeholder={t("new_password_placeholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="r-confirm" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    {t("repeat_password")}
                  </Label>
                  <Input
                    id="r-confirm"
                    name="confirmPassword"
                    type="password"
                    placeholder={t("repeat_password_placeholder")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={pending}
                  className="w-full bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold h-9 text-xs cursor-pointer shadow-sm flex items-center justify-center gap-1.5 mt-4"
                >
                  {pending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {t("updating")}
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      {t("save_button")}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
          
        </div>
      </div>

    </div>
  );
}
