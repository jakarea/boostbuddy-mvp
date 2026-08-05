"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { useDebounce } from "@/lib/hooks/useDebounce";
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
  ChevronLeft,
  ChevronRight,
  Search,
  X
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

interface EmployeesClientProps {
  initialEmployees: EmployeePerformance[];
  totalCount: number;
}

export default function EmployeesClient({ initialEmployees, totalCount }: EmployeesClientProps) {
  const { t } = useTranslation("admin_reviews");
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [employees, setEmployees] = useState<EmployeePerformance[]>(initialEmployees);
  const [localTotalCount, setLocalTotalCount] = useState(totalCount);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"completed" | "skipped" | "recent">("completed");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitePending, startInviteTransition] = useTransition();
  const initialSearchTerm = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Sync search with URL params (triggers server refetch)
  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    if (debouncedSearchTerm !== currentSearch) {
      const params = new URLSearchParams(searchParams.toString());
      if (debouncedSearchTerm) {
        params.set('search', debouncedSearchTerm);
      } else {
        params.delete('search');
      }
      params.set('page', '1');
      router.push(`/a/reviews/employees?${params.toString()}`);
    }
  }, [debouncedSearchTerm]);

  // Update employees when server provides new data
  useEffect(() => {
    setEmployees(initialEmployees);
    setLocalTotalCount(totalCount);
  }, [initialEmployees, totalCount]);

  // Pagination state
  const itemsPerPage = parseInt(searchParams.get('pageSize') || '20', 10);
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const totalPages = Math.ceil(employees.length / itemsPerPage);

  // Get sorted employees function
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

  // Current employees (sorted but already paginated from server)
  const currentEmployees = getSortedEmployees();

  // Full sorted list for display (just current page)
  const sortedEmployees = currentEmployees;

  // Navigation handlers
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/a/reviews/employees?${params.toString()}`);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const handleItemsPerPageChange = (newSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', newSize.toString());
    params.set('page', '1'); // Reset to first page when changing page size
    router.push(`/a/reviews/employees?${params.toString()}`);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startInviteTransition(async () => {
      const result = await inviteEmployeeAction(null, formData);
      if (result.success) {
        success(result.message || t("manage.inviteDialog.success", "Invitation sent"));
        setInviteOpen(false);
        router.refresh();
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

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          {t("employees.title", "Employee Performance")}
        </h1>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            className="gap-1 h-7 text-[11px]"
          >
            <RefreshCw className="h-3 w-3" />
            {t("employees.refresh", "Refresh")}
          </Button>
          <Button
            size="sm"
            onClick={() => setInviteOpen(true)}
            className="gap-1 h-7 text-[11px]"
          >
            <UserPlus className="h-3 w-3" />
            {t("manage.invite", "Invite")}
          </Button>
        </div>
      </div>

      {/* Sorting & Search */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Sort Buttons */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-zinc-600">
            {t("employees.sortBy", "Sort")}:
          </span>
          <div className="flex gap-0.5">
            <Button
              size="sm"
              variant={sortBy === "completed" ? "default" : "outline"}
              onClick={() => setSortBy("completed")}
              className="h-6 text-[10px] px-2"
            >
              {t("employees.sort.completed", "Completed")}
            </Button>
            <Button
              size="sm"
              variant={sortBy === "skipped" ? "default" : "outline"}
              onClick={() => setSortBy("skipped")}
              className="h-6 text-[10px] px-2"
            >
              {t("employees.sort.skipped", "Skipped")}
            </Button>
            <Button
              size="sm"
              variant={sortBy === "recent" ? "default" : "outline"}
              onClick={() => setSortBy("recent")}
              className="h-6 text-[10px] px-2"
            >
              {t("employees.sort.recent", "Recent")}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-7 pr-7 py-1 text-[11px] border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#168BB0]"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {searchTerm && (
          <div className="text-[10px] text-zinc-600 dark:text-zinc-400">
            {employees.length} result{employees.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Employees List */}
      {sortedEmployees.length === 0 ? (
        <Card className="p-8 text-center">
          <UserCheck className="h-10 w-10 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold mb-1">
            {t("employees.noEmployees", "No Employees Found")}
          </h3>
          <p className="text-xs text-zinc-500">
            {t("employees.noEmployeesMessage", "No employee performance data available yet.")}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-1.5">
          {currentEmployees.map((employee) => (
            <Card key={employee.id} className="p-2 hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50 truncate">
                      {employee.employeeName}
                    </h3>
                    {!employee.isActive ? (
                      <span className="px-1.5 py-0.5 bg-red-500/10 text-red-700 dark:text-red-400 rounded-full text-[10px] font-medium">
                        {t("manage.status.deactivated", "Deactivated")}
                      </span>
                    ) : employee.isActive && !employee.acceptingOrders ? (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-full text-[10px] font-medium">
                        <PauseCircle className="h-2 w-2" />
                        {t("manage.status.paused", "Pause")}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-green-500/10 text-green-700 dark:text-green-400 rounded-full text-[10px] font-medium">
                        {t("manage.status.active", "Active")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <Mail className="h-2.5 w-2.5 text-zinc-400" />
                    <p className="text-[11px] text-zinc-500 truncate">
                      {employee.employeeEmail}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  {employee.isAvailable ? (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-500/10 text-green-700 dark:text-green-400 rounded-full text-[10px] font-medium">
                      <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                      {t("employees.available", "Available")}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 rounded-full text-[10px] font-medium">
                      {t("employees.unavailable", "Unavailable")}
                    </span>
                  )}
                  {isActiveRecently(employee.lastActiveAt) && (
                    <span className="flex items-center gap-0.5 text-[10px] text-zinc-500">
                      <Clock className="h-2 w-2" />
                      {t("employees.activeRecently", "Active")}
                    </span>
                  )}
                </div>
              </div>

              {/* Performance Stats */}
              <div className="grid grid-cols-3 gap-1 mb-1.5">
                <div className="text-center px-1.5 py-1 bg-green-500/10 dark:bg-green-950/20 rounded">
                  <div className="flex items-center justify-center gap-0.5 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-2.5 w-2.5" />
                    <span className="text-sm font-bold">{employee.ordersCompleted}</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-400">
                    {t("employees.completed", "Done")}
                  </p>
                </div>
                <div className="text-center px-1.5 py-1 bg-yellow-500/10 dark:bg-yellow-950/20 rounded">
                  <div className="flex items-center justify-center gap-0.5 text-yellow-600 dark:text-yellow-400">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    <span className="text-sm font-bold">{employee.ordersSkipped}</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-400">
                    {t("employees.skipped", "Skip")}
                  </p>
                </div>
                <div className="text-center px-1.5 py-1 bg-[#168BB0]/10 dark:bg-blue-950/20 rounded">
                  <div className="flex items-center justify-center gap-0.5 text-[#168BB0] dark:text-[#45B0D2]">
                    <TrendingUp className="h-2.5 w-2.5" />
                    <span className="text-sm font-bold">
                      {getCompletionRate(employee.ordersCompleted, employee.ordersSkipped)}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-400">
                    {t("employees.rate", "Rate")}
                  </p>
                </div>
              </div>

              {/* Last Active & Member Since */}
              <div className="flex items-center gap-3 text-[10px] text-zinc-500 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-0.5">
                  <Calendar className="h-2 w-2" />
                  {employee.lastActiveAt ? (
                    <span>
                      {t("employees.lastActive", "Last: {{date}}", {
                        date: formatDateShort(employee.lastActiveAt)
                      })}
                    </span>
                  ) : (
                    <span>{t("employees.neverActive", "Never")}</span>
                  )}
                </div>
                <div className="flex items-center gap-0.5">
                  <UserCheck className="h-2 w-2" />
                  <span>
                    {formatDateShort(employee.createdAt)}
                  </span>
                </div>
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-zinc-200 dark:border-zinc-800">
                {/* Accepting Orders Switch */}
                <div className="flex items-center gap-1.5">
                  <Label className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
                    {t("manage.acceptingOrders", "Accepting")}
                  </Label>
                  <Switch
                    checked={employee.acceptingOrders}
                    onCheckedChange={(checked: boolean) =>
                      handleToggleAcceptingOrders(employee.userId, checked)
                    }
                    disabled={!employee.isActive}
                    className="scale-75"
                  />
                </div>

                {/* Activate / Deactivate */}
                {employee.isActive ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2 gap-1 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={() => handleToggleActive(employee)}
                  >
                    <Power className="h-2 w-2" />
                    {t("manage.deactivate", "Deactivate")}
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-6 text-[10px] px-2 gap-1"
                    onClick={() => handleToggleActive(employee)}
                  >
                    <Power className="h-2 w-2" />
                    {t("manage.activate", "Activate")}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {sortedEmployees.length > 0 && (
        <div className="flex items-center justify-between bg-white dark:bg-zinc-800 rounded p-1.5 shadow">
          <div className="flex items-center gap-2 text-[10px] text-zinc-600 dark:text-zinc-400">
            <span>
              {searchTerm
                ? `${currentPage}/${totalPages} (${sortedEmployees.length})`
                : `${currentPage}/${totalPages} (${localTotalCount})`
              }
            </span>
            <div className="flex items-center gap-1">
              <span className="text-zinc-500">Show:</span>
              <div className="flex items-center gap-0.5">
                {[10, 20, 50, 100].map((size) => (
                  <button
                    key={size}
                    onClick={() => handleItemsPerPageChange(size)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      itemsPerPage === size
                        ? 'bg-[#168BB0] text-white'
                        : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className="gap-0.5 h-6 px-1.5 text-[10px]"
            >
              <ChevronLeft className="h-2.5 w-2.5" />
              Prev
            </Button>

            {/* Page Numbers - limit display */}
            <div className="flex items-center gap-0.5">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(pageNum)}
                    className="min-w-[24px] h-6 text-[10px]"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="gap-0.5 h-6 px-1.5 text-[10px]"
            >
              Next
              <ChevronRight className="h-2.5 w-2.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {employees.length > 0 && (
        <Card className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {employees.length}
              </p>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-400">
                {t("employees.summary.total", "Total")}
              </p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {employees.filter(e => e.isAvailable).length}
              </p>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-400">
                {t("employees.summary.available", "Available")}
              </p>
            </div>
            <div>
              <p className="text-lg font-bold text-[#168BB0] dark:text-[#45B0D2]">
                {employees.reduce((sum, e) => sum + e.ordersCompleted, 0)}
              </p>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-400">
                {t("employees.summary.totalCompleted", "Completed")}
              </p>
            </div>
            <div>
              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {employees.length > 0
                  ? Math.round(
                      employees.reduce((sum, e) => sum + (e.ordersCompleted + e.ordersSkipped > 0
                        ? (e.ordersCompleted / (e.ordersCompleted + e.ordersSkipped)) * 100
                        : 0), 0) / employees.length
                    )
                  : 0}%
              </p>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-400">
                {t("employees.summary.avgRate", "Avg Rate")}
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
                    <div className="bb-loading-sm inline-block"></div>
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
