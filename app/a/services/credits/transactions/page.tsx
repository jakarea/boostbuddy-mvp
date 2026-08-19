"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, List, Search, Filter, Download, RefreshCw, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { formatDateTime } from "@/lib/dateUtils";
import { devLog } from "@/lib/utils/devLog";

export default function AdminTransactionsPage() {
  const router = useRouter();
  const { t } = useTranslation("credits_admin");
  const { error } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    userSearch: "",
    type: "all",
    dateFrom: "",
    dateTo: "",
  });

  // Memoize filter changes to prevent unnecessary re-renders
  const filterValue = useMemo(() => JSON.stringify(filters), [filters]);

  // Debounced search to prevent rapid API calls
  const [debouncedSearch, setDebouncedSearch] = useState(filters.userSearch);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.userSearch);
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [filters.userSearch]);

  // Define loadTransactions with useCallback to prevent stale closures
  const loadTransactions = useCallback(async () => {
    try {
      devLog("🔍 [UI] Loading transactions with filters:", filters);
      // Only show loading spinner on initial load, not on filter changes
      if (transactions.length === 0) {
        setIsLoading(true);
      }
      const { getAllCreditTransactionsAction } = await import("@/app/actions/credits");

      const filterData: any = {};
      if (debouncedSearch.trim()) filterData.userSearch = debouncedSearch.trim();
      if (filters.type !== "all") filterData.type = filters.type;
      if (filters.dateFrom) filterData.dateFrom = filters.dateFrom;
      if (filters.dateTo) filterData.dateTo = filters.dateTo;

      devLog("🔍 [UI] Calling getAllCreditTransactionsAction with:", filterData);
      const res = await getAllCreditTransactionsAction(
        Object.keys(filterData).length > 0 ? filterData : undefined
      );
      devLog("🔍 [UI] Response:", res);

      if (res.success && res.data) {
        devLog("🔍 [UI] Setting transactions:", res.data.length, "items");
        // Normalize data from snake_case to camelCase
        const normalized = res.data.map((tr: any) => ({
          id: tr.id,
          userId: tr.user_id,
          amount: tr.amount,
          balanceAfter: tr.balance_after,
          type: tr.type,
          description: tr.description,
          referenceId: tr.reference_id,
          metadata: tr.metadata,
          createdAt: tr.created_at
        }));
        devLog("🔍 [UI] Normalized transactions:", normalized.length, "items");
        setTransactions(normalized);
      } else {
        console.error("🔍 [UI] Failed to load:", res);
        error(res.error || t("error_failed_load", "Failed to load transactions"));
      }
    } catch (err) {
      console.error("🔍 [UI] Exception:", err);
      error(t("error_failed_load", "Failed to load transactions"));
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, filters.type, filters.dateFrom, filters.dateTo, transactions.length, error, t]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "PURCHASE":
      case "ADMIN_ADJUST":
        return <ArrowUpRight className="h-5 w-5 text-green-500" />;
      case "SPEND":
        return <ArrowDownLeft className="h-5 w-5 text-red-500" />;
      default:
        return <RefreshCw className="h-5 w-5 text-[#168BB0]" />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "PURCHASE":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "SPEND":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      case "ADMIN_ADJUST":
        return "bg-[#168BB0]/10 text-[#168BB0] dark:text-[#45B0D2] border-[#168BB0]/20";
      default:
        return "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20";
    }
  };

  const formatAmount = (amount: number) => {
    return amount > 0 ? `+${amount}` : `${amount}`;
  };

  const exportToCSV = () => {
    if (transactions.length === 0) return;

    const headers = [
      t("csv_id", "ID"),
      t("csv_user_id", "User ID"),
      t("csv_type", "Type"),
      t("csv_amount", "Amount"),
      t("csv_balance_after", "Balance After"),
      t("csv_description", "Description"),
      t("csv_date", "Date"),
    ];
    const rows = transactions.map(tr => [
      tr.id,
      tr.userId,
      tr.type,
      tr.amount,
      tr.balanceAfter || "",
      tr.description,
      new Date(tr.createdAt).toISOString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `credits-transactions-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/a/services/credits")}
                aria-label={t("back_to_credits", "Back to Credits")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#168BB0]/10 rounded-lg">
                  <List className="h-6 w-6 text-[#168BB0]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {t("transactions_title", "Credits Transactions")}
                  </h1>
                  <p className="text-sm text-zinc-500">
                    {t("transactions_subtitle", "View all credit transactions across the platform")}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadTransactions}
                aria-label={t("refresh", "Refresh")}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={transactions.length === 0}
              >
                <Download className="h-4 w-4" />
                {t("export", "Export")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content*/}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-zinc-500" />
            <h3 className="font-semibold">{t("filters", "Filters")}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="filter-user-search">{t("label_user_search", "User Search")}</Label>
              <Input
                id="filter-user-search"
                placeholder={t("placeholder_search_user", "Search by name or email...")}
                value={filters.userSearch}
                onChange={(e) => setFilters({ ...filters, userSearch: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="filter-transaction-type">{t("label_transaction_type", "Transaction Type")}</Label>
              <select
                id="filter-transaction-type"
                className="w-full px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="all">{t("filter_all_types", "All Types")}</option>
                <option value="PURCHASE">{t("filter_purchases", "Purchases")}</option>
                <option value="SPEND">{t("filter_spent", "Spent")}</option>
                <option value="ADMIN_ADJUST">{t("filter_admin_adjustments", "Admin Adjustments")}</option>
              </select>
            </div>

            <div>
              <Label htmlFor="filter-date-from">{t("label_date_from", "Date From")}</Label>
              <Input
                id="filter-date-from"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="filter-date-to">{t("label_date_to", "Date To")}</Label>
              <Input
                id="filter-date-to"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* Transactions List */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="bb-loading">
              <span></span><span></span><span></span><span></span>
              <span className="bb-center"></span>
              <span></span><span></span><span></span><span></span>
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold mb-2">{t("no_transactions_title", "No Transactions Found")}</h3>
            <p className="text-zinc-500">
              {t("no_transactions_desc", "Try adjusting your filters or check back later.")}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <Card key={transaction.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                      {getTransactionIcon(transaction.type)}
                    </div>

                    {/* Details */}
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {transaction.description}
                      </h3>
                      <p className="text-sm text-zinc-500">
                        {t("user_id_label", "User ID: {{userId}}", { userId: transaction.userId })}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {formatDateTime(transaction.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Amount & Badge */}
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      transaction.amount > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}>
                      {formatAmount(transaction.amount)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getBadgeColor(transaction.type)}>
                        {transaction.type.replace("_", " ")}
                      </Badge>
                      {transaction.balanceAfter !== undefined && (
                        <span className="text-sm text-zinc-500">
                          {t("balance_label", "Balance: {{balance}}", { balance: transaction.balanceAfter })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reference & Metadata */}
                {(transaction.referenceId || transaction.metadata) && (
                  <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    {transaction.referenceId && (
                      <p className="text-sm text-zinc-500">
                        {t("reference_label", "Reference: {{reference}}", { reference: transaction.referenceId })}
                      </p>
                    )}
                    {transaction.metadata && (
                      <p className="text-xs text-zinc-400 mt-1">
                        {t("metadata_label", "Metadata: {{metadata}}", { metadata: transaction.metadata })}
                      </p>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
