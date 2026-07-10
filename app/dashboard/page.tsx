import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import DashboardClient from "./dashboard-client";
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

  const response = await getClientProfilesData(auth.user.id);
  const initialProfiles = (response.success ? response.data : []) as any[];
  const duration = Date.now() - start;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <ServerFetchTimeLogger pageName="/dashboard" fetchTimeMs={duration} />
      <DashboardClient initialProfiles={initialProfiles} />
    </Suspense>
  );
}
