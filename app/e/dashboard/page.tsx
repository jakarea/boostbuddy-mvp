import { EmployeeDashboardContent } from "./EmployeeDashboardContent";
import { getEmployeeDashboardDataAction } from "@/app/actions/employee-dashboard";

export default async function EmployeeDashboardPage() {
  // Fetch data on server
  const result = await getEmployeeDashboardDataAction();

  if (!result.success) {
    console.error('Failed to load dashboard data');
    return (
      <div className="flex-1 flex justify-center items-center bg-zinc-950 text-white">
        <div className="text-center">
          <p className="text-sm text-zinc-400">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  // Type guard for success response with data
  if (!('data' in result) || !result.data) {
    console.error('Invalid response format');
    return (
      <div className="flex-1 flex justify-center items-center bg-zinc-950 text-white">
        <div className="text-center">
          <p className="text-sm text-zinc-400">Invalid response format</p>
        </div>
      </div>
    );
  }

  return <EmployeeDashboardContent initialData={result.data} />;
}
