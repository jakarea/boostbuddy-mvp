import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import InvoicesClient from "./invoices-client";
import { getAdminInvoicesAction } from "@/app/actions/invoices";
import { getClientsAction } from "@/app/actions/clients";
import { getServicesAction } from "@/app/actions/services";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Invoices - Admin",
};

export default async function InvoicesPage() {
  const response = await getAdminInvoicesAction();
  const initialInvoices = (response.success ? response.data : []) as any[];
  const allClients = await getClientsAction();
  const activeClients = allClients.filter(c => c.status === "ACTIVE");
  const services = await getServicesAction();

  // We also need orders to populate the dropdown for the specific client.
  // Fetching recent paid orders for admin (limited to 100 for performance).
  const supabase = await createClient();
  const [ordersRes, billingRes] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .eq("status", "PAID")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("billing_info")
      .select("*")
  ]);

  const allOrders = ordersRes.data || [];
  const allBilling = billingRes.data || [];

  return (
    <Suspense fallback={<LoadingScreen />}>
      <InvoicesClient 
        initialInvoices={initialInvoices} 
        activeClients={activeClients}
        services={services}
        orders={allOrders}
        billingInfos={allBilling}
      />
    </Suspense>
  );
}
