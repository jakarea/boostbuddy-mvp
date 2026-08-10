import { ReviewsClient } from "./ReviewsClient";
import { getEmployeeReviewOrdersAction } from "@/app/actions/employee";

export const metadata = {
  title: "Review Orders - Employee Portal",
};

export default async function EmployeeReviewsPage() {
  // Fetch data on server
  const result = await getEmployeeReviewOrdersAction();

  if (!result.success || !result.data) {
    return (
      <div className="flex-1 flex justify-center items-center bg-zinc-950 text-white">
        <div className="text-center">
          <p className="text-sm text-zinc-400">Failed to load reviews</p>
        </div>
      </div>
    );
  }

  return <ReviewsClient initialData={result.data} />;
}
