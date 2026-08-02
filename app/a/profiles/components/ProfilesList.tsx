"use client";

import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import { ProfileAccountRecord } from "./types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { FolderKey, Plus, UserCheck, UserMinus, Calendar, Edit, Trash } from "lucide-react";
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
}: ProfilesListProps) {
  const { t } = useTranslation("admin_profiles");
  const { t: tStatus } = useTranslation("status");

  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage);

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
          <Button
            className="bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold cursor-pointer"
            onClick={onAddNew}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("btn_add_profile")}
          </Button>
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

        {/* Toolbar Filter */}
        <div className="flex gap-3 flex-wrap md:flex-nowrap">
          <div className="relative flex-1">
            <Input
              placeholder={t("search_placeholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 h-9 text-xs pl-9 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400"
            />
            <FolderKey className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-md px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#168BB0] cursor-pointer text-zinc-800 dark:text-zinc-200"
          >
            <option value="ALL">{t("filter_all")}</option>
            <option value="AVAILABLE">{t("filter_available")}</option>
            <option value="ASSIGNED">{t("filter_assigned")}</option>
            <option value="ACTIVE">{t("filter_active")}</option>
            <option value="EXPIRED">{t("filter_expired")}</option>
            <option value="REQUEST_CHANGE">{t("filter_request_change")}</option>
            <option value="BANNED">{t("filter_banned")}</option>
            <option value="CANCELLED">{t("filter_cancelled")}</option>
          </select>
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
        <Button
          className="bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold cursor-pointer"
          onClick={onAddNew}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("btn_add_profile")}
        </Button>
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

      {/* Toolbar Filter */}
      <div className="flex gap-3 flex-wrap md:flex-nowrap">
        <div className="relative flex-1">
          <Input
            placeholder={t("search_placeholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 h-9 text-xs pl-9 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400"
          />
          <FolderKey className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-md px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#168BB0] cursor-pointer text-zinc-800 dark:text-zinc-200"
        >
          <option value="ALL">{t("filter_all")}</option>
          <option value="AVAILABLE">{t("filter_available")}</option>
          <option value="ASSIGNED">{t("filter_assigned")}</option>
          <option value="ACTIVE">{t("filter_active")}</option>
          <option value="EXPIRED">{t("filter_expired")}</option>
          <option value="REQUEST_CHANGE">{t("filter_request_change")}</option>
          <option value="BANNED">{t("filter_banned")}</option>
          <option value="CANCELLED">{t("filter_cancelled")}</option>
        </select>
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

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={filteredProfiles.length}
        itemsPerPage={itemsPerPage}
      />
    </div>
  );
});

export default ProfilesList;
