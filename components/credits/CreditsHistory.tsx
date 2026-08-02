"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Eye } from "lucide-react";
import { formatDateShort, formatTime } from "@/lib/dateUtils";

interface CreditsHistoryProps {
  userId?: string;
  limit?: number;
  showViewAll?: boolean;
  compact?: boolean;
}

export function CreditsHistory({
  userId,
  limit = 10,
  showViewAll = true,
  compact = false,
}: CreditsHistoryProps) {
  const { t } = useTranslation("credits");
  const { user } = useAuth();
  const { error } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [userId]);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const { getCreditsHistoryAction } = await import("@/app/actions/credits");
      const res = await getCreditsHistoryAction(userId, limit);

      if (res.success && res.data) {
        setTransactions(res.data);
      } else {
        error(res.error || t("failed_to_load_transactions", "Failed to load transactions"));
      }
    } catch (err) {
      error(t("failed_to_load_transactions", "Failed to load transactions"));
    } finally {
      setIsLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "PURCHASE":
      case "ADMIN_ADJUST":
        return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case "SPEND":
        return <ArrowDownLeft className="h-4 w-4 text-red-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-[#168BB0]" />;
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

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#168BB0]"></div>
        </div>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="text-4xl mb-3">📋</div>
        <p className="text-zinc-500">{t("no_transactions_yet", "No transactions yet")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <Card key={transaction.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                {getTransactionIcon(transaction.type)}
              </div>
              <div>
                <h4 className={`font-medium ${compact ? 'text-sm' : ''}`}>
                  {transaction.description}
                </h4>
                <p className="text-xs text-zinc-500">
                  {formatDateShort(transaction.createdAt)} {
                    !compact && t("at_time", " at {{time}}", { time: formatTime(transaction.createdAt) })
                  }
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className={`font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatAmount(transaction.amount)}
              </div>
              <Badge className={getBadgeColor(transaction.type)}>
                {transaction.type.replace("_", " ")}
              </Badge>
              {transaction.balanceAfter !== undefined && !compact && (
                <p className="text-xs text-zinc-500 mt-1">
                  {t("balance_label", "Balance: {{balance}}", { balance: transaction.balanceAfter })}
                </p>
              )}
            </div>
          </div>
        </Card>
      ))}

      {showViewAll && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.location.href = '/wallet/transactions'}
        >
          <Eye className="h-4 w-4 mr-2" />
          {t("view_all_transactions", "View All Transactions")}
        </Button>
      )}
    </div>
  );
}
