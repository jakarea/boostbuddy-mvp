"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSWR } from "@/lib/cache/swr";
import { CACHE_KEYS } from "@/lib/cache/cacheContext";
import CACHE_TTL from "@/lib/cache/cache-ttl";
import { getEmployeeLeaderboardAction } from "@/app/actions/employee-stats";
import { getAllEmployeesStatsAction } from "@/app/actions/employee";
import { Calendar, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SetPasswordDialog } from "@/components/admin/SetPasswordDialog";

interface LeaderboardData {
  id: string;
  name: string;
  email: string;
  ordersCompleted: number;
  creditsCompleted: number;
}

interface FullEmployeeData {
  id: string;
  name: string;
  email: string;
  totalCreditsCompleted: number;
  totalOrdersCompleted: number;
  todayCreditsCompleted: number;
  todayOrdersCompleted: number;
  isAvailable: boolean;
}

interface SelectedEmployee {
  id: string;
  name: string;
  email: string;
}

interface LeaderboardClientProps {
  initialData: LeaderboardData[];
  initialRange: { startDate: string; endDate: string };
}

export default function LeaderboardClient({ initialData, initialRange }: LeaderboardClientProps) {
  const { t } = useTranslation("admin_employees");
  const [selectedRange, setSelectedRange] = useState<"thisWeek" | "lastWeek" | "thisMonth" | "lastMonth">("thisWeek");
  const [currentRange, setCurrentRange] = useState(initialRange);

  // Dialog state — null means closed (lazy mounting: dialog DOM is only created when open)
  const [dialogEmployee, setDialogEmployee] = useState<SelectedEmployee | null>(null);

  // Leaderboard data (performance stats) — refreshes every 2 min
  const { data: leaderboard } = useSWR({
    key: `${CACHE_KEYS.ADMIN_EMPLOYEE_PERFORMANCE}_${selectedRange}`,
    fetcher: async () => {
      const result = await getEmployeeLeaderboardAction(currentRange);
      if (result.success && result.data) return result.data;
      return initialData;
    },
    ttl: CACHE_TTL.MEDIUM, // 2 minutes
  });

  // Full employee list with canonical IDs — cached for 5 min (rarely changes)
  const { data: allEmployees } = useSWR<FullEmployeeData[]>({
    key: CACHE_KEYS.ADMIN_EMPLOYEES,
    fetcher: async () => {
      const result = await getAllEmployeesStatsAction();
      if (result.success && result.data) return result.data as FullEmployeeData[];
      return [];
    },
    ttl: CACHE_TTL.LONG, // 5 minutes
  });

  const handleRangeChange = (range: typeof selectedRange) => {
    setSelectedRange(range);

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (range) {
      case "thisWeek": {
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        break;
      }
      case "lastWeek": {
        const lastWeekDay = now.getDay();
        const lastWeekStart = new Date(now);
        lastWeekStart.setDate(now.getDate() - (lastWeekDay === 0 ? 6 : lastWeekDay - 1) - 7);
        lastWeekStart.setHours(0, 0, 0, 0);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        lastWeekEnd.setHours(23, 59, 59, 999);
        startDate = lastWeekStart;
        endDate = lastWeekEnd;
        break;
      }
      case "thisMonth": {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      }
      case "lastMonth": {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      }
    }

    setCurrentRange({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("leaderboard.title", "Employee Leaderboard")}</h1>
          <p className="text-sm text-zinc-500">{t("leaderboard.subtitle", "Employee performance tracking")}</p>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-4 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-zinc-500" />
          <select
            value={selectedRange}
            onChange={(e) => handleRangeChange(e.target.value as typeof selectedRange)}
            className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#168BB0]"
          >
            <option value="thisWeek">{t("filter_range.this_week", "This Week")}</option>
            <option value="lastWeek">{t("filter_range.last_week", "Last Week")}</option>
            <option value="thisMonth">{t("filter_range.this_month", "This Month")}</option>
            <option value="lastMonth">{t("filter_range.last_month", "Last Month")}</option>
          </select>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-6 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          <div>{t("leaderboard.th_rank", "Rank")}</div>
          <div className="col-span-2">{t("leaderboard.th_employee", "Employee")}</div>
          <div className="text-right">{t("leaderboard.th_orders", "Orders")}</div>
          <div className="text-right">{t("leaderboard.th_credits", "Credits")}</div>
          <div className="text-center">{t("leaderboard.th_actions", "Actions")}</div>
        </div>

        {(!leaderboard || leaderboard.length === 0) ? (
          <div className="p-8 text-center text-zinc-500 text-sm">
            {t("leaderboard.no_data", "No data available")}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {leaderboard.map((emp, index) => {
              // Match leaderboard row to full employee record by email to get canonical user ID
              const fullEmp = allEmployees?.find((e) => e.email === emp.email);

              return (
                <div
                  key={emp.id}
                  className="grid grid-cols-6 gap-4 px-4 py-3.5 items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors duration-150"
                >
                  {/* Rank */}
                  <div className="font-bold text-base">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : (
                      <span className="text-sm text-zinc-500">#{index + 1}</span>
                    )}
                  </div>

                  {/* Employee info */}
                  <div className="col-span-2 min-w-0">
                    <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">{emp.name}</div>
                    <div className="text-xs text-zinc-400 truncate">{emp.email}</div>
                  </div>

                  {/* Orders */}
                  <div className="text-right text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {emp.ordersCompleted}
                  </div>

                  {/* Credits */}
                  <div className="text-right text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {emp.creditsCompleted}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Set Password"
                      aria-label={`Set password for ${emp.name}`}
                      className="h-7 w-7 text-zinc-400 hover:text-[#168BB0] hover:bg-[#168BB0]/10 transition-all duration-150 rounded-md"
                      onClick={() =>
                        setDialogEmployee({
                          id: fullEmp?.id ?? emp.id,
                          name: emp.name,
                          email: emp.email,
                        })
                      }
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Set Password Dialog — only mounted when a row is selected (lazy) */}
      {dialogEmployee && (
        <SetPasswordDialog
          open={!!dialogEmployee}
          onOpenChange={(open) => {
            if (!open) setDialogEmployee(null);
          }}
          userId={dialogEmployee.id}
          userName={dialogEmployee.name}
          userEmail={dialogEmployee.email}
        />
      )}
    </div>
  );
}
