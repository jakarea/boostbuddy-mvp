"use client";

import React from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useTranslation } from "react-i18next";

export default function AdminLoading() {
  const { t } = useTranslation("common");
  return <LoadingScreen message={t("is_loading", { defaultValue: "is loading..." })} />;
}
