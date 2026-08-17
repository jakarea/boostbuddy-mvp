"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { getReviewsDashboardAction } from "@/app/actions/reviews";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateShort } from "@/lib/dateUtils";
import { Search, X, Loader2 } from "lucide-react";
import { useSWR } from "@/lib/cache/swr";
import { CACHE_KEYS } from "@/lib/cache/cacheContext";
import CACHE_TTL from "@/lib/cache/cache-ttl";

interface ReviewsDashboardClientProps {
  initialData: any;
}

export default function ReviewsDashboardClient({ initialData }: ReviewsDashboardClientProps) {
  const { t } = useTranslation();
  const { error: toastError } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // SWR for reviews dashboard - 3 minute cache
  const { data: dashboardData, refresh, isValid } = useSWR({
    key: CACHE_KEYS.CLIENT_REVIEWS_DASHBOARD,
    fetcher: async () => {
      const result = await getReviewsDashboardAction();
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || t("loadFailed", "Failed to load dashboard data"));
    },
    ttl: CACHE_TTL.MEDIUM_LONG, // 3 minutes
    initialData,
  });

  // Filter recent orders based on search
  const filteredRecentOrders = dashboardData?.recentOrders?.filter((order: any) => {
    if (!debouncedSearchTerm.trim()) return true;
    const searchLower = debouncedSearchTerm.toLowerCase();
    return (
      order.businessName?.toLowerCase().includes(searchLower) ||
      order.facebookUrl?.toLowerCase().includes(searchLower) ||
      order.reviewType?.toLowerCase().includes(searchLower) ||
      order.id?.toLowerCase().includes(searchLower)
    );
  }) || [];

  if (!dashboardData) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-800 dark:text-red-400">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  const { creditsBalance, creditCosts, recentOrders } = dashboardData;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("reviews.title", "Reviews Service")}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={!isValid}
            className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-50"
            title={t("common.refresh", "Refresh")}
          >
            <Loader2 className={`h-4 w-4 ${!isValid ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/c/services/reviews/new-order"
            className="px-4 py-2 bg-[#168BB0] text-white rounded-lg hover:bg-[#0F7493]"
          >
            {t("reviews.createOrder", "New Order")}
          </Link>
          <Link
            href="/c/services/reviews/orders"
            className="px-4 py-2 border border-[#168BB0] text-[#168BB0] rounded-lg hover:bg-[#168BB0]/10"
          >
            {t("reviews.myOrders", "My Orders")}
          </Link>
        </div>
      </div>

      {/* Credit Balance Card */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow">
        <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {t("reviews.availableCredits", "Available Credits")}
        </h3>
        <p className="text-3xl font-bold text-green-600">{creditsBalance}</p>
      </div>

      {/* Credit Costs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(creditCosts).map(([platform, cost]) => (
          <div key={platform} className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow">
            <h4 className="font-medium">{platform}</h4>
            <p className="text-sm text-zinc-500">{String(cost) + " " + String(t("credits.credits", "credits"))}</p>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search recent orders by business name, URL, or type..."
              className="w-full pl-10 pr-10 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#168BB0]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Found {filteredRecentOrders.length} result{filteredRecentOrders.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow">
        <div className="p-4 border-b dark:border-zinc-700">
          <h3 className="font-semibold">
            {t("reviews.recentOrders", "Recent Orders")}
          </h3>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            {t("reviews.noOrders", "No orders yet")}
          </div>
        ) : (
          <div className="divide-y dark:divide-zinc-700">
            {filteredRecentOrders.map((order: any) => (
              <Link
                key={order.id}
                href={`/c/services/reviews/orders/${order.id}`}
                className="block p-4 hover:bg-zinc-50 dark:hover:bg-zinc-700"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 rounded text-xs font-bold">
                        {order.orderType === "COMMENT" ? "Reactions" :
                         order.orderType === "REVIEW" ? "Reviews" :
                         order.orderType === "COMMENT_WITH_PHOTO" ? "Photo + Reviews" :
                         order.orderType?.replace(/_/g, ' ') || 'N/A'}
                      </span>
                      <span className="text-zinc-500">{order.reviewType}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      {formatDateShort(order.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* View All Link */}
      <div className="text-center">
        <Link
          href="/c/services/reviews/orders"
          className="text-[#168BB0] hover:underline"
        >
          {t("reviews.viewAllOrders", "View All Orders")} →
        </Link>
      </div>
    </div>
  );
}
