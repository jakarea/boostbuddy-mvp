import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import ClientInvoices from "./client-invoices";
import { getClientInvoicesAction } from "@/app/actions/invoices";
import { getServicesAction } from "@/app/actions/services";
import { createClient } from "@/lib/supabase/server";

import { getCachedUser } from "@/lib/auth/cached-auth";

export const metadata = {
  title: "Invoices - Client Dashboard",
};

export default async function DashboardInvoicesPage() {
  const user = await getCachedUser();

  const supabase = await createClient();
  const [response, services, ordersRes] = await Promise.all([
    getClientInvoicesAction(),
    getServicesAction(),
    user
      ? supabase.from("orders").select("*").eq("user_id", user.id)
      : Promise.resolve({ data: null }),
  ]);

  const initialInvoices = (response.success ? response.data : []) as any[];
  const orders = ordersRes.data || [];

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
