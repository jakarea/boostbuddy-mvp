"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  getEarningRulesAction,
  createEarningRuleAction,
  updateEarningRuleAction,
  deleteEarningRuleAction,
  toggleEarningRuleAction
} from "@/app/actions/admin-earnings";
import { useToast } from "@/context/ToastContext";
import { useTranslation } from "react-i18next";

interface EarningRule {
  id: string;
  orderType: string;
  reviewType: string | null;
  reactionType: string | null;
  paymentAmount: number;
  currency: string;
  isActive: boolean;
  priority: number;
}

const ORDER_TYPES = [
  { value: "REVIEW", label: "Review" },
  { value: "COMMENT", label: "Comment / Reaction" },
  { value: "COMMENT_WITH_PHOTO", label: "Review with Photo" }
];

const REVIEW_TYPES = [
  { value: "FACEBOOK", label: "Facebook" },
  { value: "GOOGLE", label: "Google" },
  { value: "TRUSTPILOT", label: "Trustpilot" },
  { value: "YELP", label: "Yelp" },
  { value: "AMAZON", label: "Amazon" },
  { value: null, label: "All Platforms" }
];

export default function PaymentRulesPage() {
  const { t } = useTranslation();
  const [rules, setRules] = useState<EarningRule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<EarningRule | null>(null);
  const [loading, setLoading] = useState(true);
  const { success: toastSuccess, error: toastError } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    orderType: "REVIEW",
    reviewType: null as string | null,
    reactionType: null as string | null,
    paymentAmount: 0,
    currency: "EUR",
    priority: 0
  });

  const loadRules = async () => {
    setLoading(true);
    try {
      const result = await getEarningRulesAction();

      if (result.success && result.data) {
        setRules(result.data);
      } else {
        toastError(result.error || t("admin_earnings.save_failed", "Failed to save payment rule"));
      }
    } catch (error) {
      console.error("Failed to load rules:", error);
      toastError(t("admin_earnings.save_failed", "Failed to save payment rule"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleSubmit = async () => {
    if (formData.paymentAmount <= 0) {
      toastError(t("admin_earnings.amount_must_be_positive", "Payment amount must be greater than 0"));
      return;
    }

    try {
      let result;

      if (editingRule) {
        result = await updateEarningRuleAction(editingRule.id, {
          orderType: formData.orderType as any,
          reviewType: formData.reviewType || undefined,
          reactionType: formData.reactionType || undefined,
          paymentAmount: formData.paymentAmount,
          currency: formData.currency,
          priority: formData.priority
        });
      } else {
        result = await createEarningRuleAction({
          orderType: formData.orderType as any,
          reviewType: formData.reviewType || undefined,
          reactionType: formData.reactionType || undefined,
          paymentAmount: formData.paymentAmount,
          currency: formData.currency,
          priority: formData.priority
        });
      }

      if (result.success) {
        toastSuccess(
          editingRule
            ? t("admin_earnings.update_success", "Payment rule updated successfully")
            : t("admin_earnings.save_success", "Payment rule created successfully")
        );
        setShowForm(false);
        setEditingRule(null);
        resetForm();
        loadRules();
      } else {
        toastError(result.error || t("admin_earnings.save_failed", "Failed to save payment rule"));
      }
    } catch (error) {
      console.error("Failed to save rule:", error);
      toastError(t("admin_earnings.save_failed", "Failed to save payment rule"));
    }
  };

  const handleToggleActive = async (ruleId: string) => {
    try {
      const result = await toggleEarningRuleAction(ruleId);

      if (result.success) {
        toastSuccess(t("admin_earnings.status_updated", "Payment rule status updated"));
        loadRules();
      } else {
        toastError(result.error || t("admin_earnings.update_status_failed", "Failed to update status"));
      }
    } catch (error) {
      console.error("Failed to toggle rule:", error);
      toastError(t("admin_earnings.update_status_failed", "Failed to update status"));
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm(t("admin_earnings.delete_confirm", "Are you sure you want to delete this payment rule?"))) {
      return;
    }

    try {
      const result = await deleteEarningRuleAction(ruleId);

      if (result.success) {
        toastSuccess(t("admin_earnings.delete_success", "Payment rule deleted successfully"));
        loadRules();
      } else {
        toastError(result.error || t("admin_earnings.delete_failed", "Failed to delete rule"));
      }
    } catch (error) {
      console.error("Failed to delete rule:", error);
      toastError(t("admin_earnings.delete_failed", "Failed to delete rule"));
    }
  };

  const handleEdit = (rule: EarningRule) => {
    setEditingRule(rule);
    setFormData({
      orderType: rule.orderType,
      reviewType: rule.reviewType,
      reactionType: rule.reactionType,
      paymentAmount: rule.paymentAmount,
      currency: rule.currency,
      priority: rule.priority
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      orderType: "REVIEW",
      reviewType: null,
      reactionType: null,
      paymentAmount: 0,
      currency: "EUR",
      priority: 0
    });
    setEditingRule(null);
  };

  const openNewForm = () => {
    resetForm();
    setShowForm(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-EU", {
      style: "currency",
      currency: formData.currency || "EUR"
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("admin_earnings.title", "Payment Rules Configuration")}</h1>
        <Button onClick={openNewForm}>{t("admin_earnings.add_new_rule", "+ Add New Rule")}</Button>
      </div>

      {/* Info Card */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>{t("admin_earnings.how_it_works", "How it works:")}</strong> {t("admin_earnings.how_it_works_desc", "When an employee completes an order, the system finds the applicable payment rule based on order type, review platform, and priority. Higher priority rules are checked first. Rules with \"All Platforms\" apply as fallbacks.")}
        </p>
      </Card>

      {/* Form */}
      {showForm && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingRule ? t("admin_earnings.edit_payment_rule", "Edit Payment Rule") : t("admin_earnings.create_payment_rule", "Create New Payment Rule")}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="orderType">{t("admin_earnings.order_type", "Order Type *")}</Label>
              <Select
                value={formData.orderType}
                onValueChange={(value) =>
                  setFormData({ ...formData, orderType: value || "REVIEW" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reviewType">{t("admin_earnings.review_type", "Review Platform")}</Label>
              <Select
                value={formData.reviewType || "all"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    reviewType: (value === "all" || !value) ? null : value
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_TYPES.map((type) => (
                    <SelectItem key={type.value || "all"} value={type.value || "all"}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {t("admin_earnings.select_all_platforms", "Select \"All Platforms\" for this rule to apply to any platform")}
              </p>
            </div>

            <div>
              <Label htmlFor="paymentAmount">{t("admin_earnings.payment_amount", "Payment Amount (€) *")}</Label>
              <Input
                id="paymentAmount"
                type="number"
                min="0.01"
                step="0.01"
                value={formData.paymentAmount || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    paymentAmount: parseFloat(e.target.value) || 0
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="priority">{t("admin_earnings.priority", "Priority")}</Label>
              <Input
                id="priority"
                type="number"
                min="0"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: parseInt(e.target.value) || 0
                  })
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                {t("admin_earnings.priority_hint", "Higher priority rules are checked first (0 = lowest)")}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              {t("admin_earnings.cancel", "Cancel")}
            </Button>
            <Button onClick={handleSubmit}>
              {editingRule ? t("admin_earnings.update_rule", "Update") : t("admin_earnings.create_rule", "Create")} {t("admin_earnings.create_rule", "Rule")}
            </Button>
          </div>
        </Card>
      )}

      {/* Rules List */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">{t("admin_earnings.current_payment_rules", "Current Payment Rules")}</h2>

        {rules.length === 0 ? (
          <p className="text-gray-500">{t("admin_earnings.no_payment_rules", "No payment rules configured yet")}</p>
        ) : (
          <div className="space-y-3">
            {rules
              .sort((a, b) => b.priority - a.priority)
              .map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{rule.orderType}</Badge>
                      <Badge variant="secondary">
                        {rule.reviewType || t("admin_reviews.all_types", "All Platforms")}
                      </Badge>
                      <Badge
                        variant={rule.isActive ? "default" : "secondary"}
                      >
                        {rule.isActive ? t("admin_earnings.active", "Active") : t("admin_earnings.inactive", "Inactive")}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {t("admin_earnings.priority_label", "Priority: {{priority}}", { priority: rule.priority })}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(rule.paymentAmount)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={() => handleToggleActive(rule.id)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(rule)}
                    >
                      {t("admin_earnings.edit", "Edit")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(rule.id)}
                    >
                      {t("admin_earnings.delete", "Delete")}
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>

      {/* Examples */}
      <Card className="p-6 bg-gray-50">
        <h2 className="text-lg font-semibold mb-4">{t("admin_earnings.example_setup", "Example Rule Setup")}</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between p-2 bg-white rounded">
            <span>{t("admin_earnings.facebook_review", "Facebook Review (Priority 10)")}</span>
            <span className="font-bold">€5.00</span>
          </div>
          <div className="flex justify-between p-2 bg-white rounded">
            <span>{t("admin_earnings.facebook_comment", "Facebook Comment (Priority 10)")}</span>
            <span className="font-bold">€2.00</span>
          </div>
          <div className="flex justify-between p-2 bg-white rounded">
            <span>{t("admin_earnings.any_review", "Any Review (Priority 1) - Fallback")}</span>
            <span className="font-bold">€3.00</span>
          </div>
          <div className="flex justify-between p-2 bg-white rounded">
            <span>{t("admin_earnings.any_comment", "Any Comment (Priority 1) - Fallback")}</span>
            <span className="font-bold">€1.50</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {t("admin_earnings.example_description", "For a Facebook Review, Priority 10 rule applies (€5.00). For a Google Review, Priority 1 fallback applies (€3.00).")}
        </p>
      </Card>
    </div>
  );
}
