import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import ServicesClient from "./services-client";
import { getServicesAction } from "@/app/actions/services";

export const metadata = {
  title: "Service Plans - Admin",
};

export default async function ServicesPage() {
  const initialServices = await getServicesAction();

  return (
    <Suspense fallback={<LoadingScreen />}>
      <ServicesClient initialServices={initialServices} />
    </Suspense>
  );
}
