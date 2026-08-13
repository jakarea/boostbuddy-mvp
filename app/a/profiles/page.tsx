import React, { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import ProfilesContent from "./profiles-client";
import { getProfilesAction, getActiveClientsAction } from "@/app/actions/profiles";
import { requireAuth } from "@/lib/auth/server-auth";

export default async function AdminProfilesPage() {
  // Security: Require admin authentication
  const auth = await requireAuth({ role: "ADMIN" });
  if (!auth.success) return null;

  const [initialProfiles, activeClients] = await Promise.all([
    getProfilesAction(),
    getActiveClientsAction(),
  ]);

  return (
    <Suspense fallback={<LoadingScreen />}>
      <ProfilesContent initialProfiles={initialProfiles} activeClients={activeClients} />
    </Suspense>
  );
}
