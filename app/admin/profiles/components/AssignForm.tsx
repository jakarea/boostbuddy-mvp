"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { assignProfileAction } from "@/app/actions/profiles";
import { ProfileAccountRecord, ActiveClient } from "./types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar } from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface AssignFormProps {
  profile: ProfileAccountRecord | null;
  activeClients: ActiveClient[];
  onCancel: () => void;
}

export default function AssignForm({ profile, activeClients, onCancel }: AssignFormProps) {
  const { t } = useTranslation("admin_profiles");
  const { success, error } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [selectedClientId, setSelectedClientId] = useState(
    activeClients.length > 0 ? activeClients[0].id : ""
  );
  const [assignmentDate, setAssignmentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [expirationDate, setExpirationDate] = useState(() => {
    const exp = new Date();
    exp.setDate(exp.getDate() + 30);
    return exp.toISOString().split("T")[0];
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedClientId || !expirationDate) return;

    startTransition(async () => {
      const res = await assignProfileAction(
        profile.id,
        selectedClientId,
        expirationDate,
        undefined,
        assignmentDate || undefined
      );
      if (res && !res.success) {
        error(res.error || "Failed to assign profile");
      } else {
        success("Profile assigned successfully");
        router.refresh();
        router.push("/admin/profiles");
      }
    });
  };

  if (!profile) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-500"
          onClick={onCancel}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{t("assign_title", { name: profile?.profile_name })}</h1>
          <p className="text-xs text-zinc-500 mt-1">
            {t("assign_subtitle")}
          </p>
        </div>
      </div>

      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 max-w-md">
        <CardHeader>
          <CardTitle className="text-base font-extrabold">{t("card_alloc_title")}</CardTitle>
          <CardDescription className="text-xs">
            {t("card_alloc_desc")}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 text-xs">
            {/* Client Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("lbl_select_active_client")}</Label>
              {activeClients.length === 0 ? (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded border border-dashed text-zinc-500">
                  {t("err_no_active_clients")}
                </div>
              ) : (
                <Select
                  value={selectedClientId}
                  onValueChange={(val) => setSelectedClientId(val || "")}
                  disabled={isPending}
                >
                  <SelectTrigger className="bg-zinc-50 dark:bg-zinc-955 border-zinc-200 dark:border-zinc-800 h-9 text-xs">
                    <SelectValue placeholder={t("placeholder_select_client")}>
                      {(value) => {
                        const client = activeClients.find((c) => c.id === value);
                        return client ? `${client.name} (${client.email})` : null;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 min-w-[280px] sm:min-w-[350px]">
                    {activeClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} ({client.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Assignment Date */}
            <div className="space-y-1.5">
              <Label htmlFor="p-assign-date" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("lbl_assignment_date")}</Label>
              <div className="relative">
                <Input
                  id="p-assign-date"
                  type="date"
                  value={assignmentDate}
                  onChange={(e) => setAssignmentDate(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs pl-9"
                  required
                  disabled={isPending}
                />
                <Calendar className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Expiration Date */}
            <div className="space-y-1.5">
              <Label htmlFor="p-exp" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("lbl_subscription_expiration")}</Label>
              <div className="relative">
                <Input
                  id="p-exp"
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs pl-9"
                  required
                  disabled={isPending}
                />
                <Calendar className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-zinc-100 dark:border-zinc-800 p-4 justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 text-xs px-4 border-zinc-200"
              onClick={onCancel}
              disabled={isPending}
            >
              {t("btn_cancel")}
            </Button>
            <Button
              type="submit"
              disabled={activeClients.length === 0 || isPending}
              className="bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold h-9 text-xs px-6 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "..." : t("btn_assign_activate")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
