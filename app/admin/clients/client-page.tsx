"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { getBillingInfoAction } from "@/app/actions/clients";
import { ClientUser, BillingInfo } from "./components/types";
import ClientsList from "./components/ClientsList";

// Dynamic imports for code splitting
const ClientForm = dynamic(() => import("./components/ClientForm"), { ssr: false });
const ClientDetailsModal = dynamic(() => import("./components/ClientDetailsModal"), { ssr: false });

export default function ClientsContent({
  initialClients,
  profileCounts,
}: {
  initialClients: ClientUser[];
  profileCounts: Record<string, number>;
}) {
  const { i18n } = useTranslation("admin_clients");
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("id");
  const action = searchParams.get("action"); // "new"

  // Search/Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Edit/Details states
  const [selectedClient, setSelectedClient] = useState<ClientUser | null>(null);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [, startTransition] = useTransition();

  // Load client details and billing info when clientId changes
  useEffect(() => {
    let isMounted = true;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    const user = initialClients.find((u) => u.id === clientId);
    if (clientId && user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedClient(user);

      // Fetch billing info dynamically
      startTransition(async () => {
        const info = await getBillingInfoAction(user.id);
        if (isMounted) {
          setBillingInfo(info);
        }
      });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedClient(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBillingInfo(null);
    }

    return () => {
      isMounted = false;
    };
  }, [clientId, initialClients]);

  // Filter clients list
  const filteredClients = useMemo(() => {
    return initialClients.filter((u) => {
      if (u.role !== "CLIENT") return false;

      // Search query
      const matchSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchStatus = statusFilter === "ALL" || u.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [initialClients, searchTerm, statusFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Calculate paginated results
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredClients, currentPage, itemsPerPage]);

  // Render 1: Create New Client Form
  if (action === "new") {
    return (
      <ClientForm onCancel={() => router.push("/admin/clients")} />
    );
  }

  // Render 2: Edit Client Details
  if (selectedClient && clientId) {
    return (
      <ClientDetailsModal
        client={selectedClient}
        billingInfo={billingInfo}
        assignedProfilesCount={profileCounts[selectedClient.id] || 0}
        onClose={() => router.push("/admin/clients")}
      />
    );
  }

  // Render 3: Clients List View
  return (
    <ClientsList
      paginatedClients={paginatedClients}
      onAddNew={() => router.push("/admin/clients?action=new")}
      onManage={(id) => router.push(`/admin/clients?id=${id}`)}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      filteredClients={filteredClients}
      itemsPerPage={itemsPerPage}
      profileCounts={profileCounts}
      i18nLanguage={i18n.language}
    />
  );
}
