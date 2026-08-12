"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { getBillingInfoAction } from "@/app/actions/clients";
import { getClientsData, getProfileCountsData } from "@/lib/data/clients";
import { ClientUser, BillingInfo } from "./components/types";
import ClientsList from "./components/ClientsList";
import { useSWR } from "@/lib/cache/swr";
import { CACHE_KEYS } from "@/lib/cache/cacheContext";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  // SWR for clients data - 5 minute cache for list
  const { data: clients, refresh: refreshClients, isValid: clientsValid } = useSWR({
    key: CACHE_KEYS.ADMIN_CLIENTS,
    fetcher: getClientsData,
    ttl: 5 * 60 * 1000, // 5 minutes
    initialData: initialClients,
  });

  // Combined refresh function
  const refreshAll = () => {
    refreshClients();
    refreshCounts();
  };

  // SWR for profile counts - 5 minute cache
  const { data: counts, refresh: refreshCounts } = useSWR({
    key: 'admin_profile_counts',
    fetcher: getProfileCountsData,
    ttl: 5 * 60 * 1000,
    initialData: profileCounts,
  });

  // Search/Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const itemsPerPage = 10;

  // Edit/Details states
  const [selectedClient, setSelectedClient] = useState<ClientUser | null>(null);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [, startTransition] = useTransition();

  // Load client details and billing info when clientId changes
  useEffect(() => {
    let isMounted = true;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    const user = clients?.find((u) => u.id === clientId);
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
  }, [clientId, clients]);

  // Filter clients list
  const filteredClients = useMemo(() => {
    return clients?.filter((u) => {
      if (u.role !== "CLIENT") return false;

      // Search query
      const matchSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchStatus = statusFilter === "ALL" || u.status === statusFilter;

      return matchSearch && matchStatus;
    }) || [];
  }, [clients, searchTerm, statusFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    const page = parseInt(searchParams.get("page") || "1", 10);
    setCurrentPage(page);
  }, [searchParams]);

  useEffect(() => {
    // Reset to page 1 when filters change
    const params = new URLSearchParams(searchParams.toString());
    if (params.get('page') !== '1') {
      params.set('page', '1');
      router.push(`/a/clients?${params.toString()}`);
    }
  }, [searchTerm, statusFilter]);

  // Calculate paginated results
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredClients, currentPage, itemsPerPage]);

  // Render 1: Create New Client Form
  if (action === "new") {
    return (
      <ClientForm onCancel={() => router.push("/a/clients")} onRefresh={refreshAll} />
    );
  }

  // Render 2: Edit Client Details
  if (selectedClient && clientId) {
    return (
      <ClientDetailsModal
        client={selectedClient}
        billingInfo={billingInfo}
        assignedProfilesCount={profileCounts[selectedClient.id] || 0}
        onClose={() => router.push("/a/clients")}
        onRefresh={refreshAll}
      />
    );
  }

  // Render 3: Clients List View
  return (
    <ClientsList
      paginatedClients={paginatedClients}
      onAddNew={() => router.push("/a/clients?action=new")}
      onManage={(id) => router.push(`/a/clients?id=${id}`)}
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
      onRefresh={refreshAll}
      isCacheValid={clientsValid}
    />
  );
}
