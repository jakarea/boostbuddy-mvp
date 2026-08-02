"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { EmployeeUser } from "./components/types";
import EmployeesList from "./components/EmployeesList";

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

  // Search/Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ADMIN" | "EMPLOYEE" | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "PENDING" | "DEACTIVATED" | "ALL">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Edit/Details states
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeUser | null>(null);
  const [, startTransition] = useTransition();

  // Load employee details when employeeId changes
  useEffect(() => {
    let isMounted = true;

    const user = initialEmployees.find((u) => u.id === employeeId);
    if (employeeId && user) {
      setSelectedEmployee(user);
    } else {
      setSelectedEmployee(null);
    }

    return () => {
      isMounted = false;
    };
  }, [employeeId, initialEmployees]);

  // Filter employees list
  const filteredEmployees = useMemo(() => {
    return initialEmployees.filter((u) => {
      // Search query
      const matchSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());

      // Role filter
      const matchRole = roleFilter === "ALL" || u.role === roleFilter;

      // Status filter
      const matchStatus = statusFilter === "ALL" || u.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [initialEmployees, searchTerm, roleFilter, statusFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  // Calculate paginated results
  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEmployees.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEmployees, currentPage, itemsPerPage]);

  // Render 1: Create New Employee Form
  if (action === "new") {
    return (
      <EmployeeForm onCancel={() => router.push("/a/employees")} />
    );
  }

  // Render 2: Edit Employee Details
  if (selectedEmployee && employeeId) {
    return (
      <EmployeeDetailsModal
        employee={selectedEmployee}
        onClose={() => router.push("/a/employees")}
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
    />
  );
}
