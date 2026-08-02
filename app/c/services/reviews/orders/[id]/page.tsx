"use client";

import { useContext, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getReviewOrderDetailAction, submitClientFeedbackAction } from "@/app/actions/reviews";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime } from "@/lib/dateUtils";

const FEEDBACK_OPTIONS = [
  { value: "HAPPY", label: "Happy", color: "bg-green-500 hover:bg-green-600" },
  { value: "UNHAPPY", label: "Unhappy", color: "bg-yellow-500 hover:bg-yellow-600" },
  { value: "ANGRY", label: "Angry", color: "bg-red-500 hover:bg-red-600" }
] as const;

export default function ReviewOrderDetailPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    if (!user || !orderId) return;

    const loadOrder = async () => {
      const result = await getReviewOrderDetailAction(orderId);

      if (result.success) {
        setOrder(result.data);
      } else {
        error(result.error || "Failed to load order");
        router.push("/c/services/reviews/orders");
      }
      setLoading(false);
    };

    loadOrder();
  }, [user, orderId]);

  const handleFeedback = async (feedback: "HAPPY" | "UNHAPPY" | "ANGRY") => {
    setSubmittingFeedback(true);

    const result = await submitClientFeedbackAction(orderId, feedback);

    setSubmittingFeedback(false);

    if (result.success) {
      success(t("reviews.feedbackSubmitted", "Feedback submitted"));
      setOrder({ ...order, clientFeedback: feedback });
    } else {
      error(result.error || "Failed to submit feedback");
    }
  };

  if (loading) return <LoadingScreen />;
  if (!order) return null;

  const canSubmitFeedback = order.status === "COMPLETED" && !order.clientFeedback;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold flex-1">
          {order.businessName}
        </h1>
        <StatusBadge status={order.status} />
      </div>

      {/* Order Details Card */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow space-y-4">
        {/* Basic Info */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {t("reviews.orderType", "Order Type")}
            </h3>
            <p className="font-medium">{order.orderType}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {t("reviews.platform", "Platform")}
            </h3>
            <p className="font-medium">{order.reviewType}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {t("reviews.businessName", "Business Name")}
            </h3>
            <p className="font-medium">{order.businessName || 'N/A'}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {t("reviews.targetRating", "Target Rating")}
            </h3>
            <p className="font-medium">{order.targetRating?.replace("_", " ") || 'N/A'}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {t("reviews.quantity", "Quantity")}
            </h3>
            <p className="font-medium">{order.quantity}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {t("reviews.creditsConsumed", "Credits Consumed")}
            </h3>
            <p className="font-medium">{order.creditsConsumed}</p>
          </div>
        </div>

        {order.facebookUrl && (
          <div>
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {t("reviews.facebookUrl", "Facebook URL")}
            </h3>
            <a
              href={order.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#168BB0] hover:underline"
            >
              {order.facebookUrl}
            </a>
          </div>
        )}

        {/* Review Content (for REVIEW orders) */}
        {order.orderType === "REVIEW" && order.content && (
          <div>
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              {t("reviews.reviewContent", "Review Content")}
            </h3>
            <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg">
              <p className="whitespace-pre-wrap">{order.content}</p>
            </div>
          </div>
        )}

        {/* Comment Text (for COMMENT and COMMENT_WITH_PHOTO orders) */}
        {(order.orderType === "COMMENT" || order.orderType === "COMMENT_WITH_PHOTO") && order.commentText && (
          <div>
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              {t("reviews.commentText", "Comment Text")}
            </h3>
            <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg">
              <p className="whitespace-pre-wrap">{order.commentText}</p>
            </div>
          </div>
        )}

        {/* Photos (for COMMENT_WITH_PHOTO orders) */}
        {order.orderType === "COMMENT_WITH_PHOTO" && order.photoUrls && order.photoUrls.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              {t("reviews.photos", "Photos")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {order.photoUrls.map((url: string, index: number) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-auto rounded-lg border border-zinc-200 dark:border-zinc-700"
                    onError={(e) => {
                      console.error(`Failed to load photo ${index + 1}:`, url);
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {order.reviewInstructions && (
          <div>
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              {t("reviews.instructions", "Additional Instructions")}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {order.reviewInstructions}
            </p>
          </div>
        )}
      </div>

      {/* Timeline Card */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow">
        <h3 className="font-semibold mb-4">
          {t("reviews.timeline", "Timeline")}
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">{t("reviews.created", "Created")}:</span>
            <span>{formatDateTime(order.createdAt)}</span>
          </div>
          {order.updatedAt !== order.createdAt && (
            <div className="flex justify-between">
              <span className="text-zinc-500">{t("reviews.lastUpdated", "Last Updated")}:</span>
              <span>{formatDateTime(order.updatedAt)}</span>
            </div>
          )}
          {order.completedAt && (
            <div className="flex justify-between">
              <span className="text-zinc-500">{t("reviews.completed", "Completed")}:</span>
              <span className="text-green-600 font-medium">
                {formatDateTime(order.completedAt)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Card */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow">
        <h3 className="font-semibold mb-4">
          {t("reviews.yourFeedback", "Your Feedback")}
        </h3>

        {order.clientFeedback ? (
          <div className={`inline-block px-4 py-2 rounded-lg font-medium
            ${order.clientFeedback === "HAPPY" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" :
              order.clientFeedback === "UNHAPPY" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" :
              "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"}`}>
            {t(`reviews.feedback.${order.clientFeedback}`, order.clientFeedback) as string}
          </div>
        ) : canSubmitFeedback ? (
          <div>
            <p className="text-sm text-zinc-500 mb-4">
              {t("reviews.feedbackPrompt", "How satisfied are you with this review?")}
            </p>
            <div className="flex flex-wrap gap-3">
              {FEEDBACK_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleFeedback(option.value)}
                  disabled={submittingFeedback}
                  className={`${option.color} text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50`}
                >
                  {submittingFeedback
                    ? t("common.submitting", "Submitting...")
                    : t(`reviews.feedback.${option.value}`, option.label)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            {t("reviews.feedbackUnavailable", "Feedback available after completion")}
          </p>
        )}
      </div>

      {/* Status Info */}
      {order.status === "PENDING" && (
        <div className="bg-[#168BB0]/10 dark:bg-[#168BB0]/10 border border-[#168BB0]/20 dark:border-[#168BB0]/20 rounded-lg p-4">
          <p className="text-sm text-[#168BB0] dark:text-[#45B0D2]">
            {t("reviews.pendingInfo", "Your order is pending assignment to an employee. You'll be notified when work begins.")}
          </p>
        </div>
      )}

      {order.status === "IN_PROGRESS" && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {t("reviews.inProgressInfo", "An employee is working on your order. You'll be notified when it's completed.")}
          </p>
        </div>
      )}
    </div>
  );
}
