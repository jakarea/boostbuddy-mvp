"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getEmployeePerformanceAction } from "@/app/actions/admin-reviews";
import {
  UserCheck,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Mail,
  RefreshCw,
  TrendingUp
} from "lucide-react";

interface EmployeePerformance {
  id: string;
  userId: string;
  employeeName: string;
  employeeEmail: string;
  isAvailable: boolean;
  ordersCompleted: number;
  ordersSkipped: number;
  lastActiveAt: string;
  createdAt: string;
}

export default function AdminReviewsEmployeesPage() {
  const { t } = useTranslation("admin_reviews");
  const { error } = useToast();
  const [employees, setEmployees] = useState<EmployeePerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"completed" | "skipped" | "recent">("completed");

  const loadData = async () => {
    try {
      setIsLoading(true);
      const result = await getEmployeePerformanceAction();
      if (result.success) {
        // Normalize field names for dual-mode compatibility
        const normalizedData = (result.data as any[])?.map(emp => ({
          id: emp.id,
          userId: emp.user_id || emp.userId,
          employeeName: emp.employee_name || emp.employeeName || emp.name,
          employeeEmail: emp.employee_email || emp.employeeEmail || emp.email,
          isAvailable: emp.is_available || emp.isAvailable || emp.isAvailable,
          ordersCompleted: emp.orders_completed || emp.ordersCompleted || 0,
          ordersSkipped: emp.orders_skipped || emp.ordersSkipped || 0,
          lastActiveAt: emp.last_active_at || emp.lastActiveAt,
          createdAt: emp.created_at || emp.createdAt
        })) || [];
        setEmployees(normalizedData);
      } else {
        error(result.error || "Failed to load employee data");
      }
    } catch (err) {
      error("Failed to load employee data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [error]);

  const getSortedEmployees = () => {
    const sorted = [...employees];
    switch (sortBy) {
      case "completed":
        return sorted.sort((a, b) => b.ordersCompleted - a.ordersCompleted);
      case "skipped":
        return sorted.sort((a, b) => b.ordersSkipped - a.ordersSkipped);
      case "recent":
        return sorted.sort((a, b) =>
          new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime()
        );
      default:
        return sorted;
    }
  };

  const getCompletionRate = (completed: number, skipped: number) => {
    const total = completed + skipped;
    if (total === 0) return "0%";
    return Math.round((completed / total) * 100) + "%";
  };

  const isActiveRecently = (lastActiveAt: string | undefined) => {
    if (!lastActiveAt) return false;
    const lastActive = new Date(lastActiveAt);
    const now = new Date();
    const daysDiff = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7; // Active in last 7 days
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#168BB0]"></div>
      </div>
    );
  }

  const sortedEmployees = getSortedEmployees();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t("employees.title", "Employee Performance")}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {t("employees.subtitle", "Monitor employee performance, availability, and completion rates")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {t("employees.refresh", "Refresh")}
        </Button>
      </div>

      {/* Sorting Controls */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-600">
          {t("employees.sortBy", "Sort by")}:
        </span>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={sortBy === "completed" ? "default" : "outline"}
            onClick={() => setSortBy("completed")}
            className="text-xs"
          >
            {t("employees.sort.completed", "Most Completed")}
          </Button>
          <Button
            size="sm"
            variant={sortBy === "skipped" ? "default" : "outline"}
            onClick={() => setSortBy("skipped")}
            className="text-xs"
          >
            {t("employees.sort.skipped", "Most Skipped")}
          </Button>
          <Button
            size="sm"
            variant={sortBy === "recent" ? "default" : "outline"}
            onClick={() => setSortBy("recent")}
            className="text-xs"
          >
            {t("employees.sort.recent", "Recently Active")}
          </Button>
        </div>
      </div>

      {/* Employees List */}
      {sortedEmployees.length === 0 ? (
        <Card className="p-12 text-center">
          <UserCheck className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {t("employees.noEmployees", "No Employees Found")}
          </h3>
          <p className="text-sm text-zinc-500">
            {t("employees.noEmployeesMessage", "No employee performance data available yet.")}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedEmployees.map((employee) => (
            <Card key={employee.id} className="p-4 hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                    {employee.employeeName}
                  </h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Mail className="h-3 w-3 text-zinc-400" />
                    <p className="text-xs text-zinc-500 truncate">
                      {employee.employeeEmail}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {employee.isAvailable ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      {t("employees.available", "Available")}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full text-xs font-medium">
                      {t("employees.unavailable", "Unavailable")}
                    </span>
                  )}
                  {isActiveRecently(employee.lastActiveAt) && (
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="h-3 w-3" />
                      {t("employees.activeRecently", "Active recently")}
                    </span>
                  )}
                </div>
              </div>

              {/* Performance Stats */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-green-600">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span className="text-lg font-bold">{employee.ordersCompleted}</span>
                  </div>
                  <p className="text-xs text-zinc-600 mt-1">
                    {t("employees.completed", "Completed")}
                  </p>
                </div>
                <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-yellow-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span className="text-lg font-bold">{employee.ordersSkipped}</span>
                  </div>
                  <p className="text-xs text-zinc-600 mt-1">
                    {t("employees.skipped", "Skipped")}
                  </p>
                </div>
                <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-blue-600">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span className="text-lg font-bold">
                      {getCompletionRate(employee.ordersCompleted, employee.ordersSkipped)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 mt-1">
                    {t("employees.rate", "Rate")}
                  </p>
                </div>
              </div>

              {/* Last Active */}
              <div className="flex items-center gap-2 text-xs text-zinc-500 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <Calendar className="h-3 w-3" />
                {employee.lastActiveAt ? (
                  <span>
                    {t("employees.lastActive", "Last active: {{date}}", {
                      date: new Date(employee.lastActiveAt).toLocaleDateString()
                    })}
                  </span>
                ) : (
                  <span>{t("employees.neverActive", "Never active")}</span>
                )}
              </div>

              {/* Member Since */}
              <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                <UserCheck className="h-3 w-3" />
                <span>
                  {t("employees.memberSince", "Member since {{date}}", {
                    date: new Date(employee.createdAt).toLocaleDateString()
                  })}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {employees.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {employees.length}
              </p>
              <p className="text-xs text-zinc-600">
                {t("employees.summary.total", "Total Employees")}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {employees.filter(e => e.isAvailable).length}
              </p>
              <p className="text-xs text-zinc-600">
                {t("employees.summary.available", "Currently Available")}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {employees.reduce((sum, e) => sum + e.ordersCompleted, 0)}
              </p>
              <p className="text-xs text-zinc-600">
                {t("employees.summary.totalCompleted", "Total Completed")}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">
                {Math.round(
                  employees.reduce((sum, e) => sum + (e.ordersCompleted + e.ordersSkipped > 0
                    ? (e.ordersCompleted / (e.ordersCompleted + e.ordersSkipped)) * 100
                    : 0), 0) / employees.length
                )}%
              </p>
              <p className="text-xs text-zinc-600">
                {t("employees.summary.avgRate", "Avg. Completion Rate")}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
