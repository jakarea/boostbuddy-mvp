"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { EmployeeUser } from "./components/types";
import EmployeesList from "./components/EmployeesList";
import { useSWR } from "@/lib/cache/swr";
import { CACHE_KEYS } from "@/lib/cache/cacheContext";
import CACHE_TTL from "@/lib/cache/cache-ttl";
import { getEmployeesData } from "@/lib/data/employee";
import { getAllEmployeesStatsByRangeAction } from "@/app/actions/employee-stats";
import { Calendar } from "lucide-react";

// Dynamic imports for code splitting
const EmployeeForm = dynamic(() => import("./components/EmployeeForm"), { ssr: false });
const EmployeeDetailsModal = dynamic(() => import("./components/EmployeeDetailsModal"), { ssr: false });

export default function EmployeeClient({
  initialEmployees,
}: {
  initialEmployees: EmployeeUser[];
}) {
  const { i18n } = useTranslation("admin_employees");
  const router = useRouter();
  const searchParams = useSearchParams();
  const employeeId = searchParams.get("id");
  const action = searchParams.get("action"); // "new"

  // SWR for employees data - 5 minute cache
  const { data: employees, refresh, isValid } = useSWR<EmployeeUser[]>({
    key: CACHE_KEYS.ADMIN_EMPLOYEES,
    fetcher: getEmployeesData,
    ttl: CACHE_TTL.LONG, // 5 minutes
    initialData: initialEmployees,
  });

  // Search/Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [roleFilter, setRoleFilter] = useState<"ADMIN" | "EMPLOYEE" | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "PENDING" | "DEACTIVATED" | "ALL">("ALL");
  const [dateRange, setDateRange] = useState<"thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "custom" | "all">("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [employeeStats, setEmployeeStats] = useState<Record<string, { ordersCompleted: number; creditsCompleted: number }>>({});
  const currentPageState = useState(parseInt(searchParams.get("page") || "1", 10));
  const currentPage = currentPageState[0];
  const setCurrentPage = currentPageState[1];
  const itemsPerPage = 10;

  // Navigation handlers
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/a/employees?${params.toString()}`);
    setCurrentPage(page);
  };

  const goToNextPage = (totalPages: number) => {
    if (currentPage < totalPages) goToPage(currentPage + 1);
  };

  const goToPrevPage = () => {
    if (currentPage > 1) goToPage(currentPage - 1);
  };

  const handleClearSearch = () => setSearchTerm("");

  // Edit/Details states
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeUser | null>(null);
  const [, startTransition] = useTransition();

  // Load employee details when employeeId changes
  useEffect(() => {
    let isMounted = true;

    const user = employees?.find((u) => u.id === employeeId);
    if (employeeId && user) {
      setSelectedEmployee(user);
    } else {
      setSelectedEmployee(null);
    }

    return () => {
      isMounted = false;
    };
  }, [employeeId, employees]);

  // Filter employees list
  const filteredEmployees = useMemo(() => {
    return employees?.filter((u) => {
      // Search query
      const matchSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());

      // Role filter
      const matchRole = roleFilter === "ALL" || u.role === roleFilter;

      // Status filter
      const matchStatus = statusFilter === "ALL" || u.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    }) || [];
  }, [employees, searchTerm, roleFilter, statusFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    router.push(`/a/employees?${params.toString()}`);
  }, [searchTerm, roleFilter]);

  // Fetch employee stats when date range changes
  useEffect(() => {
    const fetchStats = async () => {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = new Date();

      switch (dateRange) {
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
        case "custom":
          if (customStartDate && customEndDate) {
            startDate = new Date(customStartDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(customEndDate);
            endDate.setHours(23, 59, 59, 999);
          } else {
            setEmployeeStats({});
            return;
          }
          break;
        default:
          setEmployeeStats({});
          return;
      }

      const result = await getAllEmployeesStatsByRangeAction({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      if (result.success && result.data) {
        const statsMap: Record<string, { ordersCompleted: number; creditsCompleted: number }> = {};
        result.data.forEach(emp => {
          statsMap[emp.id] = {
            ordersCompleted: emp.ordersCompleted,
            creditsCompleted: emp.creditsCompleted
          };
        });
        setEmployeeStats(statsMap);
      } else {
        setEmployeeStats({});
      }
    };

    fetchStats();
  }, [dateRange, customStartDate, customEndDate]);

  // Calculate paginated results
  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEmployees.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEmployees, currentPage, itemsPerPage]);

  // Render 1: Create New Employee Form
  if (action === "new") {
    return (
      <EmployeeForm onCancel={() => router.push("/a/employees")} onRefresh={refresh} />
    );
  }

  // Render 2: Edit Employee Details
  if (selectedEmployee && employeeId) {
    return (
      <EmployeeDetailsModal
        employee={selectedEmployee}
        onClose={() => router.push("/a/employees")}
        onRefresh={refresh}
      />
    );
  }

  // Render 3: Employees List View
  return (
    <EmployeesList
      paginatedEmployees={paginatedEmployees}
      onAddNew={() => router.push("/a/employees?action=new")}
      onManage={(id) => router.push(`/a/employees?id=${id}`)}
      roleFilter={roleFilter}
      setRoleFilter={setRoleFilter}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      filteredEmployees={filteredEmployees}
      itemsPerPage={itemsPerPage}
      i18nLanguage={i18n.language}
      goToPage={goToPage}
      goToNextPage={goToNextPage}
      goToPrevPage={goToPrevPage}
      handleClearSearch={handleClearSearch}
      searchParams={searchParams}
      router={router}
      onRefresh={refresh}
      isCacheValid={isValid}
      dateRange={dateRange}
      setDateRange={setDateRange}
      customStartDate={customStartDate}
      setCustomStartDate={setCustomStartDate}
      customEndDate={customEndDate}
      setCustomEndDate={setCustomEndDate}
      showDatePicker={showDatePicker}
      setShowDatePicker={setShowDatePicker}
      employeeStats={employeeStats}
    />
  );
}
