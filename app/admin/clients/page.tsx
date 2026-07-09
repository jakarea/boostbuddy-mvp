import React, { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import ClientsContent from "./client-page";
import { getClientsAction, getProfileCountsAction } from "@/app/actions/clients";

export default async function AdminClientsPage() {
  const [clients, profileCounts] = await Promise.all([
    getClientsAction(),
    getProfileCountsAction(),
  ]);

  return (
    <Suspense fallback={<LoadingScreen />}>
      <ClientsContent initialClients={clients} profileCounts={profileCounts} />
    </Suspense>
  );
}
