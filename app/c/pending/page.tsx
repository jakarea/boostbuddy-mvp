import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/server-auth";
import PendingClient from "./pending-client";

export const metadata = {
  title: "Pending Approval - BoostBuddy",
};

export default async function PendingPage() {
  const auth = await requireAuth();

  if (!auth.success) {
    redirect("/api/logout");
  }

  if (auth.user.isActive) {
    redirect("/c/dashboard");
  }

  return <PendingClient email={auth.user.email || ""} />;
}
