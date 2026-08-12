"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { CopyReviewButton } from "@/components/reviews/CopyReviewButton";
import { acceptUrlTaskAction } from "@/app/actions/reviews-multiurl";
import { toggleTaskDistributionAction } from "@/app/actions/employee";
import { getEmployeeDashboardDataAction, DashboardData, UrlTask } from "@/app/actions/employee-dashboard";
import { formatDateTime } from "@/lib/dateUtils";
import { useSWR } from "@/lib/cache/swr";
import { CACHE_KEYS } from "@/lib/cache/cacheContext";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmployeeDashboardContent({
  initialData,
}: {
  initialData: DashboardData;
}) {
  const { success: toastSuccess, error: toastError } = useToast();
  const { t } = useTranslation();
  const [acceptingTaskId, setAcceptingTaskId] = useState<string | null>(null);

  // SWR for employee dashboard data - 1 minute cache (more frequent refresh for active tasks)
  const { data: dashboardData, refresh, isValid } = useSWR({
    key: CACHE_KEYS.EMPLOYEE_DASHBOARD,
    fetcher: async () => {
      const result = await getEmployeeDashboardDataAction();
      if (result.success && 'data' in result) {
        return result.data;
      }
      return initialData; // Fallback to initial data on error
    },
    ttl: 1 * 60 * 1000, // 1 minute - shorter cache for active work
    initialData: initialData,
  });

  const stats = dashboardData?.stats || initialData.stats;
  const availableTasks = dashboardData?.availableTasks || initialData.availableTasks;
  const currentAssignments = dashboardData?.currentAssignments || initialData.currentAssignments;

  const handleAcceptTask = async (taskId: string) => {
    // Check if task distribution is enabled
    if (!stats.acceptingTasks) {
      toastError("You must enable task distribution to accept tasks");
      return;
    }

    setAcceptingTaskId(taskId);

    const result = await acceptUrlTaskAction(taskId);

    setAcceptingTaskId(null);

    if (result.success) {
      toastSuccess("Task accepted successfully");
      refresh(); // Refresh SWR cache
    } else {
      toastError(result.error || "Failed to accept task");
    }
  };

  const handleToggleTaskDistribution = async () => {
    const result = await toggleTaskDistributionAction();

    if (result.success && result.data) {
      refresh(); // Refresh SWR cache
      toastSuccess(
        result.data.acceptingTasks
          ? "Task distribution enabled - you will now receive new tasks"
          : "Task distribution disabled - you won't receive new tasks"
      );
    } else {
      toastError(result.error || "Failed to toggle task distribution");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs rounded border border-purple-200 dark:border-purple-800">
            Available
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded border border-blue-200 dark:border-blue-800">
            In Progress
          </span>
        );
      case "COMPLETED":
        return (
          <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs rounded border border-emerald-200 dark:border-emerald-800">
            Completed
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 text-xs rounded border border-gray-200 dark:border-gray-800">
            {status}
          </span>
        );
    }
  };

  const getOrderTypeLabel = (orderType: string) => {
    switch (orderType) {
      case "REVIEW":
        return "Review";
      case "COMMENT":
        return "Comment";
      case "COMMENT_WITH_PHOTO":
        return "Comment with Photo";
      default:
        return orderType;
    }
  };

  const renderTaskCard = (task: UrlTask, isAssignment: boolean = false) => (
    <div key={task.id} className="p-4 space-y-3">
      {/* Header with business name and status */}
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{task.businessName}</h4>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {getOrderTypeLabel(task.orderType)} • URL {task.reviewIndex + 1}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {isAssignment && task.assignedAt
              ? `Assigned: ${formatDateTime(task.assignedAt)}`
              : `Created: ${formatDateTime(task.createdAt)}`}
          </p>
        </div>
        {getStatusBadge(task.status)}
      </div>

      {/* URL to review */}
      <div className="bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded border border-zinc-200 dark:border-zinc-800">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">URL to review:</p>
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
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Review to post:</p>
            <CopyReviewButton content={task.reviewContent} size="sm" />
          </div>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{task.reviewContent}</p>
        </div>
      )}

      {/* Instructions */}
      {task.reviewInstructions && (
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          <strong>Instructions:</strong> {task.reviewInstructions}
        </div>
      )}

      {/* Reaction type for comments */}
      {task.reactionType && task.orderType !== "REVIEW" && (
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          <strong>Reaction:</strong> {task.reactionType}
        </div>
      )}

      {/* Quantity info */}
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        Quantity: {task.quantity} {task.quantity === 1 ? 'review' : 'reviews'}
      </p>

      {/* Action button for available tasks */}
      {!isAssignment && (
        <button
          onClick={() => handleAcceptTask(task.id)}
          disabled={acceptingTaskId === task.id || !stats.acceptingTasks}
          className="w-full px-4 py-2 bg-[#168BB0] text-white rounded-lg hover:bg-[#0F7493] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {acceptingTaskId === task.id
            ? "Accepting..."
            : "Accept Task"}
        </button>
      )}

      {/* Submit link for assignments */}
      {isAssignment && (
        <a
          href={`/e/orders/${task.reviewOrderId}`}
          className="inline-block w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium text-center"
        >
          Submit Task
        </a>
      )}
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4 sm:pb-5">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold tracking-tight">Employee Dashboard</h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Manage your review tasks and assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={refresh}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!isValid}
          >
            <Loader2 className={`h-4 w-4 ${!isValid ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <button
            onClick={handleToggleTaskDistribution}
            className={`px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 h-10 text-sm w-full sm:w-auto shrink-0 ${
              stats?.acceptingTasks
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
            }`}
          >
            {stats?.acceptingTasks ? (
              <>
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                Receiving Tasks
              </>
            ) : (
              "Task Distribution Paused"
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Completed</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats?.tasksCompleted || 0}</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">In Progress</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{currentAssignments.length}</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Available Tasks</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{availableTasks.length}</p>
        </div>
      </div>

      {/* Task Distribution Disabled Warning */}
      {!stats?.acceptingTasks && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Task Distribution Paused:</strong> You won't receive new tasks. Click the toggle above to enable task distribution.
          </p>
        </div>
      )}

      {/* Current Assignments */}
      {currentAssignments.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-800">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Current Assignments</h3>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {currentAssignments.map((task) => renderTaskCard(task, true))}
          </div>
        </div>
      )}

      {/* Available Tasks */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-800">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Available Tasks</h3>
        </div>

        {availableTasks.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
            No tasks available
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {availableTasks.map((task) => renderTaskCard(task, false))}
          </div>
        )}
      </div>
    </div>
  );
}
