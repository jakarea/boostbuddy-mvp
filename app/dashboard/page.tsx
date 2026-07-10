import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import DashboardClient from "./dashboard-client";
import { getClientProfilesData } from "@/lib/data/dashboard";
import { requireAuth } from "@/lib/auth/server-auth";

export const metadata = {
  title: "Dashboard - Client Portal",
};

export default async function DashboardPage() {
  const auth = await requireAuth();
  if (!auth.success) return null;

  const response = await getClientProfilesData(auth.user.id);
  const initialProfiles = (response.success ? response.data : []) as any[];

  return (
    <Suspense fallback={<LoadingScreen />}>
      <DashboardClient initialProfiles={initialProfiles} />
    </Suspense>
  );
}
