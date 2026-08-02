import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import NotificationsClient from "./notifications-client";
import { getNotificationsAction } from "@/app/actions/notifications";
import { getTelegramConfigAction } from "@/app/actions/telegram";
import type { TelegramConfig } from "@/app/actions/telegram";

export const metadata = {
  title: "Notifications - Admin",
};

export default async function AdminNotificationsPage() {
  const [logsRes, telegramRes] = await Promise.all([
    getNotificationsAction(),
    getTelegramConfigAction(),
  ]);

  const logs = (logsRes.success ? logsRes.data : []) as any[];
  const telegramConfig = (telegramRes.success ? telegramRes.config : null) as TelegramConfig | null;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <NotificationsClient initialLogs={logs} telegramConfig={telegramConfig} />
    </Suspense>
  );
}
