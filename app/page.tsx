"use client";

import React, { useState, useActionState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Shield, User, ArrowRight, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { signInAction, signUpAction } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";

  // Mode: "login" or "signup"
  const [mode, setMode] = useState<"login" | "signup">("login");

  // Input states (kept for shortcuts / forms)
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Error/Success messages
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [signInState, signInFormAction, isSignInPending] = useActionState(
    signInAction,
    undefined
  );

  const [signUpState, signUpFormAction, isSignUpPending] = useActionState(
    signUpAction,
    undefined
  );

  // Sync action states into local message states
  useEffect(() => {
    if (signInState) {
      if (signInState.success === false) {
        setErrorMsg(signInState.error || t("login_failed"));
      }
    }
  }, [signInState, t]);

  useEffect(() => {
    if (signUpState) {
      if (signUpState.success === false) {
        setErrorMsg(signUpState.error || t("register_failed"));
      }
    }
  }, [signUpState, t]);

  useEffect(() => {
    if (resetSuccess) {
      setSuccessMsg(t("reset_success"));
    }
  }, [resetSuccess, t]);



  return (
    <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 min-h-0 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50">

      {/* LEFT COLUMN: Brand Hero & Quick Shortcuts */}
      <div className="hidden lg:flex flex-col justify-between p-6 sm:p-8 lg:p-12 bg-zinc-950 text-zinc-50 border-b lg:border-b-0 lg:border-r border-zinc-900 relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900">
        {/* Background grids */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#168BB0]/10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          {/* Logo brand */}
          <div className="flex items-center gap-2 font-bold text-base tracking-tight text-[#168BB0]">
            <Globe className="h-5 w-5 animate-spin-slow" />
            <span>BOOSTBUDDY NETWORKS</span>
          </div>
        </div>

        {/* Hero Quote Card */}
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

        {/* Footer info */}
        <div className="relative z-10 text-[10px] text-zinc-500">
          {t("copyright")}
        </div>
      </div>

      {/* RIGHT COLUMN: Form Card */}
      <div className="flex flex-col p-4 sm:p-6 md:p-8 lg:p-12 justify-center items-center relative bg-zinc-50 dark:bg-zinc-950">

        {/* Mode switch top right */}
        <div className="absolute top-4 sm:top-6 right-4 sm:right-6 flex items-center gap-2 z-10">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="text-xs font-semibold"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? t("create_account") : t("sign_in")}
          </Button>
        </div>

        <div className="w-full max-w-xs sm:max-w-sm space-y-4 sm:space-y-6">
          
          {/* Header Mobile Brand */}
          <div className="lg:hidden text-center space-y-2 mb-4">
            <div className="inline-flex items-center gap-1.5 text-[#168BB0] dark:text-[#45B0D2] font-bold text-xs sm:text-sm uppercase tracking-wider">
              <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
              BoostBuddy Networks
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">{t("mobile_title")}</h1>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight">
              {mode === "login" ? t("login_title") : t("register_title")}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 leading-normal">
              {mode === "login" 
                ? t("login_desc")
                : t("register_desc")
              }
            </p>
          </div>

          {/* Form Content */}
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-900 shadow-sm overflow-hidden">
            <CardContent className="p-4 sm:p-5 space-y-3 sm:space-y-4">
              
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

              {mode === "login" ? (
                // LOGIN FORM
                <form action={signInFormAction} className="space-y-3 sm:space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="l-email" className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300">
                      {t("email_address")}
                    </Label>
                    <Input
                      id="l-email"
                      name="email"
                      type="email"
                      placeholder={t("email_placeholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-10 sm:h-11 text-xs sm:text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center gap-2">
                      <Label htmlFor="l-pass" className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300">
                        {t("password")}
                      </Label>
                      <Link
                        href="/forgot-password"
                        className="text-xs sm:text-sm text-[#168BB0] dark:text-[#45B0D2] font-bold hover:underline whitespace-nowrap"
                      >
                        {t("forgot_link")}
                      </Link>
                    </div>
                    <Input
                      id="l-pass"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-10 sm:h-11 text-xs sm:text-sm"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSignInPending}
                    className="w-full bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold h-10 sm:h-11 text-xs sm:text-sm cursor-pointer shadow-sm flex items-center justify-center gap-1.5 mt-2 sm:mt-4"
                  >
                    {isSignInPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {t("signing_in")}
                      </>
                    ) : (
                      <>
                        {t("sign_in_button")}
                        <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                // SIGN UP FORM
                <form action={signUpFormAction} className="space-y-3 sm:space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="s-fullname" className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300">{t("full_name")}</Label>
                    <Input
                      id="s-fullname"
                      name="name"
                      type="text"
                      placeholder={t("full_name_placeholder")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-10 sm:h-11 text-xs sm:text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="s-email" className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300">{t("email_address")}</Label>
                    <Input
                      id="s-email"
                      name="email"
                      type="email"
                      placeholder={t("email_placeholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-10 sm:h-11 text-xs sm:text-sm"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="s-password" className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300">{t("password")}</Label>
                      <Input
                        id="s-password"
                        name="password"
                        type="password"
                        placeholder={t("password")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-10 sm:h-11 text-xs sm:text-sm"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="s-confirm" className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300">{t("repeat_password")}</Label>
                      <Input
                        id="s-confirm"
                        name="confirmPassword"
                        type="password"
                        placeholder={t("repeat_placeholder")}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-10 sm:h-11 text-xs sm:text-sm"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSignUpPending}
                    className="w-full bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold h-10 sm:h-11 text-xs sm:text-sm cursor-pointer shadow-sm mt-2 sm:mt-4"
                  >
                    {isSignUpPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                        {t("registering")}
                      </>
                    ) : (
                      t("register_button")
                    )}
                  </Button>
                </form>
              )}
            </CardContent>

            <CardFooter className="bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 p-3 sm:p-4 text-center">
              <span className="text-xs sm:text-[10px] text-zinc-400 dark:text-zinc-500 w-full">
                {mode === "login" ? (
                  <>
                    {t("no_account")}{" "}
                    <button onClick={() => setMode("signup")} className="text-[#168BB0] dark:text-[#45B0D2] font-bold hover:underline">
                      {t("register_now")}
                    </button>
                  </>
                ) : (
                  <>
                    {t("already_account")}{" "}
                    <button onClick={() => setMode("login")} className="text-[#168BB0] dark:text-[#45B0D2] font-bold hover:underline">
                      {t("sign_in_here")}
                    </button>
                  </>
                )}
              </span>
            </CardFooter>
          </Card>


          
        </div>
      </div>

    </div>
  );
}
