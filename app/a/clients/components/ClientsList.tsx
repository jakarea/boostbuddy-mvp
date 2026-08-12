"use client";

import React, { memo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ClientUser } from "./types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Settings, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface ClientsListProps {
  paginatedClients: ClientUser[];
  onAddNew: () => void;
  onManage: (id: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  filteredClients: ClientUser[];
  itemsPerPage: number;
  profileCounts: Record<string, number>;
  i18nLanguage: string;
  onRefresh?: () => void;
  isCacheValid?: boolean;
}

const ClientsList = memo(function ClientsList({
  paginatedClients,
  onAddNew,
  onManage,
  statusFilter,
  setStatusFilter,
  searchTerm,
  setSearchTerm,
  currentPage,
  setCurrentPage,
  filteredClients,
  itemsPerPage,
  profileCounts,
  i18nLanguage,
  onRefresh,
  isCacheValid = true,
}: ClientsListProps) {
  const { t } = useTranslation("admin_clients");
  const { t: tStatus } = useTranslation("status");
  const router = useRouter();
  const searchParams = useSearchParams();

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);

  // Navigation handlers
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/a/clients?${params.toString()}`);
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

  const getStatusColor = (status: string) => {
    if (status === "ACTIVE") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    if (status === "PENDING") return "bg-[#168BB0]/15 text-[#0F7493] dark:text-[#45B0D2] animate-pulse";
    if (status === "DEACTIVATED") return "bg-red-500/10 text-red-700 dark:text-red-400";
    return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
  };

  const getAssignedProfilesCount = (uid: string) => {
    return profileCounts[uid] || 0;
  };

  const formatCreatedDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  if (filteredClients.length === 0) {
    return (
      <div className="space-y-6">
        {/* List Header */}
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
              <UserPlus className="h-4 w-4 mr-2" />
              {t("btn_add_client")}
            </Button>
          </div>
        </div>

        {/* Empty state */}
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="p-8 text-center text-xs text-zinc-500">
            {t("empty_clients")}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* List Header */}
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
            <UserPlus className="h-4 w-4 mr-2" />
            {t("btn_add_client")}
          </Button>
        </div>
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
            variant={statusFilter === "ACTIVE" ? "default" : "outline"}
            onClick={() => setStatusFilter("ACTIVE")}
            className="text-xs"
          >
            {t("filter_active", "Active")}
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "PENDING" ? "default" : "outline"}
            onClick={() => setStatusFilter("PENDING")}
            className="text-xs"
          >
            {t("filter_pending", "Pending")}
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "DEACTIVATED" ? "default" : "outline"}
            onClick={() => setStatusFilter("DEACTIVATED")}
            className="text-xs"
          >
            {t("filter_deactivated", "Deactivated")}
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
              placeholder={t("search_placeholder", "Search by name or email...")}
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
              Found {filteredClients.length} result{filteredClients.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
              <TableRow>
                <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_name")}</TableHead>
                <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_email")}</TableHead>
                <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_registered")}</TableHead>
                <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_assigned_profiles")}</TableHead>
                <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_status")}</TableHead>
                <TableHead className="text-xs font-bold text-zinc-500 h-10 text-right">{t("col_actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClients.map((client) => (
                <TableRow key={client.id} className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                  <TableCell className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">{client.name}</TableCell>
                  <TableCell className="text-xs text-zinc-500">{client.email}</TableCell>
                  <TableCell className="text-xs text-zinc-500">
                    {formatCreatedDate(client.created_at)}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    {getAssignedProfilesCount(client.id)}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className={`${getStatusColor(client.status)} font-bold text-[9px] uppercase tracking-wider`}>
                      {tStatus(client.status, { defaultValue: client.status })}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[#168BB0] dark:text-[#45B0D2]"
                      onClick={() => onManage(client.id)}
                    >
                      <Settings className="h-3.5 w-3.5 mr-1" />
                      {t("btn_manage_client")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Mobile Card View */}
      <div className="space-y-3 md:hidden">
        {paginatedClients.map((client) => (
          <Card key={client.id} className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                    {client.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500 truncate mt-0.5">
                    {client.email}
                  </CardDescription>
                </div>
                <Badge variant="outline" className={`${getStatusColor(client.status)} font-bold text-[8px] uppercase tracking-wider shrink-0 mt-0.5`}>
                  {tStatus(client.status, { defaultValue: client.status })}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pb-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-600 dark:text-zinc-400">{t("col_registered")}</span>
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {formatCreatedDate(client.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-600 dark:text-zinc-400">{t("col_assigned_profiles")}</span>
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {getAssignedProfilesCount(client.id)}
                </span>
              </div>
            </CardContent>
            <CardFooter className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                size="sm"
                variant="ghost"
                className="w-full h-9 text-xs font-semibold text-[#168BB0] dark:text-[#45B0D2] hover:bg-[#168BB0]/5"
                onClick={() => onManage(client.id)}
              >
                <Settings className="h-3.5 w-3.5 mr-1" />
                {t("btn_manage_client")}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Pagination Controls */}
      {filteredClients.length > 0 && (
        <div className="flex items-center justify-between bg-white dark:bg-zinc-800 rounded-lg p-4 shadow">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {searchTerm
              ? `Showing ${currentPage} of ${totalPages} pages (${filteredClients.length} filtered)`
              : `Showing ${currentPage} of ${totalPages} pages (${filteredClients.length} clients)`
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

export default ClientsList;
