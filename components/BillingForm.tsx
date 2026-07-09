"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface BillingFormData {
  billingType: "INDIVIDUAL" | "COMPANY";
  country: string;
  billingName: string;
  address: string;
  city: string;
  postalCode: string;
  vatNumber?: string;
  fiscalCode?: string;
  sdiCode?: string;
}

interface BillingFormProps {
  data: BillingFormData;
  onChange: (data: BillingFormData) => void;
  onSubmit: (data: BillingFormData) => void;
  isLoading?: boolean;
  savedSuccess?: boolean;
  showOptionalFields?: boolean;
  submitButtonText?: string;
  title?: string;
  description?: string;
}

export function BillingForm({
  data,
  onChange,
  onSubmit,
  isLoading = false,
  savedSuccess = false,
  showOptionalFields = true,
  submitButtonText,
  title,
  description,
}: BillingFormProps) {
  const { t } = useTranslation("billing_form");

  const actualTitle = title || t("title");
  const actualDescription = description || t("description");
  const actualSubmitButtonText = submitButtonText || t("btn_save");

  const handleChange = (field: keyof BillingFormData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(data);
  };

  return (
    <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base font-extrabold">{actualTitle}</CardTitle>
        <CardDescription className="text-xs">{actualDescription}</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Success Message */}
          {savedSuccess && (
            <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-md flex items-center gap-1.5 font-bold">
              <Check className="h-4 w-4" />
              {t("success_message")}
            </div>
          )}

          {/* Billing Type & Country */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Billing Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t("billing_type")}</Label>
              <Select
                value={data.billingType}
                onValueChange={(val) => handleChange("billingType", val as "INDIVIDUAL" | "COMPANY")}
              >
                <SelectTrigger className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs">
                  <SelectValue placeholder={t("select_type")} />
                </SelectTrigger>
                <SelectContent className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                  <SelectItem value="INDIVIDUAL">{t("individual")}</SelectItem>
                  <SelectItem value="COMPANY">{t("company")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Country */}
            <div className="space-y-1.5">
              <Label htmlFor="country" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                {t("country")}
              </Label>
              <Input
                id="country"
                type="text"
                value={data.country}
                onChange={(e) => handleChange("country", e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
              />
            </div>
          </div>

          {/* Billing Name */}
          <div className="space-y-1.5">
            <Label htmlFor="billing-name" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              {data.billingType === "COMPANY" ? t("company_name_label") : t("full_name_label")}
            </Label>
            <Input
              id="billing-name"
              type="text"
              value={data.billingName}
              onChange={(e) => handleChange("billingName", e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
              required
              placeholder={data.billingType === "COMPANY" ? t("company_placeholder") : t("individual_placeholder")}
            />
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              {t("street_address")}
            </Label>
            <Input
              id="address"
              type="text"
              value={data.address}
              onChange={(e) => handleChange("address", e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
              required
              placeholder={t("street_placeholder")}
            />
          </div>

          {/* City & Postal Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                {t("city")}
              </Label>
              <Input
                id="city"
                type="text"
                value={data.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                required
                placeholder={t("city_placeholder")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="postal-code" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                {t("postal_code")}
              </Label>
              <Input
                id="postal-code"
                type="text"
                value={data.postalCode}
                onChange={(e) => handleChange("postalCode", e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                required
                placeholder={t("postal_placeholder")}
              />
            </div>
          </div>

          {/* Optional Tax Fields */}
          {showOptionalFields && (
            <div className="space-y-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">{t("tax_info")}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* VAT Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="vat" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    {t("vat")}
                  </Label>
                  <Input
                    id="vat"
                    type="text"
                    placeholder={t("vat_placeholder")}
                    value={data.vatNumber || ""}
                    onChange={(e) => handleChange("vatNumber", e.target.value)}
                    className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                  />
                </div>

                {/* Fiscal Code */}
                <div className="space-y-1.5">
                  <Label htmlFor="fiscal" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    {t("fiscal_code")}
                  </Label>
                  <Input
                    id="fiscal"
                    type="text"
                    placeholder={t("fiscal_placeholder")}
                    value={data.fiscalCode || ""}
                    onChange={(e) => handleChange("fiscalCode", e.target.value)}
                    className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                  />
                </div>

                {/* SDI Code */}
                <div className="space-y-1.5">
                  <Label htmlFor="sdi" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    {t("sdi")}
                  </Label>
                  <Input
                    id="sdi"
                    type="text"
                    placeholder={t("sdi_placeholder")}
                    value={data.sdiCode || ""}
                    onChange={(e) => handleChange("sdiCode", e.target.value)}
                    className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>

        {/* Footer with Submit Button */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 p-4 flex justify-end gap-2">
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold h-9 px-6 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? t("btn_saving") : actualSubmitButtonText}
          </Button>
        </div>
      </form>
    </Card>
  );
}
