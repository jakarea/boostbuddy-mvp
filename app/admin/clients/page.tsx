import React, { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import ClientsContent from "./client-page";
import { getClientsData, getProfileCountsData } from "@/lib/data/clients";
import { requireAuth } from "@/lib/auth/server-auth";

export default async function AdminClientsPage() {
  const auth = await requireAuth({ role: "ADMIN" });
  if (!auth.success) return null;

  const [clients, profileCounts] = await Promise.all([
    getClientsData(),
    getProfileCountsData(),
  ]);

  return (
    <Suspense fallback={<LoadingScreen />}>
      <ClientsContent initialClients={clients} profileCounts={profileCounts} />
    </Suspense>
  );
}
