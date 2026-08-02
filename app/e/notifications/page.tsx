import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import EmployeeNotificationsClient, { NotificationLogDTO } from "./notifications-client";
import { getClientNotificationsAction } from "@/app/actions/notifications";

export const metadata = {
  title: "Notifications - Employee Portal",
};

export default async function EmployeeNotificationsPage() {
  const logsRes = await getClientNotificationsAction();
  const logs = (logsRes.success ? (logsRes.data as NotificationLogDTO[]) : []);

  return (
    <Suspense fallback={<LoadingScreen />}>
      <EmployeeNotificationsClient initialLogs={logs} />
    </Suspense>
  );
}
