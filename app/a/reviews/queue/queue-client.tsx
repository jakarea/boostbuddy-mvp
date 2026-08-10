"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton-card";
import { assignReviewToEmployeeAction } from "@/app/actions/admin-reviews";
import {
  Clock,
  User,
  Calendar,
  Star,
  X,
  Check,
  CheckCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { formatDateShort } from "@/lib/dateUtils";
import { getReactionEmoji, getReactionBadgeClasses } from "@/lib/reactionUtils";

interface ReviewOrder {
  id: string;
  businessName: string;
  facebookUrl?: string;
  orderType: "REVIEW" | "COMMENT" | "COMMENT_WITH_PHOTO";
  reviewType: string;
  targetRating?: string;
  reactionType?: string;
  content?: string;
  commentText?: string;
  comments?: string[];
  commentCount?: number;
  completedComments?: number[];
  photoUrls?: string[] | string[][];
  photoReviews?: Array<{ text: string; photos: string[] }>;
  reviewInstructions?: string;
  status: string;
  quantity: number;
  creditsConsumed: number;
  createdAt: string;
  clientName?: string;
  clientEmail?: string;
  assignedEmployeeId?: string;
  employeeName?: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  acceptingOrders: boolean;
  isAvailable: boolean;
  ordersCompleted: number;
  lastActiveAt?: string;
}

interface QueueClientProps {
  initialOrders: ReviewOrder[];
  initialEmployees: Employee[];
  totalCount: number;
}

export default function QueueClient({
  initialOrders,
  initialEmployees,
  totalCount,
}: QueueClientProps) {
  const { t } = useTranslation("admin_reviews");
  const { success, error } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [orders, setOrders] = useState<ReviewOrder[]>(initialOrders);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [isLoading, setIsLoading] = useState(false);
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Record<string, string>>({});
  const initialSearchTerm = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Sync search with URL params (triggers server refetch)
  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    if (debouncedSearchTerm !== currentSearch) {
      const params = new URLSearchParams(searchParams.toString());
      if (debouncedSearchTerm) {
        params.set('search', debouncedSearchTerm);
      } else {
        params.delete('search');
      }
      params.set('page', '1'); // Reset to first page on search
      router.push(`/a/reviews/queue?${params.toString()}`);
    }
  }, [debouncedSearchTerm]);

  // Update orders when server provides new data (after URL change)
  useEffect(() => {
    setOrders(initialOrders);
    setEmployees(initialEmployees);
  }, [initialOrders, initialEmployees]);

  // Pagination state
  const itemsPerPage = parseInt(searchParams.get('pageSize') || '20', 10);
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Calculate total pages from server response
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Get current page items (server-side paginated)
  const currentOrders = orders;

  // Clear search handler
  const handleClearSearch = () => {
    setSearchTerm("");
  };

  // Navigation handlers
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    setSelectedEmployees({});
    router.push(`/a/reviews/queue?${params.toString()}`);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const handleItemsPerPageChange = (newSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', newSize.toString());
    params.set('page', '1');
    setSelectedEmployees({});
    router.push(`/a/reviews/queue?${params.toString()}`);
  };

  const handleAssign = async (orderId: string) => {
    const employeeId = selectedEmployees[orderId];
    if (!employeeId) {
      error("Please select an employee");
      return;
    }

    try {
      setAssigningOrderId(orderId);
      const result = await assignReviewToEmployeeAction({ orderId, employeeId });
      if (result.success) {
        success("Order assigned successfully");
        setSelectedEmployees({ ...selectedEmployees, [orderId]: "" });
        router.refresh(); // Refresh server component
      } else {
        error(result.error || "Failed to assign order");
      }
    } catch (err) {
      error("Failed to assign order");
    } finally {
      setAssigningOrderId(null);
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
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${platformColors[type] || "bg-zinc-100 text-zinc-700"}`}>
        {type}
      </span>
    );
  };

  const availableEmployees = employees.filter(e => e.isActive && e.acceptingOrders);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          {t("queue.title", "Orders Queue")}
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.refresh()}
          className="gap-1 h-7 text-[11px]"
        >
          <RefreshCw className="h-3 w-3" />
          {t("queue.refresh", "Refresh")}
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-zinc-800 rounded p-1.5 shadow">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by business name, client name, email, or order ID..."
              className="w-full pl-7 pr-7 py-1 text-[11px] border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#168BB0]"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
              {orders.length} result{orders.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-3 text-[11px]">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-yellow-600" />
          <span className="text-zinc-600">
            {searchTerm
              ? `${orders.length}/${totalCount}`
              : t("queue.pendingCount", "{{count}} pending", { count: totalCount })
            }
          </span>
        </div>
        <div className="flex items-center gap-1">
          <User className="h-3 w-3 text-green-600" />
          <span className="text-zinc-600">
            {t("queue.availableCount", "{{count}} available", { count: availableEmployees.length })}
          </span>
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow border border-zinc-200 dark:border-zinc-800">
          <TableSkeleton rows={itemsPerPage} cols={6} />
        </div>
      ) : orders.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
          <h3 className="text-sm font-semibold mb-1">
            {t("queue.noOrders", "No Pending Orders")}
          </h3>
          <p className="text-xs text-zinc-500">
            {t("queue.noOrdersMessage", "All review orders have been assigned or processed.")}
          </p>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {currentOrders.map((order) => (
            <Card key={order.id} className="p-1.5">
              <div className="flex flex-col lg:flex-row gap-2">
                {/* Order Details */}
                <div className="flex-1 space-y-1.5">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">
                        {order.businessName}
                      </h3>
                      {/* Order Type Badge */}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        order.orderType === "REVIEW"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                        : order.orderType === "COMMENT"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      }`}>
                        {order.orderType === "REVIEW" ? "Review" :
                         order.orderType === "COMMENT" ? "Comment" : "+Photo"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getPlatformIcon(order.reviewType)}
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${getReactionBadgeClasses(order.reactionType || 'LIKE')}`}>
                        {getReactionEmoji(order.reactionType || 'LIKE')}
                      </span>
                    </div>
                  </div>

                  {/* Review Content (for REVIEW orders) */}
                  {order.orderType === "REVIEW" && order.content && (
                    <div className="bg-zinc-50 dark:bg-zinc-900 rounded px-1.5 py-1">
                      <p className="text-[11px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap line-clamp-2">
                        {order.content}
                      </p>
                    </div>
                  )}

                  {/* Comment Text (for COMMENT and COMMENT_WITH_PHOTO orders) */}
                  {(order.orderType === "COMMENT" || order.orderType === "COMMENT_WITH_PHOTO") && (
                    order.comments && order.comments.length > 0 ? (
                      <div className="space-y-1">
                        <div className="bg-zinc-50 dark:bg-zinc-900 rounded px-1.5 py-1">
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-1">
                            {order.comments.filter(c => c && c.trim().length > 0).length} comments
                            {order.completedComments && order.completedComments.length > 0 && ` (${order.completedComments.length} done)`}
                          </p>
                          {order.comments.slice(0, 2).map((comment, index) => (
                            <div key={index} className="text-[11px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                              <span className="font-medium text-zinc-500">{index + 1}.</span> {comment || '(Empty)'}
                              {order.completedComments?.includes(index) && <span className="text-green-600 ml-1">✓</span>}
                            </div>
                          ))}
                          {order.comments.length > 2 && (
                            <p className="text-[10px] text-zinc-500">+{order.comments.length - 2} more...</p>
                          )}
                        </div>
                      </div>
                    ) : order.commentText ? (
                      <div className="bg-zinc-50 dark:bg-zinc-900 rounded px-1.5 py-1">
                        <p className="text-[11px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap line-clamp-2">
                          {order.commentText}
                        </p>
                      </div>
                    ) : null
                  )}

                  {/* Photos (for COMMENT_WITH_PHOTO orders) */}
                  {order.orderType === "COMMENT_WITH_PHOTO" && order.photoReviews && order.photoReviews.length > 0 && (
                    <div className="grid grid-cols-6 gap-1">
                      {order.photoReviews.flatMap((review, rIndex) =>
                        review.photos.map((url: string, pIndex: number) => (
                          <div key={`${rIndex}-${pIndex}`} className="relative">
                            <img
                              src={url}
                              alt={`Photo ${rIndex + 1}-${pIndex + 1}`}
                              className="w-10 h-10 object-cover rounded border border-zinc-200 dark:border-zinc-700"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Instructions */}
                  {order.reviewInstructions && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded px-1.5 py-1 border border-blue-200 dark:border-blue-800">
                      <p className="text-[11px] text-blue-600 dark:text-blue-400">
                        {order.reviewInstructions}
                      </p>
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-zinc-500">
                    <div className="flex items-center gap-0.5">
                      <Calendar className="h-2 w-2" />
                      {formatDateShort(order.createdAt)}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Star className="h-2 w-2" />
                      {order.quantity}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className="font-medium">{order.creditsConsumed} cr</span>
                    </div>
                    {order.clientName && (
                      <div className="flex items-center gap-0.5">
                        <User className="h-2 w-2" />
                        {order.clientName} ({order.clientEmail})
                      </div>
                    )}
                  </div>
                </div>

                {/* Assignment Actions */}
                <div className="lg:w-44 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 pt-2 lg:pt-0 lg:pl-2 space-y-1.5">
                  <div>
                    <label htmlFor={`assign-${order.id}`} className="text-[10px] font-medium text-zinc-600 mb-0.5 block">
                      {t("queue.assignTo", "Assign")}
                    </label>
                    <select
                      id={`assign-${order.id}`}
                      value={selectedEmployees[order.id] || ""}
                      onChange={(e) => setSelectedEmployees({ ...selectedEmployees, [order.id]: e.target.value })}
                      className="w-full px-1.5 py-1 text-[11px] border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
                      disabled={assigningOrderId === order.id}
                    >
                      <option value="">{t("queue.selectEmployee", "Select...")}</option>
                      {availableEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.ordersCompleted})
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    size="sm"
                    className="w-full gap-1 py-1 h-7 text-[11px]"
                    onClick={() => handleAssign(order.id)}
                    disabled={!selectedEmployees[order.id] || assigningOrderId === order.id}
                  >
                    {assigningOrderId === order.id ? (
                      <>
                        <div className="bb-loading bb-loading-sm">
                          <span></span><span></span><span></span><span></span>
                          <span className="bb-center"></span>
                          <span></span><span></span><span></span><span></span>
                        </div>
                        {t("queue.assigning", "Assigning...")}
                      </>
                    ) : (
                      <>
                        <Check className="h-2.5 w-2.5" />
                        {t("queue.assignOrder", "Assign")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {orders.length > 0 && (
        <div className="flex items-center justify-between bg-white dark:bg-zinc-800 rounded p-1.5 shadow">
          <div className="flex items-center gap-2 text-[10px] text-zinc-600 dark:text-zinc-400">
            <span>
              {searchTerm
                ? `${currentPage}/${totalPages} (${orders.length})`
                : `${currentPage}/${totalPages} (${totalCount})`
              }
            </span>
            <div className="flex items-center gap-1">
              <span className="text-zinc-500">Show:</span>
              <div className="flex items-center gap-0.5">
                {[10, 20, 50, 100].map((size) => (
                  <button
                    key={size}
                    onClick={() => handleItemsPerPageChange(size)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      itemsPerPage === size
                        ? 'bg-[#168BB0] text-white'
                        : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className="gap-0.5 h-6 px-1.5 text-[10px]"
            >
              <ChevronLeft className="h-2.5 w-2.5" />
              Prev
            </Button>

            {/* Page Numbers - limit display */}
            <div className="flex items-center gap-0.5">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(pageNum)}
                    className="min-w-[24px] h-6 text-[10px]"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="gap-0.5 h-6 px-1.5 text-[10px]"
            >
              Next
              <ChevronRight className="h-2.5 w-2.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
