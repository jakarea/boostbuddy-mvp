"use client";

import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getReviewsDashboardAction } from "@/app/actions/reviews";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateShort } from "@/lib/dateUtils";

export default function ReviewsDashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const result = await getReviewsDashboardAction();

        if (result.success && result.data) {
          setDashboardData(result.data);
        } else {
          toastError(result.error || t("loadFailed", "Failed to load dashboard data"));
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        toastError(t("loadFailed", "Failed to load dashboard data"));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  if (loading) return <LoadingScreen />;

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
        <Link
          href="/c/services/reviews/new-order"
          className="px-4 py-2 bg-[#168BB0] text-white rounded-lg hover:bg-[#0F7493]"
        >
          {t("reviews.createOrder", "Create New Order")}
        </Link>
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
            {recentOrders.map((order: any) => (
              <Link
                key={order.id}
                href={`/c/services/reviews/orders/${order.id}`}
                className="block p-4 hover:bg-zinc-50 dark:hover:bg-zinc-700"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{order.businessName || order.facebookUrl || 'Order'}</h4>
                    <p className="text-sm text-zinc-500">
                      {order.reviewType} - {order.targetRating?.replace("_", " ")}
                    </p>
                    <p className="text-xs text-zinc-400">
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
