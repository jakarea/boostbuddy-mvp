"use client";

import React, { useState, useMemo, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InvoiceRecord, OrderRecord } from "@/app/a/invoices/invoices-client";
import { ServiceRecord } from "@/app/a/services/services-client";
import { getInvoiceDownloadUrlAction } from "@/app/actions/invoices";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Receipt, Download, FileText, Printer, Globe, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";

export default function ClientInvoices({
  initialInvoices,
  services,
  orders
}: {
  initialInvoices: InvoiceRecord[];
  services: ServiceRecord[];
  orders: OrderRecord[];
}) {
  const { t, i18n } = useTranslation("client_invoices");
  const { error } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Modal states
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 10;

  // Navigation handlers
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/c/invoices?${params.toString()}`);
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

  // Filter invoices for the client (already filtered by Server Action, just sort them)
  const clientInvoices = useMemo(() => {
    return [...initialInvoices]
      .sort((a, b) => new Date(b.uploaded_at || b.created_at).getTime() - new Date(a.uploaded_at || a.created_at).getTime());
  }, [initialInvoices]);

  // Search filter
  const filteredInvoices = useMemo(() => {
    if (!searchTerm) return clientInvoices;
    const term = searchTerm.toLowerCase();
    return clientInvoices.filter((inv) => {
      const fileName = inv.file_name.toLowerCase();
      const id = inv.id.toLowerCase();
      const orderId = inv.order_id?.toLowerCase() || "";
      return (
        fileName.includes(term) ||
        id.includes(term) ||
        orderId.includes(term)
      );
    });
  }, [clientInvoices, searchTerm]);

  // Calculate paginated results
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInvoices, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);

  const getOrderAmount = (orderId?: string | null) => {
    if (!orderId) return 0;
    const ord = orders.find(o => o.id === orderId);
    return ord ? ord.amount : 0;
  };

  const getServiceName = (orderId?: string | null) => {
    if (!orderId) return t("lbl_renewal");
    const ord = orders.find(o => o.id === orderId);
    if (!ord) return t("lbl_service_plan");
    const srv = services.find(s => s.id === ord.service_id);
    return srv ? srv.name : t("lbl_sub_renewal");
  };

  const openInvoiceViewer = (invoice: InvoiceRecord) => {
    setSelectedInvoice(invoice);
    setIsViewerOpen(true);
  };

  const triggerDownload = (path: string) => {
    startTransition(async () => {
      const res = await getInvoiceDownloadUrlAction(path);
      if (res.success && res.data?.url) {
        const a = document.createElement("a");
        a.href = res.data.url;
        a.setAttribute("download", "");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        error(res.error || "Failed to open file");
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Active client billing details would typically be fetched here
  // For the MVP, we skip the fake billing details or use users table
  const clientBilling: any = null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">{t("title")}</h1>
        <p className="text-xs text-zinc-500 mt-1">
          {t("subtitle")}
        </p>
      </div>

      {/* Search Bar */}
      {clientInvoices.length > 0 && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("search_placeholder", "Search invoices...")}
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
                Found {filteredInvoices.length} result{filteredInvoices.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      )}

      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {clientInvoices.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-500 flex flex-col items-center justify-center gap-2">
            <Receipt className="h-8 w-8 text-zinc-300" />
            <h4 className="font-semibold text-zinc-800 dark:text-zinc-200">{t("no_invoices_title")}</h4>
            <p className="max-w-xs mx-auto mt-0.5 leading-normal">
              {t("no_invoices_desc")}
            </p>
          </div>
        ) : (
          <div className="w-full">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_id")}</TableHead>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_name")}</TableHead>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_period")}</TableHead>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_size")}</TableHead>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_date")}</TableHead>
                    <TableHead className="text-xs font-bold text-zinc-500 h-10 text-right">{t("col_actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.map((inv) => (
                    <TableRow key={inv.id} className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                      <TableCell className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300" title={inv.id}>
                        {inv.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 h-11" title={inv.file_name}>
                        <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        {inv.file_name.length > 15 ? inv.file_name.substring(0, 15) + "..." : inv.file_name}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {inv.payment_period_start && inv.payment_period_end ? (
                          <span>
                            {new Date(inv.payment_period_start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} → {new Date(inv.payment_period_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        ) : (
                          <span className="text-zinc-400 italic text-[10px]">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-zinc-500">{inv.file_size}</TableCell>
                      <TableCell className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {new Date(inv.uploaded_at || inv.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button 
                             size="sm"
                             variant="ghost"
                             className="h-8 px-2 text-[10px] font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[#168BB0] dark:text-[#45B0D2]"
                             onClick={() => openInvoiceViewer(inv)}
                          >
                            {t("btn_view")}
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            title={t("btn_download", { defaultValue: "Download" })}
                            className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                            disabled={isPending}
                            onClick={() => triggerDownload(inv.pdf_path)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
              {paginatedInvoices.map((inv) => (
                <div key={inv.id} className="p-4 flex flex-col gap-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-[#168BB0] dark:text-[#45B0D2]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1" title={inv.file_name}>
                          {inv.file_name}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          ID: {inv.id.substring(0, 8)}... • {inv.file_size}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">{t("col_date")}</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        {new Date(inv.uploaded_at || inv.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">{t("col_period")}</span>
                      {inv.payment_period_start && inv.payment_period_end ? (
                        <span className="font-medium text-zinc-700 dark:text-zinc-300 line-clamp-1">
                          {new Date(inv.payment_period_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })} → {new Date(inv.payment_period_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      ) : (
                        <span className="text-zinc-400 italic">N/A</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-1">
                    <Button 
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs font-semibold border-zinc-200 dark:border-zinc-800"
                      onClick={() => openInvoiceViewer(inv)}
                    >
                      <Receipt className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
                      {t("btn_view_mobile")}
                    </Button>
                    <Button 
                      size="sm"
                      className="flex-1 h-8 text-xs font-semibold bg-[#168BB0] hover:bg-[#0F7493] text-white"
                      disabled={isPending}
                      onClick={() => triggerDownload(inv.pdf_path)}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      {t("btn_download")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {filteredInvoices.length > 0 && (
        <div className="flex items-center justify-between bg-white dark:bg-zinc-800 rounded-lg p-4 shadow">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {searchTerm
              ? `Showing ${currentPage} of ${totalPages} pages (${filteredInvoices.length} filtered)`
              : `Showing ${currentPage} of ${totalPages} pages (${filteredInvoices.length} invoices)`
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

      {/* Invoice Viewer Modal */}
      {selectedInvoice && (
        <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
          <DialogContent className="max-w-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl">
            <DialogHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-3 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-sm font-extrabold uppercase tracking-wider text-zinc-400">{t("modal_title")}</DialogTitle>
                <DialogDescription className="text-xs text-zinc-500 font-mono mt-0.5">ID: {selectedInvoice.id}</DialogDescription>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="icon" variant="ghost" title={t("btn_print", { defaultValue: "Print" })} className="h-8 w-8 text-zinc-500 hover:text-zinc-950 dark:hover:text-white" onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" title={t("btn_download", { defaultValue: "Download" })} className="h-8 w-8 text-zinc-500 hover:text-zinc-950 dark:hover:text-white" disabled={isPending} onClick={() => triggerDownload(selectedInvoice.pdf_path)}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            {/* Printable Invoice Body */}
            <div className="py-4 space-y-6 text-xs leading-normal">
              {/* Header section */}
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-base tracking-tight text-[#168BB0] dark:text-[#45B0D2]">
                    <Globe className="h-4 w-4" />
                    BoostBuddy Networks
                  </div>
                  <div className="text-[10px] text-zinc-500 leading-normal">
                    120 Enterprise Blvd, Suite 400<br />
                    San Francisco, CA 94103<br />
                    billing@boostbuddy.net
                  </div>
                </div>
                
                <div className="text-right space-y-1">
                  <div className="text-xl font-bold tracking-tight text-zinc-400 dark:text-zinc-600">{t("modal_paid_receipt")}</div>
                  <div className="text-[10px] text-zinc-500">
                    {t("modal_date_paid")} {new Date(selectedInvoice.uploaded_at || selectedInvoice.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric"
                    })}
                  </div>
                </div>
              </div>

              {/* Recipient info & order metadata */}
              <div className="grid grid-cols-2 gap-6 bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="space-y-1.5">
                  <div className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider">{t("modal_bill_to")}</div>
                  <div className="font-extrabold text-zinc-800 dark:text-zinc-200">{clientBilling?.name || selectedInvoice.users?.name || "Client"}</div>
                  <div className="text-zinc-500 text-[10px] leading-relaxed">
                    {clientBilling?.address}<br />
                    {clientBilling?.city}, {clientBilling?.postalCode}<br />
                    {clientBilling?.country}
                  </div>
                  {clientBilling?.vatNumber && (
                    <div className="text-[10px] text-zinc-500">VAT: <strong className="text-zinc-700 dark:text-zinc-300">{clientBilling.vatNumber}</strong></div>
                  )}
                  {clientBilling?.fiscalCode && (
                    <div className="text-[10px] text-zinc-500">Fiscal Code: <strong className="text-zinc-700 dark:text-zinc-300">{clientBilling.fiscalCode}</strong></div>
                  )}
                  {clientBilling?.sdiCode && (
                    <div className="text-[10px] text-zinc-500">SDI: <strong className="text-zinc-700 dark:text-zinc-300">{clientBilling.sdiCode}</strong></div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider">{t("modal_order_ref")}</div>
                  <div className="font-mono text-zinc-800 dark:text-zinc-200 font-bold">{selectedInvoice.order_id || "N/A"}</div>
                  {selectedInvoice.payment_period_start && (
                    <div className="text-zinc-500 text-[10px]">
                      {t("modal_billing_period")}<br />
                      <strong className="text-zinc-800 dark:text-zinc-200">
                        {selectedInvoice.payment_period_start} to {selectedInvoice.payment_period_end}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-2">
                <div className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider">{t("modal_line_items")}</div>
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                      <TableRow>
                        <TableHead className="text-[10px] font-bold text-zinc-500 h-8">{t("modal_col_description")}</TableHead>
                        <TableHead className="text-[10px] font-bold text-zinc-500 h-8 text-right">{t("modal_col_qty")}</TableHead>
                        <TableHead className="text-[10px] font-bold text-zinc-500 h-8 text-right">{t("modal_col_price")}</TableHead>
                        <TableHead className="text-[10px] font-bold text-zinc-500 h-8 text-right">{t("modal_col_total")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="border-b border-zinc-200 dark:border-zinc-800/80">
                        <TableCell className="py-2.5 font-bold text-zinc-800 dark:text-zinc-200">
                          {getServiceName(selectedInvoice.order_id)}
                        </TableCell>
                        <TableCell className="py-2.5 text-right font-medium">1</TableCell>
                        <TableCell className="py-2.5 text-right font-medium">${getOrderAmount(selectedInvoice.order_id).toFixed(2)}</TableCell>
                        <TableCell className="py-2.5 text-right font-bold text-zinc-800 dark:text-zinc-200">${getOrderAmount(selectedInvoice.order_id).toFixed(2)}</TableCell>
                      </TableRow>
                      
                      {/* Summary calculations */}
                      <TableRow className="bg-zinc-50/50 dark:bg-zinc-950/20">
                        <TableCell colSpan={2} className="py-1.5"></TableCell>
                        <TableCell className="py-1.5 text-right font-bold text-zinc-500">{t("modal_subtotal")}</TableCell>
                        <TableCell className="py-1.5 text-right font-bold text-zinc-800 dark:text-zinc-200">${getOrderAmount(selectedInvoice.order_id).toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow className="bg-zinc-50/50 dark:bg-zinc-950/20">
                        <TableCell colSpan={2} className="py-1.5"></TableCell>
                        <TableCell className="py-1.5 text-right font-bold text-zinc-500">{t("modal_tax")}</TableCell>
                        <TableCell className="py-1.5 text-right font-bold text-zinc-800 dark:text-zinc-200">$0.00</TableCell>
                      </TableRow>
                      <TableRow className="bg-zinc-50/50 dark:bg-zinc-950/20 border-t border-zinc-200 dark:border-zinc-800">
                        <TableCell colSpan={2} className="py-2"></TableCell>
                        <TableCell className="py-2 text-right font-extrabold text-[#168BB0] dark:text-[#45B0D2]">{t("modal_amount_paid")}</TableCell>
                        <TableCell className="py-2 text-right font-extrabold text-[#168BB0] dark:text-[#45B0D2]">${getOrderAmount(selectedInvoice.order_id).toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Thank you statement */}
              <div className="text-center text-[10px] text-zinc-400 italic pt-2">
                {t("modal_footer_thanks")}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
