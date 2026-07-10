import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import PaymentsClient from "./payments-client";
import { getClientOrdersData } from "@/lib/data/orders";
import { getServicesData } from "@/lib/data/services";
import { getClientBillingData } from "@/lib/data/billing";
import { getClientInvoicesData } from "@/lib/data/invoices";
import { getClientProfilesData } from "@/lib/data/dashboard";
import { requireAuth } from "@/lib/auth/server-auth";

export const metadata = {
  title: "Payments & Services - Client Portal",
};

export default async function ClientPaymentsPage() {
  const auth = await requireAuth();
  if (!auth.success) return null;

  const [ordersRes, services, billingRes, invoicesRes, profilesRes] = await Promise.all([
    getClientOrdersData(auth.user.id),
    getServicesData(),
    getClientBillingData(auth.user.id),
    getClientInvoicesData(auth.user.id),
    getClientProfilesData(auth.user.id)
  ]);

  const orders = (ordersRes.success ? ordersRes.data : []) as any[];
  const activeServices = services.filter(s => s.is_active);
  const billingInfo = billingRes.success ? billingRes.data : null;
  const invoices = (invoicesRes.success && invoicesRes.data ? invoicesRes.data : []) as any[];
  const profiles = (profilesRes.success ? profilesRes.data : []) as any[];

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
