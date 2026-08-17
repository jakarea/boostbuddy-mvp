"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getReviewsOverviewAction } from "@/app/actions/admin-reviews";
import {
  Star,
  UserCheck,
  CheckCircle,
  DollarSign,
  Users,
  ArrowRight,
  RefreshCw,
  Loader2,
  Clock
} from "lucide-react";
import Link from "next/link";
import { useSWR } from "@/lib/cache/swr";
import { CACHE_KEYS } from "@/lib/cache/cacheContext";

interface OverviewStats {
  totalOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  totalRevenue: number;
  totalEmployees: number;
  employeeCompleted: number;
}

export default function AdminReviewsPage() {
  const { t } = useTranslation("admin_reviews");
  const { success, error } = useToast();

  // SWR for reviews overview - 2 minute cache
  const { data: stats, refresh, isValid, loading } = useSWR({
    key: CACHE_KEYS.ADMIN_REVIEWS,
    fetcher: async () => {
      const result = await getReviewsOverviewAction();
      if (result.success) {
        return result.data as OverviewStats;
      }
      return null;
    },
    ttl: CACHE_TTL.MEDIUM, // 2 minutes
  });

  const isLoading = loading && !stats;

  const statCards = [
    {
      title: t("stats.totalOrders", "Total Orders"),
      value: stats?.totalOrders || 0,
      icon: Star,
      color: "text-[#168BB0] dark:text-[#45B0D2]",
      bgColor: "bg-[#168BB0]/10"
    },
    {
      title: t("stats.pendingOrders", "Pending Orders"),
      value: stats?.pendingOrders || 0,
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-500/10"
    },
    {
      title: t("stats.inProgressOrders", "In Progress"),
      value: stats?.inProgressOrders || 0,
      icon: RefreshCw,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10"
    },
    {
      title: t("stats.completedOrders", "Completed"),
      value: stats?.completedOrders || 0,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-500/10"
    },
    {
      title: t("stats.totalRevenue", "Total Revenue"),
      value: `${stats?.totalRevenue || 0} credits`,
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10"
    },
    {
      title: t("stats.totalEmployees", "Active Employees"),
      value: stats?.totalEmployees || 0,
      icon: Users,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-500/10"
    }
  ];

  const actionCards = [
    {
      title: t("actions.employees.title", "Employee Performance"),
      description: t("actions.employees.description", "Monitor employee performance, availability, and completion rates"),
      href: "/a/reviews/employees",
      icon: UserCheck,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-500/10 dark:bg-green-950/20",
      borderColor: "border-green-200"
    }
  ];

  return (
    <div className="space-y-6 relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-zinc-950/50 z-50 flex items-center justify-center rounded-lg backdrop-blur-sm">
          <div className="bb-loading">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span className="bb-center"></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t("title", "Reviews Management")}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {t("subtitle", "Overview and management of review orders workflow")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={!isValid}
          className="gap-2"
        >
          <Loader2 className={`h-4 w-4 ${!isValid ? 'animate-spin' : ''}`} />
          {t("refresh", "Refresh")}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-zinc-500 font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {stat.value}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Employee Performance Summary */}
      {stats && stats.employeeCompleted > 0 && (
        <Card className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {t("employeePerformance.title", "Employee Performance")}
              </p>
              <p className="text-xs text-zinc-500">
                {t("employeePerformance.summary", "{{completed}} orders completed", {
                  completed: stats.employeeCompleted
                })}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Action Cards */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
          {t("actions.title", "Quick Actions")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actionCards.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Card className={`p-4 h-full border-2 ${action.borderColor} hover:shadow-md transition-shadow cursor-pointer`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${action.bgColor} shrink-0`}>
                      <Icon className={`h-5 w-5 ${action.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">
                        {action.title}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                        {action.description}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-xs font-medium text-zinc-600">
                        {t("actions.manage", "Manage")}
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
