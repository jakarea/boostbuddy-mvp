"use client";

import React, { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { ShoppingBag, CreditCard, HelpCircle, Receipt, Copy, RefreshCw, CheckCircle, AlertCircle, Download } from "lucide-react";
import { ORDER_STATUS, ORDER_TYPE } from "@/app/admin/orders/orders-client";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { getInvoiceDownloadUrlAction } from "@/app/actions/invoices";
import { getDaysRemaining, formatDate } from "@/lib/dateUtils";

// --- DTOs ---
export interface ServiceDTO {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  is_active: boolean;
  requires_manual_assignment: boolean;
}

export interface ClientOrderDTO {
  id: string;
  user_id: string;
  service_id: string | null;
  stripe_session_id: string | null;
  amount: number;
  status: string;
  type: string;
  created_at: string;
  services?: { name: string };
  profile_accounts?: { profile_name: string };
}

export interface BillingInfoDTO {
  id?: string;
  billing_type: string;
  country: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  vat_number?: string | null;
  fiscal_code?: string | null;
  sdi_code?: string | null;
}

export interface InvoiceDTO {
  id: string;
  order_id: string | null;
  pdf_path: string;
  file_name: string;
}

export interface PaymentsClientProps {
  initialOrders: ClientOrderDTO[];
  activeServices: ServiceDTO[];
  billingInfo: BillingInfoDTO | null;
  invoices: InvoiceDTO[];
  profiles: any[];
}

const copyToClipboard = (text: string) => {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(text);
  }
};

export default function PaymentsClient({ initialOrders, activeServices, billingInfo, invoices, profiles }: PaymentsClientProps) {
  const { t, i18n } = useTranslation("client_payments");
  const { t: tStatus } = useTranslation("status");
  const { error } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const handleDownloadInvoice = (pdfPath: string) => {
    startTransition(async () => {
      const res = await getInvoiceDownloadUrlAction(pdfPath);
      if (res.success && res.url) {
        const a = document.createElement("a");
        a.href = res.url;
        a.setAttribute("download", "");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        error(res.error || "Failed to download invoice");
      }
    });
  };

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return initialOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [initialOrders, currentPage, ITEMS_PER_PAGE]);

  const totalPages = Math.ceil(initialOrders.length / ITEMS_PER_PAGE);

  const getServiceName = (ord: ClientOrderDTO): string => {
    if (ord.type === ORDER_TYPE.RENEWAL) return t("lbl_renewal");
    return ord.services?.name || t("lbl_custom");
  };

  const handleBuy = (serviceId: string) => {
    router.push(`/checkout?type=purchase&serviceId=${serviceId}`);
  };

  const activeProfiles = profiles.filter((p: any) => p.status !== "AVAILABLE" && p.expiration_date);

  return (
    <div className="space-y-8">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">{t("title")}</h1>
        <p className="text-xs text-zinc-500 mt-1">
          {t("subtitle")}
        </p>
      </div>

      {/* Active Subscriptions Summary */}
      {activeProfiles.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold tracking-tight text-zinc-400 dark:text-zinc-500 uppercase flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[#168BB0] dark:text-[#45B0D2]" />
            {t("active_packages_title", { defaultValue: "Active Subscriptions" })}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeProfiles.map((profile: any) => {
              const daysLeft = getDaysRemaining(profile.expiration_date);
              const expired = daysLeft !== null && daysLeft < 0;
              const packageName = profile.services?.name || t("lbl_default_package", { defaultValue: "Standard Plan" });
              const packagePrice = profile.services?.price 
                ? `€${Number(profile.services.price).toFixed(2)}` 
                : "N/A";

              return (
                <Card key={profile.id} className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                  <div className="p-4 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="font-extrabold text-sm text-zinc-900 dark:text-white">
                          {packageName}
                        </span>
                        <Badge variant="outline" className={
                          expired 
                            ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" 
                            : daysLeft !== null && daysLeft <= 7 
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" 
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        }>
                          {expired ? "Expired" : `${daysLeft} Days Left`}
                        </Badge>
                      </div>
                      <p className="text-zinc-500 text-xs mt-1 leading-normal">
                        Assigned Profile: <span className="font-bold text-zinc-700 dark:text-zinc-300">{profile.profile_name}</span>
                      </p>
                    </div>

                    <div className="border-t border-zinc-100 dark:border-zinc-800 mt-4 pt-3 flex justify-between text-[11px] text-zinc-400">
                      <span>Expires: {profile.expiration_date ? formatDate(profile.expiration_date) : "N/A"}</span>
                      <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                        Value: {packagePrice}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Services Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-extrabold tracking-tight text-zinc-400 dark:text-zinc-500 uppercase flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-[#168BB0] dark:text-[#45B0D2]" />
          {t("plans_title")}
        </h3>
        
        {activeServices.length === 0 ? (
          <div className="p-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded text-xs text-zinc-500">
            {t("no_services")}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeServices.map((srv) => (
              <Card key={srv.id} className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base font-extrabold text-zinc-900 dark:text-white">{srv.name}</CardTitle>
                      <CardDescription className="text-xs mt-1 text-zinc-500 leading-normal">{srv.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3 pb-4">
                  <div className="flex items-baseline gap-1 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">${srv.price.toFixed(2)}</span>
                    <span className="text-xs text-zinc-400 font-medium">/ {srv.duration_days} {t("duration_days_suffix", { defaultValue: "Days" })}</span>
                  </div>

                  {srv.requires_manual_assignment && (
                    <div className="text-[10px] text-[#0F7493] dark:text-[#45B0D2] bg-[#168BB0]/5 border border-[#168BB0]/10 p-2 rounded flex items-center gap-1.5 font-medium leading-tight">
                      <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                      {t("manual_assignment_warning")}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 p-3">
                  <Button 
                    className="w-full bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold text-xs h-9"
                    onClick={() => handleBuy(srv.id)}
                  >
                    {t("btn_purchase")}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Order History Section */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold tracking-tight text-zinc-400 dark:text-zinc-500 uppercase flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[#168BB0] dark:text-[#45B0D2]" />
            {t("history_title")}
          </h3>
        </div>

        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          {initialOrders.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-center">
              <CreditCard className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-3" />
              <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{t("no_transactions_title")}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{t("no_transactions_desc")}</p>
            </div>
          ) : (
            <div className="w-full">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_id")}</TableHead>
                      <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_item")}</TableHead>
                      <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_type")}</TableHead>
                      <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_session")}</TableHead>
                      <TableHead className="text-xs font-bold text-zinc-500 h-10 text-right">{t("col_amount")}</TableHead>
                      <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_status")}</TableHead>
                      <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_date")}</TableHead>
                      {billingInfo?.billing_type === "COMPANY" && (
                        <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_invoice", { defaultValue: "Invoice" })}</TableHead>
                      )}
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

                      return (
                        <TableRow key={ord.id} className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                          <TableCell className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300" title={ord.id}>
                            {ord.id.length > 10 ? '...' + ord.id.slice(-10) : ord.id}
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            <span className="flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                              {ord.type === ORDER_TYPE.RENEWAL ? (
                                <RefreshCw className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                              ) : (
                                <ShoppingBag className="h-3.5 w-3.5 text-[#168BB0] shrink-0" />
                              )}
                              {getServiceName(ord)}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className={`font-semibold text-[9px] px-1.5 ${
                              ord.type === ORDER_TYPE.PURCHASE 
                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" 
                                : "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
                            }`}>
                              {ord.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {ord.stripe_session_id ? (
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-[120px]" title={ord.stripe_session_id}>
                                  {ord.stripe_session_id.length > 15 ? '...' + ord.stripe_session_id.slice(-15) : ord.stripe_session_id}
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
                              <span className="text-zinc-400 italic text-[10px]">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-zinc-900 dark:text-white text-right">
                            ${ord.amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className={`${statusBadge} font-bold text-[9px] uppercase tracking-wider flex items-center w-fit`}>
                              {statusIcon}
                              {tStatus(ord.status, { defaultValue: ord.status })}
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
                          {billingInfo?.billing_type === "COMPANY" && (
                            <TableCell className="text-xs font-medium">
                              {(() => {
                                const matchingInvoice = invoices.find(inv => inv.order_id === ord.id);
                                if (ord.status !== ORDER_STATUS.PAID) {
                                  return <span className="text-zinc-400 italic text-[10px]">—</span>;
                                }
                                if (matchingInvoice) {
                                  return (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-[10px] gap-1 font-bold border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800 cursor-pointer text-[#168BB0] hover:text-[#0F7493]"
                                      onClick={() => handleDownloadInvoice(matchingInvoice.pdf_path)}
                                      disabled={isPending}
                                    >
                                      <Download className="h-3 w-3 shrink-0" />
                                      {t("btn_download", { defaultValue: "Download" })}
                                    </Button>
                                  );
                                } else {
                                  return (
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold text-[9px]">
                                      {t("status_pending", { defaultValue: "Pending" })}
                                    </Badge>
                                  );
                                }
                              })()}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                {paginatedOrders.map((ord) => {
                  let statusBadge = "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
                  let statusIcon = <RefreshCw className="h-3 w-3 mr-1" />;
                  if (ord.status === ORDER_STATUS.PAID) {
                    statusBadge = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
                    statusIcon = <CheckCircle className="h-3 w-3 mr-1 text-emerald-600 dark:text-emerald-400" />;
                  } else if (ord.status === ORDER_STATUS.FAILED) {
                    statusBadge = "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
                    statusIcon = <AlertCircle className="h-3 w-3 mr-1 text-red-600 dark:text-red-400" />;
                  }

                  return (
                    <div key={ord.id} className="p-4 flex flex-col gap-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                            {ord.type === ORDER_TYPE.RENEWAL ? (
                              <RefreshCw className="h-4 w-4 text-purple-500" />
                            ) : (
                              <ShoppingBag className="h-4 w-4 text-[#168BB0]" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                              {getServiceName(ord)}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono" title={ord.id}>
                              ID: {ord.id.length > 10 ? '...' + ord.id.slice(-10) : ord.id}
                            </span>
                          </div>
                        </div>
                        <div className="font-extrabold text-base text-zinc-900 dark:text-white">
                          ${ord.amount.toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <Badge variant="outline" className={`${statusBadge} font-bold text-[9px] uppercase tracking-wider flex items-center`}>
                          {statusIcon}
                          {tStatus(ord.status, { defaultValue: ord.status })}
                        </Badge>
                        <span className="font-medium text-zinc-500">
                          {new Date(ord.created_at).toLocaleDateString(i18n.language, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {billingInfo?.billing_type === "COMPANY" && ord.status === ORDER_STATUS.PAID && (
                        <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/50 pt-2 text-xs">
                          <span className="text-zinc-500 font-medium">{t("lbl_invoice", { defaultValue: "Invoice" })}:</span>
                          {(() => {
                            const matchingInvoice = invoices.find(inv => inv.order_id === ord.id);
                            if (matchingInvoice) {
                              return (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-[10px] gap-1 font-bold border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800 cursor-pointer text-[#168BB0] hover:text-[#0F7493]"
                                  onClick={() => handleDownloadInvoice(matchingInvoice.pdf_path)}
                                  disabled={isPending}
                                >
                                  <Download className="h-3 w-3 shrink-0" />
                                  {t("btn_download", { defaultValue: "Download" })}
                                </Button>
                              );
                            } else {
                              return (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold text-[9px]">
                                  {t("status_pending", { defaultValue: "Pending" })}
                                </Badge>
                              );
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {initialOrders.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={initialOrders.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        )}
      </div>
    </div>
  );
}
