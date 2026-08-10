import { getAllReviewOrdersAction, getAvailableEmployeesAction } from "@/app/actions/admin-reviews";
import QueueClient from "./queue-client";

interface ReviewOrder {
  id: string;
  businessName: string;
  facebookUrl?: string;
  orderType: "REVIEW" | "COMMENT" | "COMMENT_WITH_PHOTO";
  reviewType: string;
  targetRating?: string;
  reactionType?: string;
  content?: string;
  commentText?: string;
  photoUrls?: string[];
  reviewInstructions?: string;
  status: string;
  quantity: number;
  creditsConsumed: number;
  createdAt: string;
  clientName?: string;
  clientEmail?: string;
  assignedEmployeeId?: string;
  employeeName?: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  acceptingOrders: boolean;
  isAvailable: boolean;
  ordersCompleted: number;
  lastActiveAt?: string;
}

interface PageProps {
  searchParams: {
    page?: string;
    pageSize?: string;
    search?: string;
  };
}

export default async function AdminReviewsQueuePage({ searchParams }: PageProps) {
  // Parse search params from URL
  const page = parseInt(searchParams.page || '1', 10);
  const pageSize = parseInt(searchParams.pageSize || '20', 10);
  const searchTerm = searchParams.search || undefined;

  // Fetch data on server
  const [ordersRes, employeesRes] = await Promise.all([
    getAllReviewOrdersAction({
      status: "PENDING",
      page,
      pageSize,
      searchTerm,
    }),
    getAvailableEmployeesAction()
  ]);

  const orders = (ordersRes.success ? ordersRes.data : []) as ReviewOrder[];
  const employees = (employeesRes.success ? employeesRes.data : []) as Employee[];
  const totalCount = ordersRes.pagination?.totalCount || 0;

  return (
    <QueueClient
      initialOrders={orders}
      initialEmployees={employees}
      totalCount={totalCount}
    />
  );
}
