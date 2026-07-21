"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Mail, CheckCircle, ShieldAlert, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import TelegramBotConfig from "@/components/admin/TelegramBotConfig";
import type { TelegramConfig } from "@/app/actions/telegram";
import { getNotificationsAction } from "@/app/actions/notifications";
import { createClient } from "@/lib/supabase/client";

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

interface NotificationsClientProps {
  initialLogs: NotificationLogDTO[];
  telegramConfig: TelegramConfig | null;
}

export default function NotificationsClient({ initialLogs, telegramConfig }: NotificationsClientProps) {
  const { t } = useTranslation("notifications");
  const [logs, setLogs] = useState<NotificationLogDTO[]>(initialLogs);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Refresh function to pull fresh notification logs from database
  const fetchLatestLogs = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await getNotificationsAction();
      if (res.success && Array.isArray(res.data)) {
        setLogs(res.data as NotificationLogDTO[]);
      }
    } catch (err) {
      console.error("Failed to refresh notification logs:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Fetch on window focus (so returning to tab or reloading catches any missed real-time events)
  useEffect(() => {
    fetchLatestLogs();

    const handleFocus = () => {
      fetchLatestLogs();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchLatestLogs]);

  // Subscribe to Supabase Realtime for notification_logs table
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("realtime-notification-logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notification_logs" },
        (payload) => {
          if (payload.new) {
            setLogs((prev) => [payload.new as NotificationLogDTO, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return logs.slice(startIndex, startIndex + itemsPerPage);
  }, [logs, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(logs.length / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Unified header + Telegram config card */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-100 dark:divide-zinc-800">

          {/* Left: Page info + Refresh button */}
          <div className="flex items-start justify-between p-4 gap-3">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-[#168BB0]/10 text-[#168BB0] shrink-0 mt-0.5">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {t("title")}
                </h1>
                <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
                  {t("subtitle")}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchLatestLogs}
              disabled={isRefreshing}
              className="h-8 text-xs font-semibold px-2.5 border-zinc-200 dark:border-zinc-800 shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{t("btn_refresh", { defaultValue: "Refresh Logs" })}</span>
            </Button>
          </div>

          {/* Right: Telegram bot config (flat — no inner card wrapper) */}
          <TelegramBotConfig initialConfig={telegramConfig} flat />
        </div>
      </div>

      {/* Notification Log Table */}
      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-extrabold">{t("history_title")}</CardTitle>
            <CardDescription className="text-xs">
              {t("history_subtitle")}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-center">
              <ShieldAlert className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-3" />
              <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{t("empty_title")}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{t("empty_subtitle")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("columns.log_id")}</TableHead>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("columns.recipient")}</TableHead>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("columns.subject")}</TableHead>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("columns.delivery_status")}</TableHead>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("columns.dispatched_at")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log) => (
                    <TableRow key={log.id} className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                      <TableCell className="font-mono text-[10px] font-semibold text-zinc-500">
                        {log.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                          {log.recipient}
                          <Badge variant="outline" className={`text-[8px] px-1 py-0 h-4 border leading-none ${log.channel === "TELEGRAM" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                            {log.channel}
                          </Badge>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-medium mt-0.5">{log.type}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-bold text-zinc-700 dark:text-zinc-300">{log.subject}</div>
                        <div className="text-[10px] text-zinc-400 font-medium truncate max-w-md mt-0.5">
                          {log.body ? log.body.substring(0, 80) + "..." : t("no_content")}
                        </div>
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
      {logs.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={logs.length}
          itemsPerPage={itemsPerPage}
        />
      )}
    </div>
  );
}
