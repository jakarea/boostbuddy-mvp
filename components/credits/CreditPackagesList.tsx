"use client";

import { memo } from "react";
import { useTranslation } from "react-i18next";
import { CreditPackageCard } from "./CreditPackageCard";

interface CreditPackagesListProps {
  packages: any[];
  onPurchased?: () => void;
}

export const CreditPackagesList = memo(function CreditPackagesList({ packages, onPurchased }: CreditPackagesListProps) {
  const { t } = useTranslation("credits");

  if (packages.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="text-6xl mb-4">📦</div>
        <h3 className="text-xl font-semibold mb-2">{t("no_packages_available", "No Packages Available")}</h3>
        <p className="text-zinc-500">
          {t("check_back_later", "Check back later for new credit packages.")}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {packages.map((pkg) => (
        <CreditPackageCard
          key={pkg.id}
          package={pkg}
          onPurchased={onPurchased}
        />
      ))}
    </div>
  );
});
