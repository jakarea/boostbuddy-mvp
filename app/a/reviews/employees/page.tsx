"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getEmployeePerformanceAction,
  inviteEmployeeAction,
  toggleEmployeeAcceptingOrdersAction,
  setEmployeeActiveStatusAction,
} from "@/app/actions/admin-reviews";
import {
  UserCheck,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Mail,
  RefreshCw,
  TrendingUp,
  UserPlus,
  Power,
  PauseCircle,
  Loader2,
} from "lucide-react";
import { formatDateShort } from "@/lib/dateUtils";

interface EmployeePerformance {
  id: string;
  userId: string;
  employeeName: string;
  employeeEmail: string;
  isAvailable: boolean;
  isActive: boolean;
  acceptingOrders: boolean;
  ordersCompleted: number;
  ordersSkipped: number;
  lastActiveAt: string;
  createdAt: string;
}

export default function AdminReviewsEmployeesPage() {
  const { t } = useTranslation("admin_reviews");
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [employees, setEmployees] = useState<EmployeePerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"completed" | "skipped" | "recent">("completed");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitePending, startInviteTransition] = useTransition();

  const loadData = async () => {
    try {
      setIsLoading(true);
      const result = await getEmployeePerformanceAction();
      if (result.success) {
        // Normalize field names for dual-mode compatibility
        const normalizedData = (result.data as any[])?.map(emp => ({
          id: emp.id,
          userId: emp.user_id || emp.userId,
          employeeName: emp.employee_name || emp.employeeName || emp.name,
          employeeEmail: emp.employee_email || emp.employeeEmail || emp.email,
          isAvailable: emp.is_available || emp.isAvailable || emp.isAvailable,
          isActive: emp.is_active ?? emp.isActive ?? true,
          acceptingOrders: emp.accepting_orders ?? emp.acceptingOrders ?? true,
          ordersCompleted: emp.orders_completed || emp.ordersCompleted || 0,
          ordersSkipped: emp.orders_skipped || emp.ordersSkipped || 0,
          lastActiveAt: emp.last_active_at || emp.lastActiveAt,
          createdAt: emp.created_at || emp.createdAt,
        })) || [];
        setEmployees(normalizedData);
      } else {
        error(result.error || "Failed to load employee data");
      }
    } catch (err) {
      error("Failed to load employee data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startInviteTransition(async () => {
      const result = await inviteEmployeeAction(null, formData);
      if (result.success) {
        success(result.message || t("manage.inviteDialog.success", "Invitation sent"));
        setInviteOpen(false);
        loadData();
      } else {
        error(result.error || "Failed to invite employee");
      }
    });
  };

  const handleToggleAcceptingOrders = (userId: string, nextChecked: boolean) => {
    // Optimistic update
    setEmployees(prev =>
      prev.map(emp =>
        emp.userId === userId ? { ...emp, acceptingOrders: nextChecked } : emp
      )
    );

    toggleEmployeeAcceptingOrdersAction(userId)
      .then(result => {
        if (!result.success) {
          // Revert on failure
          setEmployees(prev =>
            prev.map(emp =>
              emp.userId === userId ? { ...emp, acceptingOrders: !nextChecked } : emp
            )
          );
          error(result.error || "Failed to update");
        }
      })
      .catch(() => {
        setEmployees(prev =>
          prev.map(emp =>
            emp.userId === userId ? { ...emp, acceptingOrders: !nextChecked } : emp
          )
        );
        error("Failed to update");
      });
  };

  const handleToggleActive = async (employee: EmployeePerformance) => {
    const nextActive = !employee.isActive;
    const confirmed = await confirm({
      title: nextActive
        ? t("manage.activateConfirm.title", "Activate Employee?")
        : t("manage.deactivateConfirm.title", "Deactivate Employee?"),
      message: nextActive
        ? t("manage.activateConfirm.message", "This employee will be able to log in and accept orders again.")
        : t("manage.deactivateConfirm.message", "This employee will be signed out and unable to access the employee portal."),
      confirmText: nextActive
        ? t("manage.activateConfirm.confirm", "Activate")
        : t("manage.deactivateConfirm.confirm", "Deactivate"),
      confirmVariant: nextActive ? "default" : "destructive",
    });

    if (!confirmed) return;

    const result = await setEmployeeActiveStatusAction(employee.userId, nextActive);
    if (result.success) {
      setEmployees(prev =>
        prev.map(emp =>
          emp.userId === employee.userId
            ? { ...emp, isActive: nextActive, acceptingOrders: nextActive ? emp.acceptingOrders : false }
            : emp
        )
      );
      success(nextActive ? "Employee activated" : "Employee deactivated");
    } else {
      error(result.error || "Failed to update");
    }
  };

  const getSortedEmployees = () => {
    const sorted = [...employees];
    switch (sortBy) {
      case "completed":
        return sorted.sort((a, b) => b.ordersCompleted - a.ordersCompleted);
      case "skipped":
        return sorted.sort((a, b) => b.ordersSkipped - a.ordersSkipped);
      case "recent":
        return sorted.sort((a, b) =>
          new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime()
        );
      default:
        return sorted;
    }
  };

  const getCompletionRate = (completed: number, skipped: number) => {
    const total = completed + skipped;
    if (total === 0) return "0%";
    return Math.round((completed / total) * 100) + "%";
  };

  const isActiveRecently = (lastActiveAt: string | undefined) => {
    if (!lastActiveAt) return false;
    const lastActive = new Date(lastActiveAt);
    const now = new Date();
    const daysDiff = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7; // Active in last 7 days
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#168BB0]"></div>
      </div>
    );
  }

  const sortedEmployees = getSortedEmployees();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t("employees.title", "Employee Performance")}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {t("employees.subtitle", "Monitor employee performance, availability, and completion rates")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t("employees.refresh", "Refresh")}
          </Button>
          <Button
            size="sm"
            onClick={() => setInviteOpen(true)}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            {t("manage.invite", "Invite Employee")}
          </Button>
        </div>
      </div>

      {/* Sorting Controls */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-600">
          {t("employees.sortBy", "Sort by")}:
        </span>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={sortBy === "completed" ? "default" : "outline"}
            onClick={() => setSortBy("completed")}
            className="text-xs"
          >
            {t("employees.sort.completed", "Most Completed")}
          </Button>
          <Button
            size="sm"
            variant={sortBy === "skipped" ? "default" : "outline"}
            onClick={() => setSortBy("skipped")}
            className="text-xs"
          >
            {t("employees.sort.skipped", "Most Skipped")}
          </Button>
          <Button
            size="sm"
            variant={sortBy === "recent" ? "default" : "outline"}
            onClick={() => setSortBy("recent")}
            className="text-xs"
          >
            {t("employees.sort.recent", "Recently Active")}
          </Button>
        </div>
      </div>

      {/* Employees List */}
      {sortedEmployees.length === 0 ? (
        <Card className="p-12 text-center">
          <UserCheck className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {t("employees.noEmployees", "No Employees Found")}
          </h3>
          <p className="text-sm text-zinc-500">
            {t("employees.noEmployeesMessage", "No employee performance data available yet.")}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedEmployees.map((employee) => (
            <Card key={employee.id} className="p-4 hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                      {employee.employeeName}
                    </h3>
                    {!employee.isActive ? (
                      <span className="px-2 py-0.5 bg-red-500/10 text-red-700 dark:text-red-400 rounded-full text-xs font-medium">
                        {t("manage.status.deactivated", "Deactivated")}
                      </span>
                    ) : employee.isActive && !employee.acceptingOrders ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
                        <PauseCircle className="h-3 w-3" />
                        {t("manage.status.paused", "On Pause")}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-green-500/10 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                        {t("manage.status.active", "Active")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Mail className="h-3 w-3 text-zinc-400" />
                    <p className="text-xs text-zinc-500 truncate">
                      {employee.employeeEmail}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {employee.isAvailable ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      {t("employees.available", "Available")}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 rounded-full text-xs font-medium">
                      {t("employees.unavailable", "Unavailable")}
                    </span>
                  )}
                  {isActiveRecently(employee.lastActiveAt) && (
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="h-3 w-3" />
                      {t("employees.activeRecently", "Active recently")}
                    </span>
                  )}
                </div>
              </div>

              {/* Performance Stats */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 bg-green-500/10 dark:bg-green-950/20 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span className="text-lg font-bold">{employee.ordersCompleted}</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                    {t("employees.completed", "Completed")}
                  </p>
                </div>
                <div className="text-center p-2 bg-yellow-500/10 dark:bg-yellow-950/20 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-yellow-600 dark:text-yellow-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span className="text-lg font-bold">{employee.ordersSkipped}</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                    {t("employees.skipped", "Skipped")}
                  </p>
                </div>
                <div className="text-center p-2 bg-[#168BB0]/10 dark:bg-blue-950/20 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-[#168BB0] dark:text-[#45B0D2]">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span className="text-lg font-bold">
                      {getCompletionRate(employee.ordersCompleted, employee.ordersSkipped)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                    {t("employees.rate", "Rate")}
                  </p>
                </div>
              </div>

              {/* Last Active */}
              <div className="flex items-center gap-2 text-xs text-zinc-500 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <Calendar className="h-3 w-3" />
                {employee.lastActiveAt ? (
                  <span>
                    {t("employees.lastActive", "Last active: {{date}}", {
                      date: formatDateShort(employee.lastActiveAt)
                    })}
                  </span>
                ) : (
                  <span>{t("employees.neverActive", "Never active")}</span>
                )}
              </div>

              {/* Member Since */}
              <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                <UserCheck className="h-3 w-3" />
                <span>
                  {t("employees.memberSince", "Member since {{date}}", {
                    date: formatDateShort(employee.createdAt)
                  })}
                </span>
              </div>

              {/* Accepting Orders Switch (days-off toggle) */}
              <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      {t("manage.acceptingOrders", "Accepting Orders")}
                    </Label>
                    <div className="text-[10px] text-zinc-500">
                      {t("manage.acceptingOrdersHint", "Toggle off for days off — pauses new assignments without deactivating.")}
                    </div>
                  </div>
                  <Switch
                    checked={employee.acceptingOrders}
                    onCheckedChange={(checked: boolean) =>
                      handleToggleAcceptingOrders(employee.userId, checked)
                    }
                    disabled={!employee.isActive}
                  />
                </div>
              </div>

              {/* Activate / Deactivate Account */}
              <div className="mt-3">
                {employee.isActive ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={() => handleToggleActive(employee)}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {t("manage.deactivate", "Deactivate Account")}
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => handleToggleActive(employee)}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {t("manage.activate", "Activate Account")}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {employees.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {employees.length}
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {t("employees.summary.total", "Total Employees")}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {employees.filter(e => e.isAvailable).length}
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {t("employees.summary.available", "Currently Available")}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#168BB0] dark:text-[#45B0D2]">
                {employees.reduce((sum, e) => sum + e.ordersCompleted, 0)}
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {t("employees.summary.totalCompleted", "Total Completed")}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {employees.length > 0
                  ? Math.round(
                      employees.reduce((sum, e) => sum + (e.ordersCompleted + e.ordersSkipped > 0
                        ? (e.ordersCompleted / (e.ordersCompleted + e.ordersSkipped)) * 100
                        : 0), 0) / employees.length
                    )
                  : 0}%
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {t("employees.summary.avgRate", "Avg. Completion Rate")}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Invite Employee Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("manage.inviteDialog.title", "Invite Employee")}</DialogTitle>
            <DialogDescription>
              {t("manage.inviteDialog.description", "Send an invitation email. The employee will appear in this list after they sign in.")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name">
                {t("manage.inviteDialog.nameLabel", "Full Name")}
              </Label>
              <Input
                id="invite-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder={t("manage.inviteDialog.nameLabel", "Full Name")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">
                {t("manage.inviteDialog.emailLabel", "Email Address")}
              </Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="employee@example.com"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteOpen(false)}
                disabled={invitePending}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={invitePending}>
                {invitePending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("manage.inviteDialog.sending", "Sending...")}
                  </>
                ) : (
                  t("manage.inviteDialog.submit", "Send Invitation")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
