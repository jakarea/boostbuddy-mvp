"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, Filter } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/dateUtils";

export default function TransactionsPage() {
  const { user } = useAuth();
  const { error } = useToast();
  const { t } = useTranslation("wallet");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadTransactions();
  }, [filter]);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const { getCreditsHistoryAction } = await import("@/app/actions/credits");
      const res = await getCreditsHistoryAction();

      if (res.success && res.data) {
        let filtered = res.data;
        if (filter !== "all") {
          filtered = filtered.filter((t: any) => t.type === filter);
        }
        setTransactions(filtered);
      } else {
        error(res.error || t("load_failed", "Failed to load transactions"));
      }
    } catch (err) {
      error(t("load_failed", "Failed to load transactions"));
    } finally {
      setIsLoading(false);
    }
  };

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

  const getTransactionBadgeColor = (type: string) => {
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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/c/wallet">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  {t("back_to_wallet", "Back to Wallet")}
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#168BB0]/10 rounded-lg">
                  <Wallet className="h-6 w-6 text-[#168BB0]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {t("transaction_history", "Transaction History")}
                  </h1>
                  <p className="text-sm text-zinc-500">
                    {t("transaction_history_desc", "View all your credit transactions")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-500" />
              <span className="text-sm font-medium">{t("filter", "Filter:")}:</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                {t("all", "All")}
              </Button>
              <Button
                variant={filter === "PURCHASE" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("PURCHASE")}
              >
                {t("purchases", "Purchases")}
              </Button>
              <Button
                variant={filter === "SPEND" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("SPEND")}
              >
                {t("spent", "Spent")}
              </Button>
              <Button
                variant={filter === "ADMIN_ADJUST" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("ADMIN_ADJUST")}
              >
                {t("adjustments", "Adjustments")}
              </Button>
            </div>
          </div>
        </Card>

        {/* Transactions List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#168BB0] mx-auto mb-4"></div>
            <p className="text-zinc-500">{t("loading_transactions", "Loading transactions...")}</p>
          </div>
        ) : transactions.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold mb-2">{t("no_transactions_found", "No Transactions Found")}</h3>
            <p className="text-zinc-500">
              {filter === "all" ? t("no_transactions_message", "You haven't made any credit transactions yet.") : t("no_filter_transactions_message", "No {{filter}} transactions found.", { filter })}
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
                      <Badge className={getTransactionBadgeColor(transaction.type)}>
                        {t(`type.${transaction.type}`, transaction.type.replace("_", " ")) as string}
                      </Badge>
                      {transaction.balanceAfter !== undefined && (
                        <span className="text-sm text-zinc-500">
                          {t("balance_label", "Balance:")} {transaction.balanceAfter}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reference (if any) */}
                {transaction.referenceId && (
                  <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <p className="text-sm text-zinc-500">
                      {t("reference_label", "Reference:")} {transaction.referenceId}
                    </p>
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
