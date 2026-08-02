"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { EmployeeUser } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus, ChevronLeft, ChevronRight, Shield, UserCog, CheckCircle, XCircle, Clock } from "lucide-react";

interface EmployeesListProps {
  paginatedEmployees: EmployeeUser[];
  onAddNew: () => void;
  onManage: (id: string) => void;
  roleFilter: "ADMIN" | "EMPLOYEE" | "ALL";
  setRoleFilter: (filter: "ADMIN" | "EMPLOYEE" | "ALL") => void;
  statusFilter: "ACTIVE" | "PENDING" | "DEACTIVATED" | "ALL";
  setStatusFilter: (filter: "ACTIVE" | "PENDING" | "DEACTIVATED" | "ALL") => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  filteredEmployees: EmployeeUser[];
  itemsPerPage: number;
  i18nLanguage: string;
}

export default function EmployeesList({
  paginatedEmployees,
  onAddNew,
  onManage,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  searchTerm,
  setSearchTerm,
  currentPage,
  setCurrentPage,
  filteredEmployees,
  itemsPerPage,
  i18nLanguage,
}: EmployeesListProps) {
  const { t } = useTranslation("admin_employees");

  const getEmailVerifiedBadge = (isVerified?: boolean) => {
    if (isVerified === true) {
      return (
        <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Verified
        </div>
      );
    } else if (isVerified === false) {
      return (
        <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Unverified
        </div>
      );
    }
    return null;
  };

  const getRoleIcon = (role: string) => {
    return role === "ADMIN" ? Shield : UserCog;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
      PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
      DEACTIVATED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    };

    const icons = {
      ACTIVE: CheckCircle,
      PENDING: Clock,
      DEACTIVATED: XCircle,
    };

    const Icon = icons[status as keyof typeof icons];

    return (
      <Badge className={variants[status as keyof typeof variants] + " text-[10px] font-medium px-2 py-0.5 gap-1 flex items-center"}>
        {Icon && <Icon className="h-3 w-3" />}
        {status}
      </Badge>
    );
  };

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("title", { defaultValue: "Employee Management" })}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {t("subtitle", { defaultValue: "Manage admin and employee accounts" })}
          </p>
        </div>
        <Button
          onClick={onAddNew}
          className="bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold cursor-pointer"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {t("btn_add_employee", { defaultValue: "Add Employee" })}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            placeholder={t("search_placeholder", { defaultValue: "Search by name or email..." })}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "ACTIVE" | "PENDING" | "DEACTIVATED" | "ALL")}>
          <SelectTrigger className="w-full sm:w-40 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <SelectValue placeholder={t("filter_status", { defaultValue: "All Status" })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("filter_all_status", { defaultValue: "All Status" })}</SelectItem>
            <SelectItem value="ACTIVE">{t("filter_active", { defaultValue: "Active Only" })}</SelectItem>
            <SelectItem value="PENDING">{t("filter_pending", { defaultValue: "Pending Only" })}</SelectItem>
            <SelectItem value="DEACTIVATED">{t("filter_deactivated", { defaultValue: "Deactivated Only" })}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as "ADMIN" | "EMPLOYEE" | "ALL")}>
          <SelectTrigger className="w-full sm:w-40 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <SelectValue placeholder={t("filter_role", { defaultValue: "All Roles" })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("filter_all", { defaultValue: "All Roles" })}</SelectItem>
            <SelectItem value="ADMIN">{t("filter_admin", { defaultValue: "Admin Only" })}</SelectItem>
            <SelectItem value="EMPLOYEE">{t("filter_employee", { defaultValue: "Employee Only" })}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="text-left p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  {t("th_name", { defaultValue: "Name" })}
                </th>
                <th className="text-left p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  {t("th_email", { defaultValue: "Email" })}
                </th>
                <th className="text-left p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  {t("th_role", { defaultValue: "Role" })}
                </th>
                <th className="text-left p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  {t("th_status", { defaultValue: "Status" })}
                </th>
                <th className="text-right p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  {t("th_actions", { defaultValue: "Actions" })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500 text-sm">
                    {searchTerm || roleFilter !== "ALL" || statusFilter !== "ALL"
                      ? t("no_results", { defaultValue: "No employees found matching your criteria" })
                      : t("no_employees", { defaultValue: "No employees found" })}
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#168BB0]/10 flex items-center justify-center">
                          {React.createElement(getRoleIcon(employee.role), {
                            className: "h-4 w-4 text-[#168BB0]",
                          })}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{employee.name}</div>
                          <div className="text-xs text-zinc-500">
                            {t("joined", { defaultValue: "Joined" })}: {new Date(employee.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">{employee.email}</div>
                      {getEmailVerifiedBadge(employee.email_verified)}
                    </td>
                    <td className="p-4">
                      <Badge className="bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 text-[10px] font-bold">
                        {employee.role}
                      </Badge>
                    </td>
                    <td className="p-4">{getStatusBadge(employee.status)}</td>
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onManage(employee.id)}
                        className="h-8 text-xs border-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      >
                        {t("btn_manage", { defaultValue: "Manage" })}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-500">
            {t("showing", { defaultValue: "Showing" })} {(currentPage - 1) * itemsPerPage + 1}-
            {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} {t("of", { defaultValue: "of" })}{" "}
            {filteredEmployees.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-8 px-3 border-zinc-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-zinc-600">
              {t("page", { defaultValue: "Page" })} {currentPage} {t("of", { defaultValue: "of" })} {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-3 border-zinc-200"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
