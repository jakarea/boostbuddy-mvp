"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ShieldAlert, LogOut, RefreshCw, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PendingClientProps {
  email: string;
}

export default function PendingClient({ email }: PendingClientProps) {
  const { t } = useTranslation("client_pending");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleCheckStatus = () => {
    startTransition(() => {
      // Force Next.js to re-run the Server Component, which checks the DB again
      router.refresh();
    });
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-6 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 text-white min-h-0 overflow-y-auto">
      <Card className="w-full max-w-md bg-zinc-950 border border-zinc-800 text-white shadow-xl shadow-black/40 relative overflow-hidden">
        {isPending && (
          <div className="absolute inset-0 bg-zinc-950/50 z-50 flex items-center justify-center backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-[#168BB0]" />
          </div>
        )}
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-[#168BB0]/10 border border-[#168BB0]/20 text-[#168BB0] rounded-full animate-pulse">
              <Clock className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">
            {t("title")}
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {t("account")} <span className="text-zinc-200 font-semibold">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="flex justify-center">
            <Badge className="bg-[#168BB0]/20 text-[#168BB0] border border-[#168BB0]/30 font-semibold uppercase text-[10px]">
              {t("status")}
            </Badge>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {t("desc")}
          </p>
          <div className="p-3.5 bg-zinc-900/50 border border-zinc-800/80 rounded-md text-xs text-zinc-400 text-left space-y-1.5 leading-relaxed">
            <div className="flex items-start gap-2 text-[#168BB0] dark:text-[#45B0D2] font-semibold mb-1">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{t("steps_title")}</span>
            </div>
            <div>{t("step_1")}</div>
            <div>{t("step_2")}</div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white h-10"
            onClick={() => {
              router.push("/");
              const supabase = createClient();
              supabase.auth.signOut();
              fetch("/api/logout", { method: "POST" }).catch(() => {});
            }}
            disabled={isPending}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t("btn_sign_out")}
          </Button>
          <Button
            className="flex-1 bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold flex items-center justify-center gap-1 cursor-pointer h-10"
            onClick={handleCheckStatus}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1.5" />
            )}
            {t("btn_check_status")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
