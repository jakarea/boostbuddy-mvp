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
  toggleEmployeeTaskDistributionAction,
  setEmployeeActiveStatusAction,
  getEmployeeAssignedReviewsAction,
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
import { useSWR } from "@/lib/cache/swr";
import { CACHE_KEYS } from "@/lib/cache/cacheContext";
import CACHE_TTL from '@/lib/cache/cache-ttl';

interface EmployeePerformance {
  id: string;
  userId: string;
  employeeName: string;
  employeeEmail: string;
  isAvailable: boolean;
  isActive: boolean;
  acceptingOrders: boolean;
  acceptingTasks: boolean;
  ordersCompleted: number;
  lastActiveAt: string;
  createdAt: string;
  assignedReviews?: AssignedReview[];
}

interface AssignedReview {
  id: string;
  url: string;
  quantity: number;
  status: string;
  assignedAt: string;
  completedAt?: string;
  orderId: string;
  orderType: string;
}

interface EmployeesClientProps {
  initialEmployees: EmployeePerformance[];
  totalCount: number;
}

export default function EmployeesClient({ initialEmployees, totalCount }: EmployeesClientProps) {
  const { t } = useTranslation("admin_reviews");
  const { success, error: showError } = useToast();
  const { confirm } = useConfirm();
  const searchParams = useSearchParams();
  const router = useRouter();

  // SWR for employee performance data - 2 minute cache
  const { data: swrData, refresh, isValid } = useSWR<{ employees: EmployeePerformance[]; totalCount: number }>({
    key: CACHE_KEYS.ADMIN_EMPLOYEE_PERFORMANCE,
    fetcher: async (): Promise<{ employees: EmployeePerformance[]; totalCount: number }> => {
      const result = await getEmployeePerformanceAction();
      if (result.success && result.data) {
        const employees = result.data as EmployeePerformance[];
        const totalCount = result.pagination?.totalCount || 0;
        return { employees, totalCount };
      }
      return { employees: [], totalCount: 0 };
    },
    ttl: CACHE_TTL.MEDIUM, // 2 minutes
    initialData: { employees: initialEmployees, totalCount },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"completed" | "recent">("completed");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitePending, startInviteTransition] = useTransition();
  const initialSearchTerm = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Track which employee cards are expanded and their assigned reviews
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [employeeAssignments, setEmployeeAssignments] = useState<Record<string, AssignedReview[]>>({});

  // Use SWR data
  const employees = swrData?.employees || [];
  const localTotalCount = swrData?.totalCount || 0;

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

  const toggleEmployeeExpanded = async (employeeId: string, userId: string) => {
    const newExpanded = new Set(expandedEmployees);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
      // Fetch assigned reviews if not already loaded
      if (!employeeAssignments[employeeId]) {
        try {
          const result = await getEmployeeAssignedReviewsAction(userId);
          if (result.success && result.data) {
            setEmployeeAssignments(prev => ({ ...prev, [employeeId]: result.data }));
          }
        } catch (err) {
          console.error("Failed to fetch assigned reviews:", err);
        }
      }
    }
    setExpandedEmployees(newExpanded);
  };

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startInviteTransition(async () => {
      const result = await inviteEmployeeAction(null, formData);
      if (result.success) {
        success(result.message || t("manage.inviteDialog.success", "Invitation sent"));
        setInviteOpen(false);
        refresh();
        router.refresh();
      } else {
        showError(result.error || "Failed to invite employee");
      }
    });
  };

  const handleToggleAcceptingOrders = (userId: string, nextChecked: boolean) => {
    toggleEmployeeAcceptingOrdersAction(userId)
      .then(result => {
        if (result.success) {
          refresh();
        } else {
          showError(result.error || "Failed to update");
        }
      })
      .catch(() => {
        showError("Failed to update");
      });
  };

  const handleToggleTaskDistribution = (userId: string, nextChecked: boolean) => {
    toggleEmployeeTaskDistributionAction(userId)
      .then(result => {
        if (result.success) {
          refresh();
        } else {
          showError(result.error || "Failed to update");
        }
      })
      .catch(() => {
        showError("Failed to update");
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
      refresh(); // Refresh SWR cache instead of optimistic update
      success(nextActive ? "Employee activated" : "Employee deactivated");
    } else {
      showError(result.error || "Failed to update");
    }
  };

  const isActiveRecently = (lastActiveAt: string | undefined) => {
    if (!lastActiveAt) return false;
    const lastActive = new Date(lastActiveAt);
    const now = new Date();
    const daysDiff = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7; // Active in last 7 days
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {t("employees.title", "Employee Performance")}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t("employees.subtitle", "Manage your team and track performance")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={!isValid}
            className="gap-2 h-9"
          >
            <Loader2 className={`h-4 w-4 ${!isValid ? 'animate-spin' : ''}`} />
            {t("employees.refresh", "Refresh")}
          </Button>
          <Button
            size="sm"
            onClick={() => setInviteOpen(true)}
            className="gap-2 h-9"
          >
            <UserPlus className="h-4 w-4" />
            {t("manage.invite", "Invite Employee")}
          </Button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex items-center gap-3 bg-white dark:bg-zinc-800 rounded-xl p-3 shadow-sm border border-zinc-200 dark:border-zinc-700">
        {/* Sort Options */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {t("employees.sortBy", "Sort by")}:
          </span>
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5">
            <Button
              size="sm"
              variant={sortBy === "completed" ? "default" : "ghost"}
              onClick={() => setSortBy("completed")}
              className="h-7 text-xs px-3"
            >
              {t("employees.sort.completed", "Completed")}
            </Button>
            <Button
              size="sm"
              variant={sortBy === "recent" ? "default" : "ghost"}
              onClick={() => setSortBy("recent")}
              className="h-7 text-xs px-3"
            >
              {t("employees.sort.recent", "Recent Activity")}
            </Button>
          </div>
        </div>

        <div className="flex-1 min-w-[240px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("employees.searchPlaceholder", "Search by name or email...")}
              className="w-full pl-10 pr-10 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#168BB0] focus:border-transparent transition-all"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {searchTerm && (
          <div className="text-xs text-zinc-600 dark:text-zinc-400 font-medium bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-lg">
            {employees.length} {t("common.results", "results")}
          </div>
        )}
      </div>

      {/* Employees Grid */}
      {sortedEmployees.length === 0 ? (
        <Card className="p-12 text-center border-zinc-200 dark:border-zinc-700">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
              <UserCheck className="h-8 w-8 text-zinc-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2 text-zinc-900 dark:text-zinc-50">
            {t("employees.noEmployees", "No Employees Found")}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            {t("employees.noEmployeesMessage", "No employee performance data available yet. Invite your first employee to get started.")}
          </p>
          <Button onClick={() => setInviteOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            {t("manage.inviteFirst", "Invite First Employee")}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {currentEmployees.map((employee) => (
            <Card key={employee.id} className="overflow-hidden hover:shadow-lg transition-all duration-200 border-zinc-200 dark:border-zinc-700">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-zinc-50 to-white dark:from-zinc-800/50 dark:to-zinc-900 px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-50">
                        {employee.employeeName}
                      </h3>
                      {!employee.isActive ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium border border-red-200 dark:border-red-800/30">
                          <Power className="h-3 w-3" />
                          {t("manage.status.deactivated", "Deactivated")}
                        </span>
                      ) : employee.isActive && !(employee.acceptingTasks ?? true) ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium border border-amber-200 dark:border-amber-800/30">
                          <PauseCircle className="h-3 w-3" />
                          {t("manage.status.paused", "No Tasks")}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium border border-green-200 dark:border-green-800/30">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                          {t("manage.status.active", "Active")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{employee.employeeEmail}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {employee.isAvailable ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-semibold border border-green-200 dark:border-green-800/30">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        {t("employees.available", "Available")}
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700">
                        {t("employees.unavailable", "Unavailable")}
                      </span>
                    )}
                  </div>
                </div>
                {isActiveRecently(employee.lastActiveAt) && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <Clock className="h-3 w-3" />
                    <span>{t("employees.activeRecently", "Active recently")}</span>
                  </div>
                )}
              </div>

              {/* Main Content */}
              <div className="p-4 space-y-4">
                {/* Performance Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border border-green-200/50 dark:border-green-800/30 shadow-sm">
                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-sm">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">{t("employees.completed", "Completed")}</p>
                      <p className="text-lg font-bold text-green-700 dark:text-green-300">{employee.ordersCompleted}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200/50 dark:border-blue-800/30 shadow-sm">
                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-sm">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">{t("employees.assignments", "Assignments")}</p>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                        {employeeAssignments[employee.id]?.filter(r => r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS').length || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Assigned Reviews Section */}
                <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3">
                  <button
                    onClick={() => toggleEmployeeExpanded(employee.id, employee.userId)}
                    className="w-full flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors group"
                  >
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      {expandedEmployees.has(employee.id)
                        ? t("employees.hideHistory", "Hide Order History")
                        : t("employees.viewHistory", "View Order History")
                      }
                      <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-medium">
                        {employeeAssignments[employee.id]?.length || 0}
                      </span>
                    </span>
                    <ChevronLeft className={`h-4 w-4 transition-transform ${expandedEmployees.has(employee.id) ? 'rotate-90' : ''} group-hover:text-zinc-700 dark:group-hover:text-zinc-300`} />
                  </button>

                  {expandedEmployees.has(employee.id) && (
                    <div className="mt-3 space-y-3">
                      {employeeAssignments[employee.id]?.length === 0 ? (
                        <div className="text-center py-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("employees.noAssignments", "No assigned reviews")}</p>
                        </div>
                      ) : (
                        <>
                          {/* Active Assignments */}
                          <div>
                            <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                              {t("employees.currentAssignments", "Current Assignments")}
                            </h4>
                            <div className="space-y-2">
                              {employeeAssignments[employee.id]
                                .filter(r => r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS')
                                .map((review) => (
                                  <div key={review.id} className="bg-white dark:bg-zinc-800 rounded-lg p-3 border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                                        review.status === 'IN_PROGRESS'
                                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                      }`}>
                                        {review.status === 'IN_PROGRESS' ? 'IN PROGRESS' : review.status}
                                      </span>
                                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                        Qty: {review.quantity}
                                      </span>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium truncate" title={review.url}>
                                        {review.url}
                                      </p>
                                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {review.orderType.replace(/_/g, ' ')}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              {employeeAssignments[employee.id].filter(r => r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS').length === 0 && (
                                <div className="text-center py-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700">
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("employees.noCurrentAssignments", "No current assignments")}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Completed Orders */}
                          <div>
                            <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                              {t("employees.completedOrders", "Completed Orders")}
                            </h4>
                            <div className="space-y-2">
                              {employeeAssignments[employee.id]
                                .filter(r => r.status === 'COMPLETED')
                                .map((review) => (
                                  <div key={review.id} className="bg-white dark:bg-zinc-800 rounded-lg p-3 border border-zinc-200 dark:border-zinc-700 hover:border-green-300 dark:hover:border-green-700 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="px-2 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                        COMPLETED
                                      </span>
                                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                        Qty: {review.quantity}
                                      </span>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium truncate" title={review.url}>
                                        {review.url}
                                      </p>
                                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {review.orderType.replace(/_/g, ' ')}
                                      </p>
                                      {review.completedAt && (
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                          {t("employees.completedOn", "Completed: {{date}}", { date: new Date(review.completedAt).toLocaleDateString() })}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              {employeeAssignments[employee.id].filter(r => r.status === 'COMPLETED').length === 0 && (
                                <div className="text-center py-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700">
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("employees.noCompletedOrders", "No completed orders yet")}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Activity Info */}
                <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-700 pt-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {employee.lastActiveAt
                        ? t("employees.lastActive", "Last: {{date}}", { date: formatDateShort(employee.lastActiveAt) })
                        : t("employees.neverActive", "Never")
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>{t("employees.memberSince", "Since: {{date}}", { date: formatDateShort(employee.createdAt) })}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center gap-3">
                    <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {t("manage.taskDistribution", "Task Distribution")}
                    </Label>
                    <Switch
                      checked={employee.acceptingTasks ?? true}
                      onCheckedChange={(checked: boolean) =>
                        handleToggleTaskDistribution(employee.userId, checked)
                      }
                      disabled={!employee.isActive}
                    />
                    <span className={`text-xs font-semibold ${(employee.acceptingTasks ?? true) ? 'text-green-600 dark:text-green-400' : 'text-zinc-500'}`}>
                      {(employee.acceptingTasks ?? true) ? t("common.on", "ON") : t("common.off", "OFF")}
                    </span>
                  </div>
                  {employee.isActive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs px-3 gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                      onClick={() => handleToggleActive(employee)}
                    >
                      <Power className="h-3 w-3" />
                      {t("manage.deactivate", "Deactivate")}
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 text-xs px-3 gap-1.5"
                      onClick={() => handleToggleActive(employee)}
                    >
                      <Power className="h-3 w-3" />
                      {t("manage.activate", "Activate")}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {sortedEmployees.length > 0 && (
        <div className="flex items-center justify-between bg-white dark:bg-zinc-800 rounded-xl p-3 shadow-sm border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-medium">
              {searchTerm
                ? `${currentPage}/${totalPages} (${sortedEmployees.length} ${t("common.results", "results")})`
                : `${currentPage}/${totalPages} (${localTotalCount} ${t("common.total", "total")})`
              }
            </span>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">{t("common.show", "Show")}:</span>
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5">
                {[10, 20, 50, 100].map((size) => (
                  <button
                    key={size}
                    onClick={() => handleItemsPerPageChange(size)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      itemsPerPage === size
                        ? 'bg-[#168BB0] text-white shadow-sm'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className="gap-1.5 h-8"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("common.previous", "Previous")}
            </Button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
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
                    className="min-w-[32px] h-8 text-sm"
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
              className="gap-1.5 h-8"
            >
              {t("common.next", "Next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {employees.length > 0 && (
        <Card className="overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 border-none shadow-lg">
          <div className="p-6">
            <h3 className="text-sm font-semibold text-white/90 mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t("employees.summary.title", "Performance Overview")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between mb-2">
                  <UserCheck className="h-5 w-5 text-white/80" />
                  <span className="text-xs text-white/60 font-medium">{t("employees.summary.total", "Total")}</span>
                </div>
                <p className="text-3xl font-bold text-white">{employees.length}</p>
                <p className="text-xs text-white/70 mt-1">{t("employees.summary.employees", "employees")}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                  <span className="text-xs text-white/60 font-medium">{t("employees.summary.available", "Available")}</span>
                </div>
                <p className="text-3xl font-bold text-white">{employees.filter(e => e.isAvailable).length}</p>
                <p className="text-xs text-white/70 mt-1">{t("employees.summary.ready", "ready to work")}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="h-5 w-5 text-white/80" />
                  <span className="text-xs text-white/60 font-medium">{t("employees.summary.totalCompleted", "Completed")}</span>
                </div>
                <p className="text-3xl font-bold text-white">{employees.reduce((sum, e) => sum + (e.ordersCompleted || 0), 0)}</p>
                <p className="text-xs text-white/70 mt-1">{t("employees.summary.orders", "total orders")}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="h-5 w-5 text-white/80" />
                  <span className="text-xs text-white/60 font-medium">{t("employees.summary.avgPerEmp", "Avg per Employee")}</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {employees.length > 0 ? (employees.reduce((sum, e) => sum + (e.ordersCompleted || 0), 0) / employees.length).toFixed(1) : '0'}
                </p>
                <p className="text-xs text-white/70 mt-1">{t("employees.summary.completedOrders", "completed orders")}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Invite Employee Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{t("manage.inviteDialog.title", "Invite New Employee")}</DialogTitle>
            <DialogDescription className="text-sm">
              {t("manage.inviteDialog.description", "Send an invitation email to add a new team member. They'll appear in this list after signing in.")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name" className="text-sm font-medium">
                {t("manage.inviteDialog.nameLabel", "Full Name")}
              </Label>
              <Input
                id="invite-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder={t("manage.inviteDialog.namePlaceholder", "Enter employee's full name")}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="text-sm font-medium">
                {t("manage.inviteDialog.emailLabel", "Email Address")}
              </Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="employee@example.com"
                className="h-10"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteOpen(false)}
                disabled={invitePending}
                className="h-10"
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={invitePending} className="h-10 gap-2">
                {invitePending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("manage.inviteDialog.sending", "Sending...")}
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    {t("manage.inviteDialog.submit", "Send Invitation")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
