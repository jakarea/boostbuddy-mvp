"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAllReviewOrdersAction,
} from "@/app/actions/admin-reviews";
import {
  Clock,
  User,
  Calendar,
  Star,
  RefreshCw,
  Eye,
  History as HistoryIcon,
  Smile,
  Frown,
  Angry,
  ChevronLeft,
  ChevronRight,
  Search,
  X
} from "lucide-react";
import { formatDateShort, formatDateTime } from "@/lib/dateUtils";
import { getReactionEmoji, getReactionBadgeClasses } from "@/lib/reactionUtils";

interface ReviewOrder {
  id: string;
  businessName: string;
  businessUrl?: string;
  orderType?: string;
  reviewType: string;
  targetRating: string;
  reactionType?: string;
  reviewContent: string;
  reviewInstructions?: string;
  commentText?: string;
  comments?: string[];
  commentCount?: number;
  completedComments?: number[];
  photoUrls?: string[] | string[][];
  photoReviews?: Array<{ text: string; photos: string[] }>;
  status: string;
  creditsConsumed: number;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  clientFeedback?: string;
  proofOfCompletion?: string;
  assignedEmployeeId?: string;
  clientName?: string;
  clientEmail?: string;
  employeeName?: string;
  employeeEmail?: string;
}

type StatusFilter = "ALL" | "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

const STATUS_BADGE_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  IN_PROGRESS: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  COMPLETED: "bg-green-500/10 text-green-700 dark:text-green-400",
  CANCELLED: "bg-red-500/10 text-red-700 dark:text-red-400",
};

interface HistoryClientProps {
  initialOrders: ReviewOrder[];
  totalCount: number;
}

export default function HistoryClient({ initialOrders, totalCount }: HistoryClientProps) {
  const { t } = useTranslation("admin_reviews");
  const { error } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [orders, setOrders] = useState<ReviewOrder[]>(initialOrders);
  const [localTotalCount, setLocalTotalCount] = useState(totalCount);
  const [isLoading, setIsLoading] = useState(false);
  const initialStatusFilter = (searchParams.get('status') || "ALL") as StatusFilter;
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter);
  const [selectedOrder, setSelectedOrder] = useState<ReviewOrder | null>(null);
  const initialSearchTerm = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Refresh data by reloading the current route
  const loadData = () => {
    router.push(`/a/reviews/history?${searchParams.toString()}`, { scroll: false });
  };

  // Sync status filter with URL params
  useEffect(() => {
    const currentStatus = searchParams.get('status') || "ALL";
    if (statusFilter !== currentStatus) {
      const params = new URLSearchParams(searchParams.toString());
      if (statusFilter === "ALL") {
        params.delete('status');
      } else {
        params.set('status', statusFilter);
      }
      params.set('page', '1');
      router.push(`/a/reviews/history?${params.toString()}`);
    }
  }, [statusFilter]);

  // Sync search with URL params
  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    if (debouncedSearchTerm !== currentSearch) {
      const params = new URLSearchParams(searchParams.toString());
      if (debouncedSearchTerm) {
        params.set('search', debouncedSearchTerm);
      } else {
        params.delete('search');
      }
      params.set('page', '1');
      router.push(`/a/reviews/history?${params.toString()}`);
    }
  }, [debouncedSearchTerm]);

  // Update orders when server provides new data
  useEffect(() => {
    setOrders(initialOrders);
    setLocalTotalCount(totalCount);
  }, [initialOrders, totalCount]);

  // Pagination state
  const itemsPerPage = parseInt(searchParams.get('pageSize') || '20', 10);
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Get current page items (now server-side paginated)
  const currentOrders = orders;

  // Calculate total pages from server response
  const totalPages = Math.ceil(localTotalCount / itemsPerPage);

  // Navigation handlers
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/a/reviews/history?${params.toString()}`);
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
    params.set('page', '1'); // Reset to first page when changing page size
    router.push(`/a/reviews/history?${params.toString()}`);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  // Recalculate filtered orders based on all filters
  const filteredOrders = orders;

  const getPlatformBadge = (type: string) => {
    const platformColors: Record<string, string> = {
      GOOGLE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      TRUSTPILOT: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      YELP: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      FACEBOOK: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
      AMAZON: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    };
    return (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${platformColors[type] || "bg-zinc-100 text-zinc-700"}`}>
        {type}
      </span>
    );
  };

  const getRatingStars = (rating: string) => {
    const count = parseInt(rating?.split("_")[0] || "0");
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${i < count ? "fill-yellow-400 text-yellow-400" : "text-zinc-300"}`}
          />
        ))}
        <span className="text-xs text-zinc-500 ml-1">{rating?.replace("_", " ")}</span>
      </div>
    );
  };

  const getClientFeedbackBadge = (feedback?: string) => {
    if (!feedback || feedback === "PENDING") return null;

    const feedbackConfig = {
      HAPPY: {
        icon: <Smile className="h-2.5 w-2.5" />,
        color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        label: "Happy"
      },
      UNHAPPY: {
        icon: <Frown className="h-2.5 w-2.5" />,
        color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        label: "Unhappy"
      },
      ANGRY: {
        icon: <Angry className="h-2.5 w-2.5" />,
        color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        label: "Angry"
      }
    };

    const config = feedbackConfig[feedback as keyof typeof feedbackConfig];
    if (!config) return null;

    return (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-0.5 ${config.color}`}>
        {config.icon}
      </span>
    );
  };

  const STATUS_FILTERS: StatusFilter[] = ["ALL", "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

  return (
    <div className="space-y-3 relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-zinc-950/50 z-50 flex items-center justify-center rounded-lg backdrop-blur-sm">
          <div className="bb-loading">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span className="bb-center"></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          {t("history.title", "Order History")}
        </h1>
        <Button variant="outline" size="sm" onClick={loadData} className="gap-1 h-7 text-[11px]">
          <RefreshCw className="h-3 w-3" />
          {t("history.refresh", "Refresh")}
        </Button>
      </div>

      {/* Status filter & Search */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status Filters */}
        <div className="flex items-center gap-0.5">
          {STATUS_FILTERS.map((status) => (
            <Button
              key={status}
              size="sm"
              variant={statusFilter === status ? "default" : "outline"}
              onClick={() => setStatusFilter(status)}
              className="h-6 text-[10px] px-2"
            >
              {t(`history.filter.${status.toLowerCase()}`, status).replace("_", " ")}
            </Button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by business, client, employee, or ID..."
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
        </div>

        {searchTerm && (
          <div className="text-[10px] text-zinc-600 dark:text-zinc-400">
            {orders.length} result{orders.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Orders list */}
      {filteredOrders.length === 0 ? (
        <Card className="p-8 text-center">
          <HistoryIcon className="h-10 w-10 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold mb-1">
            {t("history.noOrders", "No Orders")}
          </h3>
          <p className="text-xs text-zinc-500">
            {t("history.noOrdersMessage", "No review orders match the current filter.")}
          </p>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {currentOrders.map((order) => (
            <Card key={order.id} className="p-2 hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row gap-2">
                {/* Order details */}
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">
                      {order.businessName}
                    </h3>
                    <div className="flex items-center gap-1">
                      {getPlatformBadge(order.reviewType)}
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${getReactionBadgeClasses(order.reactionType || 'LIKE')}`}>
                        {getReactionEmoji(order.reactionType || 'LIKE')}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGE_STYLES[order.status] || "bg-zinc-100 text-zinc-700"}`}>
                        {order.status.replace("_", " ")}
                      </span>
                      {order.status === 'COMPLETED' && getClientFeedbackBadge(order.clientFeedback)}
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="flex items-center gap-x-3 gap-y-0.5 text-[10px] text-zinc-500 flex-wrap">
                    <div className="flex items-center gap-0.5">
                      <Calendar className="h-2 w-2" />
                      <span>
                        {t("history.created", "Created")}: {formatDateShort(order.createdAt)}
                      </span>
                    </div>
                    {order.updatedAt && (
                      <div className="flex items-center gap-0.5">
                        <Clock className="h-2 w-2" />
                        <span>
                          {t("history.updated", "Updated")}: {formatDateShort(order.updatedAt)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-0.5">
                      <span>{order.creditsConsumed} cr</span>
                    </div>
                    {order.clientName && (
                      <div className="flex items-center gap-0.5">
                        <User className="h-2 w-2" />
                        <span>
                          {t("history.client", "Client")}: {order.clientName}
                          {order.clientEmail ? ` (${order.clientEmail})` : ""}
                        </span>
                      </div>
                    )}
                    {order.employeeName && (
                      <div className="flex items-center gap-0.5">
                        <User className="h-2 w-2" />
                        <span>
                          {t("history.employee", "Emp")}: {order.employeeName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* View details */}
                <div className="lg:w-28 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 pt-1.5 lg:pt-0 lg:pl-2 flex items-center">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 w-full h-6 text-[10px]"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <Eye className="h-2.5 w-2.5" />
                    {t("history.viewDetails", "View")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {filteredOrders.length > 0 && (
        <div className="flex items-center justify-between bg-white dark:bg-zinc-800 rounded p-1.5 shadow">
          <div className="flex items-center gap-2 text-[10px] text-zinc-600 dark:text-zinc-400">
            <span>
              {searchTerm
                ? `${currentPage}/${totalPages} (${filteredOrders.length})`
                : `${currentPage}/${totalPages} (${localTotalCount})`
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

      {/* Order detail dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedOrder?.businessName}</DialogTitle>
            <DialogDescription>
              {selectedOrder?.reviewType} {/* Rating - Hidden from UI */}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">
                  {t("history.viewDetails", "Review Content")}
                </h4>
                <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 text-sm">
                  <p className="whitespace-pre-wrap">{selectedOrder.reviewContent}</p>
                </div>
              </div>

              {selectedOrder.reviewInstructions && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">
                    Instructions
                  </h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {selectedOrder.reviewInstructions}
                  </p>
                </div>
              )}

              {selectedOrder.proofOfCompletion && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">
                    {t("history.proof", "Review URL")}
                  </h4>
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 text-sm">
                    <a
                      href={selectedOrder.proofOfCompletion}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#168BB0] hover:underline break-all"
                    >
                      {selectedOrder.proofOfCompletion}
                    </a>
                  </div>
                </div>
              )}

              {selectedOrder.clientFeedback && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">
                    {t("history.feedback", "Client Feedback")}
                  </h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {selectedOrder.clientFeedback}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
                {selectedOrder.clientName && (
                  <div>
                    <span className="font-medium">{t("history.client", "Client")}:</span>
                    <br />
                    {selectedOrder.clientName}
                    {selectedOrder.clientEmail ? ` • ${selectedOrder.clientEmail}` : ""}
                  </div>
                )}
                {selectedOrder.employeeName && (
                  <div>
                    <span className="font-medium">{t("history.employee", "Employee")}:</span>
                    <br />
                    {selectedOrder.employeeName}
                    {selectedOrder.employeeEmail ? ` • ${selectedOrder.employeeEmail}` : ""}
                  </div>
                )}
                <div>
                  <span className="font-medium">{t("history.credits", "Credits")}:</span> {selectedOrder.creditsConsumed}
                </div>
                <div>
                  <span className="font-medium">{t("history.created", "Created")}:</span>{" "}
                  {formatDateTime(selectedOrder.createdAt)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
