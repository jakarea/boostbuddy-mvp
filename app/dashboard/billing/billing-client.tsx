"use client";

import React, { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Loader2 } from "lucide-react";
import { upsertClientBillingAction } from "@/app/actions/billing";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";

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

interface BillingClientProps {
  initialBilling: BillingInfoDTO | null;
}

export default function BillingClient({ initialBilling }: BillingClientProps) {
  const { t } = useTranslation("client_billing");
  const { success, error } = useToast();
  const [isPending, startTransition] = useTransition();

  const [billingType, setBillingType] = useState(initialBilling?.billing_type || "INDIVIDUAL");
  const [country, setCountry] = useState(initialBilling?.country || "Italy");
  const [name, setName] = useState(initialBilling?.name || "");
  const [address, setAddress] = useState(initialBilling?.address || "");
  const [city, setCity] = useState(initialBilling?.city || "");
  const [postalCode, setPostalCode] = useState(initialBilling?.postal_code || "");
  const [vatNumber, setVatNumber] = useState(initialBilling?.vat_number || "");
  const [fiscalCode, setFiscalCode] = useState(initialBilling?.fiscal_code || "");
  const [sdiCode, setSdiCode] = useState(initialBilling?.sdi_code || "");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const payload = {
        billing_type: billingType,
        country,
        name,
        address,
        city,
        postal_code: postalCode,
        vat_number: billingType === "COMPANY" ? vatNumber : undefined,
        fiscal_code: billingType === "INDIVIDUAL" ? fiscalCode : undefined,
        sdi_code: billingType === "COMPANY" ? sdiCode : undefined
      };

      const result = await upsertClientBillingAction(payload);
      
      if (result.success) {
        success(t('alert_saved'));
      } else {
        error(result.error);
      }
    });
  };

  const isItaly = country.toLowerCase() === "italy";

  return (
    <div className="space-y-6 relative">
      {isPending && (
        <div className="absolute inset-0 bg-white/50 dark:bg-zinc-950/50 z-50 flex items-center justify-center rounded-lg backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-[#168BB0]" />
        </div>
      )}

      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">{t("title")}</h1>
        <p className="text-xs text-zinc-500 mt-1">
          {t("subtitle")}
        </p>
      </div>

      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 max-w-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-extrabold">{t("section_title")}</CardTitle>
          <CardDescription className="text-xs">
            {t("section_desc")}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="billingType" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {t("billing_type")}
                </Label>
                <Select value={billingType} onValueChange={(val: string | null) => val && setBillingType(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={t("select_type")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">{t("individual")}</SelectItem>
                    <SelectItem value="COMPANY">{t("company")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="country" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {t("country")}
                </Label>
                <Select value={country} onValueChange={(val: string | null) => val && setCountry(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={t("select_country")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Italy">Italy</SelectItem>
                    <SelectItem value="United States">United States</SelectItem>
                    <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                    <SelectItem value="Germany">Germany</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                {billingType === "COMPANY" ? t("company_name") : t("full_name")} *
              </Label>
              <Input
                id="name"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={billingType === "COMPANY" ? "e.g. Acme Corp" : "e.g. John Doe"}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                {t("address")} *
              </Label>
              <Input
                id="address"
                required
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder={t("address_placeholder")}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="city" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {t("city")} *
                </Label>
                <Input
                  id="city"
                  required
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="e.g. Rome"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="postalCode" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {t("postal_code")} *
                </Label>
                <Input
                  id="postalCode"
                  required
                  value={postalCode}
                  onChange={e => setPostalCode(e.target.value)}
                  placeholder="e.g. 00100"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
              <h4 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">{t("tax_id")}</h4>
              
              {billingType === "COMPANY" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="vatNumber" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      {t("vat")} *
                    </Label>
                    <Input
                      id="vatNumber"
                      required
                      value={vatNumber}
                      onChange={e => setVatNumber(e.target.value)}
                      placeholder="e.g. IT12345678901"
                      className="h-9 text-xs"
                    />
                  </div>
                  {isItaly && (
                    <div className="space-y-1.5">
                      <Label htmlFor="sdiCode" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        {t("sdi")}
                      </Label>
                      <Input
                        id="sdiCode"
                        value={sdiCode}
                        onChange={e => setSdiCode(e.target.value)}
                        placeholder={t("sdi_placeholder")}
                        className="h-9 text-xs"
                        maxLength={7}
                      />
                    </div>
                  )}
                </div>
              )}

              {billingType === "INDIVIDUAL" && isItaly && (
                <div className="space-y-1.5">
                  <Label htmlFor="fiscalCode" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    {t("fiscal_code")} *
                  </Label>
                  <Input
                    id="fiscalCode"
                    required
                    value={fiscalCode}
                    onChange={e => setFiscalCode(e.target.value)}
                    placeholder="e.g. RSSMRA80A01H501U"
                    className="h-9 text-xs"
                  />
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 p-4">
            <Button type="submit" disabled={isPending} className="bg-[#168BB0] hover:bg-[#0F7493] text-white font-bold h-9 px-6 text-xs w-full sm:w-auto">
              {isPending ? t("btn_saving") : t("btn_save")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
