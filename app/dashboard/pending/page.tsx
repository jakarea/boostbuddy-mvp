import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PendingClient from "./pending-client";

export const metadata = {
  title: "Pending Approval - BoostBuddy",
};

export default async function PendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/api/logout");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("status")
    .eq("id", user.id)
    .single();

  if (profile?.status === "ACTIVE") {
    redirect("/dashboard");
  }

  return <PendingClient email={user.email || ""} />;
}
