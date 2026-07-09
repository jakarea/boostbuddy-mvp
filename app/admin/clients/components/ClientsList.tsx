"use client";

import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import { ClientUser } from "./types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { Search, UserPlus, Settings } from "lucide-react";

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
}: ClientsListProps) {
  const { t } = useTranslation("admin_clients");
  const { t: tStatus } = useTranslation("status");

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);

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
      return new Date(dateString).toLocaleDateString(i18nLanguage, {
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
          <Button
            className="bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold cursor-pointer"
            onClick={onAddNew}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {t("btn_add_client")}
          </Button>
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
        <Button
          className="bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold cursor-pointer"
          onClick={onAddNew}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {t("btn_add_client")}
        </Button>
      </div>

      {/* Searching / Filtering Toolbar */}
      <div className="flex gap-3 flex-wrap md:flex-nowrap">
        {/* Search */}
        <div className="relative flex-1">
          <Input
            placeholder={t("search_placeholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 h-9 text-xs pl-9 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400"
          />
          <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-md px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#168BB0] cursor-pointer text-zinc-800 dark:text-zinc-200"
        >
          <option value="ALL">{t("filter_all")}</option>
          <option value="ACTIVE">{t("filter_active")}</option>
          <option value="PENDING">{t("filter_pending")}</option>
          <option value="DEACTIVATED">{t("filter_deactivated")}</option>
        </select>
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

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={filteredClients.length}
        itemsPerPage={itemsPerPage}
      />
    </div>
  );
});

export default ClientsList;
