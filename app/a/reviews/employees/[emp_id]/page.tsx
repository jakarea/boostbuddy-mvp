import { getEmployeeCompletedOrdersAction } from "@/app/actions/admin-reviews";
import { notFound } from "next/navigation";
import EmployeeCompletedOrdersClient from "./employee-orders-client";

interface PageProps {
  params: Promise<{
    emp_id: string;
  }>;
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    dateRange?: string;
    customStartDate?: string;
    customEndDate?: string;
  }>;
}

export default async function EmployeeCompletedOrdersPage({
  params,
  searchParams,
}: PageProps) {
  const { emp_id } = await params;
  const { page = "1", pageSize = "20", dateRange = "thisWeek", customStartDate, customEndDate } = await searchParams;

  // Calculate date range
  let dateFrom: string | undefined;
  let dateTo: string | undefined;

  const now = new Date();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  if (dateRange && dateRange !== "all" && dateRange !== "custom") {
    switch (dateRange) {
      case "thisWeek": {
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        startOfWeek.setHours(0, 0, 0, 0);
        dateFrom = startOfWeek.toISOString();
        dateTo = endOfToday.toISOString();
        break;
      }
      case "lastWeek": {
        const dayOfWeek = now.getDay();
        const startOfLastWeek = new Date(now);
        startOfLastWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) - 7);
        startOfLastWeek.setHours(0, 0, 0, 0);
        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
        endOfLastWeek.setHours(23, 59, 59, 999);
        dateFrom = startOfLastWeek.toISOString();
        dateTo = endOfLastWeek.toISOString();
        break;
      }
      case "thisMonth": {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        dateFrom = startOfMonth.toISOString();
        dateTo = endOfToday.toISOString();
        break;
      }
      case "thisYear": {
        const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        dateFrom = startOfYear.toISOString();
        dateTo = endOfToday.toISOString();
        break;
      }
    }
  } else if (dateRange === "custom" && customStartDate && customEndDate) {
    const start = new Date(customStartDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customEndDate);
    end.setHours(23, 59, 59, 999);
    dateFrom = start.toISOString();
    dateTo = end.toISOString();
  }

  // Fetch completed orders for this employee with pagination and date filter
  const result = await getEmployeeCompletedOrdersAction(emp_id, {
    page: parseInt(page, 10),
    pageSize: parseInt(pageSize, 10),
    dateFrom,
    dateTo,
  });

  if (!result.success) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-red-500">
          Failed to load employee orders: {result.error}
        </p>
      </div>
    );
  }

  return (
    <EmployeeCompletedOrdersClient
      employeeId={emp_id}
      initialOrders={result.data || []}
      initialTotalCount={result.pagination?.totalCount || 0}
    />
  );
}
