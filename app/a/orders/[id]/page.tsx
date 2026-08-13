import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LoadingScreen } from "@/components/LoadingScreen";
import OrderDetailClient from "./order-detail-client";
import { getReviewOrderByIdAction } from "@/app/actions/admin-reviews";

export const metadata = {
  title: "Order Details - Admin",
};

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await getReviewOrderByIdAction(id);

  if (!response.success) {
    console.error("Failed to fetch order:", response.error);
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
            Error Loading Order
          </h1>
          <p className="text-sm text-zinc-500">{response.error || "Unknown error"}</p>
        </div>
      </div>
    );
  }

  if (!response.data) {
    notFound();
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <OrderDetailClient order={response.data as any} />
    </Suspense>
  );
}
