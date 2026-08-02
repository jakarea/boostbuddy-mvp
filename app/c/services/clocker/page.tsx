"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, ArrowLeft, Bell } from "lucide-react";

export default function ClockerPage() {
  const { t } = useTranslation("clocker");

  return (
    <div className="space-y-6">
      <Link
        href="/c/services/reviews"
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-3 w-3" />
        {t("back", { defaultValue: "Back to Services" })}
      </Link>

      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <div className="p-1.5 rounded-lg bg-[#168BB0]/10 text-[#168BB0] shrink-0">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              {t("title", { defaultValue: "Clocker" })}
            </CardTitle>
            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
              {t("subtitle", {
                defaultValue: "Automated time-tracking service for browser profiles.",
              })}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center py-10 gap-3">
            <div className="p-3 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Bell className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {t("soon_title", { defaultValue: "Available soon" })}
              </p>
              <p className="text-[11px] text-zinc-500 max-w-sm leading-relaxed">
                {t("soon_body", {
                  defaultValue:
                    "Clocker is being finalized and will be released shortly. Check back later for updates.",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
