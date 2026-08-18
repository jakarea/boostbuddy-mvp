import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import LeaderboardClient from "./leaderboard-client";
import { getEmployeeLeaderboardAction } from "@/app/actions/employee-stats";
import { requireAuth } from "@/lib/auth/server-auth";

export const metadata = {
  title: "Employee Leaderboard",
};

export default async function LeaderboardPage() {
  const auth = await requireAuth();

  // Calculate "This Week" range (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  start.setHours(0, 0, 0, 0);

  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const range = {
    startDate: start.toISOString(),
    endDate: endDate.toISOString()
  };

  const result = await getEmployeeLeaderboardAction(range);

  return (
    <Suspense fallback={<LoadingScreen />}>
      <LeaderboardClient initialData={result.success ? (result.data || []) : []} initialRange={range} />
    </Suspense>
  );
}
