import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import ServicesClient from "./services-client";
import { getServicesAction } from "@/app/actions/services";

export const metadata = {
  title: "Service Plans - Admin",
};

// Services rarely change - cache for 5 minutes
export const revalidate = 300;

export default async function ServicesPage() {
  const servicesResult = await getServicesAction();
  const initialServices = servicesResult.success ? (servicesResult.data || []) : [];

  return (
    <Suspense fallback={<LoadingScreen />}>
      <ServicesClient initialServices={initialServices} />
    </Suspense>
  );
}
