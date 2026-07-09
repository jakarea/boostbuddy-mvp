"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  getProfileStatusBadgeStyle,
  getClientStatusBadgeStyle,
  getOrderStatusBadgeStyle,
  getStatusLabel,
  type ProfileStatus,
  type ClientStatus,
  type OrderStatus,
} from "@/lib/statusUtils";
import { useTranslation } from "react-i18next";

interface StatusBadgeProps {
  status?: string;
  type?: "profile" | "client" | "order";
  isExpiringSoon?: boolean;
  isExpired?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  type = "profile",
  isExpiringSoon = false,
  isExpired = false,
  className = "",
}: StatusBadgeProps) {
  const { t } = useTranslation("status");
  let badgeStyle = "";

  if (type === "profile") {
    badgeStyle = getProfileStatusBadgeStyle(status as ProfileStatus, isExpiringSoon, isExpired);
  } else if (type === "client") {
    badgeStyle = getClientStatusBadgeStyle(status as ClientStatus);
  } else if (type === "order") {
    badgeStyle = getOrderStatusBadgeStyle(status as OrderStatus);
  }

  return (
    <Badge variant="outline" className={`${badgeStyle} font-bold text-[9px] uppercase tracking-wider ${className}`}>
      {t(status || "", { defaultValue: getStatusLabel(status) })}
    </Badge>
  );
}
