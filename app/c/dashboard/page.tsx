import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import DashboardClient from "../dashboard-client";
import { getClientProfilesData } from "@/lib/data/dashboard";
import { requireAuth } from "@/lib/auth/server-auth";
import { ServerFetchTimeLogger } from "@/components/ServerFetchTimeLogger";

export const metadata = {
  title: "Dashboard - Client Portal",
};

export default async function DashboardPage() {
  const start = Date.now();
  const auth = await requireAuth();
  if (!auth.success) return null;

  const [profilesRes, walletRes] = await Promise.all([
    getClientProfilesData(auth.user.id),
    import("@/app/actions/credits").then(m => m.getWalletSummaryAction())
  ]);

  const initialProfiles = profilesRes.success && profilesRes.data ? profilesRes.data : [];
  const creditsBalance = walletRes.success && walletRes.balance !== undefined ? walletRes.balance : 0;
  const duration = Date.now() - start;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <ServerFetchTimeLogger pageName="/c/dashboard" fetchTimeMs={duration} />
      <DashboardClient initialProfiles={initialProfiles} creditsBalance={creditsBalance} />
    </Suspense>
  );
}
