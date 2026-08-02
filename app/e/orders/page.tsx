"use client";

import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getEmployeeOrderHistoryAction } from "@/app/actions/employee";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateShort, safeDateDisplay } from "@/lib/dateUtils";

const STATUS_FILTERS = ["", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export default function EmployeeOrderHistoryPage() {
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
        const result = await getEmployeeOrderHistoryAction(100);

        if (result.success && result.data) {
          setOrders(result.data);
        } else {
          toastError(result.error || t("employee.loadOrdersFailed", "Failed to load orders"));
        }
      } catch (err) {
        console.error("Failed to load orders:", err);
        toastError(t("employee.loadOrdersFailed", "Failed to load orders"));
      }

      setLoading(false);
    };

    loadOrders();
  }, [user]);

  const filteredOrders = statusFilter
    ? orders.filter((o) => o.status === statusFilter)
    : orders;

  if (loading) return <LoadingScreen />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("employee.orderHistory", "Order History")}</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
          aria-label={t("employee.allStatuses", "All Statuses")}
        >
          {STATUS_FILTERS.map((status) => (
            <option key={status || "all"} value={status}>
              {status
                ? t(`employee.status.${status}`, status)
                : t("employee.allStatuses", "All Statuses")}
            </option>
          ))}
        </select>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-lg">
          <p className="text-zinc-500">
            {statusFilter
              ? t("employee.noOrdersFound", "No orders found")
              : t("employee.noOrdersYet", "No orders yet")}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-medium truncate flex-1">
                  {order.businessName}
                </h3>
                <StatusBadge status={order.status} type="order" />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">{t("employee.platform", "Platform")}:</span>
                  <span className="font-medium">{order.reviewType}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-500">{t("employee.rating", "Rating")}:</span>
                  <span className="font-medium">
                    {order.targetRating.replace("_", " ")}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-500">{t("employee.credits", "Credits")}:</span>
                  <span className="font-medium">{order.creditsConsumed}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-500">{t("employee.created", "Created")}:</span>
                  <span className="font-medium">
                    {formatDateShort(order.createdAt)}
                  </span>
                </div>

                {order.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">{t("employee.completed", "Completed")}:</span>
                    <span className="font-medium text-green-600">
                      {formatDateShort(order.completedAt)}
                    </span>
                  </div>
                )}
              </div>

              {order.status === "COMPLETED" && order.proofOfCompletion && (
                <div className="mt-3 pt-3 border-t dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-1">
                    {t("employee.proof", "Proof")}:
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-gray-400 line-clamp-2">
                    {order.proofOfCompletion}
                  </p>
                </div>
              )}

              {order.status === "IN_PROGRESS" && (
                <a
                  href={`/e/orders/${order.id}`}
                  className="mt-3 block w-full px-3 py-2 bg-green-600 text-white text-center rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  {t("employee.submitReview", "Submit Review")}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
