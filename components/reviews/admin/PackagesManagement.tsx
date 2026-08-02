"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Edit, Trash2, Power, RefreshCw } from "lucide-react";
import { formatDateShort } from "@/lib/dateUtils";

interface PackagesManagementProps {
  initialPackages: any[];
  onUpdate?: () => void;
}

export function PackagesManagement({ initialPackages, onUpdate }: PackagesManagementProps) {
  const router = useRouter();
  const { t } = useTranslation("admin_reviews");
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [packages, setPackages] = useState(initialPackages);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleStatus = async (pkg: any) => {
    const confirmed = await confirm({
      title: pkg.isActive
        ? t("packages.toggle.deactivate_title", "Deactivate Package?")
        : t("packages.toggle.activate_title", "Activate Package?"),
      message: pkg.isActive
        ? t("packages.toggle.deactivate_message", { name: pkg.name, defaultValue: 'Are you sure you want to deactivate "{{name}}"?' })
        : t("packages.toggle.activate_message", { name: pkg.name, defaultValue: 'Are you sure you want to activate "{{name}}"?' }),
      confirmText: t("packages.toggle.confirm", "Yes, do it!"),
      cancelText: t("common.cancel", "Cancel"),
      confirmVariant: pkg.isActive ? 'destructive' : 'default'
    });

    if (!confirmed) return;

    try {
      setIsLoading(true);
      const { togglePackageStatusAction } = await import("@/app/actions/credits");
      const res = await togglePackageStatusAction(pkg.id);

      if (res.success) {
        success(res.data.isActive
          ? t("packages.toggle.activated_success", "Package activated successfully")
          : t("packages.toggle.deactivated_success", "Package deactivated successfully"));
        // Update local state
        setPackages(packages.map(p =>
          p.id === pkg.id ? { ...p, isActive: res.data.isActive } : p
        ));
        if (onUpdate) onUpdate();
      } else {
        error(res.error || t("packages.toggle.failed", "Failed to toggle package status"));
      }
    } catch (err) {
      error(t("packages.toggle.failed", "Failed to toggle package status"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (pkg: any) => {
    const confirmed = await confirm({
      title: t("packages.delete.title", "Delete Package?"),
      message: t("packages.delete.message", { name: pkg.name, defaultValue: 'Are you sure you want to delete "{{name}}"? This action cannot be undone.' }),
      confirmText: t("packages.delete.confirm", "Yes, delete it!"),
      cancelText: t("common.cancel", "Cancel"),
      confirmVariant: 'destructive'
    });

    if (!confirmed) return;

    try {
      setIsLoading(true);
      const { deleteCreditPackageAction } = await import("@/app/actions/credits");
      const res = await deleteCreditPackageAction(pkg.id);

      if (res.success) {
        success(t("packages.delete.success", "Package deleted successfully"));
        setPackages(packages.filter(p => p.id !== pkg.id));
        if (onUpdate) onUpdate();
      } else {
        error(res.error || t("packages.delete.failed", "Failed to delete package"));
      }
    } catch (err) {
      error(t("packages.delete.failed", "Failed to delete package"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    router.push("/a/services/credits/packages/create");
  };

  const handleEdit = (pkg: any) => {
    router.push(`/a/services/credits/packages/${pkg.id}/edit`);
  };

  const formatPrice = (price: number) => {
    return `€${price.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            {t("packages.title", "Credit Packages")}
          </h2>
          <p className="text-zinc-500">
            {t("packages.subtitle", "Manage credit packages available for purchase")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPackages(initialPackages);
              if (onUpdate) onUpdate();
            }}
            disabled={isLoading}
            aria-label={t("refresh", "Refresh")}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleCreate} className="gap-2 bg-[#168BB0] hover:bg-[#0F7493]">
            <Plus className="h-4 w-4" />
            {t("packages.create", "Create Package")}
          </Button>
        </div>
      </div>

      {/* Packages Grid */}
      {packages.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold mb-2">{t("packages.empty_title", "No Packages Found")}</h3>
          <p className="text-zinc-500 mb-4">
            {t("packages.empty_subtitle", "Get started by creating your first credit package.")}
          </p>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("packages.create_first", "Create First Package")}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="overflow-hidden">
              {/* Package Header */}
              <div className={`bg-gradient-to-r ${pkg.isActive ? 'from-[#168BB0] to-[#0F7493]' : 'from-zinc-500 to-zinc-600'} p-6 text-white`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    <h3 className="font-semibold">{pkg.name}</h3>
                  </div>
                  <Badge variant={pkg.isActive ? "default" : "secondary"} className="bg-white/20 text-white border-white/30">
                    {pkg.isActive ? t("packages.active", "Active") : t("packages.inactive", "Inactive")}
                  </Badge>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{pkg.creditsAmount}</span>
                  <span className="text-white/80">{t("packages.credits", "credits")}</span>
                </div>
              </div>

              {/* Package Details */}
              <div className="p-6">
                {pkg.description && (
                  <p className="text-sm text-zinc-500 mb-4">{pkg.description}</p>
                )}

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-500">{t("packages.price", "Price")}</span>
                    <span className="font-bold text-lg">{formatPrice(pkg.price)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-500">{t("packages.per_credit", "Per Credit")}</span>
                    <span className="text-sm">
                      ≈ €{(pkg.price / pkg.creditsAmount).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-500">{t("packages.created", "Created")}</span>
                    <span className="text-sm">
                      {formatDateShort(pkg.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(pkg)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    {t("packages.edit", "Edit")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(pkg)}
                    disabled={isLoading}
                    className={pkg.isActive ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}
                  >
                    <Power className="h-4 w-4 mr-1" />
                    {pkg.isActive ? t("packages.disable", "Disable") : t("packages.enable", "Enable")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(pkg)}
                    disabled={isLoading}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                    aria-label={t("delete", "Delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
