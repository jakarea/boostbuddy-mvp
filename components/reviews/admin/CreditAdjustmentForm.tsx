"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Search, CheckCircle2, RefreshCw } from "lucide-react";

interface CreditAdjustmentFormProps {
  onAdjustmentComplete?: () => void;
}

export function CreditAdjustmentForm({ onAdjustmentComplete }: CreditAdjustmentFormProps) {
  const { t } = useTranslation("admin_reviews");
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [isLoading, setIsLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [formData, setFormData] = useState({
    amount: "",
    reason: "",
  });
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");

  const searchUsers = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const { searchUsersForCreditsAction } = await import("@/app/actions/credits");
      const res = await searchUsersForCreditsAction(query);
      if (res.success && Array.isArray(res.data)) {
        setSearchResults(res.data);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
      error(t("adjustment.errors.search_failed", "Failed to search users"));
    }
  };

  const selectUser = (user: any) => {
    setSelectedUser(user);
    setCurrentBalance(user.creditsBalance || 0);
    setSearchResults([]);
    setUserSearch(`${user.name} (${user.email})`);
  };

  const clearSelection = () => {
    setSelectedUser(null);
    setCurrentBalance(0);
    setUserSearch("");
    setSearchResults([]);
  };

  const handleAdjust = async () => {
    if (!selectedUser) {
      error(t("adjustment.errors.select_user", "Please select a user first"));
      return;
    }

    if (!formData.amount || !formData.reason) {
      error(t("adjustment.errors.amount_reason", "Please provide amount and reason"));
      return;
    }

    const amount = parseInt(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      error(t("adjustment.errors.invalid_amount", "Please provide a valid amount"));
      return;
    }

    const finalAmount = adjustmentType === "add" ? amount : -amount;

    // Check if removal would make balance negative
    if (adjustmentType === "remove" && currentBalance + finalAmount < 0) {
      error(t("adjustment.errors.insufficient_credits", "Cannot remove more credits than user has available"));
      return;
    }

    const confirmed = await confirm({
      title: t("adjustment.confirm.title", "Confirm Credit Adjustment"),
      message: t("adjustment.confirm.message", {
        user: selectedUser.name,
        current: currentBalance,
        adjustment: `${finalAmount > 0 ? '+' : ''}${finalAmount}`,
        newBalance: currentBalance + finalAmount,
        reason: formData.reason,
        defaultValue: "User: {{user}}\nCurrent Balance: {{current}} credits\nAdjustment: {{adjustment}} credits\nNew Balance: {{newBalance}} credits\nReason: {{reason}}"
      }),
      confirmText: t("adjustment.confirm.proceed", "Yes, proceed"),
      cancelText: t("common.cancel", "Cancel"),
      confirmVariant: finalAmount < 0 ? "destructive" : "default"
    });

    if (!confirmed) return;

    setIsLoading(true);
    try {
      const { adminAdjustCreditsAction } = await import("@/app/actions/credits");
      const res = await adminAdjustCreditsAction({
        userId: selectedUser.id,
        amount: finalAmount,
        reason: formData.reason,
      });

      if (res.success && res.data) {
        success(t("adjustment.success", { balance: res.data.newBalance, defaultValue: "Credits adjusted successfully. New balance: {{balance}}" }));
        setCurrentBalance(res.data.newBalance);
        setFormData({ amount: "", reason: "" });

        if (onAdjustmentComplete) {
          onAdjustmentComplete();
        }
      } else {
        error(res.error || t("adjustment.errors.failed", "Failed to adjust credits"));
      }
    } catch (err) {
      error(t("adjustment.errors.failed", "Failed to adjust credits"));
    } finally {
      setIsLoading(false);
    }
  };

  const previewBalance = () => {
    if (!selectedUser || !formData.amount) return currentBalance;
    const amount = parseInt(formData.amount);
    if (isNaN(amount)) return currentBalance;
    const adjustment = adjustmentType === "add" ? amount : -amount;
    return currentBalance + adjustment;
  };

  const newBalance = previewBalance();

  return (
    <div className="space-y-6">
      {/* User Selection */}
      <div>
        <Label htmlFor="credit-adjust-user-search" className="text-base font-semibold">{t("adjustment.select_user", "Select User")}</Label>
        <div className="flex gap-2 mt-2">
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              <Search className="h-4 w-4" />
            </div>
            <Input
              id="credit-adjust-user-search"
              placeholder={t("adjustment.search_placeholder", "Search by name, email, or user ID...")}
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                searchUsers(e.target.value);
              }}
              className="pl-10"
            />
            {userSearch && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={clearSelection}
              >
                {t("adjustment.clear", "Clear")}
              </Button>
            )}
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-2 border border-zinc-200 dark:border-zinc-800 rounded-lg divide-y divide-zinc-100 dark:divide-zinc-800">
            {searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => selectUser(user)}
                className="w-full text-left p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-sm"
              >
                <div className="font-medium">{user.name}</div>
                <div className="text-zinc-500">{user.email}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected User Info */}
      {selectedUser && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <h3 className="font-semibold">{t("adjustment.selected_user", "Selected User")}</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-500">{t("adjustment.name_label", "Name:")}</span>
              <span className="font-medium ml-2">{selectedUser.name}</span>
            </div>
            <div>
              <span className="text-zinc-500">{t("adjustment.email_label", "Email:")}</span>
              <span className="font-medium ml-2">{selectedUser.email}</span>
            </div>
            <div className="col-span-2">
              <span className="text-zinc-500">{t("adjustment.current_balance", "Current Balance:")}</span>
              <span className="font-bold text-[#168BB0] ml-2">{t("adjustment.credits", { count: currentBalance, defaultValue: "{{count}} credits" })}</span>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Type */}
      <div>
        <Label className="text-base font-semibold">{t("adjustment.adjustment_type", "Adjustment Type")}</Label>
        <div className="flex gap-4 mt-2">
          <button
            onClick={() => setAdjustmentType("add")}
            className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
              adjustmentType === "add"
                ? "border-green-500 bg-green-500/10"
                : "border-zinc-200 dark:border-zinc-800 hover:border-green-300"
            }`}
          >
            <Plus className="h-5 w-5 text-green-500 mx-auto mb-2" />
            <div className="text-center font-medium">{t("adjustment.add_credits", "Add Credits")}</div>
          </button>
          <button
            onClick={() => setAdjustmentType("remove")}
            className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
              adjustmentType === "remove"
                ? "border-red-500 bg-red-500/10"
                : "border-zinc-200 dark:border-zinc-800 hover:border-red-300"
            }`}
          >
            <Minus className="h-5 w-5 text-red-500 mx-auto mb-2" />
            <div className="text-center font-medium">{t("adjustment.remove_credits", "Remove Credits")}</div>
          </button>
        </div>
      </div>

      {/* Amount */}
      <div>
        <Label htmlFor="amount">{t("adjustment.label_amount", "Amount")}</Label>
        <Input
          id="amount"
          type="number"
          min="1"
          placeholder={t("adjustment.placeholder_amount", "Enter amount...")}
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
        />
        <p className="text-xs text-zinc-500 mt-1">
          {t("adjustment.hint_amount", "Positive number only. Use buttons above to choose add or remove.")}
        </p>
      </div>

      {/* Reason */}
      <div>
        <Label htmlFor="reason">{t("adjustment.label_reason", "Reason (Required)")}</Label>
        <Textarea
          id="reason"
          placeholder={t("adjustment.placeholder_reason", "Explain why you're adjusting credits (e.g., 'Refund for service issue', 'Compensation for delay', 'Admin correction')")}
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          rows={3}
        />
        <p className="text-xs text-zinc-500 mt-1">
          {t("adjustment.hint_reason", "This reason is required for audit purposes and will be visible to the user.")}
        </p>
      </div>

      {/* Preview */}
      {selectedUser && formData.amount && (
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4">
          <h4 className="font-semibold mb-3">{t("adjustment.preview", "Preview")}</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">{t("adjustment.preview_current", "Current Balance:")}</span>
              <span className="font-medium">{t("adjustment.credits", { count: currentBalance, defaultValue: "{{count}} credits" })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">{t("adjustment.preview_adjustment", "Adjustment:")}</span>
              <span className={`font-medium ${adjustmentType === "add" ? "text-green-600" : "text-red-600"}`}>
                {adjustmentType === "add" ? "+" : ""}{t("adjustment.credits", { count: formData.amount, defaultValue: "{{count}} credits" })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">{t("adjustment.preview_new", "New Balance:")}</span>
              <span className={`font-bold ${newBalance > currentBalance ? "text-green-600" : "text-red-600"}`}>
                {t("adjustment.credits", { count: newBalance, defaultValue: "{{count}} credits" })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleAdjust}
        disabled={isLoading || !selectedUser || !formData.amount || !formData.reason}
        className={`w-full ${
          adjustmentType === "add"
            ? "bg-green-600 hover:bg-green-700"
            : "bg-red-600 hover:bg-red-700"
        }`}
        size="lg"
      >
        {isLoading ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            {t("adjustment.processing", "Processing...")}
          </>
        ) : (
          <>
            {adjustmentType === "add" ? (
              <Plus className="h-4 w-4 mr-2" />
            ) : (
              <Minus className="h-4 w-4 mr-2" />
            )}
            {adjustmentType === "add"
              ? t("adjustment.add_action", { amount: formData.amount, defaultValue: "Add {{amount}} Credits" })
              : t("adjustment.remove_action", { amount: formData.amount, defaultValue: "Remove {{amount}} Credits" })}
          </>
        )}
      </Button>
    </div>
  );
}
