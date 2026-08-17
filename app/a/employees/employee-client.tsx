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
import { getEmployeesData } from "@/lib/data/employee";

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
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1", 10));
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
    />
  );
}
