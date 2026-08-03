"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
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
  reviewType: string;
  targetRating: string;
  reactionType?: string;
  reviewContent: string;
  reviewInstructions?: string;
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

export default function AdminReviewsHistoryPage() {
  const { t } = useTranslation("admin_reviews");
  const { error } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [allOrders, setAllOrders] = useState<ReviewOrder[]>([]);
  const [orders, setOrders] = useState<ReviewOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<ReviewOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const result = await getAllReviewOrdersAction();
      if (result.success) {
        const normalized = (result.data as any[])?.map(order => ({
          id: order.id,
          businessName: order.business_name || order.businessName,
          businessUrl: order.business_url || order.businessUrl,
          reviewType: order.review_type || order.reviewType,
          targetRating: order.target_rating || order.targetRating,
          reviewContent: order.review_content || order.reviewContent,
          reviewInstructions: order.review_instructions || order.reviewInstructions,
          status: order.status,
          creditsConsumed: order.credits_consumed || order.creditsConsumed || 0,
          createdAt: order.created_at || order.createdAt,
          updatedAt: order.updated_at || order.updatedAt,
          completedAt: order.completed_at || order.completedAt,
          clientFeedback: order.client_feedback || order.clientFeedback,
          proofOfCompletion: order.proof_of_completion || order.proofOfCompletion,
          assignedEmployeeId: order.assigned_employee_id || order.assignedEmployeeId,
          clientName: order.clientName || order.client_name || (order.users as any)?.name,
          clientEmail: order.clientEmail || order.client_email || (order.users as any)?.email,
          employeeName: order.employeeName || order.employee_name || (order.employees as any)?.name,
          employeeEmail: order.employeeEmail || order.employee_email || (order.employees as any)?.email,
        })) || [];
        setAllOrders(normalized);
        setOrders(normalized);
      } else {
        error(result.error || "Failed to load orders");
      }
    } catch (err) {
      error("Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  };

  // Apply status and search filters
  useEffect(() => {
    let filtered = allOrders;

    // Apply status filter
    if (statusFilter !== "ALL") {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((order) => {
        return (
          order.businessName?.toLowerCase().includes(searchLower) ||
          order.clientName?.toLowerCase().includes(searchLower) ||
          order.clientEmail?.toLowerCase().includes(searchLower) ||
          order.employeeName?.toLowerCase().includes(searchLower) ||
          order.id.toLowerCase().includes(searchLower)
        );
      });
      // Reset to page 1 when searching
      const params = new URLSearchParams(searchParams.toString());
      if (params.get('page') !== '1') {
        params.set('page', '1');
        router.push(`/a/reviews/history?${params.toString()}`);
      }
    }

    setOrders(filtered);
  }, [statusFilter, searchTerm, allOrders]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <span className={`px-2 py-1 rounded text-xs font-semibold ${platformColors[type] || "bg-zinc-100 text-zinc-700"}`}>
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
        icon: <Smile className="h-3.5 w-3.5" />,
        color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        label: "Happy"
      },
      UNHAPPY: {
        icon: <Frown className="h-3.5 w-3.5" />,
        color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        label: "Unhappy"
      },
      ANGRY: {
        icon: <Angry className="h-3.5 w-3.5" />,
        color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        label: "Angry"
      }
    };

    const config = feedbackConfig[feedback as keyof typeof feedbackConfig];
    if (!config) return null;

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${config.color}`}>
        {config.icon}
        <span>{config.label}</span>
      </span>
    );
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t("history.title", "Order History")}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {t("history.subtitle", "Full history of all review orders across every status.")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          {t("history.refresh", "Refresh")}
        </Button>
      </div>

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
            {t(`history.filter.${status.toLowerCase()}`, status)}
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
              placeholder="Search by business name, client name, employee name, or order ID..."
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
          <HistoryIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {t("history.noOrders", "No Orders")}
          </h3>
          <p className="text-sm text-zinc-500">
            {t("history.noOrdersMessage", "No review orders match the current filter.")}
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
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getReactionBadgeClasses(order.reactionType || 'LIKE')}`}>
                        {getReactionEmoji(order.reactionType || 'LIKE')}
                      </span>
                      {/* Rating display - Hidden from UI */}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_STYLES[order.status] || "bg-zinc-100 text-zinc-700"}`}>
                        {order.status.replace("_", " ")}
                      </span>
                      {order.status === 'COMPLETED' && getClientFeedbackBadge(order.clientFeedback)}
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="flex items-center gap-4 text-xs text-zinc-500 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {t("history.created", "Created")}: {formatDateShort(order.createdAt)}
                      </span>
                    </div>
                    {order.updatedAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {t("history.updated", "Updated")}: {formatDateShort(order.updatedAt)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      <span>{t("history.credits", "Credits")}: {order.creditsConsumed}</span>
                    </div>
                  </div>

                  {/* Client / Employee info */}
                  <div className="flex items-center gap-4 text-xs text-zinc-500 flex-wrap">
                    {order.clientName && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>
                          {t("history.client", "Client")}: {order.clientName}
                          {order.clientEmail ? ` (${order.clientEmail})` : ""}
                        </span>
                      </div>
                    )}
                    {order.employeeName && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>
                          {t("history.employee", "Employee")}: {order.employeeName}
                          {order.employeeEmail ? ` (${order.employeeEmail})` : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* View details */}
                <div className="lg:w-40 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 pt-4 lg:pt-0 lg:pl-4 flex lg:flex-col gap-2 lg:justify-center">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 w-full"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {t("history.viewDetails", "View Details")}
                  </Button>
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
                    {t("history.proof", "Proof of Completion")}
                  </h4>
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 text-sm">
                    <p className="whitespace-pre-wrap">{selectedOrder.proofOfCompletion}</p>
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
