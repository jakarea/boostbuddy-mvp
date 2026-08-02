"use client";

import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getClientReviewOrdersAction } from "@/app/actions/reviews";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateShort } from "@/lib/dateUtils";

const STATUS_FILTERS = ["", "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export default function ReviewOrdersPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>("");

  useEffect(() => {
    if (!user) return;

    const loadOrders = async () => {
      try {
        const result = await getClientReviewOrdersAction(
          statusFilter ? { status: statusFilter as any } : undefined
        );

        if (result.success && result.data) {
          setOrders(result.data);
        } else {
          toastError(result.error || t("reviews.loadOrdersFailed", "Failed to load orders"));
        }
      } catch (err) {
        console.error("Failed to load orders:", err);
        toastError(t("reviews.loadOrdersFailed", "Failed to load orders"));
      }
      setLoading(false);
    };

    loadOrders();
  }, [user, statusFilter]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {t("reviews.myOrders", "My Review Orders")}
        </h1>
        <a
          href="/c/services/reviews/new-order"
          className="px-4 py-2 bg-[#168BB0] text-white rounded-lg hover:bg-[#0F7493]"
        >
          {t("reviews.newOrder", "+ New Order")}
        </a>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
        >
          {STATUS_FILTERS.map(status => (
            <option key={status || "all"} value={status}>
              {status
                ? t(`reviews.status.${status}`, status)
                : t("reviews.allStatuses", "All Statuses")}
            </option>
          ))}
        </select>
      </div>

      {/* Orders Grid */}
      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-800 rounded-lg">
          <p className="text-zinc-500">
            {t("reviews.noOrdersFound", "No orders found")}
          </p>
          <a
            href="/c/services/reviews/new-order"
            className="inline-block mt-4 text-[#168BB0] hover:underline"
          >
            {t("reviews.createFirst", "Create your first order →")}
          </a>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orders.map(order => (
            <a
              key={order.id}
              href={`/c/services/reviews/orders/${order.id}`}
              className="block bg-white dark:bg-zinc-800 rounded-lg p-4 shadow hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-medium truncate flex-1">
                  {order.businessName}
                </h3>
                <StatusBadge status={order.status} type="order" />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">
                    {t("reviews.orderType", "Order Type")}:
                  </span>
                  <span className="font-medium">{order.orderType}</span>
                </div>

                {order.targetRating && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">
                      {t("reviews.rating", "Rating")}:
                    </span>
                    <span className="font-medium">
                      {order.targetRating.replace("_", " ")}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-zinc-500">
                    {t("reviews.quantity", "Quantity")}:
                  </span>
                  <span className="font-medium">{order.quantity}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-500">
                    {t("reviews.credits", "Credits")}:
                  </span>
                  <span className="font-medium">{order.creditsConsumed}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-500">
                    {t("reviews.created", "Created")}:
                  </span>
                  <span className="font-medium">
                    {formatDateShort(order.createdAt)}
                  </span>
                </div>
              </div>

              {order.clientFeedback && (
                <div className="mt-3 pt-3 border-t dark:border-zinc-700">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium
                    ${order.clientFeedback === "HAPPY" ? "bg-green-100 text-green-800" :
                      order.clientFeedback === "UNHAPPY" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"}`}>
                    {t(`reviews.feedback.${order.clientFeedback}`, order.clientFeedback) as string}
                  </span>
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
