import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import DashboardClient from "./dashboard-client";
import { getAdminDashboardStatsAction } from "@/app/actions/dashboard";

export const metadata = {
  title: "Dashboard - Admin",
};

export default async function AdminDashboardPage() {
  const response = await getAdminDashboardStatsAction();
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
