"use client";

import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getEmployeeReviewsByStatusAction } from "@/app/actions/employee";
import { LoadingScreen } from "@/components/LoadingScreen";
import { CheckCircle } from "lucide-react";
import { formatDateTime, safeDateDisplay } from "@/lib/dateUtils";

export default function EmployeeCompletedReviewsPage() {
  const { user } = useAuth();
  const { error } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [completedReviews, setCompletedReviews] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const result = await getEmployeeReviewsByStatusAction("APPROVED");

        if (result.success && result.data) {
          setCompletedReviews(result.data);
        }
      } catch (err) {
        console.error("Failed to load completed reviews:", err);
        error(t("load_reviews_failed", "Failed to load completed reviews"));
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
        <h1 className="text-2xl font-bold">{t("employee.completedReviews", "Completed & Approved Reviews")}</h1>
      </div>

      {/* Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <p className="text-sm text-gray-500">{t("employee.totalApproved", "Total Approved Reviews")}</p>
        <p className="text-3xl font-bold text-green-600">{completedReviews.length}</p>
      </div>

      {/* Completed Reviews */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b dark:border-gray-700">
          <h3 className="font-semibold">{t("employee.approvedReviews", "Approved Reviews")}</h3>
        </div>

        {completedReviews.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            {t("employee.noCompletedReviews", "No completed reviews yet")}
          </div>
        ) : (
          <div className="divide-y dark:divide-gray-700">
            {completedReviews.map((review) => (
              <div key={review.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium">{review.businessName}</h4>
                    <p className="text-sm text-gray-500">{review.reviewType} - {review.targetRating.replace("_", " ")}</p>
                    <p className="text-xs text-gray-400">
                      {t("employee.completed", "Completed")}: {formatDateTime(review.completedAt || review.updatedAt)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t("employee.verified", "Verified")}: {safeDateDisplay(review.adminVerifiedAt, "datetime")}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {t("employee.approved", "Approved")}
                  </span>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded mb-3">
                  <p className="text-sm font-medium mb-1">{t("employee.reviewContent", "Review Content")}:</p>
                  <p className="text-sm whitespace-pre-wrap">{review.reviewContent}</p>
                </div>

                {review.proofOfCompletion && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                    <p className="text-sm font-medium mb-1">{t("employee.proof", "Proof of Completion")}:</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{review.proofOfCompletion}</p>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-medium">{review.creditsConsumed} {t("credits.credits", "credits")}</span>
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
