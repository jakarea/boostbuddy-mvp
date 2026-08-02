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
  const supabase = await createClient();
  const [response, allClients, services, ordersRes, billingRes] = await Promise.all([
    getAdminInvoicesAction(),
    getClientsAction(),
    getServicesAction(),
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

  const initialInvoices = (response.success ? response.data : []) as any[];
  const activeClients = allClients.filter(c => c.status === "ACTIVE");
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
