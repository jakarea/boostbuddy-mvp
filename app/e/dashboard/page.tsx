"use client";

import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  getEmployeeDashboardDataAction
} from "@/app/actions/employee-dashboard";
import {
  acceptOrderAction,
  skipOrderAction,
  toggleAvailabilityAction
} from "@/app/actions/employee";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime } from "@/lib/dateUtils";

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);
  const [skippingOrderId, setSkippingOrderId] = useState<string | null>(null);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [skipReason, setSkipReason] = useState("");

  useEffect(() => {
    if (!showSkipModal) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowSkipModal(false);
        setSkipReason("");
        setSkippingOrderId(null);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showSkipModal]);

  const [stats, setStats] = useState<any>(null);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [currentAssignments, setCurrentAssignments] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        // OPTIMIZATION: Single batched action instead of 3 separate calls
        const result = await getEmployeeDashboardDataAction();

        if (result.success) {
          const data = result.data as { stats: any; availableOrders: any[]; currentAssignments: any[] };
          setStats(data.stats);
          setAvailableOrders(data.availableOrders);
          setCurrentAssignments(data.currentAssignments);
        } else {
          console.error('Failed to load dashboard data:', result.error);
          error(t("load_dashboard_failed", "Failed to load dashboard data"));
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        error(t("load_dashboard_failed", "Failed to load dashboard data"));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleAcceptOrder = async (orderId: string) => {
    setAcceptingOrderId(orderId);

    const result = await acceptOrderAction(orderId);

    setAcceptingOrderId(null);

    if (result.success) {
      success(t("employee.orderAccepted", "Order accepted successfully"));

      // Reload data with single batched action
      const dashboardResult = await getEmployeeDashboardDataAction();

      if (dashboardResult.success && dashboardResult.data) {
        const data = dashboardResult.data;
        setStats(data.stats);
        setAvailableOrders(data.availableOrders);
        setCurrentAssignments(data.currentAssignments);
      }
    } else {
      error(result.error || "Failed to accept order");
    }
  };

  const handleSkipOrder = async () => {
    if (!skipReason.trim()) {
      error(t("employee.skipReasonRequired", "Please provide a reason"));
      return;
    }

    setSkippingOrderId(skippingOrderId);

    const result = await skipOrderAction(skippingOrderId || "", skipReason);

    setSkippingOrderId(null);
    setShowSkipModal(false);
    setSkipReason("");

    if (result.success) {
      success(t("employee.orderSkipped", "Order skipped successfully"));

      // Reload data with single batched action
      const dashboardResult = await getEmployeeDashboardDataAction();

      if (dashboardResult.success && dashboardResult.data) {
        const data = dashboardResult.data;
        setStats(data.stats);
        setAvailableOrders(data.availableOrders);
        setCurrentAssignments(data.currentAssignments);
      }
    } else {
      error(result.error || "Failed to skip order");
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

  const openSkipModal = (orderId: string) => {
    setSkippingOrderId(orderId);
    setShowSkipModal(true);
  };

  if (loading) return <LoadingScreen />;

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("employee.completed", "Completed")}</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats?.ordersCompleted || 0}</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("employee.skipped", "Skipped")}</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats?.ordersSkipped || 0}</p>
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

                <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded mb-3 border border-zinc-200 dark:border-zinc-800">
                  <p className="text-sm font-medium mb-1 text-zinc-900 dark:text-zinc-100">{t("employee.reviewContent", "Review Content")}:</p>
                  <p className="text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{assignment.reviewContent}</p>
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

                <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded mb-3 border border-zinc-200 dark:border-zinc-800">
                  <p className="text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{order.reviewContent}</p>
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
                  <button
                    onClick={() => openSkipModal(order.id)}
                    disabled={skippingOrderId === order.id}
                    className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    {t("employee.skip", "Skip")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Skip Order Modal */}
      {showSkipModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSkipModal(false);
              setSkipReason("");
              setSkippingOrderId(null);
            }
          }}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-md w-full border border-zinc-200 dark:border-zinc-800"
            role="dialog"
            aria-modal="true"
            aria-labelledby="skip-modal-title"
          >
            <h3 id="skip-modal-title" className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">{t("employee.skipReason", "Skip Reason")}</h3>
            <textarea
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              placeholder={t("employee.skipReasonPlaceholder", "Why are you skipping this order?")}
              className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 mb-4 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500"
              rows={3}
              aria-label={t("employee.skipReason", "Skip reason")}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleSkipOrder}
                disabled={skippingOrderId !== null}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                {skippingOrderId ? t("common.skipping", "Skipping...") : t("employee.confirmSkip", "Confirm Skip")}
              </button>
              <button
                onClick={() => {
                  setShowSkipModal(false);
                  setSkipReason("");
                  setSkippingOrderId(null);
                }}
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium text-zinc-700 dark:text-zinc-300"
              >
                {t("common.cancel", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
