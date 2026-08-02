"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownLeft, User } from "lucide-react";
import { formatDateTime } from "@/lib/dateUtils";

interface TransactionsTableProps {
  transactions: any[];
  onRefresh?: () => void;
}

export function TransactionsTable({ transactions, onRefresh }: TransactionsTableProps) {
  const { t } = useTranslation("admin_reviews");

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "PURCHASE":
      case "ADMIN_ADJUST":
        return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case "SPEND":
        return <ArrowDownLeft className="h-4 w-4 text-red-500" />;
      default:
        return <ArrowUpRight className="h-4 w-4 text-[#168BB0]" />;
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

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-xl font-semibold mb-2">{t("transactions.empty_title", "No Transactions Found")}</h3>
        <p className="text-zinc-500">
          {t("transactions.empty_subtitle", "No credit transactions match the current filters.")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            {/* Left Side */}
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                {getTransactionIcon(transaction.type)}
              </div>

              {/* Details */}
              <div>
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {transaction.description}
                </h4>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <User className="h-3 w-3" />
                    <span>{transaction.userId}</span>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {formatDateTime(transaction.createdAt)}
                  </span>
                </div>
                {transaction.metadata && (
                  <div className="text-xs text-zinc-400 mt-1">
                    {t("transactions.metadata", { value: transaction.metadata, defaultValue: "Metadata: {{value}}" })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side */}
            <div className="text-right">
              <div className={`text-2xl font-bold ${
                transaction.amount > 0 ? "text-green-600" : "text-red-600"
              }`}>
                {formatAmount(transaction.amount)}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getBadgeColor(transaction.type)}>
                  {transaction.type.replace("_", " ")}
                </Badge>
                {transaction.balanceAfter !== undefined && (
                  <span className="text-sm text-zinc-500">
                    {t("transactions.balance", { value: transaction.balanceAfter, defaultValue: "Balance: {{value}}" })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Reference */}
          {transaction.referenceId && (
            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-500">
                {t("transactions.reference", { value: transaction.referenceId, defaultValue: "Reference: {{value}}" })}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
