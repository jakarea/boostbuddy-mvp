"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { showConfirm } from "@/lib/utils/swal";
import { unassignProfileAction, deleteProfileAction } from "@/app/actions/profiles";
import { ProfileAccountRecord, ActiveClient } from "./components/types";
import ProfilesList from "./components/ProfilesList";
import { useSWR } from "@/lib/cache/swr";
import { CACHE_KEYS } from "@/lib/cache/cacheContext";
import CACHE_TTL from '@/lib/cache/cache-ttl';
import { getProfilesData, getActiveClientsData } from "@/lib/data/profiles";

// Dynamic imports for code splitting
const ProfileForm = dynamic(() => import("./components/ProfileForm"), { ssr: false });
const AssignForm = dynamic(() => import("./components/AssignForm"), { ssr: false });

export default function ProfilesContent({
  initialProfiles,
  activeClients
}: {
  initialProfiles: ProfileAccountRecord[];
  activeClients: ActiveClient[];
}) {
  const { t } = useTranslation("admin_profiles");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // SWR for profiles data - 5 minute cache
  const { data: profiles, refresh: refreshProfiles, isValid: profilesValid } = useSWR({
    key: CACHE_KEYS.ADMIN_PROFILES,
    fetcher: getProfilesData,
    ttl: CACHE_TTL.LONG, // 5 minutes
    initialData: initialProfiles,
  });

  // SWR for active clients - 5 minute cache
  const { data: clients, refresh: refreshClients } = useSWR({
    key: 'admin_active_clients',
    fetcher: getActiveClientsData,
    ttl: CACHE_TTL.LONG, // 5 minutes
    initialData: activeClients,
  });

  // Combined refresh function
  const refreshAll = () => {
    refreshProfiles();
    refreshClients();
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      return `${d}-${m}-${y}`;
    } catch {
      return dateString;
    }
  };

  const searchParams = useSearchParams();
  const profileId = searchParams.get("id");
  const action = searchParams.get("action"); // "new", "assign", "edit"

  // Filter state
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const itemsPerPage = 10;

  const getClientName = (p: ProfileAccountRecord) => {
    return p.client_name || t("val_unassigned");
  };

  // Filtered Profiles list
  const filteredProfiles = useMemo(() => {
    return profiles?.filter(p => {
      const matchSearch =
        p.profile_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.account_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.ixbrowser_profile_id && p.ixbrowser_profile_id.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === "ALL" || p.status === statusFilter;

      return matchSearch && matchStatus;
    }) || [];
  }, [profiles, searchTerm, statusFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    const page = parseInt(searchParams.get("page") || "1", 10);
    setCurrentPage(page);
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get('page') !== '1') {
      params.set('page', '1');
      router.push(`/a/profiles?${params.toString()}`);
    }
  }, [searchTerm, statusFilter]);

  // Calculate paginated results
  const paginatedProfiles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProfiles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProfiles, currentPage, itemsPerPage]);

  const handleUnassignProfile = async (pid: string) => {
    const result = await showConfirm({
      title: t("are_you_sure", { defaultValue: "Are you sure?" }),
      text: t("alert_release_text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#168BB0",
      cancelButtonColor: "#d33",
      confirmButtonText: t("yes", { defaultValue: "Yes" })
    });

    if (result.isConfirmed) {
      startTransition(async () => {
        await unassignProfileAction(pid);
        refreshAll();
        router.refresh();
      });
    }
  };

  const handleDeleteProfile = async (pid: string) => {
    const result = await showConfirm({
      title: t("are_you_sure", { defaultValue: "Are you sure?" }),
      text: t("alert_delete_text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#168BB0",
      cancelButtonColor: "#d33",
      confirmButtonText: t("yes", { defaultValue: "Yes" })
    });

    if (result.isConfirmed) {
      startTransition(async () => {
        await deleteProfileAction(pid);
        refreshAll();
        router.refresh();
      });
    }
  };

  // Render 1: Add/Edit Profile Page
  if (action === "new" || (action === "edit" && profileId)) {
    const profileToEdit = profileId ? profiles?.find(p => p.id === profileId) : null;
    return (
      <ProfileForm
        initialProfile={profileToEdit || null}
        onCancel={() => router.push("/a/profiles")}
        isEdit={action === "edit"}
        onRefresh={refreshAll}
      />
    );
  }

  // Render 2: Profile Assignment Page
  if (action === "assign" && profileId) {
    const targetProfile = profiles?.find(p => p.id === profileId);
    return (
      <AssignForm
        profile={targetProfile || null}
        activeClients={clients || activeClients}
        onCancel={() => router.push("/a/profiles")}
        onRefresh={refreshAll}
      />
    );
  }

  // Render 3: Inventory List view
  return (
    <ProfilesList
      profiles={profiles || initialProfiles}
      paginatedProfiles={paginatedProfiles}
      onEdit={(id) => router.push(`/a/profiles?action=edit&id=${id}`)}
      onDelete={handleDeleteProfile}
      onAssign={(id) => router.push(`/a/profiles?action=assign&id=${id}`)}
      onUnassign={handleUnassignProfile}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      filteredProfiles={filteredProfiles}
      itemsPerPage={itemsPerPage}
      onAddNew={() => router.push("/a/profiles?action=new")}
      formatDate={formatDate}
      getClientName={getClientName}
      onRefresh={refreshAll}
      isCacheValid={profilesValid}
    />
  );
}
