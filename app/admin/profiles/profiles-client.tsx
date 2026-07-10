"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import { unassignProfileAction, deleteProfileAction } from "@/app/actions/profiles";
import { ProfileAccountRecord, ActiveClient } from "./components/types";
import ProfilesList from "./components/ProfilesList";

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getClientName = (p: ProfileAccountRecord) => {
    return p.client_name || t("val_unassigned");
  };

  // Filtered Profiles list
  const filteredProfiles = useMemo(() => {
    return initialProfiles.filter(p => {
      const matchSearch =
        p.profile_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.account_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.ixbrowser_profile_id && p.ixbrowser_profile_id.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === "ALL" || p.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [initialProfiles, searchTerm, statusFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Calculate paginated results
  const paginatedProfiles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProfiles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProfiles, currentPage, itemsPerPage]);

  const handleUnassignProfile = async (pid: string) => {
    const result = await Swal.fire({
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
        router.refresh();
      });
    }
  };

  const handleDeleteProfile = async (pid: string) => {
    const result = await Swal.fire({
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
        router.refresh();
      });
    }
  };

  // Render 1: Add/Edit Profile Page
  if (action === "new" || (action === "edit" && profileId)) {
    const profileToEdit = profileId ? initialProfiles.find(p => p.id === profileId) : null;
    return (
      <ProfileForm
        initialProfile={profileToEdit || null}
        onCancel={() => router.push("/admin/profiles")}
        isEdit={action === "edit"}
      />
    );
  }

  // Render 2: Profile Assignment Page
  if (action === "assign" && profileId) {
    const targetProfile = initialProfiles.find(p => p.id === profileId);
    return (
      <AssignForm
        profile={targetProfile || null}
        activeClients={activeClients}
        onCancel={() => router.push("/admin/profiles")}
      />
    );
  }

  // Render 3: Inventory List view
  return (
    <ProfilesList
      profiles={initialProfiles}
      paginatedProfiles={paginatedProfiles}
      onEdit={(id) => router.push(`/admin/profiles?action=edit&id=${id}`)}
      onDelete={handleDeleteProfile}
      onAssign={(id) => router.push(`/admin/profiles?action=assign&id=${id}`)}
      onUnassign={handleUnassignProfile}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      filteredProfiles={filteredProfiles}
      itemsPerPage={itemsPerPage}
      onAddNew={() => router.push("/admin/profiles?action=new")}
      formatDate={formatDate}
      getClientName={getClientName}
    />
  );
}
