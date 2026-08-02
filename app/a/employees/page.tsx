import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import EmployeeClient from "./employee-client";
import { getEmployeeUsersData } from "@/lib/data/employee";
import { requireAuth } from "@/lib/auth/server-auth";
import { ServerFetchTimeLogger } from "@/components/ServerFetchTimeLogger";

export const metadata = {
  title: "Employee Management - Admin Portal",
};

export default async function EmployeePage() {
  const start = Date.now();
  const auth = await requireAuth({ role: "ADMIN" });
  if (!auth.success) return null;

  const response = await getEmployeeUsersData();
  const initialEmployees = (response.success ? response.data : []) as any[];
  const duration = Date.now() - start;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <ServerFetchTimeLogger pageName="/a/employees" fetchTimeMs={duration} />
      <EmployeeClient initialEmployees={initialEmployees} />
    </Suspense>
  );
}
