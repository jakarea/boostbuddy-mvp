import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import OrdersList from "@/components/orders/OrdersList";
import { getEmployeeOrderHistoryAction, getEmployeeReviewOrdersAction } from "@/app/actions/employee";

export const metadata = {
  title: "Order History - Employee Portal",
};

export default async function EmployeeOrderHistoryPage() {
  // Fetch both assigned and available orders in parallel
  const [assignedResult, availableResult] = await Promise.all([
    getEmployeeOrderHistoryAction(),
    getEmployeeReviewOrdersAction()
  ]);

  if (!assignedResult.success || !assignedResult.data) {
    return (
      <div className="flex-1 flex justify-center items-center bg-zinc-950 text-white">
        <div className="text-center">
          <p className="text-sm text-zinc-400">Failed to load orders</p>
        </div>
      </div>
    );
  }

  const assignedOrders = assignedResult.data || [];

  // Get available orders from the second result (already filtered to PENDING only)
  const availableOrders = (availableResult.success && availableResult.data)
    ? availableResult.data
    : [];

  // Combine orders and sort by created_at descending (newest first)
  const allOrders = [...assignedOrders, ...availableOrders].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalCount = assignedOrders.length + availableOrders.length;
  const totalRevenue = allOrders.reduce((sum, o) => sum + (o.creditsConsumed || 0), 0);

  return (
    <Suspense fallback={<LoadingScreen />}>
      <OrdersList
        orders={allOrders}
        totalCount={totalCount}
        role="EMPLOYEE"
        detailPageBasePath="/e/orders"
        stats={{
          totalRevenue,
          assignedCount: assignedOrders.length,
          availableCount: availableOrders.length
        }}
      />
    </Suspense>
  );
}
