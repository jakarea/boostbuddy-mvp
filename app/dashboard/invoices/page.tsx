import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import ClientInvoices from "./client-invoices";
import { getClientInvoicesAction } from "@/app/actions/invoices";
import { getServicesAction } from "@/app/actions/services";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Invoices - Client Dashboard",
};

export default async function DashboardInvoicesPage() {
  const response = await getClientInvoicesAction();
  const initialInvoices = (response.success ? response.data : []) as any[];
  const services = await getServicesAction();

  // Fetch orders for the current user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let orders = [];
  if (user) {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id);
    orders = data || [];
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <ClientInvoices 
        initialInvoices={initialInvoices} 
        services={services}
        orders={orders}
      />
    </Suspense>
  );
}
