"use client";

import { useTranslation } from "react-i18next";

export default function PendingClient() {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex justify-center items-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">{t("employee.accountPending", "Account Pending")}</h1>
        <p className="text-gray-600">{t("employee.accountPendingMessage", "Your account is currently inactive. Please contact support.")}</p>
      </div>
    </div>
  );
}
