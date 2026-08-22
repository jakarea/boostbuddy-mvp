"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Coins,
  Plus,
  Edit,
  Trash2,
  Power,
  RefreshCw,
  Wallet
} from "lucide-react";
import {
  getCreditPackagesAdminAction,
  createCreditPackageAction,
  updateCreditPackageAction,
  deleteCreditPackageAction,
  togglePackageStatusAction,
  getCreditsOverviewAction
} from "@/app/actions/credits";

interface CreditPackage {
  id: string;
  name: string;
  description?: string;
  creditsAmount: number;
  price: number;
  stripePriceId?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface Overview {
  totalCreditsSold: number;
  totalCreditsConsumed: number;
  activePackages: number;
  totalTransactions: number;
}

interface CreditsAdminClientProps {
  initialPackages: CreditPackage[];
  initialOverview: Overview;
}

export default function CreditsAdminClient({
  initialPackages,
  initialOverview,
}: CreditsAdminClientProps) {
  const { t } = useTranslation("credits_admin");
  const { success, error } = useToast();
  const router = useRouter();

  const [packages, setPackages] = useState<CreditPackage[]>(initialPackages);
  const [overview, setOverview] = useState<Overview>(initialOverview);
  const [isLoading, setIsLoading] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CreditPackage | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    creditsAmount: "",
    price: "",
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [packagesRes, overviewRes] = await Promise.all([
        getCreditPackagesAdminAction(),
        getCreditsOverviewAction(),
      ]);

      if (packagesRes.success && packagesRes.data) {
        setPackages(packagesRes.data);
      }
      if (overviewRes.success && overviewRes.data) {
        setOverview(overviewRes.data);
      }
    } catch (err) {
      error(t("packages.load_error", "Failed to load credits data"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPackage(null);
    setFormData({
      name: "",
      description: "",
      creditsAmount: "",
      price: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (pkg: CreditPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || "",
      creditsAmount: pkg.creditsAmount.toString(),
      price: pkg.price.toString(),
    });
    setDialogOpen(true);
  };

  const handleToggle = async (pkg: CreditPackage) => {
    try {
      const res = await togglePackageStatusAction(pkg.id);
      if (res.success) {
        success(pkg.isActive ? t("packages.deactivated", "Package deactivated") : t("packages.activated", "Package activated"));
        loadData();
      } else {
        error(res.error || t("packages.toggle_error", "Failed to toggle package status"));
      }
    } catch (err) {
      error(t("packages.toggle_error", "Failed to toggle package status"));
    }
  };

  const handleDelete = async (pkg: CreditPackage) => {
    if (!confirm(t("packages.delete_confirm", { name: pkg.name, defaultValue: `Are you sure you want to delete "${pkg.name}"?` }))) {
      return;
    }

    try {
      const res = await deleteCreditPackageAction(pkg.id);
      if (res.success) {
        success(t("packages.deleted", "Package deleted successfully"));
        loadData();
      } else {
        error(res.error || t("packages.delete_error", "Failed to delete package"));
      }
    } catch (err) {
      error(t("packages.delete_error", "Failed to delete package"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const creditsAmount = parseInt(formData.creditsAmount);
      const price = parseFloat(formData.price);

      if (isNaN(creditsAmount) || creditsAmount <= 0) {
        error(t("packages.invalid_credits", "Invalid credits amount"));
        setIsLoading(false);
        return;
      }

      if (isNaN(price) || price <= 0) {
        error(t("packages.invalid_price", "Invalid price"));
        setIsLoading(false);
        return;
      }

      let res;
      if (editingPackage) {
        res = await updateCreditPackageAction(editingPackage.id, {
          name: formData.name,
          description: formData.description,
          creditsAmount,
          price,
        });
      } else {
        res = await createCreditPackageAction({
          name: formData.name,
          description: formData.description,
          creditsAmount,
          price,
          displayOrder: packages.length + 1,
        });
      }

      if (res.success) {
        success(editingPackage ? t("packages.updated", "Package updated successfully") : t("packages.created", "Package created successfully"));
        setDialogOpen(false);
        loadData();
      } else {
        error(res.error || t("packages.save_error", "Failed to save package"));
      }
    } catch (err) {
      error(t("packages.save_error", "Failed to save package"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t("management.title", "Credits Management")}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {t("management.subtitle", "Create and manage credit packages for review orders")}
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm" disabled={isLoading} className="cursor-pointer">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {t("common.refresh", "Refresh")}
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Wallet className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">{t("stats.sold", "Sold")}</p>
              <p className="text-xl font-bold">{overview.totalCreditsSold}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Coins className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">{t("stats.consumed", "Consumed")}</p>
              <p className="text-xl font-bold">{overview.totalCreditsConsumed}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Wallet className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">{t("stats.active", "Active")}</p>
              <p className="text-xl font-bold">{overview.activePackages}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Wallet className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">{t("stats.transactions", "Transactions")}</p>
              <p className="text-xl font-bold">{overview.totalTransactions}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Packages List */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("packages.title", "Credit Packages")}</h2>
        <Button onClick={handleCreate} size="sm" className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          {t("packages.new_package", "New Package")}
        </Button>
      </div>

      {packages.length === 0 ? (
        <Card className="p-12 text-center">
          <Coins className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t("packages.no_packages", "No packages yet")}</h3>
          <p className="text-zinc-500">{t("packages.create_first", "Create your first credit package to get started")}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <Card key={pkg.id} className={`p-4 ${!pkg.isActive ? 'opacity-60' : ''}`}>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {pkg.name}
                    </h3>
                    {pkg.description && (
                      <p className="text-sm text-zinc-500 mt-1">{pkg.description}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    pkg.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}>
                    {pkg.isActive ? t("status.active", "Active") : t("status.inactive", "Inactive")}
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {pkg.creditsAmount}
                  </span>
                  <span className="text-zinc-500">{t("common.credits_label", "credits")}</span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-[#168BB0]">
                    €{pkg.price}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 cursor-pointer"
                    onClick={() => handleEdit(pkg)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    {t("common.edit", "Edit")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => handleToggle(pkg)}
                  >
                    <Power className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50 cursor-pointer"
                    onClick={() => handleDelete(pkg)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPackage ? t("packages.edit_package", "Edit Package") : t("packages.create_package", "Create Package")}</DialogTitle>
            <DialogDescription>
              {editingPackage ? t("packages.edit_desc", "Update the credit package details.") : t("packages.create_desc", "Create a new credit package for users to purchase.")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("packages.package_name", "Package Name")}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("packages.name_placeholder", "e.g. Starter Pack")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t("packages.description", "Description (optional)")}</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t("packages.description_placeholder", "Brief description")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="credits">{t("packages.credits", "Credits")}</Label>
                <Input
                  id="credits"
                  type="number"
                  min="1"
                  value={formData.creditsAmount}
                  onChange={(e) => setFormData({ ...formData, creditsAmount: e.target.value })}
                  placeholder="10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">{t("packages.price", "Price (€)")}</Label>
                <Input
                  id="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="29.99"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isLoading} className="cursor-pointer">
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={isLoading} className="cursor-pointer">
                {isLoading ? t("common.saving", "Saving...") : (editingPackage ? t("common.update", "Update") : t("common.create", "Create"))}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Links */}
      <div className="flex items-center gap-4 pt-4 border-t">
        <Button variant="outline" onClick={() => router.push('/a/services/credits/transactions')} className="cursor-pointer">
          {t("management.view_transactions", "View Transactions")}
        </Button>
        <Button variant="outline" onClick={() => router.push('/a/services/credits/adjust')} className="cursor-pointer">
          {t("management.adjust_credits", "Adjust User Credits")}
        </Button>
      </div>
    </div>
  );
}
