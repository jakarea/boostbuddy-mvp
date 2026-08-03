"use client";

import { useContext, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getEmployeeOrderHistoryAction } from "@/app/actions/employee";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateShort, safeDateDisplay } from "@/lib/dateUtils";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";

const STATUS_FILTERS = ["", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export default function EmployeeOrderHistoryPage() {
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
    router.push(`/e/orders?${params.toString()}`);
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

    const loadOrders = async () => {
      try {
        const result = await getEmployeeOrderHistoryAction(100);

        if (result.success && result.data) {
          setAllOrders(result.data);
          setOrders(result.data);
        } else {
          toastError(result.error || t("employee.loadOrdersFailed", "Failed to load orders"));
        }
      } catch (err) {
        console.error("Failed to load orders:", err);
        toastError(t("employee.loadOrdersFailed", "Failed to load orders"));
      }

      setLoading(false);
    };

    loadOrders();
  }, [user]);

  // Apply search filter
  useEffect(() => {
    let filtered = allOrders;

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(order => {
        return (
          order.businessName?.toLowerCase().includes(searchLower) ||
          order.reviewType?.toLowerCase().includes(searchLower) ||
          order.id?.toLowerCase().includes(searchLower)
        );
      });
      // Reset to page 1 when searching
      const params = new URLSearchParams(searchParams.toString());
      if (params.get('page') !== '1') {
        params.set('page', '1');
        router.push(`/e/orders?${params.toString()}`);
      }
    }

    setOrders(filtered);
  }, [statusFilter, searchTerm, allOrders]);

  const filteredOrders = orders;

  if (loading) return <LoadingScreen />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("employee.orderHistory", "Order History")}</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
          aria-label={t("employee.allStatuses", "All Statuses")}
        >
          {STATUS_FILTERS.map((status) => (
            <option key={status || "all"} value={status}>
              {status
                ? t(`employee.status.${status}`, status)
                : t("employee.allStatuses", "All Statuses")}
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
              placeholder="Search by business name, platform, or ID..."
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
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-lg">
          <p className="text-zinc-500">
            {statusFilter
              ? t("employee.noOrdersFound", "No orders found")
              : t("employee.noOrdersYet", "No orders yet")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-medium truncate flex-1">
                  {order.businessName}
                </h3>
                <StatusBadge status={order.status} type="order" />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">{t("employee.platform", "Platform")}:</span>
                  <span className="font-medium">{order.reviewType}</span>
                </div>

                {/* Rating display - Hidden from UI */}

                <div className="flex justify-between">
                  <span className="text-zinc-500">{t("employee.credits", "Credits")}:</span>
                  <span className="font-medium">{order.creditsConsumed}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-500">{t("employee.created", "Created")}:</span>
                  <span className="font-medium">
                    {formatDateShort(order.createdAt)}
                  </span>
                </div>

                {order.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">{t("employee.completed", "Completed")}:</span>
                    <span className="font-medium text-green-600">
                      {formatDateShort(order.completedAt)}
                    </span>
                  </div>
                )}
              </div>

              {order.status === "COMPLETED" && order.proofOfCompletion && (
                <div className="mt-3 pt-3 border-t dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-1">
                    {t("employee.proof", "Proof")}:
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-gray-400 line-clamp-2">
                    {order.proofOfCompletion}
                  </p>
                </div>
              )}

              {order.status === "IN_PROGRESS" && (
                <a
                  href={`/e/orders/${order.id}`}
                  className="mt-3 block w-full px-3 py-2 bg-green-600 text-white text-center rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  {t("employee.submitReview", "Submit Review")}
                </a>
              )}
            </div>
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
    </div>
  );
}
