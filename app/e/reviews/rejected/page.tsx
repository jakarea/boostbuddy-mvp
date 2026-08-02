"use client";

import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getEmployeeReviewsByStatusAction } from "@/app/actions/employee";
import { LoadingScreen } from "@/components/LoadingScreen";
import { XCircle } from "lucide-react";
import { formatDateTime, safeDateDisplay } from "@/lib/dateUtils";

export default function EmployeeRejectedReviewsPage() {
  const { user } = useAuth();
  const { error } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [rejectedReviews, setRejectedReviews] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const result = await getEmployeeReviewsByStatusAction("REJECTED");

        if (result.success && result.data) {
          setRejectedReviews(result.data);
        }
      } catch (err) {
        console.error("Failed to load rejected reviews:", err);
        error(t("load_reviews_failed", "Failed to load rejected reviews"));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("employee.rejectedReviews", "Rejected Reviews")}</h1>
      </div>

      {/* Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <p className="text-sm text-gray-500">{t("employee.totalRejected", "Total Rejected Reviews")}</p>
        <p className="text-3xl font-bold text-red-600">{rejectedReviews.length}</p>
      </div>

      {/* Rejected Reviews */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b dark:border-gray-700">
          <h3 className="font-semibold">{t("employee.rejectedReviewsList", "Reviews Rejected by Admin")}</h3>
        </div>

        {rejectedReviews.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <XCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            {t("employee.noRejectedReviews", "No rejected reviews")}
          </div>
        ) : (
          <div className="divide-y dark:divide-gray-700">
            {rejectedReviews.map((review) => (
              <div key={review.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium">{review.businessName}</h4>
                    <p className="text-sm text-gray-500">{review.reviewType} - {review.targetRating.replace("_", " ")}</p>
                    <p className="text-xs text-gray-400">
                      {t("employee.submitted", "Submitted")}: {formatDateTime(review.completedAt || review.updatedAt)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t("employee.rejected", "Rejected")}: {safeDateDisplay(review.adminVerifiedAt, "datetime")}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {t("employee.rejected", "Rejected")}
                  </span>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded mb-3">
                  <p className="text-sm font-medium mb-1">{t("employee.reviewContent", "Review Content")}:</p>
                  <p className="text-sm whitespace-pre-wrap">{review.reviewContent}</p>
                </div>

                {review.proofOfCompletion && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded mb-3">
                    <p className="text-sm font-medium mb-1">{t("employee.proof", "Proof of Completion")}:</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{review.proofOfCompletion}</p>
                  </div>
                )}

                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                    {t("employee.rejectionNote", "Note: This review was rejected by the admin. Please review the feedback and improve your work.")}
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <span>{review.creditsConsumed} {t("credits.credits", "credits")}</span>
                  <span>•</span>
                  <span>ID: {review.id.slice(0, 8)}...</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
