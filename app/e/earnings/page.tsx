"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getEmployeeEarningsAction,
  getEmployeeEarningsByTypeAction,
  getEmployeeEarningsHistoryAction,
  requestPayoutAction,
  updatePayoutDetailsAction
} from "@/app/actions/employee-earnings";
import { useToast } from "@/context/ToastContext";
import { useTranslation } from "react-i18next";

interface EarningsData {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
  currentPeriodEarned: number;
  status: "ACTIVE" | "FROZEN" | "BANNED";
  payoutMethod?: string;
  payoutDetails?: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export default function EmployeeEarningsPage() {
  const { t } = useTranslation();
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [byType, setByType] = useState<Record<string, number>>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showPaymentSettings, setShowPaymentSettings] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("BANK");
  const [paymentDetails, setPaymentDetails] = useState("");

  const { success: toastSuccess, error: toastError } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      console.log("Loading earnings data...");
      const [earningsRes, byTypeRes, historyRes] = await Promise.all([
        getEmployeeEarningsAction(),
        getEmployeeEarningsByTypeAction(),
        getEmployeeEarningsHistoryAction(50)
      ]);

      console.log("Earnings response:", earningsRes);
      console.log("ByType response:", byTypeRes);
      console.log("History response:", historyRes);

      if (earningsRes.success && earningsRes.data) {
        setEarnings(earningsRes.data);
        setPaymentMethod(earningsRes.data.payoutMethod || "BANK");
        setPaymentDetails(earningsRes.data.payoutDetails || "");
      } else {
        console.error("Earnings failed:", earningsRes.error);
      }

      if (byTypeRes.success && byTypeRes.data) {
        setByType(byTypeRes.data);
      } else {
        console.error("ByType failed:", byTypeRes.error);
      }

      if (historyRes.success && historyRes.data) {
        setTransactions(historyRes.data);
      } else {
        console.error("History failed:", historyRes.error);
      }
    } catch (error) {
      console.error("Failed to load earnings:", error);
      toastError(t("employee_earnings.loading_failed", "Failed to load earnings data"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRequestPayout = async () => {
    if (payoutAmount <= 0) {
      toastError(t("employee_earnings.valid_amount", "Please enter a valid amount"));
      return;
    }

    if (!earnings || payoutAmount > earnings.balance) {
      toastError(t("employee_earnings.amount_exceeds_balance", "Amount cannot exceed available balance (€{{balance}})", { balance: earnings?.balance || 0 }));
      return;
    }

    if (!earnings.payoutMethod || !earnings.payoutDetails) {
      toastError(t("employee_earnings.setup_payment_method", "Please set up your payment method first"));
      setShowPaymentSettings(true);
      return;
    }

    try {
      const result = await requestPayoutAction(payoutAmount);

      if (result.success) {
        toastSuccess(t("employee_earnings.payout_success", "Payout request for €{{amount}} submitted successfully!", { amount: payoutAmount }));
        setPayoutAmount(0);
        loadData();
      } else {
        toastError(result.error || t("employee_earnings.payout_failed", "Failed to request payout"));
      }
    } catch (error) {
      console.error("Payout request error:", error);
      toastError(t("employee_earnings.payout_failed", "Failed to request payout"));
    }
  };

  const handleUpdatePaymentDetails = async () => {
    if (!paymentDetails.trim()) {
      toastError(t("employee_earnings.payment_details_required", "Payment details are required"));
      return;
    }

    try {
      const result = await updatePayoutDetailsAction(
        paymentMethod as "BANK" | "PAYPAL" | "CRYPTO" | "OTHER",
        paymentDetails.trim()
      );

      if (result.success) {
        toastSuccess(t("employee_earnings.payment_details_updated", "Payment details updated successfully!"));
        setShowPaymentSettings(false);
        loadData();
      } else {
        toastError(result.error || t("employee_earnings.update_payment_details_failed", "Failed to update payment details"));
      }
    } catch (error) {
      console.error("Update payment details error:", error);
      toastError(t("employee_earnings.update_payment_details_failed", "Failed to update payment details"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!earnings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">{t("employee_earnings.failed_to_load", "Failed to load earnings data")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("employee_earnings.title", "My Earnings")}</h1>
        <Button
          onClick={() => setShowPaymentSettings(!showPaymentSettings)}
          variant="outline"
        >
          {showPaymentSettings ? t("employee_earnings.hide_payment_settings", "Hide") : t("employee_earnings.show_payment_settings", "Show")} {t("employee_earnings.payment_settings", "Payment Settings")}
        </Button>
      </div>

      {/* Payment Settings Panel */}
      {showPaymentSettings && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">{t("employee_earnings.payment_settings", "Payment Settings")}</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="paymentMethod">{t("employee_earnings.payment_method", "Payment Method")}</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value || "BANK")}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("employee_earnings.select_payment_method", "Select payment method")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK">{t("employee_earnings.bank_transfer", "Bank Transfer")}</SelectItem>
                  <SelectItem value="PAYPAL">{t("employee_earnings.paypal", "PayPal")}</SelectItem>
                  <SelectItem value="CRYPTO">{t("employee_earnings.crypto", "Crypto")}</SelectItem>
                  <SelectItem value="OTHER">{t("employee_earnings.other", "Other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="paymentDetails">
                {paymentMethod === "BANK" && t("employee_earnings.bank_details", "Bank Details (IBAN, BIC, Account Number)")}
                {paymentMethod === "PAYPAL" && t("employee_earnings.paypal_email", "PayPal Email Address")}
                {paymentMethod === "CRYPTO" && t("employee_earnings.crypto_wallet", "Crypto Wallet Address")}
                {paymentMethod === "OTHER" && t("employee_earnings.other_details", "Payment Details")}
              </Label>
              <Input
                id="paymentDetails"
                value={paymentDetails}
                onChange={(e) => setPaymentDetails(e.target.value)}
                placeholder={
                  paymentMethod === "BANK"
                    ? t("employee_earnings.placeholder_bank", "Enter your IBAN or bank account details")
                    : paymentMethod === "PAYPAL"
                    ? t("employee_earnings.placeholder_paypal", "Enter your PayPal email")
                    : paymentMethod === "CRYPTO"
                    ? t("employee_earnings.placeholder_crypto", "Enter your wallet address")
                    : t("employee_earnings.placeholder_other", "Enter your payment details")
                }
              />
            </div>

            <Button onClick={handleUpdatePaymentDetails}>
              {t("employee_earnings.save_payment_details", "Save Payment Details")}
            </Button>
          </div>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">{t("employee_earnings.total_earned", "Total Earned")}</h3>
          <p className="text-2xl font-bold">€{earnings.totalEarned.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">{t("employee_earnings.all_time", "All time")}</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">{t("employee_earnings.current_period", "Current Period")}</h3>
          <p className="text-2xl font-bold">€{earnings.currentPeriodEarned.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">{t("employee_earnings.cumulative", "Cumulative")}</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">{t("employee_earnings.wallet_balance", "Wallet Balance")}</h3>
          <p className="text-2xl font-bold">€{earnings.balance.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">{t("employee_earnings.available_for_payout", "Available for payout")}</p>
        </Card>
      </div>

      {/* Payout Request */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">{t("employee_earnings.request_payout", "Request Payout")}</h2>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="payoutAmount">{t("employee_earnings.amount", "Amount (€)")}</Label>
            <Input
              id="payoutAmount"
              type="number"
              min="0"
              max={earnings.balance}
              step="0.01"
              value={payoutAmount || ""}
              onChange={(e) => setPayoutAmount(parseFloat(e.target.value) || 0)}
              placeholder={t("employee_earnings.enter_amount", "Enter amount")}
            />
            <p className="text-xs text-gray-500 mt-1">
              {t("employee_earnings.available", "Available")}: €{earnings.balance.toFixed(2)}
            </p>
          </div>
          <Button
            onClick={handleRequestPayout}
            disabled={payoutAmount <= 0 || payoutAmount > earnings.balance}
          >
            {t("employee_earnings.request_payout_button", "Request Payout")}
          </Button>
        </div>
      </Card>

      {/* Earnings by Type */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">{t("employee_earnings.earnings_by_type", "Earnings by Review Type")}</h2>
        {Object.keys(byType).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(byType).map(([type, amount]) => (
              <div key={type} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="font-medium">{type}</span>
                <span className="font-bold">€{amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">{t("employee_earnings.no_earnings", "No earnings yet")}</p>
        )}
      </Card>

      {/* Transaction History */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">{t("employee_earnings.transaction_history", "Transaction History")}</h2>
        {transactions.length > 0 ? (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex justify-between items-center p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">{tx.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(tx.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-bold ${
                      tx.amount > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {tx.amount > 0 ? "+" : ""}€{tx.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t("employee_earnings.balance_after", "Balance: €{{balance}}", { balance: tx.balanceAfter.toFixed(2) })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">{t("employee_earnings.no_transactions", "No transactions yet")}</p>
        )}
      </Card>
    </div>
  );
}
