"use client";

import { useState } from "react";
import { useSWR } from "@/lib/cache/swr";
import { CACHE_KEYS } from "@/lib/cache/cacheContext";
import CACHE_TTL from "@/lib/cache/cache-ttl";
import { getEmployeeLeaderboardAction } from "@/app/actions/employee-stats";
import { Loader2, TrendingUp, Calendar } from "lucide-react";

interface LeaderboardData {
  id: string;
  name: string;
  email: string;
  ordersCompleted: number;
  creditsCompleted: number;
}

interface LeaderboardClientProps {
  initialData: LeaderboardData[];
  initialRange: { startDate: string; endDate: string };
}

export default function LeaderboardClient({ initialData, initialRange }: LeaderboardClientProps) {
  const [selectedRange, setSelectedRange] = useState<"thisWeek" | "lastWeek" | "thisMonth" | "lastMonth">("thisWeek");
  const [currentRange, setCurrentRange] = useState(initialRange);

  const { data: leaderboard, refresh } = useSWR({
    key: `${CACHE_KEYS.ADMIN_EMPLOYEE_PERFORMANCE}_${selectedRange}`,
    fetcher: async () => {
      const result = await getEmployeeLeaderboardAction(currentRange);
      if (result.success && result.data) {
        return result.data;
      }
      return initialData;
    },
    ttl: CACHE_TTL.MEDIUM, // 3 minutes
  });

  const handleRangeChange = (range: typeof selectedRange) => {
    setSelectedRange(range);

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (range) {
      case "thisWeek":
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        break;
      case "lastWeek":
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
      case "thisMonth":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case "lastMonth":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
    }

    setCurrentRange({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employee Leaderboard</h1>
          <p className="text-sm text-zinc-500">Employee performance tracking</p>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-zinc-500" />
          <select
            value={selectedRange}
            onChange={(e) => handleRangeChange(e.target.value as any)}
            className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm"
          >
            <option value="thisWeek">This Week</option>
            <option value="lastWeek">Last Week</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
          </select>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-5 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          <div>Rank</div>
          <div>Employee</div>
          <div className="text-right">Orders</div>
          <div className="text-right">Credits</div>
          <div className="text-center">Trend</div>
        </div>

        {(!leaderboard || leaderboard.length === 0) ? (
          <div className="p-8 text-center text-zinc-500">No data available</div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {leaderboard.map((emp, index) => (
              <div key={emp.id} className="grid grid-cols-5 gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                <div className="font-bold text-lg">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </div>
                <div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">{emp.name}</div>
                  <div className="text-xs text-zinc-500">{emp.email}</div>
                </div>
                <div className="text-right font-medium">{emp.ordersCompleted}</div>
                <div className="text-right font-bold text-emerald-600">{emp.creditsCompleted}</div>
                <div className="text-center">
                  <span className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded">
                    {index === 0 ? '📈 Top' : '•'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
