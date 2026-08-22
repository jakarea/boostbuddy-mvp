"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/dateUtils";
import { CopyReviewButton } from "@/components/reviews/CopyReviewButton";
import { completeReviewOrderAction, getMyEmployeeStatsAction } from "@/app/actions/employee";
import { getEmployeeDashboardDataAction, type DashboardData, type UrlTask } from "@/app/actions/employee-dashboard";
import { useSWR } from "@/lib/cache/swr";
import { CACHE_KEYS } from "@/lib/cache/cacheContext";
import CACHE_TTL from "@/lib/cache/cache-ttl";

interface EmployeeStatsData {
  totalCreditsCompleted: number;
  totalOrdersCompleted: number;
  todayCreditsCompleted: number;
  todayOrdersCompleted: number;
}

export function EmployeeDashboardContent({
  initialData,
}: {
  initialData: DashboardData;
}) {
  const { t } = useTranslation("employee");
  const { success: toastSuccess, error: toastError } = useToast();
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const { data: dashboardData, refresh, isValid } = useSWR({
    key: CACHE_KEYS.EMPLOYEE_DASHBOARD,
    fetcher: async () => {
      try {
        const result = await getEmployeeDashboardDataAction();
        if (result.success && 'data' in result && result.data) {
          return result.data;
        }
        return initialData;
      } catch (error) {
        console.error('[EmployeeDashboard] Failed to fetch stats:', error);
        return initialData;
      }
    },
    ttl: CACHE_TTL.SHORT,
  });

  const stats = dashboardData?.stats || initialData.stats;
  const availableTasks = dashboardData?.availableTasks || initialData.availableTasks;
  const employeeStats = dashboardData?.employeeStats || initialData.employeeStats;

  const handleCompleteTask = async (taskId: string) => {
    if (!stats.acceptingTasks) {
      toastError(t("dashboard.must_enable_distribution", "You must enable task distribution to complete tasks"));
      return;
    }

    setCompletingTaskId(taskId);
    const result = await completeReviewOrderAction(taskId);
    setCompletingTaskId(null);

    if (result.success) {
      toastSuccess(t("dashboard.task_completed_success", "Task completed successfully!"));
      refresh();
    } else {
      toastError(result.error || t("dashboard.task_completed_failed", "Failed to complete task"));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs rounded border border-purple-200 dark:border-purple-800">
            {t("status.available", "Available")}
          </span>
        );
      case "ASSIGNED":
      case "IN_PROGRESS":
        return (
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded border border-blue-200 dark:border-blue-800">
            {t("status.in_progress", "In Progress")}
          </span>
        );
      case "COMPLETED":
        return (
          <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs rounded border border-emerald-200 dark:border-emerald-800">
            {t("status.completed", "Completed")}
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 text-xs rounded border border-zinc-200 dark:border-zinc-800">
            {status}
          </span>
        );
    }
  };

  const getOrderTypeLabel = (orderType: string) => {
    switch (orderType) {
      case "REVIEW":
        return t("orders.type_reviews", "Reviews");
      case "COMMENT":
        return t("orders.type_reactions", "Reactions");
      case "COMMENT_WITH_PHOTO":
        return t("orders.type_photo_reviews", "Photo + Reviews");
      default:
        return orderType?.replace(/_/g, " ") || orderType;
    }
  };

  const renderTaskCard = (task: UrlTask) => (
    <div key={task.id} className="p-4 space-y-3">
      {/* Header with business name and status */}
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{task.businessName}</h4>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {getOrderTypeLabel(task.orderType)} • URL {task.reviewIndex + 1}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {t("orders.created", "Created")}: {formatDateTime(task.createdAt)}
          </p>
        </div>
        {getStatusBadge(task.status)}
      </div>

      {/* URL to review */}
      <div className="bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded border border-zinc-200 dark:border-zinc-800">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{t("dashboard.url_to_review", "URL to review:")}</p>
        <a
          href={task.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
        >
          {task.url}
        </a>
      </div>

      {/* Review content with Copy button */}
      {task.reviewContent && (
        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded border border-zinc-200 dark:border-zinc-800">
          <div className="flex justify-between items-start gap-2 mb-2">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("dashboard.review_to_post", "Review to post:")}</p>
            <CopyReviewButton content={task.reviewContent} size="sm" />
          </div>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{task.reviewContent}</p>
        </div>
      )}

      {/* Instructions */}
      {task.reviewInstructions && (
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          <strong>{t("orders.instructions", "Instructions")}:</strong> {task.reviewInstructions}
        </div>
      )}

      {/* Reaction type for comments */}
      {task.reactionType && task.orderType !== "REVIEW" && (
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          <strong>{t("dashboard.reaction", "Reaction")}:</strong> {task.reactionType}
        </div>
      )}

      {/* Quantity info */}
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        {t("orders.qty", "Quantity")}: {task.quantity} {task.quantity === 1 ? t("orders.review_singular", "review") : t("orders.reviews_plural", "reviews")}
      </p>

      {/* Complete Task button */}
      <button
        onClick={() => handleCompleteTask(task.reviewOrderId)}
        disabled={completingTaskId === task.reviewOrderId || !stats.acceptingTasks}
        className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
      >
        {completingTaskId === task.reviewOrderId ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("dashboard.completing", "Completing...")}
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            {t("dashboard.mark_as_completed", "Mark as Completed")}
          </>
        )}
      </button>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4 sm:pb-5">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold tracking-tight">
            {t("dashboard.title", "Employee Dashboard")}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            {t("dashboard.subtitle", "Complete review tasks and track your performance")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={refresh}
            variant="outline"
            size="sm"
            className="gap-2 cursor-pointer"
            disabled={!isValid}
          >
            <Loader2 className={`h-4 w-4 ${!isValid ? 'animate-spin' : ''}`} />
            {t("common.refresh", "Refresh")}
          </Button>
        </div>
      </div>

      {/* Employee Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("dashboard.total_credits", "Total Credits")}</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {employeeStats?.totalCreditsCompleted || 0}
          </p>
          <p className="text-xs text-zinc-400 mt-1">{t("dashboard.credits_completed", "credits completed")}</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("dashboard.total_orders", "Total Orders")}</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {employeeStats?.totalOrdersCompleted || 0}
          </p>
          <p className="text-xs text-zinc-400 mt-1">{t("dashboard.orders_completed", "orders completed")}</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("dashboard.todays_credits", "Today's Credits")}</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {employeeStats?.todayCreditsCompleted || 0}
          </p>
          <p className="text-xs text-zinc-400 mt-1">{t("dashboard.credits_today", "credits today")}</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("dashboard.todays_orders", "Today's Orders")}</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {employeeStats?.todayOrdersCompleted || 0}
          </p>
          <p className="text-xs text-zinc-400 mt-1">{t("dashboard.orders_today", "orders today")}</p>
        </div>
      </div>

      {/* Task Distribution Status */}
      <div className={`rounded-lg p-4 border ${
        stats?.acceptingTasks
          ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
          : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
      }`}>
        <p className="text-sm">
          <strong className={stats?.acceptingTasks ? "text-emerald-800 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"}>
            {stats?.acceptingTasks ? t("dashboard.distribution_active", "✓ Task Distribution Active") : t("dashboard.distribution_paused", "⚠ Task Distribution Paused")}
          </strong>
          {!stats?.acceptingTasks && t("dashboard.distribution_paused_desc", " - You won't see new tasks until you enable distribution")}
        </p>
      </div>

      {/* Available Tasks */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-800">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            {t("dashboard.available_tasks", "Available Tasks")} ({availableTasks.length})
          </h3>
        </div>

        {availableTasks.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
            {t("dashboard.no_tasks", "No tasks available")}
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-[600px] overflow-y-auto">
            {availableTasks.map((task) => renderTaskCard(task))}
          </div>
        )}
      </div>
    </div>
  );
}

export default EmployeeDashboardContent;
