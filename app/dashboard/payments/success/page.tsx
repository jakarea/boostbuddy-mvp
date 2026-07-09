"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function SuccessPage() {
  const { t } = useTranslation("success");

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-zinc-50 dark:bg-zinc-950 min-h-[calc(100vh-64px)]">
      <div className="mb-6 relative">
        <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse"></div>
        <CheckCircle2 className="h-24 w-24 text-emerald-500 relative z-10" />
      </div>
      <h1 className="text-3xl font-extrabold mb-3 text-zinc-900 dark:text-white">{t("title")}</h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md leading-relaxed">
        {t("desc")}
      </p>
      <Link href="/dashboard/payments">
        <Button className="bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold h-12 px-8 text-sm shadow-lg shadow-[#168BB0]/20">
          {t("btn_return")}
        </Button>
      </Link>
    </div>
  );
}
