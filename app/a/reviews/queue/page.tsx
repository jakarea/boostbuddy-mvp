"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getAllReviewOrdersAction,
  assignReviewToEmployeeAction,
  cancelReviewOrderAction,
  getAvailableEmployeesAction
} from "@/app/actions/admin-reviews";
import {
  Clock,
  User,
  Calendar,
  Star,
  X,
  Check,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search
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
  photoUrls?: string[];
  reviewInstructions?: string;
  status: string;
  quantity: number;
  creditsConsumed: number;
  createdAt: string;
  clientName?: string;
  clientEmail?: string;
  assignedEmployeeId?: string;
  employeeName?: string;
  skips?: Array<{
    employeeId: string;
    employeeName?: string;
    reason: string;
    createdAt: string;
  }>;
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

export default function AdminReviewsQueuePage() {
  const { t } = useTranslation("admin_reviews");
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [orders, setOrders] = useState<ReviewOrder[]>([]);
  const [allOrders, setAllOrders] = useState<ReviewOrder[]>([]); // Store all orders for filtering
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Record<string, string>>({});
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination state
  const ITEMS_PER_PAGE = 10;
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);

  // Filter orders based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setOrders(allOrders);
    } else {
      const filtered = allOrders.filter((order) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          order.businessName?.toLowerCase().includes(searchLower) ||
          order.clientName?.toLowerCase().includes(searchLower) ||
          order.clientEmail?.toLowerCase().includes(searchLower) ||
          order.facebookUrl?.toLowerCase().includes(searchLower) ||
          order.id.toLowerCase().includes(searchLower)
        );
      });
      setOrders(filtered);
      // Reset to page 1 when searching
      const params = new URLSearchParams(searchParams.toString());
      if (params.get('page') !== '1') {
        params.set('page', '1');
        router.push(`/a/reviews/queue?${params.toString()}`);
      }
    }
  }, [searchTerm, allOrders]);

  // Get current page items
  const getCurrentPageOrders = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return orders.slice(startIndex, endIndex);
  };

  const currentOrders = getCurrentPageOrders();

  // Clear search handler
  const handleClearSearch = () => {
    setSearchTerm("");
  };

  // Navigation handlers
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    // Clear selected employees when changing pages
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

  useEffect(() => {
    if (cancelOrderId === null) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCancelOrderId(null);
        setCancelReason("");
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [cancelOrderId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [ordersRes, employeesRes] = await Promise.all([
        getAllReviewOrdersAction({ status: "PENDING" }),
        getAvailableEmployeesAction()
      ]);

      if (ordersRes.success) {
        const orders = ordersRes.data as ReviewOrder[];
        console.log("📋 [ADMIN QUEUE] Orders loaded:", orders.length, orders);
        setAllOrders(orders);
        setOrders(orders);
      }

      if (employeesRes.success) {
        setEmployees(employeesRes.data as Employee[]);
      }
    } catch (err) {
      error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [error, currentPage]);

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
        loadData();
      } else {
        error(result.error || "Failed to assign order");
      }
    } catch (err) {
      error("Failed to assign order");
    } finally {
      setAssigningOrderId(null);
    }
  };

  const handleCancel = (orderId: string) => {
    setCancelOrderId(orderId);
    setCancelReason("");
  };

  const confirmCancel = async () => {
    if (!cancelOrderId) return;

    const reason = cancelReason.trim();
    if (!reason) {
      error(t("queue.cancelDialog.reasonRequired", "Please provide a reason for cancellation"));
      return;
    }

    const confirmed = await confirm({
      title: t("queue.cancelDialog.title", "Cancel Order?"),
      message: t("queue.cancelDialog.message", "This will refund the credits to the client."),
      confirmText: t("queue.cancelDialog.confirm", "Cancel & Refund"),
      cancelText: t("queue.cancelDialog.back", "Back"),
      confirmVariant: "destructive"
    });

    if (confirmed) {
      try {
        const result = await cancelReviewOrderAction(cancelOrderId, reason);
        if (result.success) {
          success("Order cancelled and credits refunded");
          loadData();
        } else {
          error(result.error || "Failed to cancel order");
        }
      } catch (err) {
        error("Failed to cancel order");
      }
    }

    setCancelOrderId(null);
    setCancelReason("");
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

  const getRatingStars = (rating?: string) => {
    if (!rating) return null;
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

  const availableEmployees = employees.filter(e => e.isActive && e.acceptingOrders);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t("queue.title", "Orders Queue")}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {t("queue.subtitle", "Assign pending review orders to available employees")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {t("queue.refresh", "Refresh")}
        </Button>
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
              placeholder="Search by business name, client name, email, Facebook URL, or order ID..."
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

      {/* Stats Bar */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-yellow-600" />
          <span className="text-zinc-600">
            {searchTerm
              ? `${orders.length} of ${allOrders.length} orders`
              : t("queue.pendingCount", "{{count}} pending", { count: orders.length })
            }
          </span>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-green-600" />
          <span className="text-zinc-600">
            {t("queue.availableCount", "{{count}} available employees", { count: availableEmployees.length })}
          </span>
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {t("queue.noOrders", "No Pending Orders")}
          </h3>
          <p className="text-sm text-zinc-500">
            {t("queue.noOrdersMessage", "All review orders have been assigned or processed.")}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {currentOrders.map((order) => (
            <Card key={order.id} className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Order Details */}
                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                          {order.businessName}
                        </h3>
                        {/* Order Type Badge */}
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          order.orderType === "REVIEW"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                          : order.orderType === "COMMENT"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        }`}>
                          {order.orderType === "REVIEW" ? "Review" :
                           order.orderType === "COMMENT" ? "Comment" : "Comment + Photo"}
                        </span>
                      </div>
                      {order.facebookUrl && (
                        <a
                          href={order.facebookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#168BB0] hover:underline"
                        >
                          {order.facebookUrl}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getPlatformIcon(order.reviewType)}
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getReactionBadgeClasses(order.reactionType || 'LIKE')}`}>
                        {getReactionEmoji(order.reactionType || 'LIKE')}
                      </span>
                      {/* Rating display - Hidden from UI */}
                    </div>
                  </div>

                  {/* Review Content (for REVIEW orders) */}
                  {order.orderType === "REVIEW" && order.content && (
                    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3">
                      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        {t("queue.reviewContent", "Review Content")}:
                      </p>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                        {order.content}
                      </p>
                    </div>
                  )}

                  {/* Comment Text (for COMMENT and COMMENT_WITH_PHOTO orders) */}
                  {(order.orderType === "COMMENT" || order.orderType === "COMMENT_WITH_PHOTO") && order.commentText && (
                    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3">
                      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        {t("queue.commentText", "Comment Text")}:
                      </p>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                        {order.commentText}
                      </p>
                    </div>
                  )}

                  {/* Photos (for COMMENT_WITH_PHOTO orders) */}
                  {order.orderType === "COMMENT_WITH_PHOTO" && order.photoUrls && order.photoUrls.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {order.photoUrls.map((url: string, index: number) => (
                        <div key={index} className="relative">
                          <img
                            src={url}
                            alt={`Photo ${index + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700"
                            onError={(e) => {
                              console.error(`Failed to load photo ${index + 1}:`, url);
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Instructions */}
                  {order.reviewInstructions && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
                        {t("queue.instructions", "Instructions")}:
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        {order.reviewInstructions}
                      </p>
                    </div>
                  )}

                  {/* Skips by employees (admin only) */}
                  {order.skips && order.skips.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium mb-2">
                        {t("queue.skipsByEmployees", "Skipped by employees")} ({order.skips.length})
                      </p>
                      <div className="space-y-2">
                        {order.skips.map((skip, idx) => (
                          <div key={idx} className="text-xs bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-medium text-yellow-800 dark:text-yellow-200">
                                {skip.employeeName || skip.employeeId}
                              </span>
                              <span className="text-yellow-600 dark:text-yellow-400">
                                {formatDateShort(skip.createdAt)}
                              </span>
                            </div>
                            <p className="text-yellow-700 dark:text-yellow-300">{skip.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDateShort(order.createdAt)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {order.quantity} unit{order.quantity > 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{order.creditsConsumed} credits</span>
                    </div>
                    {order.clientName && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {order.clientName} ({order.clientEmail})
                      </div>
                    )}
                  </div>
                </div>

                {/* Assignment Actions */}
                <div className="lg:w-64 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 pt-4 lg:pt-0 lg:pl-4 space-y-3">
                  <div>
                    <label htmlFor={`assign-${order.id}`} className="text-xs font-medium text-zinc-600 mb-1 block">
                      {t("queue.assignTo", "Assign to Employee")}
                    </label>
                    <select
                      id={`assign-${order.id}`}
                      value={selectedEmployees[order.id] || ""}
                      onChange={(e) => setSelectedEmployees({ ...selectedEmployees, [order.id]: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
                      disabled={assigningOrderId === order.id}
                    >
                      <option value="">{t("queue.selectEmployee", "Select employee...")}</option>
                      {availableEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.ordersCompleted} completed)
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    size="sm"
                    className="w-full gap-2"
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
                        <Check className="h-3.5 w-3.5" />
                        {t("queue.assignOrder", "Assign Order")}
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleCancel(order.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                    {t("queue.cancelOrder", "Cancel Order")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {orders.length > 0 && (
        <div className="flex items-center justify-between bg-white dark:bg-zinc-800 rounded-lg p-4 shadow">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {searchTerm
              ? `Showing ${currentPage} of ${totalPages} page${totalPages === 1 ? '' : 's'} (${orders.length} filtered from ${allOrders.length} total)`
              : `Showing ${currentPage} of ${totalPages} ${totalPages === 1 ? 'order' : 'orders'} (${orders.length} total)`
            }
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(page)}
                  className="min-w-[40px]"
                >
                  {page}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Cancel Reason Modal (accessible replacement for prompt()) */}
      {cancelOrderId && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-reason-title"
          onClick={() => setCancelOrderId(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 id="cancel-reason-title" className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {t("queue.cancelDialog.title", "Cancel Order?")}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {t("queue.cancelDialog.message", "This will refund the credits to the client.")}
              </p>
            </div>
            <div>
              <label htmlFor="cancel-reason-input" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {t("queue.cancelDialog.reasonLabel", "Reason")}
              </label>
              <textarea
                id="cancel-reason-input"
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[80px]"
                placeholder={t("queue.cancelDialog.reasonPlaceholder", "Enter the reason for cancellation...")}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelOrderId(null)}>
                {t("queue.cancelDialog.back", "Back")}
              </Button>
              <Button
                variant="destructive"
                onClick={confirmCancel}
                disabled={!cancelReason.trim()}
              >
                {t("queue.cancelDialog.confirm", "Cancel & Refund")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
