"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getEmployeeCompletedOrdersAction } from "@/app/actions/admin-reviews";
import { ArrowLeft, Calendar as CalendarIcon, ExternalLink, Package, CheckCircle, ChevronLeft, ChevronRight, TrendingUp, Coins, Clock } from "lucide-react";

interface CompletedOrder {
  id: string;
  url: string;
  quantity: number;
  status: string;
  assignedAt: string;
  completedAt: string;
  orderId: string;
  orderType: string;
  businessName?: string;
  creditsConsumed: number;
}

interface EmployeeCompletedOrdersProps {
  employeeId: string;
  initialOrders: CompletedOrder[];
  initialTotalCount: number;
}

export default function EmployeeCompletedOrdersClient({
  employeeId,
  initialOrders,
  initialTotalCount,
}: EmployeeCompletedOrdersProps) {
  const { t } = useTranslation("admin_reviews");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pagination state
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const itemsPerPage = parseInt(searchParams.get("pageSize") || "20", 10);
  const totalPages = Math.ceil(initialTotalCount / itemsPerPage);

  const [orders, setOrders] = useState<CompletedOrder[]>(initialOrders);
  const [totalCount, setTotalCount] = useState(initialTotalCount);

  // Date range filter state - initialize from URL params, default to thisWeek
  const initialDateRange = (searchParams.get("dateRange") || "thisWeek") as
    "thisWeek" | "lastWeek" | "thisMonth" | "thisYear" | "custom" | "all";
  const [dateRange, setDateRange] = useState(initialDateRange);
  const [customStartDate, setCustomStartDate] = useState(searchParams.get("customStartDate") || "");
  const [customEndDate, setCustomEndDate] = useState(searchParams.get("customEndDate") || "");
  const [showDatePicker, setShowDatePicker] = useState(initialDateRange === "custom" && !!customStartDate && !!customEndDate);

  // Sync state with props when they change (e.g., when date range filter changes)
  useEffect(() => {
    setOrders(initialOrders);
    setTotalCount(initialTotalCount);
  }, [initialOrders, initialTotalCount]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!orders || orders.length === 0) {
      return {
        totalCredits: 0,
        totalOrders: 0,
        totalQuantity: 0,
        earliestDate: null,
        latestDate: null,
      };
    }

    const totalCredits = orders.reduce((sum, order) => sum + (order.creditsConsumed || 0), 0);
    const totalQuantity = orders.reduce((sum, order) => sum + (order.quantity || 0), 0);
    const completedDates = orders.map(order => new Date(order.completedAt)).filter(date => !isNaN(date.getTime()));
    const earliestDate = completedDates.length > 0 ? new Date(Math.min(...completedDates.map(d => d.getTime()))) : null;
    const latestDate = completedDates.length > 0 ? new Date(Math.max(...completedDates.map(d => d.getTime()))) : null;

    return {
      totalCredits,
      totalOrders: totalCount,
      totalQuantity,
      earliestDate,
      latestDate,
    };
  }, [orders, totalCount]);

  const formatOrderType = (type: string) => {
    switch (type) {
      case "COMMENT":
        return t("orders.type_reactions", "Reactions");
      case "REVIEW":
        return t("orders.type_reviews", "Reviews");
      case "COMMENT_WITH_PHOTO":
        return t("orders.type_photo_reviews", "Photo + Reviews");
      default:
        return type?.replace(/_/g, " ") || type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper to update URL params and fetch data
  const updateQueryParams = async (newParams: Record<string, string | number>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      params.set(key, String(value));
    });
    router.push(`?${params.toString()}`);

    const result = await getEmployeeCompletedOrdersAction(
      employeeId,
      Number(params.get("page") || currentPage),
      Number(params.get("pageSize") || itemsPerPage),
      params.get("dateRange") || dateRange,
      params.get("customStartDate") || customStartDate,
      params.get("customEndDate") || customEndDate
    );

    if (result.success && result.data) {
      setOrders(result.data.orders);
      setTotalCount(result.data.totalCount);
    }
  };

  const goToPage = (page: number) => {
    updateQueryParams({ page });
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      updateQueryParams({ page: currentPage - 1 });
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      updateQueryParams({ page: currentPage + 1 });
    }
  };

  const handleItemsPerPageChange = (newPageSize: number) => {
    updateQueryParams({ pageSize: newPageSize, page: 1 });
  };

  const handleDateRangeChange = (newRange: typeof dateRange) => {
    setDateRange(newRange);
    if (newRange === "custom") {
      setShowDatePicker(true);
    } else {
      setShowDatePicker(false);
      setCustomStartDate("");
      setCustomEndDate("");
      updateQueryParams({ dateRange: newRange, page: 1, customStartDate: "", customEndDate: "" });
    }
  };

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      updateQueryParams({
        dateRange: "custom",
        customStartDate,
        customEndDate,
        page: 1,
      });
      setShowDatePicker(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/a/reviews/employees")}
          className="gap-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("orders.back_to_employees", "Back to Employees")}
        </Button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-4 w-4 text-zinc-500" />
          <select
            value={dateRange}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const value = e.target.value;
              handleDateRangeChange(value as typeof dateRange);
              if (value !== "custom") {
                setShowDatePicker(false);
              }
            }}
            className="h-10 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#168BB0]"
          >
            <option value="all">{t("filter_range.all_time", "All Time")}</option>
            <option value="thisWeek">{t("filter_range.this_week", "This Week")}</option>
            <option value="lastWeek">{t("filter_range.last_week", "Last Week")}</option>
            <option value="thisMonth">{t("filter_range.this_month", "This Month")}</option>
            <option value="thisYear">{t("filter_range.this_year", "This Year")}</option>
            <option value="custom">{t("filter_range.custom", "Custom Range")}</option>
          </select>
          {dateRange === "custom" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="gap-2"
            >
              {showDatePicker ? t("orders.close", "Close") : t("orders.select_dates", "Select Dates")}
            </Button>
          )}
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {showDatePicker && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-zinc-500 mb-1">{t("filter_range.start_date", "Start Date")}</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#168BB0]"
              />
            </div>
            <div className="flex items-center pt-5">
              <span className="text-zinc-400">→</span>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-zinc-500 mb-1">{t("filter_range.end_date", "End Date")}</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#168BB0]"
              />
            </div>
            <div className="flex gap-2 pt-5">
              <Button
                onClick={() => {
                  setCustomStartDate("");
                  setCustomEndDate("");
                  setShowDatePicker(false);
                  setDateRange("all");
                }}
                variant="outline"
                size="sm"
              >
                {t("orders.clear", "Clear")}
              </Button>
              <Button
                onClick={handleCustomDateApply}
                disabled={!customStartDate || !customEndDate}
                size="sm"
                className="bg-[#168BB0] hover:bg-[#147aa0]"
              >
                {t("orders.apply", "Apply")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats Card */}
      {orders.length > 0 && (
        <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-xl p-6 shadow-lg border-none">
          <h3 className="text-sm font-semibold text-white/90 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t("employee_orders.performance_summary", "Performance Summary")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="h-5 w-5 text-white/80" />
                <span className="text-xs text-white/60 font-medium">{t("orders.total", "Total")}</span>
              </div>
              <p className="text-3xl font-bold text-white">{summaryStats.totalOrders}</p>
              <p className="text-xs text-white/70 mt-1">{t("employee_orders.orders_completed", "orders completed")}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <Coins className="h-5 w-5 text-white/80" />
                <span className="text-xs text-white/60 font-medium">{t("employee_orders.earned", "Earned")}</span>
              </div>
              <p className="text-3xl font-bold text-white">{summaryStats.totalCredits}</p>
              <p className="text-xs text-white/70 mt-1">{t("employee_orders.credits_earned", "credits earned")}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <Package className="h-5 w-5 text-white/80" />
                <span className="text-xs text-white/60 font-medium">{t("orders.reviews", "Reviews")}</span>
              </div>
              <p className="text-3xl font-bold text-white">{summaryStats.totalQuantity}</p>
              <p className="text-xs text-white/70 mt-1">{t("employee_orders.total_reviews", "total reviews")}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-5 w-5 text-white/80" />
                <span className="text-xs text-white/60 font-medium">{t("employee_orders.period", "Period")}</span>
              </div>
              <p className="text-lg font-bold text-white leading-tight">
                {summaryStats.earliestDate && summaryStats.latestDate ? (
                  <>
                    {summaryStats.earliestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    <span className="text-white/70 mx-1">→</span>
                    {summaryStats.latestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </>
                ) : (
                  <span className="text-sm text-white/70">{t("employee_orders.no_data", "No data")}</span>
                )}
              </p>
              <p className="text-xs text-white/70 mt-1">{t("employee_orders.activity_period", "activity period")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Orders List */}
      {!orders || orders.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-zinc-900 dark:text-zinc-50">
            {t("employee_orders.no_completed_title", "No Completed Orders")}
          </h3>
          <p className="text-sm text-zinc-500">
            {t("employee_orders.no_completed_desc", "This employee hasn't completed any orders yet.")}
          </p>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {orders.map((order) => (
              <Card
                key={order.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-[#168BB0] dark:hover:border-[#168BB0]"
                onClick={() => router.push(`/a/orders/${order.orderId}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* URL with external link */}
                    <div className="flex items-center gap-2 mb-2">
                      <a
                        href={order.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-zinc-900 dark:text-zinc-50 hover:text-[#168BB0] dark:hover:text-[#168BB0] truncate flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {order.url}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </div>

                    {/* Order Details */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {order.businessName && (
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {order.businessName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                          {formatOrderType(order.orderType)}
                        </span>
                        × {order.quantity}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {t("employee_orders.completed_at", "Completed:")} {formatDate(order.completedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold border border-green-200 dark:border-green-800/30">
                      ✓ {t("status.completed", "COMPLETED")}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {orders.length > 0 && (
            <div className="flex items-center justify-between bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                {totalPages > 1
                  ? t("pagination.page_of", { page: currentPage, total: totalPages, defaultValue: `Page ${currentPage} of ${totalPages}` })
                  : `${totalCount} ${totalCount !== 1 ? t("orders.orders", "orders") : t("orders.order", "order")}`}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPrevPage}
                  disabled={currentPage === 1}
                  className="h-8 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
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
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`min-w-[32px] h-8 rounded text-sm font-medium transition-colors cursor-pointer ${
                          currentPage === pageNum
                            ? "bg-[#168BB0] text-white"
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="h-8 cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <select
                  value={itemsPerPage}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleItemsPerPageChange(Number(e.target.value))}
                  className="h-8 border border-zinc-300 dark:border-zinc-600 rounded px-2 text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none"
                >
                  <option value="10">10 / {t("pagination.page", "page")}</option>
                  <option value="20">20 / {t("pagination.page", "page")}</option>
                  <option value="50">50 / {t("pagination.page", "page")}</option>
                  <option value="100">100 / {t("pagination.page", "page")}</option>
                </select>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
