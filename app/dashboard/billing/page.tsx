import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import BillingClient from "./billing-client";
import { getClientBillingAction } from "@/app/actions/billing";

export const metadata = {
  title: "Billing Information - Client Portal",
};

export default async function ClientBillingPage() {
  const response = await getClientBillingAction();
  const initialBilling = response.success ? response.data : null;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <BillingClient initialBilling={initialBilling} />
    </Suspense>
  );
}
