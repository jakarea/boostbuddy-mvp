import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import CheckoutClient from "./checkout-client";
import { getServicesAction } from "@/app/actions/services";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Secure Checkout - BoostBuddy",
};

export default async function CheckoutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/api/logout");
  }

  // Fetch data needed for checkout rendering
  const [services, { data: profiles }] = await Promise.all([
    getServicesAction(),
    supabase.from("profile_accounts").select("*").eq("assigned_client_id", user.id)
  ]);

  return (
    <Suspense fallback={<LoadingScreen />}>
      <CheckoutClient 
        services={services as any[]} 
        profiles={(profiles || []) as any[]} 
        userName={user.user_metadata?.name || user.email || ""}
      />
    </Suspense>
  );
}
