import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import BillingClient from "./billing-client";
import { getClientBillingData } from "@/lib/data/billing";
import { requireAuth } from "@/lib/auth/server-auth";
import { ServerFetchTimeLogger } from "@/components/ServerFetchTimeLogger";

export const metadata = {
  title: "Billing Information - Client Portal",
};

export default async function ClientBillingPage() {
  const start = Date.now();
  const auth = await requireAuth();
  if (!auth.success) return null;

  const response = await getClientBillingData(auth.user.id);
  const initialBilling = response.success ? response.data : null;
  const duration = Date.now() - start;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <ServerFetchTimeLogger pageName="/dashboard/billing" fetchTimeMs={duration} />
      <BillingClient initialBilling={initialBilling} />
    </Suspense>
  );
}
