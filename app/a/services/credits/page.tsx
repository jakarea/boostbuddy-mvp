import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import CreditsAdminClient from "./credits-admin-client";
import { requireAuth } from "@/lib/auth/server-auth";
import { getCreditPackagesAdminAction, getCreditsOverviewAction } from "@/app/actions/credits";

export const metadata = {
  title: "Credits Management - Admin",
};

export default async function CreditsAdminPage() {
  const auth = await requireAuth({ role: "ADMIN" });
  if (!auth.success) return null;

  // Fetch initial data
  const [packagesResponse, overviewResponse] = await Promise.all([
    getCreditPackagesAdminAction(),
    getCreditsOverviewAction(),
  ]);

  const initialPackages = packagesResponse.success && packagesResponse.data ? packagesResponse.data : [];
  const initialOverview = overviewResponse.success && overviewResponse.data ? overviewResponse.data : {
    totalCreditsSold: 0,
    totalCreditsConsumed: 0,
    activePackages: 0,
    totalTransactions: 0,
  };

  return (
    <Suspense fallback={<LoadingScreen />}>
      <CreditsAdminClient
        initialPackages={initialPackages}
        initialOverview={initialOverview}
      />
    </Suspense>
  );
}
