"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  Calendar,
  ExternalLink,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Coins,
  UserCheck,
  Eye
} from "lucide-react";
import { useSWR } from "@/lib/cache/swr";
import { CACHE_KEYS } from "@/lib/cache/cacheContext";
import CACHE_TTL from '@/lib/cache/cache-ttl';
import { getAllReviewOrdersAction, type ReviewOrderFilter } from "@/app/actions/admin-reviews";
import { formatDateShort } from "@/lib/dateUtils";
import Link from "next/link";

// Constants
const ORDER_STATUS = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  ALL: ""
} as const;

interface ReviewOrder {
  id: string;
  userId: string;
  businessName: string;
  facebookUrl?: string;
  orderType: string;
  reviewType: string;
  reviewContent: string;
  reviewInstructions?: string;
  quantity: number;
  creditsConsumed: number;
  status: string;
  assignedEmployeeId?: string;
  assignedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  users?: { name: string; email: string };
  employees?: { name: string; email: string };
}

interface OrdersClientProps {
  initialOrders: ReviewOrder[];
  initialTotalCount: number;
}

export default function OrdersClient({ initialOrders, initialTotalCount }: OrdersClientProps) {
  const { t } = useTranslation("admin_reviews");
  const router = useRouter();
  const searchParams = useSearchParams();

  // SWR for orders data - 2 minute cache
  const { data: swrData, refresh, isValid } = useSWR({
    key: CACHE_KEYS.ADMIN_REVIEW_ORDERS,
    fetcher: async () => {
      const page = parseInt(searchParams.get('page') || '1', 10);
      const status = searchParams.get('status') as ReviewOrderFilter['status'] || undefined;
      const searchTerm = searchParams.get('search') || undefined;

      const result = await getAllReviewOrdersAction({
        page,
        pageSize: 20,
        status,
        searchTerm
      });

      if (result.success) {
        return {
          orders: result.data as ReviewOrder[],
          totalCount: result.pagination?.totalCount || 0
        };
      }
      return { orders: [], totalCount: 0 };
    },
    ttl: CACHE_TTL.MEDIUM, // 2 minutes
    initialData: { orders: initialOrders, totalCount: initialTotalCount }
  });

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || ORDER_STATUS.ALL);
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const totalPages = Math.ceil((swrData?.totalCount || 0) / 20);

  const orders = swrData?.orders || [];
  const totalCount = swrData?.totalCount || 0;

  // Sync search with URL params (debounced could be added)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchTerm) {
        params.set('search', searchTerm);
      } else {
        params.delete('search');
      }
      params.set('page', '1');
      router.push(`/a/orders?${params.toString()}`);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Sync status filter with URL params
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (statusFilter && statusFilter !== ORDER_STATUS.ALL) {
      params.set('status', statusFilter);
    } else {
      params.delete('status');
    }
    params.set('page', '1');
    router.push(`/a/orders?${params.toString()}`);
  }, [statusFilter]);

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/a/orders?${params.toString()}`);
  };

  const handleClearSearch = () => setSearchTerm('');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            In Progress
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReviewTypeIcon = (reviewType: string) => {
    switch (reviewType) {
      case 'GOOGLE': return '🔍';
      case 'FACEBOOK': return '📘';
      case 'TRUSTPILOT': return '⭐';
      case 'YELP': return '📝';
      case 'AMAZON': return '🛒';
      default: return '⭐';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Package className="h-6 w-6 text-[#168BB0]" />
            {t("orders.title", "Client Review Orders")}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {t("orders.subtitle", "Manage all client review orders with URLs and content")}
          </p>
        </div>
        <Button onClick={refresh} variant="outline" size="sm" disabled={!isValid} className="gap-2">
          <Loader2 className={`h-4 w-4 ${!isValid ? 'animate-spin' : ''}`} />
          {t("common.refresh", "Refresh")}
        </Button>
      </div>

      {/* Stats Cards - 6 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">{t("orders.totalOrders", "Total Orders")}</p>
              <p className="text-2xl font-bold">{totalCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">{t("orders.pendingOrders", "Pending Orders")}</p>
              <p className="text-2xl font-bold">{orders.filter(o => o.status === 'PENDING').length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">{t("orders.inProgressOrders", "In Progress")}</p>
              <p className="text-2xl font-bold">{orders.filter(o => o.status === 'IN_PROGRESS').length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">{t("orders.completedOrders", "Completed")}</p>
              <p className="text-2xl font-bold">{orders.filter(o => o.status === 'COMPLETED').length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Coins className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">{t("orders.totalRevenue", "Total Revenue")}</p>
              <p className="text-2xl font-bold">{orders.reduce((sum, o) => sum + (o.creditsConsumed || 0), 0)} <span className="text-sm font-normal text-zinc-500">credits</span></p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <UserCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">{t("orders.activeEmployees", "Active Employees")}</p>
              <p className="text-2xl font-bold">{new Set(orders.filter(o => o.assignedEmployeeId).map(o => o.assignedEmployeeId)).size}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-3 bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-700">
        <div className="flex-1 min-w-[240px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("orders.searchPlaceholder", "Search by order ID...")}
              className="w-full pl-10 pr-10 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#168BB0]"
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
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#168BB0]"
        >
          <option value={ORDER_STATUS.ALL}>{t("orders.allStatuses", "All Statuses")}</option>
          <option value={ORDER_STATUS.PENDING}>{t("orders.status.pending", "Pending")}</option>
          <option value={ORDER_STATUS.IN_PROGRESS}>{t("orders.status.inProgress", "In Progress")}</option>
          <option value={ORDER_STATUS.COMPLETED}>{t("orders.status.completed", "Completed")}</option>
          <option value={ORDER_STATUS.CANCELLED}>{t("orders.status.cancelled", "Cancelled")}</option>
        </select>

        {searchTerm && (
          <div className="text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-3 py-2 rounded-lg">
            {orders.length} {t("common.results", "results")}
          </div>
        )}
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card className="p-12 text-center border-zinc-200 dark:border-zinc-700">
          <Package className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t("orders.noOrders", "No Review Orders Found")}</h3>
          <p className="text-sm text-zinc-500">
            {t("orders.noOrdersMessage", "No review orders available yet.")}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden border-zinc-200 dark:border-zinc-700">
          {/* Table Header */}
          <div className="bg-zinc-50 dark:bg-zinc-900 px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 grid grid-cols-10 gap-3 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            <div className="col-span-3">{t("orders.orderId", "Order ID")}</div>
            <div className="col-span-2">{t("orders.type", "Type")}</div>
            <div className="col-span-1 text-center">{t("orders.qty", "Qty")}</div>
            <div className="col-span-2">{t("orders.employee", "Employee")}</div>
            <div className="col-span-1">{t("orders.status", "Status")}</div>
            <div className="col-span-1 text-right">{t("orders.created", "Created")}</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/a/orders/${order.id}`}
                className="block hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
              >
                <div className="px-4 py-3 grid grid-cols-10 gap-3 items-center">
                  {/* Order ID with Icon */}
                  <div className="col-span-3 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs" title={order.reviewType}>
                        {getReviewTypeIcon(order.reviewType)}
                      </span>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{order.id.substring(0, 8)}...</p>
                    </div>
                  </div>

                  {/* Type */}
                  <div className="col-span-2">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {order.orderType.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Quantity */}
                  <div className="col-span-1 text-center">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{order.quantity}</span>
                  </div>

                  {/* Employee */}
                  <div className="col-span-2">
                    {order.employees ? (
                      <div className="flex items-center gap-1 text-sm">
                        <UserCheck className="h-3 w-3 text-green-600 dark:text-green-400" />
                        <span className="text-zinc-700 dark:text-zinc-300 truncate">{order.employees.name}</span>
                      </div>
                    ) : order.status === 'PENDING' ? (
                      <span className="text-xs text-zinc-500 italic">Unassigned</span>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="col-span-1">
                    {getStatusBadge(order.status)}
                  </div>

                  {/* Created Date */}
                  <div className="col-span-1 text-right text-xs text-zinc-500">
                    {formatDateShort(order.createdAt)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Pagination */}
      {orders.length > 0 && (
        <div className="flex items-center justify-between bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-700">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {searchTerm || statusFilter !== ORDER_STATUS.ALL
              ? `${currentPage}/${totalPages} (${orders.length} ${t("common.results", "results")})`
              : `${currentPage}/${totalPages} (${totalCount} ${t("common.total", "total")})`
            }
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("common.previous", "Previous")}
            </Button>
            <div className="flex items-center gap-1">
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
                    className="min-w-[32px] h-8 text-sm"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="gap-1.5"
            >
              {t("common.next", "Next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
