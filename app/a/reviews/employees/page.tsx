import { getEmployeePerformanceAction } from "@/app/actions/admin-reviews";
import EmployeesClient from "./employees-client";

interface EmployeePerformance {
  id: string;
  userId: string;
  name: string;
  email: string;
  isAvailable: boolean;
  isActive: boolean;
  is_active: boolean;
  acceptingOrders: boolean;
  accepting_tasks: boolean;
  ordersCompleted: number;
  orders_completed: number;
  creditsCompleted: number;
  credits_completed: number;
  lastActiveAt: string;
  last_active_at: string;
  createdAt: string;
  created_at: string;
  assignedReviews?: any[];
}

interface PageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
  }>;
}

export default async function AdminReviewsEmployeesPage({ searchParams }: PageProps) {
  // Parse search params from URL (await in Next.js 16)
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const pageSize = parseInt(params.pageSize || '20', 10);
  const searchTerm = params.search || undefined;

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
      userId: emp.user_id || emp.userId || '',
      user_id: emp.user_id || emp.userId || '',
      name: emp.users?.name || emp.employee_name || emp.employeeName || emp.name || '',
      employeeName: emp.employee_name || emp.employeeName || emp.users?.name || emp.name || '',
      email: emp.users?.email || emp.employee_email || emp.employeeEmail || emp.email || '',
      employeeEmail: emp.employee_email || emp.employeeEmail || emp.users?.email || emp.email || '',
      isAvailable: emp.is_available || emp.isAvailable || false,
      is_available: emp.is_available || emp.isAvailable || false,
      status: emp.users?.status || 'ACTIVE',
      isActive: emp.users?.status ? emp.users.status === 'ACTIVE' : (emp.users?.is_active ?? emp.is_active ?? true),
      is_active: emp.users?.status ? emp.users.status === 'ACTIVE' : (emp.users?.is_active ?? emp.is_active ?? true),
      acceptingOrders: emp.users?.accepting_orders ?? emp.accepting_orders ?? true,
      accepting_orders: emp.users?.accepting_orders ?? emp.accepting_orders ?? true,
      acceptingTasks: emp.accepting_tasks ?? emp.acceptingTasks ?? true,
      accepting_tasks: emp.accepting_tasks ?? emp.acceptingTasks ?? true,
      ordersCompleted: emp.orders_completed || emp.ordersCompleted || 0,
      orders_completed: emp.orders_completed || emp.ordersCompleted || 0,
      creditsCompleted: emp.credits_completed || emp.creditsCompleted || 0,
      credits_completed: emp.credits_completed || emp.creditsCompleted || 0,
      lastActiveAt: emp.last_active_at || emp.lastActiveAt || '',
      last_active_at: emp.last_active_at || emp.lastActiveAt || '',
      createdAt: emp.created_at || emp.createdAt || '',
      created_at: emp.created_at || emp.createdAt || '',
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
