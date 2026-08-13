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
  // eslint-disable-next-line react-hooks/rules-of-hooks -- Server component: Date.now() is safe for one-time execution
  const start = Date.now();
  const auth = await requireAuth({ role: 'CLIENT' });
  if (!auth.success) return null;

  const response = await getClientBillingData(auth.user.id);
  const initialBilling = response.success ? response.data : null;
  // eslint-disable-next-line react-hooks/rules-of-hooks -- Server component: Date.now() is safe for one-time execution
  const duration = Date.now() - start;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <ServerFetchTimeLogger pageName="/c/billing" fetchTimeMs={duration} />
      <BillingClient initialBilling={initialBilling} />
    </Suspense>
  );
}
