import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import BillingClient from "./billing-client";
import { getClientBillingData } from "@/lib/data/billing";
import { requireAuth } from "@/lib/auth/server-auth";

export const metadata = {
  title: "Billing Information - Client Portal",
};

export default async function ClientBillingPage() {
  const auth = await requireAuth();
  if (!auth.success) return null;

  const response = await getClientBillingData(auth.user.id);
  const initialBilling = response.success ? response.data : null;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <BillingClient initialBilling={initialBilling} />
    </Suspense>
  );
}
