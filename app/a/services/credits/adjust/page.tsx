"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Settings, Search, Plus, Minus, RefreshCw, CheckCircle2, User } from "lucide-react";

export default function AdjustCreditsPage() {
  const router = useRouter();
  const { t } = useTranslation("credits_admin");
  const { success, error } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [formData, setFormData] = useState({
    amount: "",
    reason: "",
  });

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
      error(t("error_failed_search", "Failed to search users"));
    }
  };

  const selectUser = async (user: any) => {
    setSelectedUser(user);
    setCurrentBalance(user.creditsBalance || 0);
    setSearchResults([]);
    setUserSearch(`${user.name} (${user.email})`);
  };

  const handleAdjust = async (adjustmentType: "add" | "remove") => {
    if (!selectedUser) {
      error(t("error_select_user", "Please select a user first"));
      return;
    }

    if (!formData.amount || !formData.reason) {
      error(t("error_amount_and_reason", "Please provide amount and reason"));
      return;
    }

    const amount = parseInt(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      error(t("error_valid_amount", "Please provide a valid amount"));
      return;
    }

    const finalAmount = adjustmentType === "add" ? amount : -amount;

    // Check if removal would make balance negative
    if (adjustmentType === "remove" && currentBalance + finalAmount < 0) {
      error(t("error_cannot_remove_more", "Cannot remove more credits than user has available"));
      return;
    }

    setIsLoading(true);
    try {
      const { adminAdjustCreditsAction } = await import("@/app/actions/credits");
      const res = await adminAdjustCreditsAction({
        userId: selectedUser.id,
        amount: finalAmount,
        reason: formData.reason,
      });

      if (res.success && res.data) {
        success(t("success_adjust", "Credits adjusted successfully. New balance: {{balance}}", { balance: res.data.newBalance }));
        setCurrentBalance(res.data.newBalance);
        setFormData({ amount: "", reason: "" });
      } else {
        error(res.error || t("error_failed_adjust", "Failed to adjust credits"));
      }
    } catch (err) {
      error(t("error_failed_adjust", "Failed to adjust credits"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                <Settings className="h-6 w-6 text-[#168BB0]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {t("adjust_user_credits", "Adjust User Credits")}
                </h1>
                <p className="text-sm text-zinc-500">
                  {t("adjust_user_credits_desc", "Manually add or remove credits from user accounts")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - User Selection */}
          <div className="space-y-6">
            {/* User Search */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-zinc-500" />
                <h3 className="font-semibold">{t("select_user", "Select User")}</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="adjust-user-search">{t("search_users", "Search Users")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="adjust-user-search"
                      placeholder={t("placeholder_search", "Search by name, email, or ID...")}
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        searchUsers(e.target.value);
                      }}
                    />
                    {userSearch && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUserSearch("");
                          setSelectedUser(null);
                          setSearchResults([]);
                        }}
                      >
                        {t("clear", "Clear")}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg divide-y divide-zinc-100 dark:divide-zinc-800">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => selectUser(user)}
                        className="w-full text-left p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-zinc-500">{user.email}</div>
                        <div className="text-xs text-zinc-400 mt-1">
                          {t("balance_credits", "Balance: {{balance}} credits", { balance: user.creditsBalance || 0 })}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Selected User Info */}
            {selectedUser && (
              <Card className="p-6 bg-green-500/5 border-green-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <h3 className="font-semibold">{t("selected_user", "Selected User")}</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-500">{t("label_name", "Name:")}</span>
                    <span className="font-medium">{selectedUser.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-500">{t("label_email", "Email:")}</span>
                    <span className="font-medium">{selectedUser.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-500">{t("label_current_balance", "Current Balance:")}</span>
                    <span className="font-bold text-[#168BB0]">{t("credits_count", "{{count}} credits", { count: currentBalance })}</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Adjustment Form */}
            {selectedUser && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4">{t("adjustment_details", "Adjustment Details")}</h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="adjust-amount">{t("amount", "Amount")}</Label>
                    <Input
                      id="adjust-amount"
                      type="number"
                      min="1"
                      placeholder={t("placeholder_enter_amount", "Enter amount...")}
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      {t("amount_hint", "Positive number. Use buttons below to choose add or remove.")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="adjust-reason">{t("reason_required", "Reason (Required)")}</Label>
                    <Textarea
                      id="adjust-reason"
                      placeholder={t("placeholder_reason", "Explain why you're adjusting credits...")}
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      rows={3}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={() => handleAdjust("add")}
                      disabled={isLoading || !formData.amount || !formData.reason}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {isLoading ? t("processing", "Processing...") : t("add_credits", "Add Credits")}
                    </Button>
                    <Button
                      onClick={() => handleAdjust("remove")}
                      disabled={isLoading || !formData.amount || !formData.reason}
                      variant="destructive"
                    >
                      <Minus className="h-4 w-4 mr-2" />
                      {isLoading ? t("processing", "Processing...") : t("remove_credits", "Remove Credits")}
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Info & Guidelines */}
          <div className="space-y-6">
            {/* How It Works */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">{t("how_it_works_title", "How Credit Adjustments Work")}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <div className="text-green-500">1.</div>
                  <div>
                    <p className="font-medium">{t("step1_title", "Search for a user")}</p>
                    <p className="text-zinc-500">{t("step1_desc", "Find by name, email, or user ID")}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="text-green-500">2.</div>
                  <div>
                    <p className="font-medium">{t("step2_title", "Select the user")}</p>
                    <p className="text-zinc-500">{t("step2_desc", "View their current balance")}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="text-green-500">3.</div>
                  <div>
                    <p className="font-medium">{t("step3_title", "Enter amount & reason")}</p>
                    <p className="text-zinc-500">{t("step3_desc", "Reason is required for audit trail")}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="text-green-500">4.</div>
                  <div>
                    <p className="font-medium">{t("step4_title", "Choose add or remove")}</p>
                    <p className="text-zinc-500">{t("step4_desc", "Cannot go below zero balance")}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="text-green-500">5.</div>
                  <div>
                    <p className="font-medium">{t("step5_title", "Confirm adjustment")}</p>
                    <p className="text-zinc-500">{t("step5_desc", "User gets notified automatically")}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Important Notes */}
            <Card className="p-6 bg-yellow-500/5 border-yellow-500/20">
              <h3 className="font-semibold mb-4 text-yellow-700 dark:text-yellow-400">
                {t("important_notes_title", "⚠️ Important Notes")}
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span>•</span>
                  <span>{t("note1", "All adjustments are logged for audit purposes")}</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>{t("note2", "Users receive Telegram notification of adjustments")}</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>{t("note3", "Cannot remove more credits than available balance")}</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>{t("note4", "Reason is mandatory and visible to user")}</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>{t("note5", "Consider documenting refund/compensation reasons")}</span>
                </li>
              </ul>
            </Card>

            {/* Recent Adjustments */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{t("recent_adjustments", "Recent Adjustments")}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/a/services/credits/transactions")}
                >
                  {t("view_all", "View All")}
                </Button>
              </div>
              <div className="text-center py-4 text-sm text-zinc-500">
                {t("recent_adjustments_hint", "View recent ADMIN_ADJUST transactions in full history")}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
