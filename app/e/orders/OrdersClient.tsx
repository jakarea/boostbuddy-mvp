"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateShort, safeDateDisplay } from "@/lib/dateUtils";
import { Search, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useSWR } from "@/lib/cache/swr";
import { CACHE_KEYS } from "@/lib/cache/cacheContext";
import { getEmployeeReviewOrdersAction } from "@/app/actions/employee";
import { Button } from "@/components/ui/button";

const STATUS_FILTERS = ["", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

interface Order {
  id: string;
  businessName: string;
  reviewType: string;
  status: string;
  creditsConsumed: number;
  createdAt: string;
  completedAt?: string;
  proofOfCompletion?: string;
}

interface OrdersClientProps {
  initialOrders: Order[];
}

export function OrdersClient({ initialOrders }: OrdersClientProps) {
  const { t } = useTranslation();
  const { error: toastError } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  // SWR for employee orders - 2 minute cache
  const { data: allOrders, refresh, isValid } = useSWR<Order[]>({
    key: CACHE_KEYS.EMPLOYEE_ORDERS,
    fetcher: async (): Promise<Order[]> => {
      const result = await getEmployeeReviewOrdersAction();
      if (result.success && result.data) {
        const data = result.data as any;
        return data.orders || [];
      }
      return [];
    },
    ttl: CACHE_TTL.MEDIUM, // 2 minutes
    initialData: initialOrders,
  });

  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>("");
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

  // Apply search filter
  useEffect(() => {
    let filtered = allOrders || [];

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    // Apply search filter
    if (debouncedSearchTerm.trim()) {
      const searchLower = debouncedSearchTerm.toLowerCase();
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
  }, [statusFilter, debouncedSearchTerm, allOrders]);

  const filteredOrders = orders;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-bold">{t("employee.orderHistory", "Order History")}</h1>
        <Button
          onClick={refresh}
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={!isValid}
        >
          <Loader2 className={`h-4 w-4 ${!isValid ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex gap-2 flex-wrap items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof STATUS_FILTERS[number])}
          className="px-2 py-1 text-sm border rounded dark:bg-zinc-800 dark:border-zinc-700"
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

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-8 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#168BB0]"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {searchTerm && (
          <span className="text-xs text-zinc-500">
            {orders.length} result{orders.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Orders List - Compact Display */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-zinc-900 rounded">
          <p className="text-sm text-zinc-500">
            {statusFilter
              ? t("employee.noOrdersFound", "No orders found")
              : t("employee.noOrdersYet", "No orders yet")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {currentOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-zinc-900 rounded p-3 shadow-sm hover:shadow transition-shadow"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-sm font-medium truncate">
                      {order.businessName}
                    </h3>
                    <StatusBadge status={order.status} type="order" />
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div>
                      <span className="text-zinc-500">{t("employee.platform", "Platform")}:</span>
                      <span className="ml-1">{order.reviewType}</span>
                    </div>

                    <div>
                      <span className="text-zinc-500">{t("employee.created", "Created")}:</span>
                      <span className="ml-1">{formatDateShort(order.createdAt)}</span>
                    </div>

                    {order.completedAt && (
                      <div className="col-span-2">
                        <span className="text-zinc-500">{t("employee.completed", "Completed")}:</span>
                        <span className="ml-1 text-green-600">{formatDateShort(order.completedAt)}</span>
                      </div>
                    )}
                  </div>

                  {order.status === "COMPLETED" && order.proofOfCompletion && (
                    <div className="mt-2 pt-2 border-t dark:border-zinc-800">
                      <p className="text-xs text-zinc-500">
                        {t("employee.proof", "Review URL")}: <a href={order.proofOfCompletion} target="_blank" rel="noopener noreferrer" className="text-[#168BB0] hover:underline line-clamp-1">{order.proofOfCompletion}</a>
                      </p>
                    </div>
                  )}
                </div>

                {order.status === "IN_PROGRESS" && (
                  <a
                    href={`/e/orders/${order.id}`}
                    className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap"
                  >
                    {t("employee.submitReview", "Submit Review")}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compact Pagination */}
      {filteredOrders.length > 0 && (
        <div className="flex items-center justify-between bg-white dark:bg-zinc-800 rounded px-3 py-2 text-xs shadow-sm">
          <span className="text-zinc-500">
            {searchTerm
              ? `${currentPage}/${totalPages} (${filteredOrders.length} of ${allOrders?.length || 0})`
              : `${currentPage}/${totalPages} (${filteredOrders.length} orders)`
            }
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-2 py-1 border rounded hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700"
            >
              <ChevronLeft className="h-3 w-3" />
              Prev
            </button>

            <div className="flex items-center gap-0.5">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`min-w-[28px] px-1.5 py-1 border rounded text-xs ${
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
              className="flex items-center gap-1 px-2 py-1 border rounded hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700"
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
