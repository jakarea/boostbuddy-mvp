"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/lib/hooks/useDebounce";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  acceptOrderAction,
  completeReviewAction,
} from "@/app/actions/employee";
import { devLog } from "@/lib/utils/devLog";
import {
  Clock,
  Calendar,
  RefreshCw,
  Eye,
  Inbox,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  X
} from "lucide-react";
import { formatDateShort, formatDateTime } from "@/lib/dateUtils";
import { getReactionEmoji, getReactionBadgeClasses } from "@/lib/reactionUtils";
import { getEmployeeReviewOrdersAction } from "@/app/actions/employee";

interface ReviewOrder {
  id: string;
  businessName: string;
  businessUrl?: string;
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
  assignedAt?: string;
  proofOfCompletion?: string;
  adminVerificationStatus?: string;
}

interface EmployeeStats {
  is_available: boolean;
  orders_completed: number;
}

interface ReviewsData {
  stats: EmployeeStats;
  orders: ReviewOrder[];
}

type StatusFilter = "ALL" | "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

const STATUS_BADGE_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  IN_PROGRESS: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  COMPLETED: "bg-green-500/10 text-green-700 dark:text-green-400",
  CANCELLED: "bg-red-500/10 text-red-700 dark:text-red-400",
};

interface ReviewsClientProps {
  initialData: any; // Server data is in snake_case
}

// Convert server data (snake_case) to client data (camelCase)
function normalizeServerData(serverData: any): ReviewsData {
  const normalizedOrders = serverData.orders?.map((order: any) => {
    const photoUrls = order.photo_urls ? JSON.parse(order.photo_urls) : null;
    return {
      id: order.id,
      businessName: order.business_name,
      businessUrl: order.business_url || null,
      reviewType: order.review_type,
      targetRating: order.target_rating,
      reactionType: order.reaction_type || 'LIKE',
      reviewContent: order.review_content || '',
      reviewInstructions: order.review_instructions || null,
      commentText: order.comment_text || null,
      comments: order.comment_text ? order.comment_text.split('|||').map((c: string) => c.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\')) : [],
      commentCount: order.comment_count || 1,
      completedComments: order.completed_comments ? order.completed_comments.split(',').map((i: string) => parseInt(i)) : [],
      photoUrls: photoUrls,
      photoReviews: photoUrls && order.order_type === 'COMMENT_WITH_PHOTO'
        ? order.comment_text.split('|||').map((c: string, i: number) => ({
            text: c.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\'),
            photos: photoUrls[i] || []
          }))
        : null,
      status: order.status,
      creditsConsumed: order.credits_consumed || 0,
      createdAt: order.created_at,
      updatedAt: order.updated_at || null,
      completedAt: order.completed_at || null,
      assignedAt: order.assigned_at || null,
      proofOfCompletion: order.proof_of_completion || null,
      adminVerificationStatus: order.admin_verification_status || null
    };
  }) || [];

  return {
    stats: {
      is_available: serverData.stats.is_available,
      orders_completed: serverData.stats.orders_completed
    },
    orders: normalizedOrders
  };
}

export function ReviewsClient({ initialData }: ReviewsClientProps) {
  const { success, error } = useToast();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();

  const normalizedData = normalizeServerData(initialData);

  const [allOrders, setAllOrders] = useState<ReviewOrder[]>(normalizedData.orders);
  const [orders, setOrders] = useState<ReviewOrder[]>(normalizedData.orders);
  const [stats, setStats] = useState<any>({ ...normalizedData.stats, isAvailable: normalizedData.stats.is_available });
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<ReviewOrder | null>(null);
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [reviewUrl, setReviewUrl] = useState("");
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Pagination state
  const ITEMS_PER_PAGE = 10;
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);

  // Get current page items
  const getCurrentPageOrders = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return orders.slice(startIndex, endIndex);
  };

  const currentOrders = getCurrentPageOrders();

  // Navigation handlers
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/e/reviews?${params.toString()}`);
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

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  // Status filter applied to orders
  const filteredOrders = statusFilter === "ALL"
    ? orders
    : orders.filter(o => o.status === statusFilter);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const result = await getEmployeeReviewOrdersAction();

      if (result.success && result.data) {
        const data = result.data as any;
        const normalizedOrders = data.orders?.map((order: any) => {
          const photoUrls = order.photo_urls ? JSON.parse(order.photo_urls) : null;
          return {
            id: order.id,
            businessName: order.business_name || order.businessName,
            businessUrl: order.business_url || order.businessUrl,
            reviewType: order.review_type || order.reviewType,
            targetRating: order.target_rating || order.targetRating,
            reviewContent: order.review_content || order.reviewContent,
            reviewInstructions: order.review_instructions || order.reviewInstructions,
            commentText: order.comment_text || order.commentText,
            comments: order.comment_text ? order.comment_text.split('|||').map((c: string) => c.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\')) : [],
            commentCount: order.comment_count || 1,
            completedComments: order.completed_comments ? order.completed_comments.split(',').map((i: string) => parseInt(i)) : [],
            photoUrls: photoUrls,
            photoReviews: photoUrls && order.order_type === 'COMMENT_WITH_PHOTO'
              ? order.comment_text.split('|||').map((c: string, i: number) => ({
                  text: c.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\'),
                  photos: photoUrls[i] || []
                }))
              : null,
            status: order.status,
            creditsConsumed: order.credits_consumed || order.creditsConsumed || 0,
            createdAt: order.created_at || order.createdAt,
            updatedAt: order.updated_at || order.updatedAt,
            completedAt: order.completed_at || order.completedAt,
            assignedAt: order.assigned_at || order.assignedAt,
            proofOfCompletion: order.proof_of_completion || order.proofOfCompletion,
            adminVerificationStatus: order.admin_verification_status || order.adminVerificationStatus
          };
        }) || [];

        setAllOrders(normalizedOrders);
        setOrders(normalizedOrders);
        setStats({ ...data.stats, isAvailable: data.stats.is_available });
      } else {
        error(result.error || "Failed to load reviews data");
      }
    } catch (err) {
      console.error("Failed to load reviews data:", err);
      error("Failed to load reviews data");
    } finally {
      setIsLoading(false);
    }
  };

  // Apply search filter
  useEffect(() => {
    if (!debouncedSearchTerm.trim()) {
      setOrders(allOrders);
    } else {
      const filtered = allOrders.filter((order) => {
        const searchLower = debouncedSearchTerm.toLowerCase();
        return (
          order.businessName?.toLowerCase().includes(searchLower) ||
          order.businessUrl?.toLowerCase().includes(searchLower) ||
          order.reviewType?.toLowerCase().includes(searchLower) ||
          order.id?.toLowerCase().includes(searchLower)
        );
      });
      setOrders(filtered);
      // Reset to page 1 when searching
      const params = new URLSearchParams(searchParams.toString());
      if (params.get('page') !== '1') {
        params.set('page', '1');
        router.push(`/e/reviews?${params.toString()}`);
      }
    }
  }, [debouncedSearchTerm, allOrders]);

  const handleAcceptOrder = async (orderId: string) => {
    setAcceptingOrderId(orderId);
    const result = await acceptOrderAction(orderId);
    setAcceptingOrderId(null);

    if (result.success) {
      success("Order accepted successfully");
      loadData();
    } else {
      error(result.error || "Failed to accept order");
    }
  };

  const handleCompleteReview = async () => {
    devLog("Complete review button clicked, url length:", reviewUrl.length);

    if (!reviewUrl || reviewUrl.trim().length === 0) {
      console.error("Validation failed: empty url");
      error("Please provide review URL");
      return;
    }

    if (!completingOrderId) {
      console.error("No order ID set");
      error("No order selected for completion");
      return;
    }

    devLog("Starting completion for order:", completingOrderId);
    setIsSubmittingCompletion(true);

    const result = await completeReviewAction(completingOrderId, reviewUrl);
    setIsSubmittingCompletion(false);

    devLog("Completion result:", result);

    if (result.success) {
      success("Review marked as complete");
      setShowCompleteModal(false);
      setReviewUrl("");
      setCompletingOrderId(null);
      loadData();
    } else {
      console.error("Completion failed:", result.error);
      error(result.error || "Failed to complete review");
    }
  };

  const openCompleteModal = (orderId: string) => {
    setCompletingOrderId(orderId);
    setReviewUrl("");
    setIsSubmittingCompletion(false);
    setShowCompleteModal(true);
  };

  const getPlatformBadge = (type: string) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING": return <Clock className="h-4 w-4" />;
      case "IN_PROGRESS": return <AlertCircle className="h-4 w-4" />;
      case "COMPLETED": return <CheckCircle className="h-4 w-4" />;
      case "CANCELLED": return <XCircle className="h-4 w-4" />;
      default: return <Inbox className="h-4 w-4" />;
    }
  };

  const STATUS_FILTERS: StatusFilter[] = ["ALL", "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

  return (
    <div className="space-y-6 relative">
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
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Review Orders
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage your review orders and assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">{stats.ordersCompleted || 0}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow">
            <p className="text-sm text-gray-500">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">
              {orders.filter(o => o.status === 'IN_PROGRESS').length}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow">
            <p className="text-sm text-gray-500">Available</p>
            <p className="text-2xl font-bold text-purple-600">
              {orders.filter(o => o.status === 'PENDING').length}
            </p>
          </div>
        </div>
      )}

      {/* Status filter */}
      <div className="flex items-center gap-1 flex-wrap">
        {STATUS_FILTERS.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={statusFilter === status ? "default" : "outline"}
            onClick={() => setStatusFilter(status)}
            className="text-xs"
          >
            {status.replace("_", " ")}
          </Button>
        ))}
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
              placeholder="Search by business name, URL, or type..."
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
              Found {orders.length} result{orders.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Orders list */}
      {filteredOrders.length === 0 ? (
        <Card className="p-12 text-center">
          <Inbox className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No Orders Found
          </h3>
          <p className="text-sm text-zinc-500">
            No review orders match the current filter.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {currentOrders.map((order) => (
            <Card key={order.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Order details */}
                <div className="flex-1 space-y-3">
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
                          className="text-xs text-[#168BB0] hover:underline"
                        >
                          {order.businessUrl}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getPlatformBadge(order.reviewType)}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getReactionBadgeClasses(order.reactionType || 'LIKE')}`}>
                        {getReactionEmoji(order.reactionType || 'LIKE')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_STYLES[order.status] || "bg-zinc-100 text-zinc-700"}`}>
                        {order.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="flex items-center gap-4 text-xs text-zinc-500 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Created: {formatDateShort(order.createdAt)}</span>
                    </div>
                    {order.assignedAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Assigned: {formatDateTime(order.assignedAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Verification status for completed orders */}
                  {order.adminVerificationStatus && (
                    <div className={`text-xs p-2 rounded ${
                      order.adminVerificationStatus === 'APPROVED'
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      <strong>Verification:</strong> {order.adminVerificationStatus.replace("_", " ")}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="lg:w-40 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 pt-4 lg:pt-0 lg:pl-4 flex lg:flex-col gap-2 lg:justify-center">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 w-full"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View Details
                  </Button>

                  {order.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => handleAcceptOrder(order.id)}
                        disabled={acceptingOrderId === order.id || !stats?.isAvailable}
                      >
                        {acceptingOrderId === order.id ? "Accepting..." : (
                          <>
                            <CheckCircle className="h-3.5 w-3.5" />
                            Accept
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {order.status === 'IN_PROGRESS' && (
                    <Button
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => openCompleteModal(order.id)}
                      disabled={completingOrderId === order.id}
                    >
                      {completingOrderId === order.id ? "Completing..." : (
                        <>
                          <CheckCircle className="h-3.5 w-3.5" />
                          Mark as Complete
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {filteredOrders.length > 0 && (
        <div className="flex items-center justify-between bg-white dark:bg-zinc-800 rounded-lg p-4 shadow">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {searchTerm
              ? `Showing ${currentPage} of ${totalPages} pages (${filteredOrders.length} filtered from ${allOrders.length} total)`
              : `Showing ${currentPage} of ${totalPages} pages (${filteredOrders.length} orders)`
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

      {/* Order detail dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedOrder?.businessName}</DialogTitle>
            <DialogDescription>
              {selectedOrder?.reviewType}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {selectedOrder.comments && selectedOrder.comments.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">
                    Comments ({selectedOrder.comments.filter(c => c && c.trim().length > 0).length}/{selectedOrder.commentCount || selectedOrder.comments.length}):
                  </p>
                  <div className="space-y-2">
                    {selectedOrder.comments.map((comment, index) => (
                      <div
                        key={index}
                        className={`bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 ${
                          selectedOrder.completedComments?.includes(index)
                            ? 'opacity-50 line-through'
                            : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-medium text-zinc-500 min-w-[20px]">
                            {index + 1}.
                          </span>
                          <p className="text-sm whitespace-pre-wrap flex-1">{comment || '(Empty)'}</p>
                          {selectedOrder.completedComments?.includes(index) && (
                            <span className="text-xs text-green-600 dark:text-green-400">✓ Done</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedOrder.reviewInstructions && (
                <div>
                  <p className="text-sm font-medium mb-2">Instructions:</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {selectedOrder.reviewInstructions}
                  </p>
                </div>
              )}

              {selectedOrder.proofOfCompletion && (
                <div>
                  <p className="text-sm font-medium mb-2">Review URL:</p>
                  <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3">
                    <a
                      href={selectedOrder.proofOfCompletion}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#168BB0] hover:underline break-all"
                    >
                      {selectedOrder.proofOfCompletion}
                    </a>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-500">Status:</span>
                  <span className="ml-2 font-medium">{selectedOrder.status.replace("_", " ")}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Created:</span>
                  <span className="ml-2">{formatDateShort(selectedOrder.createdAt)}</span>
                </div>
                {selectedOrder.assignedAt && (
                  <div>
                    <span className="text-zinc-500">Assigned:</span>
                    <span className="ml-2">{formatDateTime(selectedOrder.assignedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mark as Complete Modal */}
      {showCompleteModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCompleteModal(false);
              setReviewUrl("");
              setCompletingOrderId(null);
            }
          }}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-md w-full relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Mark Review as Complete</h3>
            <p className="text-sm text-zinc-500 mb-4">
              Please provide the URL to your completed review
            </p>
            <input
              type="url"
              value={reviewUrl}
              onChange={(e) => {
                devLog("Review URL input changed:", e.target.value);
                setReviewUrl(e.target.value);
              }}
              placeholder="https://..."
              className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <Button
                onClick={(e) => {
                  devLog("Submit button clicked, url length:", reviewUrl.length);
                  handleCompleteReview();
                  e.preventDefault();
                }}
                disabled={isSubmittingCompletion || !reviewUrl.trim()}
                className="flex-1"
                type="button"
              >
                {isSubmittingCompletion ? "Completing..." : "Submit as Complete"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  devLog("Cancel clicked");
                  setShowCompleteModal(false);
                  setReviewUrl("");
                  setCompletingOrderId(null);
                }}
                type="button"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
