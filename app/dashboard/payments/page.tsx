import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import PaymentsClient from "./payments-client";
import { getClientOrdersAction } from "@/app/actions/orders";
import { getServicesAction } from "@/app/actions/services";
import { getClientBillingAction } from "@/app/actions/billing";
import { getClientInvoicesAction } from "@/app/actions/invoices";
import { getClientProfilesAction } from "@/app/actions/dashboard";

export const metadata = {
  title: "Payments & Services - Client Portal",
};

export default async function ClientPaymentsPage() {
  const [ordersRes, services, billingRes, invoicesRes, profilesRes] = await Promise.all([
    getClientOrdersAction(),
    getServicesAction(),
    getClientBillingAction(),
    getClientInvoicesAction(),
    getClientProfilesAction()
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
