"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { submitCompletedReviewAction } from "@/app/actions/employee";
import { getEmployeeOrderDetailAction } from "@/app/actions/admin-reviews";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { formatDateTime, safeDateDisplay } from "@/lib/dateUtils";
import { getReactionEmoji, getReactionBadgeClasses } from "@/lib/reactionUtils";

export default function EmployeeOrderDetailPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [proof, setProof] = useState("");

  useEffect(() => {
    if (!user || !orderId) return;

    const loadOrder = async () => {
      try {
        const result = await getEmployeeOrderDetailAction(orderId);

        if (result.success && result.data) {
          // Normalize field names for dual-mode compatibility
          const raw = result.data as any;
          const normalized = {
            ...raw,
            businessName: raw.businessName || raw.business_name,
            businessUrl: raw.businessUrl || raw.business_url,
            reviewType: raw.reviewType || raw.review_type,
            targetRating: raw.targetRating || raw.target_rating,
            reactionType: raw.reactionType || raw.reaction_type || 'LIKE',
            reviewContent: raw.reviewContent || raw.review_content,
            reviewInstructions: raw.reviewInstructions || raw.review_instructions,
            creditsConsumed: raw.creditsConsumed ?? raw.credits_consumed ?? 0,
            status: raw.status,
            assignedAt: raw.assignedAt || raw.assigned_at,
            completedAt: raw.completedAt || raw.completed_at,
            createdAt: raw.createdAt || raw.created_at,
            updatedAt: raw.updatedAt || raw.updated_at,
            proofOfCompletion: raw.proofOfCompletion || raw.proof_of_completion,
            clientName: raw.clientName || raw.client_name || (raw.users as any)?.name,
            clientEmail: raw.clientEmail || raw.client_email || (raw.users as any)?.email,
          };
          setOrder(normalized);
        } else {
          error(result.error || t("employee.orderNotFound", "Order not found"));
          router.push("/e/dashboard");
        }
      } catch (err) {
        console.error("Failed to load order:", err);
        error(t("load_order_failed", "Failed to load order"));
        router.push("/e/dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [user, orderId, error, router, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proof.trim()) {
      error(t("employee.proofRequired", "Proof is required"));
      return;
    }

    setSubmitting(true);

    const result = await submitCompletedReviewAction(orderId, proof);

    setSubmitting(false);

    if (result.success) {
      success(t("employee.reviewSubmitted", "Review submitted successfully"));
      router.push("/e/dashboard");
    } else {
      error(result.error || "Failed to submit review");
    }
  };

  if (loading) return <LoadingScreen />;
  if (!order) return null;

  const isCompleted = order.status === "COMPLETED";
  const isReadOnly = order.status !== "IN_PROGRESS";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/e/dashboard")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("employee.backToDashboard", "Back to Dashboard")}
        </Button>
        <h1 className="text-2xl font-bold flex-1">{order.businessName}</h1>
        <span className={`px-2 py-1 rounded text-xs font-semibold ${order.status === "COMPLETED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}>
          {order.status?.replace("_", " ")}
        </span>
      </div>

      <div className="space-y-6">
        {/* Order Details Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("employee.platform", "Platform")}
              </h3>
              <p className="font-medium">{order.reviewType}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("employee.reaction", "Reaction")}
              </h3>
              <p className={`font-medium text-lg ${getReactionBadgeClasses(order.reactionType || 'LIKE')}`}>
                {getReactionEmoji(order.reactionType || 'LIKE')}
              </p>
            </div>

            {/* Target Rating - Hidden from UI */}

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("employee.credits", "Credits")}
              </h3>
              <p className="font-medium">{order.creditsConsumed}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("employee.assigned", "Assigned")}
              </h3>
              <p className="font-medium">{formatDateTime(order.assignedAt || order.createdAt)}</p>
            </div>
          </div>

          {/* Review Content */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              {t("employee.reviewContent", "Review Content")}
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <p className="whitespace-pre-wrap">{order.reviewContent}</p>
            </div>
          </div>

          {order.reviewInstructions && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                {t("employee.instructions", "Instructions")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {order.reviewInstructions}
              </p>
            </div>
          )}
        </div>

        {/* Read-only submitted proof for completed orders */}
        {isCompleted && order.proofOfCompletion && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow space-y-2">
            <h3 className="font-semibold">
              {t("employee.submittedProof", "Submitted Proof of Completion")}
            </h3>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-sm">
              <p className="whitespace-pre-wrap">{order.proofOfCompletion}</p>
            </div>
            {order.completedAt && (
              <p className="text-xs text-gray-500">
                {t("employee.completedAt", "Completed at {{date}}", {
                  date: formatDateTime(order.completedAt),
                })}
              </p>
            )}
          </div>
        )}

        {/* Proof Submission Card — only for in-progress orders */}
        {!isReadOnly && (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h3 className="font-semibold mb-4">
              {t("employee.submitProof", "Submit Proof of Completion")}
            </h3>

            <p className="text-sm text-gray-500 mb-4">
              {t("employee.proofDescription", "Please provide evidence that you've completed this review. Include a screenshot URL or detailed description.")}
            </p>

            <textarea
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              placeholder={t("employee.proofPlaceholder", "Paste screenshot URL or describe how you completed the review...")}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              rows={5}
              required
              aria-label={t("employee.proofDescription", "Proof of completion")}
            />

            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {submitting ? t("common.submitting", "Submitting...") : t("employee.submitReview", "Submit Completed Review")}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 font-medium"
              >
                {t("common.cancel", "Cancel")}
              </button>
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>{t("employee.important", "Important")}:</strong> {t("employee.submitWarning", "Once submitted, this order cannot be modified. Make sure your proof is accurate.")}
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
