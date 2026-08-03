"use client";

import { useContext, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getEmployeeReviewsByStatusAction } from "@/app/actions/employee";
import { LoadingScreen } from "@/components/LoadingScreen";
import { CheckCircle, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateTime, safeDateDisplay } from "@/lib/dateUtils";
import { getReactionEmoji, getReactionBadgeClasses } from "@/lib/reactionUtils";

export default function EmployeeCompletedReviewsPage() {
  const { user } = useAuth();
  const { error } = useToast();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination state
  const ITEMS_PER_PAGE = 10;
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const totalPages = Math.ceil(reviews.length / ITEMS_PER_PAGE);

  // Get current page items
  const getCurrentPageReviews = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return reviews.slice(startIndex, endIndex);
  };

  const currentReviews = getCurrentPageReviews();

  // Navigation handlers
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/e/reviews/completed?${params.toString()}`);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) goToPage(currentPage + 1);
  };

  const goToPrevPage = () => {
    if (currentPage > 1) goToPage(currentPage - 1);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const result = await getEmployeeReviewsByStatusAction("APPROVED");

        if (result.success && result.data) {
          setAllReviews(result.data);
          setReviews(result.data);
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

  // Apply search filter
  useEffect(() => {
    if (!searchTerm.trim()) {
      setReviews(allReviews);
    } else {
      const filtered = allReviews.filter((review) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          review.businessName?.toLowerCase().includes(searchLower) ||
          review.reviewType?.toLowerCase().includes(searchLower) ||
          review.id?.toLowerCase().includes(searchLower)
        );
      });
      setReviews(filtered);
      // Reset to page 1 when searching
      const params = new URLSearchParams(searchParams.toString());
      if (params.get('page') !== '1') {
        params.set('page', '1');
        router.push(`/e/reviews/completed?${params.toString()}`);
      }
    }
  }, [searchTerm, allReviews]);

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
        <p className="text-3xl font-bold text-green-600">{reviews.length}</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by business name, type, or ID..."
              className="w-full pl-10 pr-10 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#168BB0]"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Found {reviews.length} result{reviews.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Completed Reviews */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b dark:border-gray-700">
          <h3 className="font-semibold">{t("employee.approvedReviews", "Approved Reviews")}</h3>
        </div>

        {reviews.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            {t("employee.noCompletedReviews", "No completed reviews yet")}
          </div>
        ) : (
          <div className="divide-y dark:divide-gray-700">
            {currentReviews.map((review) => (
              <div key={review.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium">{review.businessName}</h4>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      {review.reviewType} {/* Rating - Hidden from UI */}
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getReactionBadgeClasses(review.reactionType || 'LIKE')}`}>
                        {getReactionEmoji(review.reactionType || 'LIKE')}
                      </span>
                    </p>
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

      {/* Pagination Controls */}
      {reviews.length > 0 && (
        <div className="flex items-center justify-between bg-white dark:bg-zinc-800 rounded-lg p-4 shadow">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {searchTerm
              ? `Showing ${currentPage} of ${totalPages} pages (${reviews.length} filtered from ${allReviews.length} total)`
              : `Showing ${currentPage} of ${totalPages} pages (${reviews.length} reviews)`
            }
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`min-w-[40px] px-3 py-2 border rounded-lg ${
                    currentPage === page
                      ? 'bg-[#168BB0] text-white border-[#168BB0]'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-700 dark:border-zinc-700'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
