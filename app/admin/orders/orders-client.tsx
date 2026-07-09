"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  CreditCard, ShoppingBag, RefreshCw, AlertCircle, CheckCircle,
  Search, Copy, FolderKey
} from "lucide-react";

// --- CONSTANTS (No Magic Strings) ---
export const ORDER_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  ALL: "ALL"
} as const;

export const ORDER_TYPE = {
  PURCHASE: "PURCHASE",
  RENEWAL: "RENEWAL",
  ALL: "ALL"
} as const;

// --- DTOs (Data Transfer Objects) ---
export interface OrderRecord {
  id: string;
  user_id: string;
  service_id: string | null;
  stripe_session_id: string | null;
  amount: number;
  status: keyof typeof ORDER_STATUS;
  type: keyof typeof ORDER_TYPE;
  profile_account_id: string | null;
  created_at: string;
  updated_at: string;
  users?: { name: string; email: string };
  services?: { name: string };
  profile_accounts?: { profile_name: string };
}

interface OrdersClientProps {
  initialOrders: OrderRecord[];
}

// --- PURE HELPER FUNCTIONS ---
const getClientName = (ord: OrderRecord, t: (key: string) => string): string => {
  return ord.users?.name || t("unknown_client");
};

const getClientEmail = (ord: OrderRecord): string => {
  return ord.users?.email || "";
};

const getServiceName = (ord: OrderRecord, t: (key: string) => string): string => {
  if (ord.type === ORDER_TYPE.RENEWAL) return t("lbl_profile_renewal");
  return ord.services?.name || t("lbl_custom_package");
};

const getLinkedProfileName = (ord: OrderRecord): string | null => {
  return ord.profile_accounts?.profile_name || ord.profile_account_id || null;
};

const copyToClipboard = (text: string) => {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(text);
  }
};

const isOrderMatchingSearch = (ord: OrderRecord, searchTerm: string, t: (key: string) => string): boolean => {
  if (!searchTerm) return true;
  const term = searchTerm.toLowerCase();
  
  const matchesName = getClientName(ord, t).toLowerCase().includes(term);
  const matchesEmail = getClientEmail(ord).toLowerCase().includes(term);
  const matchesService = getServiceName(ord, t).toLowerCase().includes(term);
  const matchesStripeId = (ord.stripe_session_id || "").toLowerCase().includes(term);
  const matchesOrderId = ord.id.toLowerCase().includes(term);

  return matchesName || matchesEmail || matchesService || matchesStripeId || matchesOrderId;
};

const isOrderMatchingFilters = (
  ord: OrderRecord, 
  statusFilter: string, 
  typeFilter: string
): boolean => {
  const matchStatus = statusFilter === ORDER_STATUS.ALL || ord.status === statusFilter;
  const matchType = typeFilter === ORDER_TYPE.ALL || ord.type === typeFilter;
  return matchStatus && matchType;
};

export default function OrdersClient({ initialOrders }: OrdersClientProps) {
  const { t, i18n } = useTranslation("admin_orders");
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  // State
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<string>(ORDER_STATUS.ALL);
  const [typeFilter, setTypeFilter] = useState<string>(ORDER_TYPE.ALL);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Derived filtered data
  const filteredOrders = useMemo(() => {
    return initialOrders.filter(ord => 
      isOrderMatchingSearch(ord, searchTerm, t) && 
      isOrderMatchingFilters(ord, statusFilter, typeFilter)
    );
  }, [initialOrders, searchTerm, statusFilter, typeFilter, t]);

  // Derived paginated data
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage, ITEMS_PER_PAGE]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter]);

  const { t: tStatus } = useTranslation("status");

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const totalPaid = initialOrders.filter(o => o.status === ORDER_STATUS.PAID).reduce((sum, o) => sum + o.amount, 0);
  const totalPending = initialOrders.filter(o => o.status === ORDER_STATUS.PENDING).length;
  const totalFailed = initialOrders.filter(o => o.status === ORDER_STATUS.FAILED).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-[#168BB0]" />
            {t("title")}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t("total_revenue")}</div>
            <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">${totalPaid.toFixed(2)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t("pending")}</div>
            <div className="text-lg font-extrabold text-[#168BB0] dark:text-[#45B0D2]">{totalPending}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t("failed")}</div>
            <div className="text-lg font-extrabold text-red-600 dark:text-red-400">{totalFailed}</div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap md:flex-nowrap">
        <div className="relative flex-1">
          <Input
            placeholder={t("search_placeholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 h-9 text-xs pl-9 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400"
          />
          <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-md px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#168BB0] cursor-pointer text-zinc-800 dark:text-zinc-200"
        >
          <option value={ORDER_STATUS.ALL}>{t("filter_all_statuses")}</option>
          <option value={ORDER_STATUS.PAID}>{tStatus("PAID")}</option>
          <option value={ORDER_STATUS.PENDING}>{tStatus("PENDING")}</option>
          <option value={ORDER_STATUS.FAILED}>{tStatus("FAILED")}</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-md px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#168BB0] cursor-pointer text-zinc-800 dark:text-zinc-200"
        >
          <option value={ORDER_TYPE.ALL}>{t("filter_all_types")}</option>
          <option value={ORDER_TYPE.PURCHASE}>{t("type_purchase")}</option>
          <option value={ORDER_TYPE.RENEWAL}>{t("type_renewal")}</option>
        </select>
      </div>

      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-extrabold">{t("card_title")}</CardTitle>
          <CardDescription className="text-xs">
            {t("card_desc", { count: filteredOrders.length, total: initialOrders.length })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              {t("empty_filtered")}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_id")}</TableHead>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_client")}</TableHead>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_item")}</TableHead>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_type")}</TableHead>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_stripe_session")}</TableHead>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_linked_profile")}</TableHead>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_amount")}</TableHead>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_status")}</TableHead>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((ord) => {
                    let statusBadge = "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
                    let statusIcon = <RefreshCw className="h-3 w-3 mr-1" />;
                    if (ord.status === ORDER_STATUS.PAID) {
                      statusBadge = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
                      statusIcon = <CheckCircle className="h-3 w-3 mr-1 text-emerald-600 dark:text-emerald-400" />;
                    } else if (ord.status === ORDER_STATUS.FAILED) {
                      statusBadge = "bg-red-500/10 text-red-700 dark:text-red-400";
                      statusIcon = <AlertCircle className="h-3 w-3 mr-1 text-red-600 dark:text-red-400" />;
                    }

                    const linkedProfile = getLinkedProfileName(ord);

                    return (
                      <TableRow key={ord.id} className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                        <TableCell className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          {ord.id.substring(0, 8)}...
                        </TableCell>
                        <TableCell className="text-xs">
                          <div
                            className="cursor-pointer hover:underline"
                            onClick={() => router.push(`/admin/clients?id=${ord.user_id}`)}
                          >
                            <div className="font-bold text-[#168BB0] dark:text-[#45B0D2]">{getClientName(ord, t)}</div>
                            <div className="text-[10px] text-zinc-400 font-medium">{getClientEmail(ord)}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          <span
                            className={`flex items-center gap-1 ${ord.service_id ? "cursor-pointer hover:underline text-[#168BB0] dark:text-[#45B0D2]" : "text-zinc-700 dark:text-zinc-300"}`}
                            onClick={() => { if (ord.service_id) router.push(`/admin/services?action=edit&id=${ord.service_id}`); }}
                          >
                            {ord.type === ORDER_TYPE.RENEWAL ? (
                              <RefreshCw className="h-3.5 w-3.5 text-zinc-400" />
                            ) : (
                              <ShoppingBag className="h-3.5 w-3.5 text-[#168BB0]" />
                            )}
                            {getServiceName(ord, t)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className={`font-semibold text-[9px] px-1.5 ${
                            ord.type === ORDER_TYPE.PURCHASE 
                              ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" 
                              : "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
                          }`}>
                            {ord.type === ORDER_TYPE.PURCHASE ? t("type_purchase") : t("type_renewal")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {ord.stripe_session_id ? (
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-[120px]" title={ord.stripe_session_id}>
                                {ord.stripe_session_id}
                              </span>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-5 w-5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white shrink-0"
                                onClick={() => copyToClipboard(ord.stripe_session_id || "")}
                              >
                                <Copy className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-zinc-400 italic text-[10px]">{t("not_applicable")}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {linkedProfile ? (
                            <div
                              className="flex items-center gap-1 cursor-pointer hover:underline"
                              onClick={() => router.push(`/admin/profiles?action=edit&id=${ord.profile_account_id}`)}
                            >
                              <FolderKey className="h-3 w-3 text-[#168BB0] shrink-0" />
                              <span className="font-semibold text-[#168BB0] dark:text-[#45B0D2] truncate max-w-[100px]" title={linkedProfile}>
                                {linkedProfile}
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-400 italic text-[10px]">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-zinc-900 dark:text-white">
                          ${ord.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className={`${statusBadge} font-bold text-[9px] uppercase tracking-wider flex items-center w-fit`}>
                            {statusIcon}
                            {tStatus(ord.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-zinc-500 font-medium whitespace-nowrap">
                          {new Date(ord.created_at).toLocaleDateString(i18n.language, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden flex flex-col gap-3 p-3">
                {paginatedOrders.map((ord) => {
                  let statusBadge = "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
                  let statusIcon = <RefreshCw className="h-3 w-3 mr-1" />;
                  if (ord.status === ORDER_STATUS.PAID) {
                    statusBadge = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
                    statusIcon = <CheckCircle className="h-3 w-3 mr-1 text-emerald-600 dark:text-emerald-400" />;
                  } else if (ord.status === ORDER_STATUS.FAILED) {
                    statusBadge = "bg-red-500/10 text-red-700 dark:text-red-400";
                    statusIcon = <AlertCircle className="h-3 w-3 mr-1 text-red-600 dark:text-red-400" />;
                  }

                  const linkedProfile = getLinkedProfileName(ord);

                  return (
                    <Card key={ord.id} className="bg-zinc-50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 p-3 flex flex-col gap-3 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <div
                            className="cursor-pointer hover:underline"
                            onClick={() => router.push(`/admin/clients?id=${ord.user_id}`)}
                          >
                            <div className="font-bold text-sm text-[#168BB0] dark:text-[#45B0D2]">{getClientName(ord, t)}</div>
                            <div className="text-[10px] text-zinc-500 font-medium">{getClientEmail(ord)}</div>
                          </div>
                        </div>
                        <Badge variant="outline" className={`${statusBadge} font-bold text-[8px] uppercase tracking-wider flex items-center shrink-0`}>
                          {statusIcon}
                          {tStatus(ord.status)}
                        </Badge>
                      </div>

                      <div className="bg-white dark:bg-zinc-900 p-2.5 rounded border border-zinc-200 dark:border-zinc-800 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-wider">{t("col_item")}</span>
                          <span
                            className={`flex items-center gap-1 font-semibold ${ord.service_id ? "cursor-pointer hover:underline text-[#168BB0] dark:text-[#45B0D2]" : "text-zinc-700 dark:text-zinc-300"}`}
                            onClick={() => { if (ord.service_id) router.push(`/admin/services?action=edit&id=${ord.service_id}`); }}
                          >
                            {ord.type === ORDER_TYPE.RENEWAL ? (
                              <RefreshCw className="h-3 w-3 text-zinc-400" />
                            ) : (
                              <ShoppingBag className="h-3 w-3 text-[#168BB0]" />
                            )}
                            {getServiceName(ord, t)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-wider">{t("col_amount")}</span>
                          <span className="font-extrabold text-zinc-900 dark:text-white">
                            ${ord.amount.toFixed(2)}
                          </span>
                        </div>

                        {linkedProfile && (
                          <div className="flex justify-between items-center text-xs border-t border-zinc-100 dark:border-zinc-800 pt-2">
                            <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-wider">{t("col_linked_profile")}</span>
                            <div
                              className="flex items-center gap-1 cursor-pointer hover:underline"
                              onClick={() => router.push(`/admin/profiles?action=edit&id=${ord.profile_account_id}`)}
                            >
                              <FolderKey className="h-3 w-3 text-[#168BB0] shrink-0" />
                              <span className="font-semibold text-[#168BB0] dark:text-[#45B0D2] truncate max-w-[150px]">
                                {linkedProfile}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-[10px] text-zinc-500 font-mono">ID: {ord.id.substring(0, 8)}...</div>
                        <div className="text-[10px] text-zinc-500 font-medium">
                          {new Date(ord.created_at).toLocaleDateString(i18n.language, {
                            year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                          })}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {filteredOrders.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredOrders.length}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      )}
    </div>
  );
}
