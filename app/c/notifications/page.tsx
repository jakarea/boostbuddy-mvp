import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import ClientNotificationsClient, { NotificationLogDTO } from "./notifications-client";
import { getClientNotificationsAction } from "@/app/actions/notifications";

export const metadata = {
  title: "Notifications - Client Portal",
};

export default async function ClientNotificationsPage() {
  const logsRes = await getClientNotificationsAction();
  const logs = (logsRes.success ? (logsRes.data as NotificationLogDTO[]) : []);

  return (
    <Suspense fallback={<LoadingScreen />}>
      <ClientNotificationsClient initialLogs={logs} />
    </Suspense>
  );
}
