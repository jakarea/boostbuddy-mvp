import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import PricingClient from "./pricing-client";
import { getReviewPricingAction } from "@/app/actions/reviews";
import { requireAuth } from "@/lib/auth/server-auth";

export const metadata = {
  title: "Review Pricing - Admin",
};

export default async function PricingPage() {
  const auth = await requireAuth({ role: "ADMIN" });
  if (!auth.success) return null;

  const pricingResponse = await Promise.all([
    getReviewPricingAction("REVIEW"),
    getReviewPricingAction("COMMENT"),
    getReviewPricingAction("COMMENT_WITH_PHOTO")
  ]);

  const initialPricing = {
    REVIEW: pricingResponse[0].success ? pricingResponse[0].cost : 15,
    COMMENT: pricingResponse[1].success ? pricingResponse[1].cost : 10,
    COMMENT_WITH_PHOTO: pricingResponse[2].success ? pricingResponse[2].cost : 20
  };

  return (
    <Suspense fallback={<LoadingScreen />}>
      <PricingClient initialPricing={initialPricing} />
    </Suspense>
  );
}
