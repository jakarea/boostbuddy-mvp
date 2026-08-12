"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { CopyReviewButton } from "@/components/reviews/CopyReviewButton";
import { submitUrlTaskCompletionAction } from "@/app/actions/reviews-multiurl";
import { getOrderUrlTasksAction } from "@/app/actions/reviews-multiurl";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Clock, Circle } from "lucide-react";
import { formatDateTime } from "@/lib/dateUtils";
import { REACTIONS } from "@/lib/reactionUtils";

interface UrlTask {
  id: string;
  url: string;
  quantity: number;
  reviewContent: string | null;
  photos: string[] | null;
  reactionType: string | null;
  reviewIndex: number;
  status: "PENDING" | "ASSIGNED" | "COMPLETED";
  assignedEmployeeId: string | null;
  assignedAt: string | null;
  completedAt: string | null;
  proofOfCompletion: string | null;
  createdAt: string;
}

interface OrderData {
  orderId: string;
  businessName: string;
  orderType: string;
  urlTasks: UrlTask[];
}

export default function EmployeeOrderDetailPage() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [proofs, setProofs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user || !orderId) return;

    const loadOrder = async () => {
      try {
        const result = await getOrderUrlTasksAction(orderId);

        if (result.success && result.data) {
          setOrderData(result.data as OrderData);
        } else {
          toastError(result.error || "Order not found");
          router.push("/e/dashboard");
        }
      } catch (err) {
        console.error("Failed to load order:", err);
        toastError("Failed to load order");
        router.push("/e/dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [user, orderId, toastError, router]);

  const handleSubmitProof = async (taskId: string) => {
    const proof = proofs[taskId];
    if (!proof?.trim()) {
      toastError("Proof is required");
      return;
    }

    setSubmittingTaskId(taskId);

    try {
      const result = await submitUrlTaskCompletionAction(taskId, proof);

      if (result.success) {
        toastSuccess("Task submitted successfully");
        // Reload order data
        const reloadResult = await getOrderUrlTasksAction(orderId);
        if (reloadResult.success && reloadResult.data) {
          setOrderData(reloadResult.data as OrderData);
        }
        // Clear proof for this task
        setProofs(prev => ({ ...prev, [taskId]: "" }));
      } else {
        toastError(result.error || "Failed to submit task");
      }
    } catch (err) {
      console.error("Failed to submit task:", err);
      toastError("Failed to submit task");
    } finally {
      setSubmittingTaskId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-full">
            <Circle className="w-3 h-3" />
            Pending
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
            <Clock className="w-3 h-3" />
            In Progress
          </span>
        );
      case "COMPLETED":
        return (
          <span className="flex items-center gap-1.5 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      default:
        return <span className="text-xs">{status}</span>;
    }
  };

  const getReactionEmoji = (reactionType: string | null) => {
    if (!reactionType) return null;
    const reaction = REACTIONS.find(r => r.type === reactionType);
    return reaction?.emoji || "👍";
  };

  if (loading) return <LoadingScreen />;
  if (!orderData) return null;

  const completedCount = orderData.urlTasks.filter(t => t.status === "COMPLETED").length;
  const isOrderComplete = completedCount === orderData.urlTasks.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/e/dashboard")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{orderData.businessName}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {orderData.orderType === "REVIEW" && "Review Order"}
            {orderData.orderType === "COMMENT" && "Reaction Order"}
            {orderData.orderType === "COMMENT_WITH_PHOTO" && "Photo + Review Order"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Progress</p>
          <p className="text-lg font-bold text-[#168BB0]">{completedCount}/{orderData.urlTasks.length}</p>
        </div>
      </div>

      {/* Order Complete Banner */}
      {isOrderComplete && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-semibold text-green-900 dark:text-green-100">Order Complete!</p>
              <p className="text-sm text-green-700 dark:text-green-300">
                All {orderData.urlTasks.length} URL tasks have been completed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* URL Tasks List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">URL Tasks</h2>
        {orderData.urlTasks.map((task) => (
          <div key={task.id} className="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow border border-zinc-200 dark:border-zinc-800">
            {/* Task Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#168BB0] text-white flex items-center justify-center text-sm font-bold">
                  {task.reviewIndex + 1}
                </div>
                <div>
                  <p className="font-medium">URL {task.reviewIndex + 1}</p>
                  <p className="text-sm text-zinc-500">Quantity: {task.quantity}</p>
                </div>
              </div>
              {getStatusBadge(task.status)}
            </div>

            {/* URL to review */}
            <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg mb-4">
              <p className="text-xs text-zinc-500 mb-1">URL to review:</p>
              <a
                href={task.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
              >
                {task.url}
              </a>
            </div>

            {/* Review Content with Copy Button */}
            {task.reviewContent && (
              <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-lg mb-4">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <p className="text-xs text-zinc-500">Review to post:</p>
                  <CopyReviewButton content={task.reviewContent} size="sm" />
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{task.reviewContent}</p>
              </div>
            )}

            {/* Reaction Type */}
            {task.reactionType && orderData.orderType !== "REVIEW" && (
              <div className="mb-4">
                <p className="text-xs text-zinc-500 mb-1">Reaction to post:</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getReactionEmoji(task.reactionType)}</span>
                  <span className="text-sm font-medium">{task.reactionType}</span>
                </div>
              </div>
            )}

            {/* Photos info */}
            {task.photos && task.photos.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-zinc-500 mb-1">Photos to upload:</p>
                <div className="flex flex-wrap gap-2">
                  {task.photos.map((photo, idx) => (
                    <img
                      key={idx}
                      src={photo}
                      alt={`Photo ${idx + 1}`}
                      className="w-20 h-20 object-cover rounded border"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Task - Show proof */}
            {task.status === "COMPLETED" && task.proofOfCompletion && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                  Completed at {formatDateTime(task.completedAt || "")}
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  <strong>Proof:</strong> {task.proofOfCompletion}
                </p>
              </div>
            )}

            {/* In-Progress Task - Submit proof form */}
            {task.status === "ASSIGNED" && (
              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
                <h3 className="text-sm font-medium mb-2">Submit Proof of Completion</h3>
                <textarea
                  value={proofs[task.id] || ""}
                  onChange={(e) => setProofs(prev => ({ ...prev, [task.id]: e.target.value }))}
                  placeholder="Paste screenshot URL or describe how you completed the review..."
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm resize-none"
                  rows={3}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleSubmitProof(task.id)}
                    disabled={submittingTaskId === task.id || !proofs[task.id]?.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {submittingTaskId === task.id ? "Submitting..." : "Submit Task"}
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Once submitted, this task cannot be modified.
                </p>
              </div>
            )}

            {/* Pending Task - Not assigned to anyone */}
            {task.status === "PENDING" && (
              <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This task is not assigned to anyone. You can accept it from the dashboard.
                </p>
              </div>
            )}

            {/* Timestamps */}
            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex gap-4 text-xs text-zinc-500">
                <span>Created: {formatDateTime(task.createdAt)}</span>
                {task.assignedAt && <span>Assigned: {formatDateTime(task.assignedAt)}</span>}
                {task.completedAt && <span>Completed: {formatDateTime(task.completedAt)}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
