"use client";

import { useTranslation } from "react-i18next";

interface CreditsOverviewProps {
  initialOverview: {
    totalCreditsSold: number;
    totalCreditsConsumed: number;
    activePackages: number;
    totalTransactions: number;
  };
}

export function CreditsOverview({ initialOverview }: CreditsOverviewProps) {
  const { t } = useTranslation("admin_reviews");

  const stats = [
    {
      title: t("credits_overview.total_sold", "Total Credits Sold"),
      value: initialOverview.totalCreditsSold,
      icon: "📈",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-500/10",
    },
    {
      title: t("credits_overview.total_consumed", "Total Credits Consumed"),
      value: initialOverview.totalCreditsConsumed,
      icon: "📉",
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-500/10",
    },
    {
      title: t("credits_overview.active_packages", "Active Packages"),
      value: initialOverview.activePackages,
      icon: "📦",
      color: "text-[#168BB0] dark:text-[#45B0D2]",
      bgColor: "bg-blue-500/10",
    },
    {
      title: t("credits_overview.total_transactions", "Total Transactions"),
      value: initialOverview.totalTransactions,
      icon: "📋",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          {t("credits_overview.title", "Credits Overview")}
        </h2>
        <p className="text-zinc-500">
          {t("credits_overview.subtitle", "Platform-wide credits statistics and performance metrics")}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className={`${stat.bgColor} ${stat.color} rounded-lg p-6 border border-current/10`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-2xl">{stat.icon}</div>
            </div>
            <div>
              <p className="text-sm opacity-80 mb-1">{stat.title}</p>
              <p className="text-3xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
          <h3 className="font-semibold mb-4">{t("credits_overview.utilization_title", "Credits Utilization")}</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>{t("credits_overview.consumed", "Consumed")}</span>
                <span className="font-medium">
                  {initialOverview.totalCreditsConsumed} / {initialOverview.totalCreditsSold}
                </span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
                <div
                  className="bg-[#168BB0] h-2 rounded-full transition-all"
                  style={{
                    width: `${initialOverview.totalCreditsSold > 0
                      ? (initialOverview.totalCreditsConsumed / initialOverview.totalCreditsSold) * 100
                      : 0}%`
                  }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {initialOverview.totalCreditsSold > 0
                  ? t("credits_overview.utilization_rate", {
                      percent: ((initialOverview.totalCreditsConsumed / initialOverview.totalCreditsSold) * 100).toFixed(1),
                      defaultValue: "{{percent}}% utilization rate"
                    })
                  : t("credits_overview.utilization_rate", { percent: "0", defaultValue: "{{percent}}% utilization rate" })}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
          <h3 className="font-semibold mb-4">{t("credits_overview.quick_stats", "Quick Stats")}</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-500">{t("credits_overview.active_revenue", "Active Revenue")}</span>
              <span className="font-medium">
                {t("credits_overview.credits_sold", { count: initialOverview.totalCreditsSold, defaultValue: "{{count}} credits sold" })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-500">{t("credits_overview.consumed_value", "Consumed Value")}</span>
              <span className="font-medium">
                {t("credits_overview.credits_used", { count: initialOverview.totalCreditsConsumed, defaultValue: "{{count}} credits used" })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-500">{t("credits_overview.remaining_credits", "Remaining Credits")}</span>
              <span className="font-medium text-green-600">
                {t("credits_overview.credits", { count: initialOverview.totalCreditsSold - initialOverview.totalCreditsConsumed, defaultValue: "{{count}} credits" })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
