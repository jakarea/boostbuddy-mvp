"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, Package } from "lucide-react";

interface PackageFormProps {
  mode?: "create" | "edit";
}

export function PackageForm({ mode = "create" }: PackageFormProps) {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation("admin_reviews");
  const { success, error } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [packageData, setPackageData] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    creditsAmount: "",
    price: "",
    isActive: true,
  });

  useEffect(() => {
    if (mode === "edit" && params.id) {
      loadPackage(params.id as string);
    }
  }, [mode, params.id]);

  const loadPackage = async (id: string) => {
    try {
      const { getCreditPackagesAdminAction } = await import("@/app/actions/credits");
      const res = await getCreditPackagesAdminAction();

      if (res.success && res.data) {
        const pkg = res.data.find((p: any) => p.id === id);
        if (pkg) {
          setPackageData(pkg);
          setFormData({
            name: pkg.name,
            description: pkg.description || "",
            creditsAmount: pkg.creditsAmount.toString(),
            price: pkg.price.toString(),
            isActive: pkg.isActive ?? true,
          });
        }
      }
    } catch (err) {
      error(t("package_form.load_failed", "Failed to load package"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      error(t("package_form.name_required", "Package name is required"));
      return;
    }

    const creditsAmount = parseInt(formData.creditsAmount);
    const price = parseFloat(formData.price);

    if (isNaN(creditsAmount) || creditsAmount <= 0) {
      error(t("package_form.invalid_credits", "Please enter a valid credits amount"));
      return;
    }

    if (isNaN(price) || price <= 0) {
      error(t("package_form.invalid_price", "Please enter a valid price"));
      return;
    }

    setIsLoading(true);
    try {
      const data = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        creditsAmount,
        price,
        isActive: formData.isActive,
      };

      if (mode === "create") {
        const { createCreditPackageAction } = await import("@/app/actions/credits");
        const res = await createCreditPackageAction(data);

        if (res.success) {
          success(t("package_form.create_success", "Package created successfully"));
          router.push("/a/services/credits");
        } else {
          error(res.error || t("package_form.create_failed", "Failed to create package"));
        }
      } else {
        const { updateCreditPackageAction } = await import("@/app/actions/credits");
        const res = await updateCreditPackageAction(params.id as string, data);

        if (res.success) {
          success(t("package_form.update_success", "Package updated successfully"));
          router.push("/a/services/credits");
        } else {
          error(res.error || t("package_form.update_failed", "Failed to update package"));
        }
      }
    } catch (err) {
      error(t("package_form.save_failed", "Failed to save package"));
    } finally {
      setIsLoading(false);
    }
  };

  const title = mode === "create"
    ? t("package_form.create_title", "Create Credit Package")
    : t("package_form.edit_title", "Edit Credit Package");
  const buttonText = mode === "create"
    ? t("package_form.create_button", "Create Package")
    : t("package_form.update_button", "Update Package");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/a/services/credits")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#168BB0]/10 rounded-lg">
                <Package className="h-6 w-6 text-[#168BB0]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {title}
                </h1>
                <p className="text-sm text-zinc-500">
                  {mode === "create"
                    ? t("package_form.create_subtitle", "Create a new credit package for users to purchase")
                    : t("package_form.edit_subtitle", "Update package details")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Package Name */}
            <div>
              <Label htmlFor="name">{t("package_form.label_name", "Package Name *")}</Label>
              <Input
                id="name"
                placeholder={t("package_form.placeholder_name", "e.g., Starter Pack, Professional Bundle, Enterprise Plan")}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <p className="text-xs text-zinc-500 mt-1">
                {t("package_form.hint_name", "A descriptive name for your credit package")}
              </p>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">{t("package_form.label_description", "Description")}</Label>
              <Textarea
                id="description"
                placeholder={t("package_form.placeholder_description", "Describe what this package includes...")}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
              <p className="text-xs text-zinc-500 mt-1">
                {t("package_form.hint_description", "Optional description to help users understand the package")}
              </p>
            </div>

            {/* Credits Amount & Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="creditsAmount">{t("package_form.label_credits", "Credits Amount *")}</Label>
                <Input
                  id="creditsAmount"
                  type="number"
                  min="1"
                  placeholder={t("package_form.placeholder_credits", "e.g., 10, 25, 50, 100")}
                  value={formData.creditsAmount}
                  onChange={(e) => setFormData({ ...formData, creditsAmount: e.target.value })}
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  {t("package_form.hint_credits", "Number of credits in this package")}
                </p>
              </div>

              <div>
                <Label htmlFor="price">{t("package_form.label_price", "Price (EUR) *")}</Label>
                <Input
                  id="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder={t("package_form.placeholder_price", "e.g., 9.99, 24.99, 49.99")}
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  {t("package_form.hint_price", "Price in Euros (€)")}
                </p>
              </div>
            </div>

            {/* Live Preview */}
            {(formData.creditsAmount && formData.price) && (
              <Card className="p-4 bg-zinc-50 dark:bg-zinc-900">
                <h4 className="font-medium mb-3">{t("package_form.preview_title", "Live Preview")}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">{t("package_form.preview_package", "Package:")}</span>
                    <span className="font-medium">{formData.name || t("package_form.preview_package_default", "Package Name")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">{t("package_form.preview_credits", "Credits:")}</span>
                    <span className="font-medium">{t("package_form.preview_credits_value", { count: formData.creditsAmount, defaultValue: "{{count}} credits" })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">{t("package_form.preview_price", "Price:")}</span>
                    <span className="font-medium">€{formData.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">{t("package_form.preview_per_credit", "Per Credit:")}</span>
                    <span className="font-medium">
                      €{(parseFloat(formData.price) / parseInt(formData.creditsAmount)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* Active Status */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isActive">{t("package_form.label_active", "Active Status")}</Label>
                <p className="text-xs text-zinc-500">
                  {t("package_form.hint_active", "Invisible to users when inactive")}
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/a/services/credits")}
                disabled={isLoading}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-[#168BB0] hover:bg-[#0F7493]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("package_form.saving", "Saving...")}
                  </>
                ) : (
                  buttonText
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
