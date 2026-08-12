"use client";

import { useContext, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getClientReviewOrdersAction } from "@/app/actions/reviews";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateShort } from "@/lib/dateUtils";
import { getReactionEmoji, getReactionBadgeClasses } from "@/lib/reactionUtils";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";

const STATUS_FILTERS = ["", "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export default function ReviewOrdersPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { error: toastError } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>("");
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
    router.push(`/c/services/reviews/orders?${params.toString()}`);
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

  useEffect(() => {
    if (!user) return;

    const loadOrders = async () => {
      try {
        const result = await getClientReviewOrdersAction(
          statusFilter ? { status: statusFilter as any } : undefined
        );

        if (result.success && result.data) {
          setAllOrders(result.data);
          setOrders(result.data);
        } else {
          toastError(result.error || t("reviews.loadOrdersFailed", "Failed to load orders"));
        }
      } catch (err) {
        console.error("Failed to load orders:", err);
        toastError(t("reviews.loadOrdersFailed", "Failed to load orders"));
      }
      setLoading(false);
    };

    loadOrders();
  }, [user, statusFilter]);

  // Apply search filter
  useEffect(() => {
    if (!searchTerm.trim()) {
      setOrders(allOrders);
    } else {
      const filtered = allOrders.filter((order) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          order.businessName?.toLowerCase().includes(searchLower) ||
          order.facebookUrl?.toLowerCase().includes(searchLower) ||
          order.orderType?.toLowerCase().includes(searchLower) ||
          order.id?.toLowerCase().includes(searchLower)
        );
      });
      setOrders(filtered);
      // Reset to page 1 when searching
      const params = new URLSearchParams(searchParams.toString());
      if (params.get('page') !== '1') {
        params.set('page', '1');
        router.push(`/c/services/reviews/orders?${params.toString()}`);
      }
    }
  }, [searchTerm, allOrders]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {t("reviews.myOrders", "My Review Orders")}
        </h1>
        <a
          href="/c/services/reviews/new-order"
          className="px-4 py-2 bg-[#168BB0] text-white rounded-lg hover:bg-[#0F7493]"
        >
          {t("reviews.newOrder", "+ New Order")}
        </a>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
        >
          {STATUS_FILTERS.map(status => (
            <option key={status || "all"} value={status}>
              {status
                ? t(`reviews.status.${status}`, status)
                : t("reviews.allStatuses", "All Statuses")}
            </option>
          ))}
        </select>
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
              placeholder="Search by business name, Facebook URL, order type, or ID..."
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

      {/* Orders List - Single Item Display */}
      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-800 rounded-lg">
          <p className="text-zinc-500">
            {t("reviews.noOrdersFound", "No orders found")}
          </p>
          <a
            href="/c/services/reviews/new-order"
            className="inline-block mt-4 text-[#168BB0] hover:underline"
          >
            {t("reviews.createFirst", "Create your first order →")}
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {currentOrders.map(order => (
            <a
              key={order.id}
              href={`/c/services/reviews/orders/${order.id}`}
              className="block bg-white dark:bg-zinc-800 rounded-lg p-6 shadow hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-medium truncate flex-1">
                  {order.businessName}
                </h3>
                <StatusBadge status={order.status} type="order" />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">
                    {t("reviews.orderType", "Order Type")}:
                  </span>
                  <span className="font-medium">{order.orderType.replace(/_/g, ' ')}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">
                    {t("reviews.reaction", "Reaction")}:
                  </span>
                  <span className={`font-medium ${getReactionBadgeClasses(order.reactionType || 'LIKE')}`}>
                    {getReactionEmoji(order.reactionType || 'LIKE')}
                  </span>
                </div>

                {/* Rating display - Hidden from UI */}

                <div className="flex justify-between">
                  <span className="text-zinc-500">
                    {t("reviews.quantity", "Quantity")}:
                  </span>
                  <span className="font-medium">{order.quantity}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-500">
                    {t("reviews.credits", "Credits")}:
                  </span>
                  <span className="font-medium">{order.creditsConsumed}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-500">
                    {t("reviews.created", "Created")}:
                  </span>
                  <span className="font-medium">
                    {formatDateShort(order.createdAt)}
                  </span>
                </div>
              </div>

              {order.clientFeedback && (
                <div className="mt-3 pt-3 border-t dark:border-zinc-700">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium
                    ${order.clientFeedback === "HAPPY" ? "bg-green-100 text-green-800" :
                      order.clientFeedback === "UNHAPPY" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"}`}>
                    {t(`reviews.feedback.${order.clientFeedback}`, order.clientFeedback) as string}
                  </span>
                </div>
              )}
            </a>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {orders.length > 0 && (
        <div className="flex items-center justify-between bg-white dark:bg-zinc-800 rounded-lg p-4 shadow">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {searchTerm
              ? `Showing ${currentPage} of ${totalPages} pages (${orders.length} filtered from ${allOrders.length} total)`
              : `Showing ${currentPage} of ${totalPages} pages (${orders.length} orders)`
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
