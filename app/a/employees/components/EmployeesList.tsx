"use client";

import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import { EmployeeUser } from "./types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus, ChevronLeft, ChevronRight, Shield, UserCog, CheckCircle, XCircle, Clock, X, Loader2, Calendar } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

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
  goToPage: (page: number) => void;
  goToNextPage: (totalPages: number) => void;
  goToPrevPage: () => void;
  handleClearSearch: () => void;
  searchParams: ReturnType<typeof useSearchParams>;
  router: ReturnType<typeof useRouter>;
  onRefresh?: () => void;
  isCacheValid?: boolean;
  // Date range props
  dateRange?: "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "custom" | "all";
  setDateRange?: (range: "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "custom" | "all") => void;
  customStartDate?: string;
  setCustomStartDate?: (date: string) => void;
  customEndDate?: string;
  setCustomEndDate?: (date: string) => void;
  showDatePicker?: boolean;
  setShowDatePicker?: (show: boolean) => void;
  employeeStats?: Record<string, { ordersCompleted: number; creditsCompleted: number }>;
}

const EmployeesList = memo(function EmployeesList({
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
  goToPage,
  goToNextPage,
  goToPrevPage,
  handleClearSearch,
  searchParams,
  router,
  onRefresh,
  isCacheValid = true,
  dateRange = "all",
  setDateRange,
  customStartDate = "",
  setCustomStartDate,
  customEndDate = "",
  setCustomEndDate,
  showDatePicker = false,
  setShowDatePicker,
  employeeStats = {},
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
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              onClick={onRefresh}
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={!isCacheValid}
            >
              <Loader2 className={`h-4 w-4 ${!isCacheValid ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
          <Button
            onClick={onAddNew}
            className="bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold cursor-pointer"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {t("btn_add_employee", { defaultValue: "Add Employee" })}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow flex-1">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("search_placeholder", { defaultValue: "Search by name or email..." })}
                className="w-full pl-10 pr-10 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#168BB0]"
              />
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {searchTerm && (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                Found {filteredEmployees.length} result{filteredEmployees.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
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

      {/* Date Range Filter */}
      {(setDateRange && setShowDatePicker) && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-zinc-500" />
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value as typeof dateRange);
                if (e.target.value !== "custom") {
                  setShowDatePicker(false);
                }
              }}
              className="h-10 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#168BB0]"
            >
              <option value="all">All Time</option>
              <option value="thisWeek">This Week</option>
              <option value="lastWeek">Last Week</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="custom">Custom Range</option>
            </select>
            {dateRange === "custom" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="gap-2"
              >
                {showDatePicker ? "Close" : "Select Dates"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Custom Date Range Picker */}
      {showDatePicker && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-zinc-500 mb-1">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomStartDate?.(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#168BB0]"
              />
            </div>
            <div className="flex items-center pt-5">
              <span className="text-zinc-400">→</span>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-zinc-500 mb-1">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomEndDate?.(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#168BB0]"
              />
            </div>
            <div className="flex gap-2 pt-5">
              <Button
                onClick={() => {
                  setCustomStartDate?.("");
                  setCustomEndDate?.("");
                  setShowDatePicker?.(false);
                  setDateRange?.("all");
                }}
                variant="outline"
                size="sm"
              >
                Clear
              </Button>
              <Button
                onClick={() => setShowDatePicker?.(false)}
                disabled={!customStartDate || !customEndDate}
                size="sm"
                className="bg-[#168BB0] hover:bg-[#147aa0]"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}

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
                  {t("th_login", { defaultValue: "Login" })}
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
        <div className="flex items-center justify-between bg-white dark:bg-zinc-800 rounded-lg p-4 shadow">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {searchTerm
              ? `Showing ${currentPage} of ${totalPages} pages (${filteredEmployees.length} filtered)`
              : `Showing ${currentPage} of ${totalPages} pages (${filteredEmployees.length} employees)`
            }
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`min-w-[40px] px-3 py-2 border rounded-lg ${
                    currentPage === page
                      ? 'bg-[#168BB0] text-white border-[#168BB0]'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-700 dark:border-zinc-700'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => goToNextPage(totalPages)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default EmployeesList;
