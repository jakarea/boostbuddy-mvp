"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import { useToast } from "@/context/ToastContext";
import { upsertServiceAction, deleteServiceAction } from "@/app/actions/services";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { Plus, ArrowLeft, Trash, Edit } from "lucide-react";

export type ServiceRecord = {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  is_active: boolean;
  requires_manual_assignment: boolean;
  instructions: string;
};

export default function ServicesClient({ initialServices }: { initialServices: ServiceRecord[] }) {
  const { t } = useTranslation("admin_services");
  const { success, error } = useToast();
  const [isPending, startTransition] = useTransition();

  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get("id");
  const action = searchParams.get("action"); // "new", "edit"

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Service form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("49.00");
  const [durationDays, setDurationDays] = useState("30");
  const [isActive, setIsActive] = useState(true);
  const [requiresManualAssignment, setRequiresManualAssignment] = useState(true);
  const [instructions, setInstructions] = useState("");

  // Load service details
  useEffect(() => {
    if (serviceId) {
      const s = initialServices.find(srv => srv.id === serviceId);
      if (s) {
        setName(s.name);
        setDescription(s.description);
        setPrice(s.price.toString());
        setDurationDays(s.duration_days.toString());
        setIsActive(s.is_active);
        setRequiresManualAssignment(s.requires_manual_assignment);
        setInstructions(s.instructions);
      }
    } else {
      setName("");
      setDescription("");
      setPrice("49.00");
      setDurationDays("30");
      setIsActive(true);
      setRequiresManualAssignment(true);
      setInstructions("");
    }
  }, [serviceId, initialServices]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("price", price);
    formData.append("durationDays", durationDays);
    formData.append("isActive", isActive.toString());
    formData.append("requiresManualAssignment", requiresManualAssignment.toString());
    formData.append("instructions", instructions);

    startTransition(async () => {
      const result = await upsertServiceAction(formData, serviceId || undefined);
      if (result.success) {
        success(t('alert_saved_text'));
        router.push("/admin/services");
      } else {
        error(result.error || t('alert_save_failed'));
      }
    });
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: t("are_you_sure", { defaultValue: "Are you sure?" }),
      text: t('alert_delete_text'),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#168BB0",
      cancelButtonColor: "#d33",
      confirmButtonText: t("yes", { defaultValue: "Yes" })
    });

    if (result.isConfirmed) {
      startTransition(async () => {
        await deleteServiceAction(id);
        success(t('alert_deleted_text'));
        router.refresh();
      });
    }
  };

  // Calculate paginated results
  const paginatedServices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return initialServices.slice(startIndex, startIndex + itemsPerPage);
  }, [initialServices, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(initialServices.length / itemsPerPage);

  // Render 1: Add/Edit Service Screen
  if (action === "new" || (action === "edit" && serviceId)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-500"
            onClick={() => router.push("/admin/services")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              {action === "new" ? t('new_title') : t('edit_title')}
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              {action === "new" ? t('new_subtitle') : t('edit_subtitle')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base font-extrabold">{t('card_details_title')}</CardTitle>
                <CardDescription className="text-xs">
                  {t('card_details_desc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label htmlFor="s-name" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t('lbl_name')}</Label>
                  <Input
                    id="s-name"
                    type="text"
                    placeholder={t('placeholder_name')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s-desc" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t('lbl_description')}</Label>
                  <Input
                    id="s-desc"
                    type="text"
                    placeholder={t('placeholder_desc')}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="s-price" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t('lbl_price')}</Label>
                    <Input
                      id="s-price"
                      type="number"
                      step="0.01"
                      placeholder="49.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs font-semibold"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="s-duration" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t('lbl_duration')}</Label>
                    <Input
                      id="s-duration"
                      type="number"
                      placeholder="30"
                      value={durationDays}
                      onChange={(e) => setDurationDays(e.target.value)}
                      className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs font-semibold"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t('lbl_instructions')}</Label>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full h-32 p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-[#168BB0] text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed"
                    placeholder={t('placeholder_instructions')}
                    required
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-zinc-400">{t('card_settings_title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 text-xs">
                {/* Active Switch */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t('lbl_status')}</Label>
                    <div className="text-[10px] text-zinc-500">{t('status_desc')}</div>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>

                {/* Manual Allocation Switch */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t('lbl_allocation')}</Label>
                    <div className="text-[10px] text-zinc-500 leading-normal">{t('allocation_desc')}</div>
                  </div>
                  <Switch
                    checked={requiresManualAssignment}
                    onCheckedChange={setRequiresManualAssignment}
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t border-zinc-100 dark:border-zinc-800 p-4 justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-xs px-4 border-zinc-200"
                  onClick={() => router.push("/admin/services")}
                >
                  {t('btn_cancel')}
                </Button>
                <Button
                  type="submit"
                  className="bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold h-9 text-xs px-6 cursor-pointer"
                >
                  {t('btn_save_service')}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </form>
      </div>
    );
  }

  // Render 2: Services List
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{t('title')}</h1>
          <p className="text-xs text-zinc-500 mt-1">
            {t('subtitle')}
          </p>
        </div>
        <Button 
          className="bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold cursor-pointer"
          onClick={() => router.push("/admin/services?action=new")}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('btn_create_service')}
        </Button>
      </div>

      {/* List Table */}
      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {initialServices.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            {t('empty_db')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <TableRow>
                  <TableHead className="text-xs font-bold text-zinc-500 h-10">{t('col_name')}</TableHead>
                  <TableHead className="text-xs font-bold text-zinc-500 h-10">{t('col_description')}</TableHead>
                  <TableHead className="text-xs font-bold text-zinc-500 h-10">{t('col_price')}</TableHead>
                  <TableHead className="text-xs font-bold text-zinc-500 h-10">{t('col_duration')}</TableHead>
                  <TableHead className="text-xs font-bold text-zinc-500 h-10">{t('col_manual_assignment')}</TableHead>
                  <TableHead className="text-xs font-bold text-zinc-500 h-10">{t('col_state')}</TableHead>
                  <TableHead className="text-xs font-bold text-zinc-500 h-10 text-right">{t('col_actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedServices.map((srv) => (
                  <TableRow key={srv.id} className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                    <TableCell className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">{srv.name}</TableCell>
                    <TableCell className="text-xs text-zinc-500 max-w-xs truncate">{srv.description}</TableCell>
                    <TableCell className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">${srv.price.toFixed(2)}</TableCell>
                    <TableCell className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{srv.duration_days} {t('days')}</TableCell>
                    <TableCell className="text-xs text-center">
                      <Badge variant="outline" className={`font-semibold text-[9px] uppercase ${
                        srv.requires_manual_assignment 
                          ? "bg-[#168BB0]/10 text-[#168BB0] border-[#168BB0]/20" 
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}>
                        {srv.requires_manual_assignment ? t('val_required') : t('val_auto')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className={
                        srv.is_active 
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60" 
                          : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                      }>
                        {srv.is_active ? t('val_active') : t('val_inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                          onClick={() => router.push(`/admin/services?action=edit&id=${srv.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                          onClick={() => handleDelete(srv.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Mobile Card View */}
      {initialServices.length > 0 && (
        <div className="space-y-3 md:hidden">
          {paginatedServices.map((srv) => (
            <Card key={srv.id} className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                      {srv.name}
                    </CardTitle>
                    <CardDescription className="text-xs font-extrabold text-[#168BB0] dark:text-[#45B0D2] mt-0.5">
                      ${srv.price.toFixed(2)}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={
                    srv.is_active 
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60 font-bold text-[8px] uppercase tracking-wider shrink-0 mt-0.5" 
                      : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 font-bold text-[8px] uppercase tracking-wider shrink-0 mt-0.5"
                  }>
                    {srv.is_active ? t('val_active') : t('val_inactive')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pb-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-600 dark:text-zinc-400">{t('col_duration')}</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{srv.duration_days} {t('days')}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-600 dark:text-zinc-400">{t('col_manual_assignment')}</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {srv.requires_manual_assignment ? t('val_required') : t('val_auto')}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs font-semibold text-[#168BB0] dark:text-[#45B0D2] hover:bg-[#168BB0]/5"
                  onClick={() => router.push(`/admin/services?action=edit&id=${srv.id}`)}
                >
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  {t('btn_edit')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={() => handleDelete(srv.id)}
                >
                  <Trash className="h-3.5 w-3.5 mr-1" />
                  {t('btn_delete')}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {initialServices.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={initialServices.length}
          itemsPerPage={itemsPerPage}
        />
      )}
    </div>
  );
}
