import { OrdersClient } from "./OrdersClient";
import { getEmployeeOrderHistoryAction } from "@/app/actions/employee";

export const metadata = {
  title: "Order History - Employee Portal",
};

export default async function EmployeeOrderHistoryPage() {
  // Fetch data on server
  const result = await getEmployeeOrderHistoryAction(100);

  if (!result.success || !result.data) {
    return (
      <div className="flex-1 flex justify-center items-center bg-zinc-950 text-white">
        <div className="text-center">
          <p className="text-sm text-zinc-400">Failed to load orders</p>
        </div>
      </div>
    );
  }

  return <OrdersClient initialOrders={result.data} />;
}
