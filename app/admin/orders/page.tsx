import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import OrdersClient from "./orders-client";
import { getAdminOrdersAction } from "@/app/actions/orders";

export const metadata = {
  title: "Order Management - Admin",
};

export default async function AdminOrdersPage() {
  const response = await getAdminOrdersAction();
  const initialOrders = (response.success ? response.data : []) as any[];

  return (
    <Suspense fallback={<LoadingScreen />}>
      <OrdersClient initialOrders={initialOrders} />
    </Suspense>
  );
}
