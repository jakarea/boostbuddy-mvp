import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import OrdersList from "@/components/orders/OrdersList";
import { getClientReviewOrdersAction } from "@/app/actions/reviews";

export const metadata = {
  title: "My Review Orders - Client Portal",
};

export default async function ClientReviewOrdersPage() {
  const result = await getClientReviewOrdersAction();

  if (!result.success || !result.data) {
    return (
      <div className="flex-1 flex justify-center items-center bg-zinc-950 text-white">
        <div className="text-center">
          <p className="text-sm text-zinc-400">Failed to load orders</p>
        </div>
      </div>
    );
  }

  const orders = result.data;
  const totalCount = orders.length;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <OrdersList
        orders={orders}
        totalCount={totalCount}
        role="CLIENT"
        detailPageBasePath="/c/services/reviews/orders"
      />
    </Suspense>
  );
}
