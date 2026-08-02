"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getAllReviewOrdersAction,
  verifyCompletedReviewAction
} from "@/app/actions/admin-reviews";
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Star,
  ExternalLink,
  RefreshCw,
  Eye
} from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/dateUtils";

interface ReviewOrder {
  id: string;
  businessName: string;
  businessUrl?: string;
  reviewType: string;
  targetRating: string;
  reviewContent: string;
  reviewInstructions?: string;
  status: string;
  submittedReviewUrl?: string;
  submissionNotes?: string;
  clientFeedback?: string;
  submittedAt?: string;
  createdAt: string;
  clientName?: string;
  clientEmail?: string;
  employeeName?: string;
  employeeEmail?: string;
  assignedEmployeeId?: string;
}

export default function AdminReviewsVerificationPage() {
  const { t } = useTranslation("admin_reviews");
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [orders, setOrders] = useState<ReviewOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);

  // ESC key handler for reject modal
  useEffect(() => {
    if (!showRejectModal) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowRejectModal(false);
        setRejectReason("");
        setRejectingOrderId(null);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showRejectModal]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const result = await getAllReviewOrdersAction({ status: "COMPLETED" });
      if (result.success) {
        // Normalize field names for dual-mode compatibility
        const normalizedOrders = (result.data as any[])?.map(order => ({
          id: order.id,
          businessName: order.business_name || order.businessName,
          businessUrl: order.business_url || order.businessUrl,
          reviewType: order.review_type || order.reviewType,
          targetRating: order.target_rating || order.targetRating,
          reviewContent: order.review_content || order.reviewContent,
          reviewInstructions: order.review_instructions || order.reviewInstructions,
          status: order.status,
          submittedReviewUrl: order.submitted_review_url || order.submittedReviewUrl,
          submissionNotes: order.submission_notes || order.submissionNotes,
          clientFeedback: order.client_feedback || order.clientFeedback,
          submittedAt: order.submitted_at || order.submittedAt,
          createdAt: order.created_at || order.createdAt,
          clientName: order.clientName || order.client_name,
          clientEmail: order.clientEmail || order.client_email,
          employeeName: order.employeeName || order.employee_name,
          employeeEmail: order.employeeEmail || order.employee_email,
          assignedEmployeeId: order.assigned_employee_id || order.assignedEmployeeId
        })) || [];
        setOrders(normalizedOrders);
      }
    } catch (err) {
      error("Failed to load completed orders");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [error]);

  const handleVerify = async (orderId: string, approved: boolean) => {
    if (approved) {
      // Approve immediately
      const confirmed = await confirm({
        title: t("verification.approveDialog.title", "Approve Review?"),
        message: t("verification.approveDialog.message", "This will notify the client that their review is complete. The employee will be credited with a completed order."),
        confirmText: t("verification.approveDialog.confirm", "Approve"),
        cancelText: t("verification.cancelDialog.back", "Back"),
        confirmVariant: "default"
      });

      if (confirmed) {
        try {
          setVerifyingOrderId(orderId);
          const result = await verifyCompletedReviewAction(orderId, true);
          if (result.success) {
            success("Review approved successfully");
            loadData();
          } else {
            error(result.error || "Failed to verify review");
          }
        } catch (err) {
          error("Failed to verify review");
        } finally {
          setVerifyingOrderId(null);
        }
      }
    } else {
      // Show reject modal
      setRejectingOrderId(orderId);
      setShowRejectModal(true);
      setRejectReason("");
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      error("Please provide a rejection reason");
      return;
    }

    try {
      setRejectingOrderId(rejectingOrderId);
      const result = await verifyCompletedReviewAction(rejectingOrderId || "", false, rejectReason);
      if (result.success) {
        success("Review rejected and returned to queue");
        loadData();
        setShowRejectModal(false);
        setRejectReason("");
        setRejectingOrderId(null);
      } else {
        error(result.error || "Failed to reject review");
      }
    } catch (err) {
      error("Failed to reject review");
    } finally {
      setRejectingOrderId(null);
    }
  };

  const getPlatformIcon = (type: string) => {
    const platformColors: Record<string, string> = {
      GOOGLE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      TRUSTPILOT: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      YELP: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      FACEBOOK: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
      AMAZON: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${platformColors[type] || "bg-zinc-100 text-zinc-700"}`}>
        {type}
      </span>
    );
  };

  const getRatingStars = (rating: string) => {
    const count = parseInt(rating.split("_")[0]);
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${i < count ? "fill-yellow-400 text-yellow-400" : "text-zinc-300"}`}
          />
        ))}
        <span className="text-xs text-zinc-500 ml-1">{rating.replace("_", " ")}</span>
      </div>
    );
  };

  // Filter orders that haven't been verified yet
  const pendingVerification = orders.filter(order => !order.clientFeedback || order.clientFeedback === "PENDING");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#168BB0]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t("verification.title", "Verification Queue")}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {t("verification.subtitle", "Review and verify completed submissions before client delivery")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {t("verification.refresh", "Refresh")}
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-blue-600" />
          <span className="text-zinc-600">
            {t("verification.pendingCount", "{{count}} pending verification", { count: pendingVerification.length })}
          </span>
        </div>
        {orders.length > pendingVerification.length && (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-zinc-600">
              {t("verification.verifiedCount", "{{count}} already verified", { count: orders.length - pendingVerification.length })}
            </span>
          </div>
        )}
      </div>

      {/* Verification List */}
      {pendingVerification.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {t("verification.noPending", "All Reviews Verified")}
          </h3>
          <p className="text-sm text-zinc-500">
            {t("verification.noPendingMessage", "All completed reviews have been verified.")}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingVerification.map((order) => (
            <Card key={order.id} className="p-4">
              <div className="flex flex-col gap-4">
                {/* Order Requirements */}
                <div className="space-y-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {order.businessName}
                      </h3>
                      {order.businessUrl && (
                        <a
                          href={order.businessUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#168BB0] hover:underline flex items-center gap-1 mt-1"
                        >
                          {order.businessUrl}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getPlatformIcon(order.reviewType)}
                      {getRatingStars(order.targetRating)}
                    </div>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3">
                    <p className="text-xs text-zinc-500 mb-1">
                      {t("verification.requiredContent", "Required Review Content")}:
                    </p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {order.reviewContent}
                    </p>
                  </div>

                  {order.reviewInstructions && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
                        {t("verification.instructions", "Special Instructions")}:
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        {order.reviewInstructions}
                      </p>
                    </div>
                  )}
                </div>

                {/* Employee Submission */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t("verification.submission", "Employee Submission")}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                      <p className="text-xs text-green-700 dark:text-green-300 font-medium mb-1">
                        {t("verification.submittedBy", "Submitted by")}
                      </p>
                      <p className="text-sm font-medium">{order.employeeName}</p>
                      <p className="text-xs text-zinc-500">{order.employeeEmail}</p>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3">
                      <p className="text-xs text-zinc-500 mb-1">
                        {t("verification.submittedAt", "Submitted at")}
                      </p>
                      <p className="text-sm font-medium">
                        {formatDateTime(order.submittedAt || order.createdAt)}
                      </p>
                    </div>
                  </div>

                  {order.submittedReviewUrl && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
                        {t("verification.reviewUrl", "Review URL")}
                      </p>
                      <a
                        href={order.submittedReviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {order.submittedReviewUrl}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {order.submissionNotes && (
                    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3">
                      <p className="text-xs text-zinc-500 mb-1">
                        {t("verification.notes", "Submission Notes")}
                      </p>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        {order.submissionNotes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Client Info */}
                <div className="flex items-center gap-2 text-xs text-zinc-500 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <User className="h-3 w-3" />
                  <span>
                    {t("verification.forClient", "Client: {{name}} ({{email}})", {
                      name: order.clientName,
                      email: order.clientEmail
                    })}
                  </span>
                </div>

                {/* Verification Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                    onClick={() => handleVerify(order.id, true)}
                    disabled={verifyingOrderId === order.id}
                  >
                    {verifyingOrderId === order.id ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        {t("verification.verifying", "Verifying...")}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        {t("verification.approve", "Approve & Send to Client")}
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-2 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleVerify(order.id, false)}
                    disabled={verifyingOrderId === order.id}
                  >
                    {verifyingOrderId === order.id ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                        {t("verification.verifying", "Verifying...")}
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        {t("verification.reject", "Reject & Request Revision")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-modal-title"
          onClick={() => {
            setShowRejectModal(false);
            setRejectReason("");
            setRejectingOrderId(null);
          }}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 id="reject-modal-title" className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {t("verification.rejectModal.title", "Reject Review")}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {t("verification.rejectModal.message", "Please provide a reason for rejection. This will be visible to all employees.")}
              </p>
            </div>
            <div>
              <label htmlFor="reject-reason-input" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {t("verification.rejectModal.reasonLabel", "Rejection Reason")}
              </label>
              <textarea
                id="reject-reason-input"
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[100px]"
                placeholder={t("verification.rejectModal.reasonPlaceholder", "Explain why this review was rejected and what needs to be fixed...")}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowRejectModal(false);
                setRejectReason("");
                setRejectingOrderId(null);
              }}>
                {t("verification.rejectModal.cancel", "Cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim() || rejectingOrderId !== null}
              >
                {rejectingOrderId ? "Rejecting..." : t("verification.rejectModal.confirm", "Reject & Return to Queue")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
