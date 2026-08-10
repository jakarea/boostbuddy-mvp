import { getEmployeePerformanceAction } from "@/app/actions/admin-reviews";
import EmployeesClient from "./employees-client";

interface EmployeePerformance {
  id: string;
  userId: string;
  employeeName: string;
  employeeEmail: string;
  isAvailable: boolean;
  isActive: boolean;
  acceptingOrders: boolean;
  ordersCompleted: number;
  lastActiveAt: string;
  createdAt: string;
}

interface PageProps {
  searchParams: {
    page?: string;
    pageSize?: string;
    search?: string;
  };
}

export default async function AdminReviewsEmployeesPage({ searchParams }: PageProps) {
  // Parse search params from URL
  const page = parseInt(searchParams.page || '1', 10);
  const pageSize = parseInt(searchParams.pageSize || '20', 10);
  const searchTerm = searchParams.search || undefined;

  // Fetch data on server
  const result = await getEmployeePerformanceAction({
    page,
    pageSize,
    searchTerm,
  });

  if (result.success) {
    // Normalize field names for dual-mode compatibility
    const employees = (result.data as any[])?.map(emp => ({
      id: emp.id,
      userId: emp.user_id || emp.userId,
      employeeName: emp.employee_name || emp.employeeName || emp.name,
      employeeEmail: emp.employee_email || emp.employeeEmail || emp.email,
      isAvailable: emp.is_available || emp.isAvailable || false,
      isActive: emp.is_active ?? emp.isActive ?? true,
      acceptingOrders: emp.accepting_orders ?? emp.acceptingOrders ?? true,
      ordersCompleted: emp.orders_completed || emp.ordersCompleted || 0,
      lastActiveAt: emp.last_active_at || emp.lastActiveAt,
      createdAt: emp.created_at || emp.createdAt,
    })) || [];

    const totalCount = result.pagination?.totalCount || 0;

    return (
      <EmployeesClient
        initialEmployees={employees}
        totalCount={totalCount}
      />
    );
  }

  // Return error state
  return (
    <div className="p-8 text-center">
      <p className="text-sm text-zinc-500">Failed to load employee data</p>
    </div>
  );
}
