import React, { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import ProfilesContent from "./profiles-client";
import { getProfilesAction, getActiveClientsAction } from "@/app/actions/profiles";

export default async function AdminProfilesPage() {
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
