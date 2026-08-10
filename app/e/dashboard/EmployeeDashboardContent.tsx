"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import {
  acceptOrderAction,
  toggleAvailabilityAction
} from "@/app/actions/employee";
import {
  getEmployeeDashboardDataAction
} from "@/app/actions/employee-dashboard";
import { formatDateTime } from "@/lib/dateUtils";

interface Stats {
  isAvailable: boolean;
  ordersCompleted: number;
}

interface Order {
  id: string;
  businessName: string;
  reviewType: string;
  targetRating: string;
  creditsConsumed: number;
  createdAt: string;
  reviewContent: string;
  reviewInstructions: string | null;
  businessUrl: string | null;
  status: string;
  assignedAt?: string;
}

interface DashboardData {
  stats: Stats;
  availableOrders: Order[];
  currentAssignments: Order[];
}

export function EmployeeDashboardContent({
  initialData,
}: {
  initialData: DashboardData;
}) {
  const { success, error } = useToast();
  const { t } = useTranslation();
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);

  const [stats, setStats] = useState<Stats>(initialData.stats);
  const [availableOrders, setAvailableOrders] = useState<Order[]>(initialData.availableOrders);
  const [currentAssignments, setCurrentAssignments] = useState<Order[]>(initialData.currentAssignments);

  const handleAcceptOrder = async (orderId: string) => {
    setAcceptingOrderId(orderId);

    const result = await acceptOrderAction(orderId);

    setAcceptingOrderId(null);

    if (result.success) {
      success(t("employee.orderAccepted", "Order accepted successfully"));

      // Reload data with single batched action
      const dashboardResult = await getEmployeeDashboardDataAction();

      if (dashboardResult.success && 'data' in dashboardResult) {
        const data = dashboardResult.data;
        setStats(data.stats);
        setAvailableOrders(data.availableOrders);
        setCurrentAssignments(data.currentAssignments);
      }
    } else {
      error(result.error || "Failed to accept order");
    }
  };

  const handleToggleAvailability = async () => {
    const result = await toggleAvailabilityAction();

    if (result.success && result.data) {
      setStats({ ...stats, isAvailable: result.data.isAvailable });
      success(
        result.data.isAvailable
          ? t("employee.nowAvailable", "You are now available")
          : t("employee.nowUnavailable", "You are now unavailable")
      );
    } else {
      error(result.error || "Failed to toggle availability");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4 sm:pb-5">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold tracking-tight">{t("employee.title", "Employee Dashboard")}</h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            {t("employee.subtitle", "Manage your orders and assignments")}
          </p>
        </div>
        <button
          onClick={handleToggleAvailability}
          className={`px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 h-10 text-sm w-full sm:w-auto shrink-0 ${
            stats?.isAvailable
              ? "bg-emerald-500 text-white hover:bg-emerald-600"
              : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
          }`}
        >
          {stats?.isAvailable ? (
            <>
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              {t("employee.available", "Available")}
            </>
          ) : (
            t("employee.unavailable", "Unavailable")
          )}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("employee.completed", "Completed")}</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats?.ordersCompleted || 0}</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("employee.currentAssignments", "In Progress")}</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{currentAssignments.length}</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("employee.available", "Available Orders")}</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{availableOrders.length}</p>
        </div>
      </div>

      {/* Current Assignments */}
      {currentAssignments.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-800">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{t("employee.currentAssignments", "Current Assignments")}</h3>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {currentAssignments.map((assignment) => (
              <div key={assignment.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-zinc-100">{assignment.businessName}</h4>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{assignment.reviewType} {/* Rating - Hidden from UI */}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      {t("employee.assigned", "Assigned")}: {formatDateTime(assignment.assignedAt || assignment.createdAt)}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded border border-blue-200 dark:border-blue-800">
                    {t("employee.inProgress", "In Progress")}
                  </span>
                </div>

                {assignment.reviewInstructions && (
                  <div className="mb-3">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      <strong>{t("employee.instructions", "Instructions")}:</strong> {assignment.reviewInstructions}
                    </p>
                  </div>
                )}

                <a
                  href={`/e/orders/${assignment.id}`}
                  className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                >
                  {t("employee.submitReview", "Submit Review")}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Orders */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-800">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{t("employee.availableOrders", "Available Orders")}</h3>
        </div>

        {availableOrders.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
            {t("employee.noAvailableOrders", "No orders available")}
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {availableOrders.map((order) => (
              <div key={order.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-zinc-100">{order.businessName}</h4>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{order.reviewType} {/* Rating - Hidden from UI */}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">{order.creditsConsumed} {t("credits.credits", "credits")}</p>
                  </div>
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs rounded border border-purple-200 dark:border-purple-800">
                    {t("employee.available", "Available")}
                  </span>
                </div>

                {order.reviewInstructions && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                    <strong>{t("employee.instructions", "Instructions")}:</strong> {order.reviewInstructions}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => handleAcceptOrder(order.id)}
                    disabled={acceptingOrderId === order.id || !stats?.isAvailable}
                    className="flex-1 px-4 py-2 bg-[#168BB0] text-white rounded-lg hover:bg-[#0F7493] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {acceptingOrderId === order.id
                      ? t("common.accepting", "Accepting...")
                      : t("employee.acceptOrder", "Accept Order")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
