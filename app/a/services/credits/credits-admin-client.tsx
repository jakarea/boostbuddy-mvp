"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Coins, Plus, Edit, Trash2, Power, RefreshCw, Wallet } from "lucide-react";
import Swal from "sweetalert2";

interface Package {
  id: string;
  name: string;
  description?: string;
  creditsAmount: number;
  price: number;
  isActive: boolean;
  createdAt: string;
}

interface Overview {
  totalCreditsSold: number;
  totalCreditsConsumed: number;
  activePackages: number;
  totalTransactions: number;
}

export default function CreditsAdminClient({
  initialPackages,
  initialOverview,
}: {
  initialPackages: Package[];
  initialOverview: Overview;
}) {
  const router = useRouter();
  const { t } = useTranslation("admin_reviews");
  const { success, error } = useToast();
  const [packages, setPackages] = useState<Package[]>(initialPackages);
  const [overview, setOverview] = useState<Overview>(initialOverview);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    creditsAmount: "",
    price: "",
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const { getCreditPackagesAdminAction, getCreditsOverviewAction } = await import("@/app/actions/credits");
      const [packagesRes, overviewRes] = await Promise.all([
        getCreditPackagesAdminAction(),
        getCreditsOverviewAction(),
      ]);

      if (packagesRes.success && packagesRes.data) {
        setPackages(packagesRes.data as Package[]);
      }
      if (overviewRes.success && overviewRes.data) {
        setOverview(overviewRes.data as Overview);
      }
    } catch (err) {
      error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = () => {
    setEditingPackage(null);
    setFormData({ name: "", description: "", creditsAmount: "", price: "" });
    setDialogOpen(true);
  };

  const handleEdit = (pkg: Package) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || "",
      creditsAmount: pkg.creditsAmount.toString(),
      price: pkg.price.toString(),
    });
    setDialogOpen(true);
  };

  const handleToggle = async (pkg: Package) => {
    try {
      setIsLoading(true);
      const { togglePackageStatusAction } = await import("@/app/actions/credits");
      const res = await togglePackageStatusAction(pkg.id);

      if (res.success) {
        success(res.data.isActive ? "Package activated" : "Package deactivated");
        setPackages(packages.map(p => p.id === pkg.id ? { ...p, isActive: res.data.isActive } : p));
        loadData();
      } else {
        error(res.error || "Failed to toggle package");
      }
    } catch (err) {
      error("Failed to toggle package");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (pkg: Package) => {
    const result = await Swal.fire({
      title: "Delete Package?",
      text: `Are you sure you want to delete "${pkg.name}"? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!"
    });

    if (!result.isConfirmed) return;

    try {
      setIsLoading(true);
      const { deleteCreditPackageAction } = await import("@/app/actions/credits");
      const res = await deleteCreditPackageAction(pkg.id);

      if (res.success) {
        success("Package deleted");
        setPackages(packages.filter(p => p.id !== pkg.id));
        loadData();
      } else {
        error(res.error || "Failed to delete package");
      }
    } catch (err) {
      error("Failed to delete package");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const credits = parseInt(formData.creditsAmount);
    const price = parseFloat(formData.price);

    if (!formData.name.trim()) {
      error("Package name is required");
      return;
    }
    if (isNaN(credits) || credits <= 0) {
      error("Valid credits amount required");
      return;
    }
    if (isNaN(price) || price <= 0) {
      error("Valid price required");
      return;
    }

    try {
      setIsLoading(true);
      const { createCreditPackageAction, updateCreditPackageAction } = await import("@/app/actions/credits");

      const res = editingPackage
        ? await updateCreditPackageAction(editingPackage.id, {
            name: formData.name.trim(),
            description: formData.description.trim(),
            creditsAmount: credits,
            price,
          })
        : await createCreditPackageAction({
            name: formData.name.trim(),
            description: formData.description.trim(),
            creditsAmount: credits,
            price,
          });

      if (res.success) {
        success(editingPackage ? "Package updated" : "Package created");
        setDialogOpen(false);
        loadData();
      } else {
        error(res.error || "Failed to save package");
      }
    } catch (err) {
      error("Failed to save package");
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
            Credits Management
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Create and manage credit packages for review orders
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
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
              <p className="text-sm text-zinc-500">Sold</p>
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
              <p className="text-sm text-zinc-500">Consumed</p>
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
              <p className="text-sm text-zinc-500">Active</p>
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
              <p className="text-sm text-zinc-500">Transactions</p>
              <p className="text-xl font-bold">{overview.totalTransactions}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Packages List */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Credit Packages</h2>
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Package
        </Button>
      </div>

      {packages.length === 0 ? (
        <Card className="p-12 text-center">
          <Coins className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No packages yet</h3>
          <p className="text-zinc-500">Create your first credit package to get started</p>
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
                    {pkg.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {pkg.creditsAmount}
                  </span>
                  <span className="text-zinc-500">credits</span>
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
                    className="flex-1"
                    onClick={() => handleEdit(pkg)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggle(pkg)}
                  >
                    <Power className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
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
            <DialogTitle>{editingPackage ? 'Edit Package' : 'Create Package'}</DialogTitle>
            <DialogDescription>
              {editingPackage ? 'Update the credit package details.' : 'Create a new credit package for users to purchase.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Package Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Starter Pack"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="credits">Credits</Label>
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
                <Label htmlFor="price">Price (€)</Label>
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
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : (editingPackage ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Links */}
      <div className="flex items-center gap-4 pt-4 border-t">
        <Button variant="outline" onClick={() => router.push('/a/services/credits/transactions')}>
          View Transactions
        </Button>
        <Button variant="outline" onClick={() => router.push('/a/services/credits/adjust')}>
          Adjust User Credits
        </Button>
      </div>
    </div>
  );
}
