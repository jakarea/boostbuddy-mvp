"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  Package,
  Star,
  Wallet,
  User,
  Send,
  ArrowRight,
} from "lucide-react";

export default function DocsPage() {
  const { t } = useTranslation("docs");
  const { user } = useAuth();

  const sections = [
    {
      icon: Package,
      title: t("sections.boxes.title", { defaultValue: "Boxes" }),
      body: t("sections.boxes.body", {
        defaultValue:
          "Boxes are browser profiles assigned to your account. Open them in IXBrowser using the reference codes shown on the My Boxes page.",
      }),
      links: [
        { href: "/dashboard", label: t("sections.boxes.link_my", { defaultValue: "Go to My Boxes" }) },
        { href: "/checkout", label: t("sections.boxes.link_buy", { defaultValue: "Buy Boxes" }) },
      ],
    },
    {
      icon: Star,
      title: t("sections.services.title", { defaultValue: "Services" }),
      body: t("sections.services.body", {
        defaultValue:
          "Order review services (Google, Trustpilot, Yelp, Facebook, Amazon) using your wallet credits. Track each order from submission to completion.",
      }),
      links: [
        { href: "/c/services/reviews", label: t("sections.services.link", { defaultValue: "Open Reviews" }) },
      ],
    },
    {
      icon: Wallet,
      title: t("sections.wallet.title", { defaultValue: "Wallet & Credits" }),
      body: t("sections.wallet.body", {
        defaultValue:
          "Top up credits via Stripe to pay for services. Every transaction is recorded and available in your transaction history.",
      }),
      links: [
        { href: "/c/wallet/top-up", label: t("sections.wallet.link_topup", { defaultValue: "Top Up Credits" }) },
        { href: "/c/wallet/transactions", label: t("sections.wallet.link_tx", { defaultValue: "View Transactions" }) },
      ],
    },
    {
      icon: User,
      title: t("sections.account.title", { defaultValue: "Account" }),
      body: t("sections.account.body", {
        defaultValue:
          "Keep your billing details up to date — they appear on your invoices. Manage your notification preferences and account settings.",
      }),
      links: [
        { href: "/c/billing", label: t("sections.account.link_billing", { defaultValue: "Billing Details" }) },
        { href: "/c/settings", label: t("sections.account.link_settings", { defaultValue: "Settings" }) },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <div className="p-1.5 rounded-lg bg-[#168BB0]/10 text-[#168BB0] shrink-0">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              {t("title", { defaultValue: "Documentation" })}
            </CardTitle>
            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
              {t("subtitle", {
                defaultValue:
                  "Learn how to use BoostBuddy — manage boxes, order services, and handle payments.",
              })}
            </p>
          </div>
        </CardHeader>
      </Card>

      {user && (
        <p className="text-[11px] text-zinc-500">
          {t("signed_in_as", { defaultValue: "Signed in as" })}:{" "}
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">{user.email}</span>
        </p>
      )}

      {/* Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.title}
              className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm"
            >
              <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                <div className="p-1.5 rounded-md bg-[#168BB0]/10 text-[#168BB0] shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <CardTitle className="text-xs font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-[11px] text-zinc-500 leading-relaxed">{section.body}</p>
                <div className="flex flex-wrap gap-2">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#168BB0] dark:text-[#45B0D2] hover:underline"
                    >
                      {link.label}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Support */}
      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="p-1.5 rounded-md bg-[#168BB0]/10 text-[#168BB0] shrink-0">
            <Send className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              {t("support.title", { defaultValue: "Need help?" })}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {t("support.body", {
                defaultValue: "Contact our team on Telegram for assistance.",
              })}
            </p>
          </div>
          <a
            href="https://t.me/StefanoBernardiML"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold text-[11px] py-2 px-3 rounded-md transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            {t("support.cta", { defaultValue: "Contact Support" })}
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
