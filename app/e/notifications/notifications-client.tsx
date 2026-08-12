"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, Inbox, Search, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSWR } from "@/lib/cache/swr";
import { CACHE_KEYS } from "@/lib/cache/cacheContext";
import { getNotificationsAction } from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";

export interface NotificationLogDTO {
  id: string;
  recipient: string;
  subject: string;
  body: string | null;
  type: string;
  channel: "EMAIL" | "TELEGRAM";
  status: string;
  created_at: string;
}

interface EmployeeNotificationsClientProps {
  initialLogs: NotificationLogDTO[];
}

export default function EmployeeNotificationsClient({ initialLogs }: EmployeeNotificationsClientProps) {
  const { t, i18n } = useTranslation("employee_notifications");
  const locale = i18n.language === "it" ? "it-IT" : "en-US";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 10;

  // SWR for notifications - 2 minute cache
  const { data: logs, refresh, isValid } = useSWR<NotificationLogDTO[]>({
    key: CACHE_KEYS.EMPLOYEE_NOTIFICATIONS,
    fetcher: async (): Promise<NotificationLogDTO[]> => {
      const result = await getNotificationsAction();
      return result.success ? (result.data as NotificationLogDTO[]) : [];
    },
    ttl: 2 * 60 * 1000,
    initialData: initialLogs,
  });

  // Navigation handlers
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/e/notifications?${params.toString()}`);
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

  // Reset page when filters change
  useEffect(() => {
    if (searchTerm) {
      setCurrentPage(1);
    }
  }, [searchTerm]);

  // Search filter
  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs || [];
    const term = searchTerm.toLowerCase();
    return (logs || []).filter((log) => {
      const subject = log.subject.toLowerCase();
      const body = log.body?.toLowerCase() || "";
      const recipient = log.recipient.toLowerCase();
      const type = log.type.toLowerCase();
      const channel = log.channel.toLowerCase();
      return (
        subject.includes(term) ||
        body.includes(term) ||
        recipient.includes(term) ||
        type.includes(term) ||
        channel.includes(term)
      );
    });
  }, [logs, searchTerm]);

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Unified header card */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-1.5 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 shrink-0 mt-0.5">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                {t("title", { defaultValue: "Notifications" })}
              </h1>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
                {t("subtitle", { defaultValue: "Stay updated on your assigned orders and activities. Employee notifications are managed by your admin." })}
              </p>
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={!isValid}
            className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Refresh notifications"
          >
            <Loader2 className={`h-4 w-4 ${!isValid ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {(logs?.length || 0) > 0 && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("search_placeholder", "Search notifications...")}
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
                Found {filteredLogs.length} result{filteredLogs.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notification Log Table */}
      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-extrabold">
            {t("history_title", { defaultValue: "Notification History" })}
          </CardTitle>
          <CardDescription className="text-xs">
            {t("history_subtitle", { defaultValue: "Your recent notification activity" })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {initialLogs.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-center">
              <Inbox className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-3" />
              <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
                {t("empty_title", { defaultValue: "No Notifications Yet" })}
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                {t("empty_subtitle", { defaultValue: "Notifications will appear here when orders are assigned to you." })}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">
                      {t("columns.subject", { defaultValue: "Subject" })}
                    </TableHead>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">
                      {t("columns.channel", { defaultValue: "Channel" })}
                    </TableHead>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">
                      {t("columns.status", { defaultValue: "Status" })}
                    </TableHead>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">
                      {t("columns.date", { defaultValue: "Date" })}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log) => (
                    <TableRow key={log.id} className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                      <TableCell className="text-xs">
                        <div className="font-bold text-zinc-700 dark:text-zinc-300">{log.subject}</div>
                        <div className="text-[10px] text-zinc-400 font-medium truncate max-w-md mt-0.5">
                          {log.body ? log.body.substring(0, 80) + "..." : ""}
                        </div>
                        <div className="text-[9px] text-zinc-400 font-mono mt-0.5">{log.type}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className={`text-[8px] px-1 py-0 h-4 border leading-none ${log.channel === "TELEGRAM" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                          {log.channel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 w-fit">
                          <CheckCircle className="h-3 w-3" />
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-zinc-500 font-medium whitespace-nowrap">
                        {new Date(log.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {filteredLogs.length > 0 && (
        <div className="flex items-center justify-between bg-white dark:bg-zinc-800 rounded-lg p-4 shadow">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {searchTerm
              ? `Showing ${currentPage} of ${totalPages} pages (${filteredLogs.length} filtered)`
              : `Showing ${currentPage} of ${totalPages} pages (${filteredLogs.length} notifications)`
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
}
