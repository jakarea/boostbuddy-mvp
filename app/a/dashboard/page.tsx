import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import DashboardClient from "./dashboard-client";
import { getAdminDashboardStatsData } from "@/lib/data/dashboard";
import { requireAuth } from "@/lib/auth/server-auth";

export const metadata = {
  title: "Dashboard - Admin",
};

export default async function AdminDashboardPage() {
  const auth = await requireAuth({ role: "ADMIN" });
  if (!auth.success) return null;

  const response = await getAdminDashboardStatsData();
  const stats = (response.success ? response.data : {
    activeClientsCount: 0,
    pendingClientsCount: 0,
    pendingClients: [],
    availableProfilesCount: 0,
    expiringProfilesCount: 0,
    expiringProfiles: [],
  }) as any;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <DashboardClient initialStats={stats} />
    </Suspense>
  );
}
