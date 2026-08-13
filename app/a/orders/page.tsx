import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import OrdersClient from "./orders-client";
import { getAllReviewOrdersAction } from "@/app/actions/admin-reviews";

export const metadata = {
  title: "Review Orders Management - Admin",
};

export default async function AdminReviewOrdersPage() {
  const response = await getAllReviewOrdersAction();
  const initialOrders = (response.success ? response.data : []) as any[];
  const totalCount = response.pagination?.totalCount || 0;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <OrdersClient initialOrders={initialOrders} initialTotalCount={totalCount} />
    </Suspense>
  );
}
