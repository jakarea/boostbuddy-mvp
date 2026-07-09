"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { uploadInvoiceAction, deleteInvoiceAction, getInvoiceDownloadUrlAction } from "@/app/actions/invoices";
import { ServiceRecord } from "@/app/admin/services/services-client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  Receipt, Plus, ArrowLeft, Upload, FileText,
  Calendar, Check, AlertTriangle, ShieldCheck, Trash, ChevronsUpDown
} from "lucide-react";

export type InvoiceRecord = {
  id: string;
  user_id: string;
  order_id: string | null;
  payment_period_start: string | null;
  payment_period_end: string | null;
  pdf_path: string;
  file_name: string;
  file_size: string;
  created_at: string;
  uploaded_at: string;
  users: { name: string; email: string };
  orders: { service_id: string } | null;
};

export type OrderRecord = {
  id: string;
  user_id: string;
  service_id: string;
  status: string;
  amount: number;
};

export type ActiveClient = {
  id: string;
  name: string;
  email: string;
  status: string;
};

export interface BillingInfoRecord {
  id: string;
  user_id: string;
  billing_type: string;
  country: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  vat_number: string | null;
  fiscal_code: string | null;
  sdi_code: string | null;
}

export default function InvoicesClient({
  initialInvoices,
  activeClients,
  services,
  orders,
  billingInfos = []
}: {
  initialInvoices: InvoiceRecord[];
  activeClients: ActiveClient[];
  services: ServiceRecord[];
  orders: OrderRecord[];
  billingInfos: BillingInfoRecord[];
}) {
  const { t, i18n } = useTranslation("admin_invoices");
  const { success, error } = useToast();
  const [isPending, startTransition] = useTransition();

  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get("action"); // "new"

  // Upload form states
  const [selectedClientId, setSelectedClientId] = useState("");
  const [openClientPopover, setOpenClientPopover] = useState(false);

  const selectedClientBilling = billingInfos.find(b => b.user_id === selectedClientId);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [openOrderPopover, setOpenOrderPopover] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  
  // Real PDF upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileSizeRaw, setFileSizeRaw] = useState(0); // in bytes

  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Set default dates
  useEffect(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30);
    setPeriodStart(start.toISOString().split("T")[0]);
    setPeriodEnd(end.toISOString().split("T")[0]);

    if (activeClients.length > 0 && !selectedClientId) {
      setSelectedClientId(activeClients[0].id);
    }
  }, [activeClients]);

  // Load client's orders
  const clientPaidOrders = orders.filter(
    o => o.user_id === selectedClientId && o.status === "PAID"
  );

  // Set default order selection on client change
  useEffect(() => {
    if (clientPaidOrders.length > 0) {
      setSelectedOrderId(clientPaidOrders[0].id);
    } else {
      setSelectedOrderId("");
    }
  }, [selectedClientId, orders]);

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
      setFileSizeRaw(file.size);
    }
  };

  const handleUploadInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError("");
    setUploadSuccess(false);

    if (!selectedClientId || !selectedFile) {
      setUploadError(t("err_select_client_pdf"));
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("userId", selectedClientId);
    if (selectedOrderId) formData.append("orderId", selectedOrderId);
    if (periodStart) formData.append("periodStart", periodStart);
    if (periodEnd) formData.append("periodEnd", periodEnd);

    startTransition(async () => {
      const result = await uploadInvoiceAction(formData);
      if (result.success) {
        setUploadSuccess(true);
        success(t('alert_uploaded_text'));
        setSelectedFile(null);
        setFileName("");
        router.push("/admin/invoices");
      } else {
        setUploadError(result.error || t("alert_upload_failed"));
        error(result.error || t('alert_upload_failed'));
      }
    });
  };

  const getClientName = (uid: string) => {
    const u = activeClients.find(usr => usr.id === uid);
    return u ? u.name : t("unknown_client");
  };

  const getServiceName = (orderId?: string | null) => {
    if (!orderId) return t("lbl_profile_renewal");
    const ord = orders.find(o => o.id === orderId);
    if (!ord) return t("lbl_service_plan");
    const srv = services.find(s => s.id === ord.service_id);
    return srv ? srv.name : t("lbl_sub_renewal");
  };



  // Format bytes helper
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // --- HOOKS MOVED TO TOP ---
  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredInvoices = useMemo(() => {
    return initialInvoices.filter(inv => {
      // Name/ID search
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = searchTerm === "" || 
        inv.id.toLowerCase().includes(searchLower) ||
        inv.file_name.toLowerCase().includes(searchLower) ||
        (inv.users?.name || "").toLowerCase().includes(searchLower);

      // Client filter
      const matchClient = clientFilter === "ALL" || inv.user_id === clientFilter;

      return matchSearch && matchClient;
    });
  }, [initialInvoices, searchTerm, clientFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, clientFilter]);

  // Calculate paginated results
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInvoices, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  // --- END HOOKS ---

  // Render 1: Upload Invoice Screen
  if (action === "new") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-500"
            onClick={() => router.push("/admin/invoices")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{t("upload_title")}</h1>
            <p className="text-xs text-zinc-500 mt-1">
              {t("upload_subtitle")}
            </p>
          </div>
        </div>

        <form onSubmit={handleUploadInvoice} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base font-extrabold">{t("card_mapping_title")}</CardTitle>
                <CardDescription className="text-xs">
                  {t("card_mapping_desc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {uploadError && (
                  <div className="p-3 bg-red-950/50 border border-red-500/30 text-red-300 rounded-md">
                    {uploadError}
                  </div>
                )}
                {uploadSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-md flex items-center gap-1.5 font-bold">
                    <Check className="h-4 w-4" />
                    {t("success_upload")}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Client */}
                  <div className="space-y-1.5 flex flex-col">
                    <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("lbl_select_client")}</Label>
                    <Popover open={openClientPopover} onOpenChange={setOpenClientPopover}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openClientPopover}
                          className="w-full justify-between bg-zinc-50 dark:bg-zinc-955 border-zinc-200 dark:border-zinc-800 h-9 text-xs font-normal"
                        >
                          {selectedClientId
                            ? (() => {
                                const c = activeClients.find(c => c.id === selectedClientId);
                                return c ? `${c.name} (${c.email})` : t("placeholder_choose_client");
                              })()
                            : t("placeholder_choose_client")}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                        <Command>
                          <CommandInput placeholder={t("search_client_placeholder")} className="text-xs" />
                          <CommandList>
                            <CommandEmpty>{t("err_no_client_found")}</CommandEmpty>
                            <CommandGroup>
                              {activeClients.map((client) => (
                                <CommandItem
                                  key={client.id}
                                  value={`${client.name} ${client.email}`}
                                  onSelect={() => {
                                    setSelectedClientId(client.id);
                                    setOpenClientPopover(false);
                                  }}
                                  className="text-xs data-selected:bg-accent data-selected:text-accent-foreground"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedClientId === client.id ? "opacity-100 text-[#168BB0]" : "opacity-0"
                                    )}
                                  />
                                  {client.name} <span className="text-zinc-500 ml-1">({client.email})</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Selected Client Billing Details */}
                  {selectedClientId && (
                    <div className="sm:col-span-2 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2">
                      <h4 className="font-extrabold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide text-[10px]">
                        Client Billing Details
                      </h4>
                      {selectedClientBilling ? (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-zinc-600 dark:text-zinc-400">
                          <div>
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Type:</span>{" "}
                            <span className={cn(
                              "font-bold text-[10px] px-1.5 py-0.5 rounded",
                              selectedClientBilling.billing_type === "COMPANY" 
                                ? "bg-cyan-500/10 text-cyan-600 border border-cyan-500/20"
                                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                            )}>
                              {selectedClientBilling.billing_type}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Invoice:</span>{" "}
                            <span className={cn(
                              "font-bold text-[10px] px-1.5 py-0.5 rounded",
                              selectedClientBilling.billing_type === "COMPANY" 
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            )}>
                              {selectedClientBilling.billing_type === "COMPANY" ? "REQUIRED" : "NOT REQUIRED"}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Recipient Name:</span>{" "}
                            {selectedClientBilling.name}
                          </div>
                          <div className="col-span-2">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Address:</span>{" "}
                            {selectedClientBilling.address}, {selectedClientBilling.postal_code} {selectedClientBilling.city}, {selectedClientBilling.country}
                          </div>
                          {selectedClientBilling.billing_type === "COMPANY" && (
                            <>
                              {selectedClientBilling.vat_number && (
                                <div>
                                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">VAT Number:</span>{" "}
                                  {selectedClientBilling.vat_number}
                                </div>
                              )}
                              {selectedClientBilling.sdi_code && (
                                <div>
                                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">SDI Code:</span>{" "}
                                  {selectedClientBilling.sdi_code}
                                </div>
                              )}
                            </>
                          )}
                          {selectedClientBilling.billing_type === "INDIVIDUAL" && selectedClientBilling.fiscal_code && (
                            <div>
                              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Fiscal Code:</span>{" "}
                              {selectedClientBilling.fiscal_code}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-zinc-400 italic text-[11px]">
                          No billing details configured by client. Invoice is <span className="font-bold text-amber-600">NOT REQUIRED</span> (Individual user).
                        </p>
                      )}
                    </div>
                  )}

                  {/* Select Order */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("lbl_map_order")}</Label>
                    {clientPaidOrders.length === 0 ? (
                      <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded border border-dashed text-zinc-500 italic text-[11px] h-9 flex items-center">
                        {t("err_no_transactions")}
                      </div>
                    ) : selectedOrderId ? (
                      <Popover open={openOrderPopover} onOpenChange={setOpenOrderPopover}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openOrderPopover}
                            className="w-full justify-between bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs font-normal"
                          >
                            {(() => {
                              const ord = clientPaidOrders.find(o => o.id === selectedOrderId);
                              return ord 
                                ? t("order_option_label", { id: ord.id.substring(0, 8), amount: ord.amount.toFixed(2), service: getServiceName(ord.id) })
                                : t("placeholder_select_order");
                            })()}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] sm:w-[400px] p-0 bg-white dark:bg-zinc-955 border-zinc-200 dark:border-zinc-800" align="start">
                          <Command>
                            <CommandInput placeholder={t("search_order_placeholder")} className="h-9 text-xs" />
                            <CommandList className="max-h-[200px] overflow-y-auto">
                              <CommandEmpty className="py-4 text-center text-xs text-zinc-500">{t("err_no_order_found")}</CommandEmpty>
                              <CommandGroup>
                                {clientPaidOrders.map((ord) => (
                                  <CommandItem
                                    key={ord.id}
                                    value={ord.id} // Search by order ID
                                    onSelect={() => {
                                      setSelectedOrderId(ord.id);
                                      setOpenOrderPopover(false);
                                    }}
                                    className="text-xs data-[selected=true]:bg-[#168BB0] data-[selected=true]:text-white dark:data-[selected=true]:bg-[#168BB0] dark:data-[selected=true]:text-white cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedOrderId === ord.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {t("order_option_label", { id: ord.id.substring(0, 8), amount: ord.amount.toFixed(2), service: getServiceName(ord.id) })}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <div className="h-9 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Service Period */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="s-start" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("lbl_period_start")}</Label>
                    <div className="relative">
                      <Input
                        id="s-start"
                        type="date"
                        value={periodStart}
                        onChange={(e) => setPeriodStart(e.target.value)}
                        className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs pl-9"
                      />
                      <Calendar className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="s-end" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("lbl_period_end")}</Label>
                    <div className="relative">
                      <Input
                        id="s-end"
                        type="date"
                        value={periodEnd}
                        onChange={(e) => setPeriodEnd(e.target.value)}
                        className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs pl-9"
                      />
                      <Calendar className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-6">
            {/* File Drag and drop uploader */}
            <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-zinc-400">{t("card_pdf_title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {/* Simulated file selector */}
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-5 bg-zinc-50 dark:bg-zinc-955 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30 transition-all text-center relative">
                  <Upload className="h-8 w-8 text-zinc-400 mb-2" />
                  
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {t("btn_select_pdf")}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1">{t("pdf_size_limit")}</span>
                  
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileDrop}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>

                {/* PDF details and simulated compression status */}
                {fileName && (
                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-[#168BB0] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-zinc-800 dark:text-zinc-200 truncate">{fileName}</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">{t("original_size", { size: formatBytes(fileSizeRaw) })}</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t border-zinc-100 dark:border-zinc-800 p-4 justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-xs px-4 border-zinc-200"
                  onClick={() => router.push("/admin/invoices")}
                >
                  {t("btn_cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !fileName}
                  className="bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold h-9 text-xs px-6 cursor-pointer"
                >
                  {isPending ? t("btn_uploading") : t("btn_upload_save")}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </form>
      </div>
    );
  }

  const handleDeleteInvoice = (inv: InvoiceRecord) => {
    if (confirm(t("alert_delete_text"))) {
      startTransition(async () => {
        await deleteInvoiceAction(inv.id, inv.pdf_path);
        success(t("alert_deleted_text"));
      });
    }
  };

  const getLinkedOrderAmount = (orderId?: string) => {
    if (!orderId) return null;
    const ord = orders.find(o => o.id === orderId);
    return ord ? ord.amount : null;
  };



  // Get unique clients who have invoices
  const clientsWithInvoices = [...new Set(initialInvoices.map(i => i.user_id))].map(uid => ({
    id: uid,
    name: getClientName(uid)
  }));

  // Render 2: Invoice List Table
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
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t("total_invoices")}</div>
            <div className="text-lg font-extrabold text-zinc-800 dark:text-zinc-200">{initialInvoices.length}</div>
          </div>
          <Button 
            className="bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold cursor-pointer"
            onClick={() => router.push("/admin/invoices?action=new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("btn_upload_invoice")}
          </Button>
        </div>
      </div>


      {/* Search & Filter Toolbar */}
      <div className="flex gap-3 flex-wrap md:flex-nowrap">
        <div className="relative flex-1">
          <Input
            placeholder={t("search_placeholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 h-9 text-xs pl-9 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400"
          />
          <Receipt className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
        </div>

        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="h-9 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-md px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#168BB0] cursor-pointer text-zinc-800 dark:text-zinc-200"
        >
          <option value="ALL">{t("filter_all_clients")}</option>
          {clientsWithInvoices.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* List Table */}
      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            {initialInvoices.length === 0 
              ? t("empty_db")
              : t("empty_filtered")}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
              <TableHeader className="bg-zinc-50 dark:bg-zinc-955 border-b border-zinc-200 dark:border-zinc-800">
                <TableRow>
                  <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_id")}</TableHead>
                  <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_client")}</TableHead>
                  <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_file_name")}</TableHead>
                  <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_linked_order")}</TableHead>
                  <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_period")}</TableHead>
                  <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_size")}</TableHead>
                  <TableHead className="text-xs font-bold text-zinc-500 h-10">{t("col_uploaded")}</TableHead>
                  <TableHead className="text-xs font-bold text-zinc-500 h-10 text-right">{t("col_actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.map((inv) => {
                  const orderAmount = getLinkedOrderAmount(inv.order_id || undefined);
                  return (
                    <TableRow key={inv.id} className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                      <TableCell className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300" title={inv.id}>
                        {inv.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="text-xs">
                        <span
                          className="font-bold text-[#168BB0] dark:text-[#45B0D2] cursor-pointer hover:underline"
                          onClick={() => router.push(`/admin/clients?id=${inv.user_id}`)}
                        >
                          {getClientName(inv.user_id)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-zinc-600 dark:text-zinc-400" title={inv.file_name}>
                        <span className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          {inv.file_name.length > 15 ? inv.file_name.substring(0, 15) + "..." : inv.file_name}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {inv.order_id ? (
                          <div className="flex flex-col gap-1">
                            <span 
                              className="font-mono text-[10px] truncate max-w-[120px] font-semibold text-[#168BB0] dark:text-[#45B0D2] cursor-pointer hover:underline"
                              onClick={() => router.push(`/admin/orders?search=${inv.order_id}`)}
                              title="View Order"
                            >
                              {inv.order_id.length > 10 ? '...' + inv.order_id.slice(-10) : inv.order_id}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic text-[10px]">{t("not_linked")}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {inv.payment_period_start && inv.payment_period_end ? (
                          <span>
                            {new Date(inv.payment_period_start).toLocaleDateString(i18n.language, { month: "short", day: "numeric", year: "numeric" })} → {new Date(inv.payment_period_end).toLocaleDateString(i18n.language, { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        ) : (
                          <span className="text-zinc-400 italic text-[10px]">{t("not_applicable")}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-zinc-500">{inv.file_size}</TableCell>
                      <TableCell className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {new Date(inv.uploaded_at || inv.created_at).toLocaleDateString(i18n.language, {
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[10px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                            onClick={async () => {
                              startTransition(async () => {
                                const res = await getInvoiceDownloadUrlAction(inv.pdf_path);
                                if (res.success && res.url) {
                                  const link = document.createElement('a');
                                  link.href = res.url;
                                  link.setAttribute('download', inv.file_name);
                                  document.body.appendChild(link);
                                  link.click();
                                  link.parentNode?.removeChild(link);
                                } else {
                                  error(res.error || 'Failed to open file');
                                }
                              });
                            }}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            {t("btn_pdf")}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                            onClick={() => handleDeleteInvoice(inv)}
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

            {/* Mobile Cards View */}
            <div className="md:hidden flex flex-col gap-3 p-3">
              {paginatedInvoices.map((inv) => {
                const orderAmount = getLinkedOrderAmount(inv.order_id || undefined);
                return (
                  <Card key={inv.id} className="bg-zinc-50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 p-3 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span
                          className="font-bold text-sm text-[#168BB0] dark:text-[#45B0D2] cursor-pointer hover:underline"
                          onClick={() => router.push(`/admin/clients?id=${inv.user_id}`)}
                        >
                          {getClientName(inv.user_id)}
                        </span>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">ID: {inv.id.substring(0, 8)}...</div>
                      </div>
                      <div className="text-[10px] font-semibold text-zinc-500 text-right">
                        {new Date(inv.uploaded_at || inv.created_at).toLocaleDateString(i18n.language)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 p-2 rounded-md border border-zinc-200 dark:border-zinc-800">
                      <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
                      <span className="truncate" title={inv.file_name}>
                        {inv.file_name.length > 15 ? inv.file_name.substring(0, 15) + "..." : inv.file_name}
                      </span>
                      <span className="ml-auto text-[10px] text-zinc-500 shrink-0">{inv.file_size}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase">{t("col_order_mobile")}</div>
                        {inv.order_id ? (
                          <div 
                            className="font-mono text-[10px] truncate font-semibold text-[#168BB0] dark:text-[#45B0D2] cursor-pointer hover:underline"
                            onClick={() => router.push(`/admin/orders?search=${inv.order_id}`)}
                            title="View Order"
                          >
                            {inv.order_id.length > 10 ? '...' + inv.order_id.slice(-10) : inv.order_id}
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic text-[10px]">{t("not_linked")}</span>
                        )}
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase">{t("col_period_mobile")}</div>
                        {inv.payment_period_start && inv.payment_period_end ? (
                          <div className="text-zinc-600 dark:text-zinc-400 text-[10px]">
                            {new Date(inv.payment_period_start).toLocaleDateString(i18n.language, { month: "short", day: "numeric", year: "numeric" })} → {new Date(inv.payment_period_end).toLocaleDateString(i18n.language, { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic text-[10px]">{t("not_applicable")}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-full"
                        onClick={async () => {
                          startTransition(async () => {
                            const res = await getInvoiceDownloadUrlAction(inv.pdf_path);
                            if (res.success && res.url) {
                              const link = document.createElement('a');
                              link.href = res.url;
                              link.setAttribute('download', inv.file_name);
                              document.body.appendChild(link);
                              link.click();
                              link.parentNode?.removeChild(link);
                            } else {
                              error(res.error || 'Failed to open file');
                            }
                          });
                        }}
                      >
                        <FileText className="h-3 w-3 mr-1.5" />
                        {t("btn_download_pdf")}
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-955/30 shrink-0"
                        onClick={() => handleDeleteInvoice(inv)}
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Pagination */}
      {filteredInvoices.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredInvoices.length}
          itemsPerPage={itemsPerPage}
        />
      )}
    </div>
  );
}
