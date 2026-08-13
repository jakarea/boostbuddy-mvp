import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import PaymentsClient from "./payments-client";
import { getAdminOrdersAction } from "@/app/actions/orders";

export const metadata = {
  title: "Payment Management - Admin",
};

export default async function AdminPaymentsPage() {
  const response = await getAdminOrdersAction();
  const initialOrders = (response.success ? response.data : []) as any[];

  return (
    <Suspense fallback={<LoadingScreen />}>
      <PaymentsClient initialOrders={initialOrders} />
    </Suspense>
  );
}
