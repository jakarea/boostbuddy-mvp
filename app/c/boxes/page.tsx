import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import BoxesClient from "../boxes-client";
import { getClientProfilesData } from "@/lib/data/dashboard";
import { requireAuth } from "@/lib/auth/server-auth";
import { ServerFetchTimeLogger } from "@/components/ServerFetchTimeLogger";

export const metadata = {
  title: "My Boxes - Client Portal",
};

export default async function BoxesPage() {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- Server component: Date.now() is safe for one-time execution
  const start = Date.now();
  const auth = await requireAuth({ role: 'CLIENT' });
  if (!auth.success) return null;

  const response = await getClientProfilesData(auth.user.id);
  const initialBoxes = response.success && response.data ? response.data : [];
  // eslint-disable-next-line react-hooks/rules-of-hooks -- Server component: Date.now() is safe for one-time execution
  const duration = Date.now() - start;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <ServerFetchTimeLogger pageName="/c/boxes" fetchTimeMs={duration} />
      <BoxesClient initialBoxes={initialBoxes} />
    </Suspense>
  );
}
