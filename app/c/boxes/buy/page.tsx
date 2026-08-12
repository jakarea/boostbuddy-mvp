import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import PaymentsClient from "../../payments/payments-client";
import { getClientOrdersData } from "@/lib/data/orders";
import { getServicesData } from "@/lib/data/services";
import { getClientBillingData } from "@/lib/data/billing";
import { getClientInvoicesData } from "@/lib/data/invoices";
import { getClientProfilesData } from "@/lib/data/dashboard";
import { requireAuth } from "@/lib/auth/server-auth";

export const metadata = {
  title: "Buy Boxes - Client Portal",
};

export default async function BuyBoxesPage() {
  const auth = await requireAuth({ role: 'CLIENT' });
  if (!auth.success) return null;

  const [ordersRes, services, billingRes, invoicesRes, profilesRes] = await Promise.all([
    getClientOrdersData(auth.user.id),
    getServicesData(),
    getClientBillingData(auth.user.id),
    getClientInvoicesData(auth.user.id),
    getClientProfilesData(auth.user.id)
  ]);

  const orders = ordersRes.success && ordersRes.data ? ordersRes.data : [];
  const activeServices = services.filter((s: { is_active?: boolean }) => s.is_active);
  const billingInfo = billingRes.success ? billingRes.data : null;
  const invoices = invoicesRes.success && invoicesRes.data ? invoicesRes.data : [];
  const profiles = profilesRes.success && profilesRes.data ? profilesRes.data : [];

  return (
    <Suspense fallback={<LoadingScreen />}>
      <PaymentsClient
        initialOrders={orders}
        activeServices={activeServices}
        billingInfo={billingInfo}
        invoices={invoices}
        profiles={profiles}
      />
    </Suspense>
  );
}
