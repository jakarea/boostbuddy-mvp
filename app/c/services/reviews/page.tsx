import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import ReviewsDashboardClient from "./reviews-dashboard-client";
import { getReviewsDashboardAction } from "@/app/actions/reviews";
import { requireAuth } from "@/lib/auth/server-auth";

export const metadata = {
  title: "Reviews Service - Client Portal",
};

export default async function ReviewsDashboardPage() {
  const auth = await requireAuth();
  if (!auth.success) return null;

  const initialData = await getReviewsDashboardAction();

  return (
    <Suspense fallback={<LoadingScreen />}>
      <ReviewsDashboardClient initialData={initialData.success ? initialData.data : null} />
    </Suspense>
  );
}
