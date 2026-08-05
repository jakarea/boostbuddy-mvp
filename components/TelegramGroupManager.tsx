"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  TestTube,
  Check,
  X,
  Loader2,
  MessageSquare,
  Settings,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  getTelegramGroupsAction,
  addTelegramGroupAction,
  updateTelegramGroupAction,
  deleteTelegramGroupAction,
  testTelegramGroupAction,
  verifyAllGroupsAction,
} from "@/app/actions/telegram-groups";

interface TelegramGroup {
  id: string;
  group_name: string;
  group_chat_id: string;
  group_type: "ADMIN" | "EMPLOYEE" | "CLIENT_SUPPORT" | "BILLING";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const GROUP_TYPE_LABELS = {
  ADMIN: "Admin Team",
  EMPLOYEE: "All Employees",
  CLIENT_SUPPORT: "Client Support",
  BILLING: "Billing Team",
};

const GROUP_TYPE_COLORS = {
  ADMIN: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  EMPLOYEE: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  CLIENT_SUPPORT: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  BILLING: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
};

export default function TelegramGroupManager() {
  const { t } = useTranslation("notifications");
  const [groups, setGroups] = useState<TelegramGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TelegramGroup | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    group_name: "",
    group_chat_id: "",
    group_type: "EMPLOYEE" as const,
    is_active: true,
  });

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = () => {
    startTransition(async () => {
      setIsLoading(true);
      const result = await getTelegramGroupsAction();
      if (result.success && result.groups) {
        setGroups(result.groups);
      }
      setIsLoading(false);
    });
  };

  const handleAdd = () => {
    setFeedback(null);
    startTransition(async () => {
      const formPayload = new FormData();
      formPayload.append("group_name", formData.group_name);
      formPayload.append("group_chat_id", formData.group_chat_id);
      formPayload.append("group_type", formData.group_type);

      const result = await addTelegramGroupAction(formPayload);
      if (result.success) {
        setFeedback({ ok: true, msg: "Group added successfully!" });
        setShowAddDialog(false);
        resetForm();
        loadGroups();
      } else {
        setFeedback({ ok: false, msg: result.error || "Failed to add group" });
      }
    });
  };

  const handleEdit = () => {
    if (!editingGroup) return;

    setFeedback(null);
    startTransition(async () => {
      const formPayload = new FormData();
      formPayload.append("group_name", formData.group_name);
      formPayload.append("group_chat_id", formData.group_chat_id);
      formPayload.append("group_type", formData.group_type);
      formPayload.append("is_active", formData.is_active.toString());

      const result = await updateTelegramGroupAction(editingGroup.id, formPayload);
      if (result.success) {
        setFeedback({ ok: true, msg: "Group updated successfully!" });
        setShowEditDialog(false);
        setEditingGroup(null);
        resetForm();
        loadGroups();
      } else {
        setFeedback({ ok: false, msg: result.error || "Failed to update group" });
      }
    });
  };

  const handleDelete = (groupId: string, groupName: string) => {
    if (!confirm(`Are you sure you want to delete "${groupName}"?`)) return;

    setFeedback(null);
    startTransition(async () => {
      const result = await deleteTelegramGroupAction(groupId);
      if (result.success) {
        setFeedback({ ok: true, msg: "Group deleted successfully!" });
        loadGroups();
      } else {
        setFeedback({ ok: false, msg: result.error || "Failed to delete group" });
      }
    });
  };

  const handleTest = (groupId: string) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await testTelegramGroupAction(groupId);
      if (result.success) {
        setFeedback({ ok: true, msg: "Test message sent successfully! Check your Telegram group." });
      } else {
        setFeedback({ ok: false, msg: result.error || "Failed to send test message" });
      }
    });
  };

  const handleVerifyAll = () => {
    setFeedback(null);
    setVerifying(true);
    startTransition(async () => {
      const result = await verifyAllGroupsAction();
      setVerifying(false);

      if (result.success && result.results) {
        const accessible = result.results.filter((r) => r.accessible).length;
        const total = result.results.length;
        setFeedback({
          ok: accessible === total,
          msg: `Verification complete: ${accessible}/${total} groups accessible`,
        });
        loadGroups(); // Reload to show updated active status
      } else {
        setFeedback({ ok: false, msg: result.error || "Verification failed" });
      }
    });
  };

  const resetForm = () => {
    setFormData({
      group_name: "",
      group_chat_id: "",
      group_type: "EMPLOYEE",
      is_active: true,
    });
  };

  const openEditDialog = (group: TelegramGroup) => {
    setEditingGroup(group);
    setFormData({
      group_name: group.group_name,
      group_chat_id: group.group_chat_id,
      group_type: group.group_type,
      is_active: group.is_active,
    });
    setShowEditDialog(true);
  };

  const activeGroups = groups.filter((g) => g.is_active);
  const inactiveGroups = groups.filter((g) => !g.is_active);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">Telegram Groups</h3>
            <p className="text-[10px] text-zinc-500">Team-based notifications</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px] gap-1"
            onClick={handleVerifyAll}
            disabled={verifying || isPending}
          >
            {verifying ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Verify All
          </Button>
          <Button
            size="sm"
            className="bg-[#168BB0] hover:bg-[#0F7493] text-white h-7 px-3 text-xs gap-1"
            onClick={() => {
              resetForm();
              setShowAddDialog(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Group
          </Button>
        </div>
      </div>

      {/* Feedback Message */}
      {feedback && (
        <div
          className={cn(
            "p-2 rounded text-[11px] leading-relaxed font-medium",
            feedback.ok
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/15"
              : "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/15"
          )}
        >
          {feedback.ok ? <Check className="h-3 w-3 inline mr-1" /> : <X className="h-3 w-3 inline mr-1" />}
          {feedback.msg}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
          <p className="text-xs text-zinc-500">No Telegram groups configured yet.</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 text-xs"
            onClick={() => setShowAddDialog(true)}
          >
            Add Your First Group
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Active Groups */}
          {activeGroups.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Active Groups ({activeGroups.length})
              </p>
              <div className="space-y-2">
                {activeGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onEdit={() => openEditDialog(group)}
                    onDelete={() => handleDelete(group.id, group.group_name)}
                    onTest={() => handleTest(group.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Inactive Groups */}
          {inactiveGroups.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Inactive Groups ({inactiveGroups.length})
              </p>
              <div className="space-y-2">
                {inactiveGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onEdit={() => openEditDialog(group)}
                    onDelete={() => handleDelete(group.id, group.group_name)}
                    onTest={() => handleTest(group.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Group Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold">Add Telegram Group</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 leading-relaxed mt-1">
              Add a Telegram group for team-based notifications. All employees in the group will receive messages.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Group Name</Label>
              <Input
                value={formData.group_name}
                onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                placeholder="e.g., BoostBuddy Employees"
                className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Group Chat ID</Label>
              <Input
                value={formData.group_chat_id}
                onChange={(e) => setFormData({ ...formData, group_chat_id: e.target.value })}
                placeholder="e.g., -1001234567890"
                className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
              />
              <p className="text-[10px] text-zinc-500">
                Get this from @GetMyId bot (must be a negative number for groups)
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Group Type</Label>
              <Select value={formData.group_type} onValueChange={(value: any) => setFormData({ ...formData, group_type: value })}>
                <SelectTrigger className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GROUP_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-[#168BB0] hover:bg-[#0F7493] text-white h-8 text-xs"
                onClick={handleAdd}
                disabled={isPending || !formData.group_name.trim() || !formData.group_chat_id.trim()}
              >
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add Group"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold">Edit Telegram Group</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 leading-relaxed mt-1">
              Update the Telegram group configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Group Name</Label>
              <Input
                value={formData.group_name}
                onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Group Chat ID</Label>
              <Input
                value={formData.group_chat_id}
                onChange={(e) => setFormData({ ...formData, group_chat_id: e.target.value })}
                className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Group Type</Label>
              <Select value={formData.group_type} onValueChange={(value: any) => setFormData({ ...formData, group_type: value })}>
                <SelectTrigger className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GROUP_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-zinc-300"
              />
              <Label htmlFor="is_active" className="text-xs text-zinc-700 dark:text-zinc-300">
                Active (enable notifications for this group)
              </Label>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-[#168BB0] hover:bg-[#0F7493] text-white h-8 text-xs"
                onClick={handleEdit}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GroupCard({
  group,
  onEdit,
  onDelete,
  onTest,
}: {
  group: TelegramGroup;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
}) {
  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-all",
        group.is_active
          ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
          : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{group.group_name}</span>
            <Badge
              className={cn(
                "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 border",
                GROUP_TYPE_COLORS[group.group_type]
              )}
            >
              {GROUP_TYPE_LABELS[group.group_type]}
            </Badge>
            {!group.is_active && (
              <Badge className="bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0">
                Inactive
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-zinc-500 font-mono">{group.group_chat_id}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] gap-1 text-zinc-500" onClick={onTest}>
            <TestTube className="h-3 w-3" />
            Test
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] gap-1 text-zinc-500" onClick={onEdit}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] gap-1 text-red-500" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}