"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getWalletSummaryAction } from "@/app/actions/credits";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Wallet, ArrowUpLeft, Plus, History, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { formatDateTime } from "@/lib/dateUtils";

interface Transaction {
  id: string;
  amount: number;
  balanceAfter: number;
  type: string;
  description: string;
  createdAt: string;
}

export default function WalletPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { error } = useToast();

  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const result = await getWalletSummaryAction(10); // Get last 10 transactions

        if (result.success && result.balance !== undefined) {
          setBalance(result.balance);
        }

        if (result.success && result.data) {
          setTransactions(result.data);
        }
      } catch (err) {
        error("Failed to load wallet data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link href="/c/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowUpLeft className="h-4 w-4" />
                {t("wallet.backToDashboard", "Back to Dashboard")}
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#168BB0]/10 rounded-lg">
                <Wallet className="h-6 w-6 text-[#168BB0]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {t("wallet.title", "My Wallet")}
                </h1>
                <p className="text-sm text-zinc-500">
                  {t("wallet.subtitle", "Manage your credits and view transaction history")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Balance Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              {/* Balance Card */}
              <Card className="bg-gradient-to-br from-[#168BB0] to-[#0F7493] text-white p-6 shadow-lg">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-white/80">
                      {t("wallet.currentBalance", "Current Balance")}
                    </p>
                    <p className="text-4xl font-bold">{balance}</p>
                    <p className="text-sm text-white/60">
                      {t("credits.credits", "credits")}
                    </p>
                  </div>

                  <div className="h-px bg-white/20"></div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/80">{t("wallet.status", "Status")}</span>
                      <span className="font-medium">
                        {balance > 0 ? t("wallet.active", "Active") : t("wallet.empty", "Empty")}
                      </span>
                    </div>
                  </div>

                  <Link href="/c/wallet/top-up">
                    <Button className="w-full bg-white text-[#168BB0] hover:bg-white/90 font-medium">
                      <Plus className="h-4 w-4 mr-2" />
                      {t("wallet.topUp", "Top Up Credits")}
                    </Button>
                  </Link>
                </div>
              </Card>

              {/* Quick Stats */}
              <div className="mt-6 bg-white dark:bg-zinc-800 rounded-lg p-4 shadow">
                <h3 className="font-semibold mb-3 text-sm">{t("wallet.summary", "Summary")}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">{t("wallet.totalEarned", "Total Earned")}</span>
                    <span className="font-medium">
                      {transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">{t("wallet.totalSpent", "Total Spent")}</span>
                    <span className="font-medium">
                      {Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">{t("wallet.totalTransactions", "Transactions")}</span>
                    <span className="font-medium">{transactions.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Transaction History */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow">
              <div className="p-6 border-b dark:border-zinc-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{t("wallet.transactionHistory", "Transaction History")}</h3>
                  <History className="h-5 w-5 text-zinc-400" />
                </div>
              </div>

              {transactions.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  <Wallet className="h-12 w-12 mx-auto mb-4 text-zinc-300" />
                  <p className="font-medium">{t("wallet.noTransactions", "No transactions yet")}</p>
                  <p className="text-sm mt-1">{t("wallet.noTransactionsDesc", "Start by purchasing credits")}</p>
                  <Link href="/c/wallet/top-up" className="mt-4 inline-flex items-center gap-2 text-[#168BB0] hover:underline font-medium">
                    {t("wallet.purchaseCredits", "Purchase Credits")}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <div className="divide-y dark:divide-zinc-700">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-zinc-500">
                            {formatDateTime(transaction.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {t("wallet.balanceAfter", "Balance")}: {transaction.balanceAfter}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded ${
                          transaction.type === 'PURCHASE' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                          transaction.type === 'SPEND' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                          'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-400'
                        }`}>
                          {transaction.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
