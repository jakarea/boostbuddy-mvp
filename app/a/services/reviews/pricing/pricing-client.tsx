"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, RefreshCw } from "lucide-react";
import { updateReviewPricingAction } from "@/app/actions/reviews";

interface PricingClientProps {
  initialPricing: {
    REVIEW: number;
    COMMENT: number;
    COMMENT_WITH_PHOTO: number;
  };
}

export default function PricingClient({ initialPricing }: PricingClientProps) {
  const { t } = useTranslation("admin_reviews");
  const { success, error } = useToast();
  const router = useRouter();

  const [pricing, setPricing] = useState(initialPricing);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const results = await Promise.all([
        updateReviewPricingAction("REVIEW", pricing.REVIEW),
        updateReviewPricingAction("COMMENT", pricing.COMMENT),
        updateReviewPricingAction("COMMENT_WITH_PHOTO", pricing.COMMENT_WITH_PHOTO)
      ]);

      if (results.every(r => r.success)) {
        success(t("pricing.save_success", "Pricing updated successfully!"));
        setHasChanges(false);
      } else {
        const failed = results.find(r => !r.success);
        error(failed?.error || t("pricing.save_error", "Failed to update pricing"));
      }
    } catch (err) {
      error(t("pricing.save_error", "Failed to update pricing"));
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setPricing({ REVIEW: 15, COMMENT: 10, COMMENT_WITH_PHOTO: 20 });
    setHasChanges(true);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t("pricing.page_title", "Review Order Pricing")}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {t("pricing.page_subtitle", "Manage credit costs for each type of Facebook order")}
          </p>
        </div>
        <Button
          onClick={resetToDefaults}
          variant="outline"
          size="sm"
          className="cursor-pointer"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("pricing.reset_defaults", "Reset to Defaults")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Reviews */}
        <Card>
          <CardHeader>
            <CardTitle>{t("orders.type_reviews", "Reviews")}</CardTitle>
            <CardDescription>{t("pricing.credits_per_review", "Credits per review")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("pricing.credits_per_unit", "Credits per Unit")}</Label>
              <Input
                type="number"
                min="1"
                value={pricing.REVIEW}
                onChange={(e) => {
                  setPricing({ ...pricing, REVIEW: parseInt(e.target.value) || 1 });
                  setHasChanges(true);
                }}
                className="mt-1"
              />
            </div>
            <p className="text-sm text-zinc-500">
              {t("pricing.for_standard_reviews", "For standard review orders")}
            </p>
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader>
            <CardTitle>{t("orders.type_reactions", "Comments / Reactions")}</CardTitle>
            <CardDescription>{t("pricing.credits_per_comment", "Credits per comment")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("pricing.credits_per_unit", "Credits per Unit")}</Label>
              <Input
                type="number"
                min="1"
                value={pricing.COMMENT}
                onChange={(e) => {
                  setPricing({ ...pricing, COMMENT: parseInt(e.target.value) || 1 });
                  setHasChanges(true);
                }}
                className="mt-1"
              />
            </div>
            <p className="text-sm text-zinc-500">
              {t("pricing.for_text_comments", "For text-only comment orders")}
            </p>
          </CardContent>
        </Card>

        {/* Comments + Photo */}
        <Card>
          <CardHeader>
            <CardTitle>{t("orders.type_photo_reviews", "Photo + Reviews")}</CardTitle>
            <CardDescription>{t("pricing.credits_per_comment_photo", "Credits per comment with photo")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("pricing.credits_per_unit", "Credits per Unit")}</Label>
              <Input
                type="number"
                min="1"
                value={pricing.COMMENT_WITH_PHOTO}
                onChange={(e) => {
                  setPricing({ ...pricing, COMMENT_WITH_PHOTO: parseInt(e.target.value) || 1 });
                  setHasChanges(true);
                }}
                className="mt-1"
              />
            </div>
            <p className="text-sm text-zinc-500">
              {t("pricing.for_photo_comments", "For comment orders with attached photos")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button
          onClick={() => router.back()}
          variant="outline"
          disabled={saving}
          className="cursor-pointer"
        >
          {t("common.cancel", "Cancel")}
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="bg-[#168BB0] hover:bg-[#0F7493] text-white cursor-pointer"
        >
          {saving ? t("pricing.saving", "Saving...") : <><Save className="h-4 w-4 mr-2" />{t("pricing.save_changes", "Save Changes")}</>}
        </Button>
      </div>
    </div>
  );
}
