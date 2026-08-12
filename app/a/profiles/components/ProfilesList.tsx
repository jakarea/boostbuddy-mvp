"use client";

import React, { memo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ProfileAccountRecord } from "./types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FolderKey, Plus, UserCheck, UserMinus, Calendar, Edit, Trash, Search, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfilesListProps {
  profiles: ProfileAccountRecord[];
  paginatedProfiles: ProfileAccountRecord[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAssign: (id: string) => void;
  onUnassign: (id: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  filteredProfiles: ProfileAccountRecord[];
  itemsPerPage: number;
  onAddNew: () => void;
  formatDate: (dateString?: string | null) => string | null;
  getClientName: (p: ProfileAccountRecord) => string;
  onRefresh?: () => void;
  isCacheValid?: boolean;
}

const getStatusBadgeStyle = (status: string) => {
  if (status === "AVAILABLE") return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
  else if (status === "ASSIGNED") return "bg-sky-500/10 text-sky-700 dark:text-sky-400";
  else if (status === "ACTIVE") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  else if (status === "EXPIRED") return "bg-red-500/10 text-red-700 dark:text-red-400 animate-pulse";
  else if (status === "REQUEST_CHANGE") return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
  else if (status === "BANNED") return "bg-red-500/15 text-red-800 dark:text-red-400";
  else if (status === "CANCELLED") return "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400";
  return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
};

const ProfilesList = memo(function ProfilesList({
  profiles,
  paginatedProfiles,
  onEdit,
  onDelete,
  onAssign,
  onUnassign,
  statusFilter,
  setStatusFilter,
  searchTerm,
  setSearchTerm,
  currentPage,
  setCurrentPage,
  filteredProfiles,
  itemsPerPage,
  onAddNew,
  formatDate,
  getClientName,
  onRefresh,
  isCacheValid = true,
}: ProfilesListProps) {
  const { t } = useTranslation("admin_profiles");
  const { t: tStatus } = useTranslation("status");
  const router = useRouter();
  const searchParams = useSearchParams();

  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage);

  // Navigation handlers
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/a/profiles?${params.toString()}`);
    setCurrentPage(page);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  if (filteredProfiles.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{t("title")}</h1>
            <p className="text-xs text-zinc-500 mt-1">
              {t("subtitle")}
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
              className="bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold cursor-pointer"
              onClick={onAddNew}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("btn_add_profile")}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardContent className="p-4 flex flex-col justify-center">
              <span className="text-xs font-bold text-zinc-500 mb-1">{t("stat_total")}</span>
              <span className="text-2xl font-black text-zinc-900 dark:text-white">{profiles.length}</span>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-zinc-900 border-emerald-200 dark:border-emerald-500/20 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-20">
              <FolderKey className="h-10 w-10 text-emerald-500" />
            </div>
            <CardContent className="p-4 flex flex-col justify-center">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">{t("stat_available")}</span>
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                {profiles.filter(p => p.status === "AVAILABLE").length}
              </span>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-zinc-900 border-[#168BB0]/30 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-20">
              <UserCheck className="h-10 w-10 text-[#168BB0]" />
            </div>
            <CardContent className="p-4 flex flex-col justify-center">
              <span className="text-xs font-bold text-[#168BB0] dark:text-[#45B0D2] mb-1">{t("stat_active")}</span>
              <span className="text-2xl font-black text-[#168BB0] dark:text-[#45B0D2]">
                {profiles.filter(p => p.status === "ACTIVE").length}
              </span>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-zinc-900 border-amber-200 dark:border-amber-500/20 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-20">
              <Calendar className="h-10 w-10 text-amber-500" />
            </div>
            <CardContent className="p-4 flex flex-col justify-center">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">{t("stat_expiring")}</span>
              <span className="text-2xl font-black text-amber-700 dark:text-amber-400">
                {profiles.filter(p => {
                  if (!p.expiration_date) return false;
                  const days = (new Date(p.expiration_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
                  return days > 0 && days <= 7;
                }).length}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-zinc-600">
            {t("filter_label", "Filter by status")}:
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={statusFilter === "ALL" ? "default" : "outline"}
              onClick={() => setStatusFilter("ALL")}
              className="text-xs"
            >
              {t("filter_all", "All")}
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "AVAILABLE" ? "default" : "outline"}
              onClick={() => setStatusFilter("AVAILABLE")}
              className="text-xs"
            >
              {t("filter_available", "Available")}
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "ASSIGNED" ? "default" : "outline"}
              onClick={() => setStatusFilter("ASSIGNED")}
              className="text-xs"
            >
              {t("filter_assigned", "Assigned")}
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "ACTIVE" ? "default" : "outline"}
              onClick={() => setStatusFilter("ACTIVE")}
              className="text-xs"
            >
              {t("filter_active", "Active")}
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "EXPIRED" ? "default" : "outline"}
              onClick={() => setStatusFilter("EXPIRED")}
              className="text-xs"
            >
              {t("filter_expired", "Expired")}
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("search_placeholder", "Search by name, email, or IXBrowser ID...")}
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
                Found {filteredProfiles.length} result{filteredProfiles.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Empty State */}
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="p-8 text-center text-xs text-zinc-500">
            {t("empty_filtered")}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{t("title")}</h1>
          <p className="text-xs text-zinc-500 mt-1">
            {t("subtitle")}
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
            className="bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold cursor-pointer"
            onClick={onAddNew}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("btn_add_profile")}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardContent className="p-4 flex flex-col justify-center">
            <span className="text-xs font-bold text-zinc-500 mb-1">{t("stat_total")}</span>
            <span className="text-2xl font-black text-zinc-900 dark:text-white">{profiles.length}</span>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-zinc-900 border-emerald-200 dark:border-emerald-500/20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <FolderKey className="h-10 w-10 text-emerald-500" />
          </div>
          <CardContent className="p-4 flex flex-col justify-center">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">{t("stat_available")}</span>
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {profiles.filter(p => p.status === "AVAILABLE").length}
            </span>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-zinc-900 border-[#168BB0]/30 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <UserCheck className="h-10 w-10 text-[#168BB0]" />
          </div>
          <CardContent className="p-4 flex flex-col justify-center">
            <span className="text-xs font-bold text-[#168BB0] dark:text-[#45B0D2] mb-1">{t("stat_active")}</span>
            <span className="text-2xl font-black text-[#168BB0] dark:text-[#45B0D2]">
              {profiles.filter(p => p.status === "ACTIVE").length}
            </span>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-zinc-900 border-amber-200 dark:border-amber-500/20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <Calendar className="h-10 w-10 text-amber-500" />
          </div>
          <CardContent className="p-4 flex flex-col justify-center">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">{t("stat_expiring")}</span>
            <span className="text-2xl font-black text-amber-700 dark:text-amber-400">
              {profiles.filter(p => {
                if (!p.expiration_date) return false;
                const days = (new Date(p.expiration_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
                return days > 0 && days <= 7;
              }).length}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Table View */}
      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
              <TableRow>
                <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_profile_email")}</TableHead>
                <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_ixbrowser_id")}</TableHead>
                <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_assigned_client")}</TableHead>
                <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_assigned")}</TableHead>
                <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_expires")}</TableHead>
                <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_renewal")}</TableHead>
                <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_status")}</TableHead>
                <TableHead className="text-xs font-bold text-zinc-500 h-10 text-right">{t("col_actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProfiles.map((p) => {
                const badgeStyle = getStatusBadgeStyle(p.status);

                return (
                  <TableRow key={p.id} className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                    <TableCell className="text-xs">
                      <div className="font-extrabold text-zinc-900 dark:text-zinc-100">{p.profile_name}</div>
                      <div className="text-zinc-400 dark:text-zinc-500 font-medium text-[11px] mt-0.5">{p.account_email}</div>
                    </TableCell>
                    <TableCell className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
                      {p.ixbrowser_profile_id || <span className="text-zinc-400 italic">{t("val_none")}</span>}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {getClientName(p)}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500 font-semibold">
                      {formatDate(p.assignment_date) || <span className="text-zinc-400 italic">{t("val_na")}</span>}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500 font-semibold">
                      {formatDate(p.expiration_date) || <span className="text-zinc-400 italic">{t("val_na")}</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.renewal_count && p.renewal_count > 0 ? (
                        <div>
                          <span className="font-bold">
                            {p.renewal_count === 1
                              ? t("val_renewals_count_one", { count: p.renewal_count })
                              : t("val_renewals_count", { count: p.renewal_count })}
                          </span>
                          {p.current_renewal_month && (
                            <span className="text-[10px] text-zinc-500 block">{t("val_renewal_month", { count: p.current_renewal_month })}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-400 italic text-[10px]">{t("val_initial_period")}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className={`${badgeStyle} font-bold text-[9px] uppercase tracking-wider`}>
                        {tStatus(p.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {p.status === "AVAILABLE" ? (
                          <Button
                            size="sm"
                            className="h-7 px-2.5 bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold text-[10px] cursor-pointer flex items-center gap-1"
                            onClick={() => onAssign(p.id)}
                          >
                            <UserCheck className="h-3 w-3" />
                            {t("btn_assign")}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-zinc-500 hover:text-red-600 text-[10px] flex items-center gap-1 font-semibold"
                            onClick={() => onUnassign(p.id)}
                          >
                            <UserMinus className="h-3 w-3" />
                            {t("btn_release")}
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                          onClick={() => onEdit(p.id)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 disabled:hover:text-zinc-400 disabled:cursor-not-allowed"
                          onClick={() => onDelete(p.id)}
                          disabled={p.status !== "AVAILABLE"}
                          title={p.status !== "AVAILABLE" ? t("alert_delete_disabled_title") : t("alert_delete_title")}
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Mobile Card View */}
      <div className="space-y-3 md:hidden">
        {paginatedProfiles.map((p) => {
          const badgeStyle = getStatusBadgeStyle(p.status);

          return (
            <Card key={p.id} className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                      {p.profile_name}
                    </CardTitle>
                    <CardDescription className="text-xs text-zinc-500 truncate mt-0.5">
                      {p.account_email}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={`${badgeStyle} font-bold text-[8px] uppercase tracking-wider shrink-0 mt-0.5`}>
                    {tStatus(p.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pb-3">
                {p.ixbrowser_profile_id && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-600 dark:text-zinc-400">{t("col_ixbrowser_id")}</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-white">{p.ixbrowser_profile_id}</span>
                  </div>
                )}
                {p.assigned_client_id && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-600 dark:text-zinc-400">{t("col_assigned_client")}</span>
                    <span className="font-semibold text-zinc-900 dark:text-white">{getClientName(p)}</span>
                  </div>
                )}
                {p.assignment_date && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-600 dark:text-zinc-400">{t("col_assigned")}</span>
                    <span className="font-semibold text-zinc-900 dark:text-white">{formatDate(p.assignment_date)}</span>
                  </div>
                )}
                {p.expiration_date && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-600 dark:text-zinc-400">{t("col_expires")}</span>
                    <span className="font-semibold text-zinc-900 dark:text-white">{formatDate(p.expiration_date)}</span>
                  </div>
                )}
                {p.renewal_count && p.renewal_count > 0 ? (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-600 dark:text-zinc-400">{t("col_renewal")}</span>
                    <div className="text-right">
                      <span className="font-semibold text-zinc-900 dark:text-white">
                        {p.renewal_count === 1
                          ? t("val_renewals_count_one", { count: p.renewal_count })
                          : t("val_renewals_count", { count: p.renewal_count })}
                      </span>
                      {p.current_renewal_month && (
                        <span className="text-[10px] text-zinc-500 block">{t("val_renewal_month", { count: p.current_renewal_month })}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-600 dark:text-zinc-400">{t("col_renewal")}</span>
                    <span className="text-zinc-400 italic">{t("val_initial_period")}</span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
                {p.status === "AVAILABLE" ? (
                  <Button
                    size="sm"
                    className="flex-1 h-9 bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold text-xs flex items-center justify-center gap-1"
                    onClick={() => onAssign(p.id)}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    {t("btn_assign")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 h-9 text-zinc-500 hover:text-red-600 text-xs flex items-center justify-center gap-1 font-semibold"
                    onClick={() => onUnassign(p.id)}
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                    {t("btn_release")}
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  onClick={() => onEdit(p.id)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 disabled:hover:text-zinc-400 disabled:cursor-not-allowed"
                  onClick={() => onDelete(p.id)}
                  disabled={p.status !== "AVAILABLE"}
                  title={p.status !== "AVAILABLE" ? t("alert_delete_disabled_title") : t("alert_delete_title")}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {filteredProfiles.length > 0 && (
        <div className="flex items-center justify-between bg-white dark:bg-zinc-800 rounded-lg p-4 shadow">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {searchTerm
              ? `Showing ${currentPage} of ${totalPages} pages (${filteredProfiles.length} filtered)`
              : `Showing ${currentPage} of ${totalPages} pages (${filteredProfiles.length} profiles)`
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
              onClick={goToNextPage}
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

export default ProfilesList;
