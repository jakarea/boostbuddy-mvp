import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import DashboardClient from "./dashboard-client";
import { getClientProfilesAction } from "@/app/actions/dashboard";

export const metadata = {
  title: "Dashboard - Client Portal",
};

export default async function DashboardPage() {
  const response = await getClientProfilesAction();
  const initialProfiles = (response.success ? response.data : []) as any[];

  return (
    <Suspense fallback={<LoadingScreen />}>
      <DashboardClient initialProfiles={initialProfiles} />
    </Suspense>
  );
}
