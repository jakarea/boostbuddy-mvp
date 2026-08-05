import { getAllReviewOrdersAction } from "@/app/actions/admin-reviews";
import HistoryClient from "./history-client";

interface ReviewOrder {
  id: string;
  businessName: string;
  businessUrl?: string;
  reviewType: string;
  targetRating: string;
  reactionType?: string;
  reviewContent: string;
  reviewInstructions?: string;
  status: string;
  creditsConsumed: number;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  clientFeedback?: string;
  proofOfCompletion?: string;
  assignedEmployeeId?: string;
  clientName?: string;
  clientEmail?: string;
  employeeName?: string;
  employeeEmail?: string;
}

type StatusFilter = "ALL" | "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

interface PageProps {
  searchParams: {
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
  };
}

export default async function AdminReviewsHistoryPage({ searchParams }: PageProps) {
  // Parse search params from URL
  const page = parseInt(searchParams.page || '1', 10);
  const pageSize = parseInt(searchParams.pageSize || '20', 10);
  const searchTerm = searchParams.search || undefined;
  const statusFilter = (searchParams.status || "ALL") as StatusFilter;

  // Fetch data on server (already normalized in action)
  const result = await getAllReviewOrdersAction({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    page,
    pageSize,
    searchTerm,
  });

  if (result.success) {
    const orders = result.data || [];
    const totalCount = result.pagination?.totalCount || 0;

    return (
      <HistoryClient
        initialOrders={orders}
        totalCount={totalCount}
      />
    );
  }

  // Return error state
  return (
    <div className="p-8 text-center">
      <p className="text-sm text-zinc-500">Failed to load order history</p>
    </div>
  );
}
