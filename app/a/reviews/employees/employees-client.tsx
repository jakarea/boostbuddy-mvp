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
  PauseCircle,
  Play,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Shield,
  IdCard,
  MapPin,
  Phone
} from "lucide-react";
import { formatDateShort } from "@/lib/dateUtils";
import { useSWR } from "@/lib/cache/swr";
import { CACHE_KEYS } from "@/lib/cache/cacheContext";
import CACHE_TTL from '@/lib/cache/cache-ttl';

interface EmployeePerformance {
  id: string;
  userId: string;
  user_id: string;
  name: string;
  employeeName: string;
  email: string;
  employeeEmail: string;
  isAvailable: boolean;
  is_available: boolean;
  isActive: boolean;
  is_active: boolean;
  acceptingOrders: boolean;
  accepting_orders: boolean;
  acceptingTasks: boolean;
  accepting_tasks: boolean;
  ordersCompleted: number;
  orders_completed: number;
  creditsCompleted: number;
  credits_completed: number;
  lastActiveAt: string;
  last_active_at: string;
  createdAt: string;
  created_at: string;
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
        // Apply same mapping as server component to handle nested users data
        const employees = (result.data as any[])?.map(emp => ({
          id: emp.id,
          userId: emp.user_id || emp.userId || '',
          user_id: emp.user_id || emp.userId || '',
          name: emp.users?.name || emp.employee_name || emp.employeeName || emp.name || '',
          employeeName: emp.employee_name || emp.employeeName || emp.users?.name || emp.name || '',
          email: emp.users?.email || emp.employee_email || emp.employeeEmail || emp.email || '',
          employeeEmail: emp.employee_email || emp.employeeEmail || emp.users?.email || emp.email || '',
          isAvailable: emp.is_available || emp.isAvailable || false,
          is_available: emp.is_available || emp.isAvailable || false,
          isActive: emp.users?.is_active ?? emp.is_active ?? emp.isActive ?? true,
          is_active: emp.users?.is_active ?? emp.is_active ?? emp.isActive ?? true,
          acceptingOrders: emp.users?.accepting_orders ?? emp.accepting_orders ?? emp.acceptingOrders ?? true,
          accepting_orders: emp.users?.accepting_orders ?? emp.accepting_orders ?? emp.acceptingOrders ?? true,
          acceptingTasks: emp.accepting_tasks ?? emp.acceptingTasks ?? true,
          accepting_tasks: emp.accepting_tasks ?? emp.acceptingTasks ?? true,
          ordersCompleted: emp.orders_completed || emp.ordersCompleted || 0,
          orders_completed: emp.orders_completed || emp.ordersCompleted || 0,
          creditsCompleted: emp.credits_completed || emp.creditsCompleted || 0,
          credits_completed: emp.credits_completed || emp.creditsCompleted || 0,
          lastActiveAt: emp.last_active_at || emp.lastActiveAt || '',
          last_active_at: emp.last_active_at || emp.lastActiveAt || '',
          createdAt: emp.created_at || emp.createdAt || '',
          created_at: emp.created_at || emp.createdAt || '',
        })) || [];
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

  // Optimistic state for employee isActive - tracks local changes before server confirms
  const [optimisticActiveStates, setOptimisticActiveStates] = useState<Record<string, boolean>>({});

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
    const currentActive = optimisticActiveStates[employee.userId] ?? employee.isActive ?? employee.is_active;
    const nextActive = !currentActive;
    const confirmed = await confirm({
      title: nextActive
        ? t("manage.activateConfirm.title", "Start Order Distribution?")
        : t("manage.deactivateConfirm.title", "Stop Order Distribution?"),
      message: nextActive
        ? t("manage.activateConfirm.message", "New orders will be assigned to this employee.")
        : t("manage.deactivateConfirm.message", "This employee will stop receiving new orders. Current orders will continue."),
      confirmText: nextActive
        ? t("manage.activateConfirm.confirm", "Start")
        : t("manage.deactivateConfirm.confirm", "Stop"),
      confirmVariant: nextActive ? "default" : "destructive",
    });

    if (!confirmed) return;

    // Optimistic update - update UI instantly
    setOptimisticActiveStates(prev => ({ ...prev, [employee.userId]: nextActive }));

    // Call backend API silently in background
    setEmployeeActiveStatusAction(employee.userId, nextActive).then((result) => {
      if (result.success) {
        refresh(); // Refresh SWR cache to get confirmed state
        success(nextActive ? "Order distribution started" : "Order distribution stopped");
        // Clear optimistic state on success (SWR refresh will have the real value)
        setOptimisticActiveStates(prev => {
          const newState = { ...prev };
          delete newState[employee.userId];
          return newState;
        });
      } else {
        // Revert UI on error
        setOptimisticActiveStates(prev => {
          const newState = { ...prev };
          delete newState[employee.userId];
          return newState;
        });
        showError(result.error || "Failed to update");
      }
    }).catch(() => {
      // Revert UI on exception
      setOptimisticActiveStates(prev => {
        const newState = { ...prev };
        delete newState[employee.userId];
        return newState;
      });
      showError("Failed to update");
    });
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentEmployees.map((employee) => (
            <Card key={employee.id} className="p-4 hover:shadow-lg transition-all duration-200 border-zinc-200 dark:border-zinc-700">
              <div className="space-y-4">
                {/* Name & Email */}
                <div>
                  <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-50">
                    {employee.name || employee.employeeName || 'Employee'}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    {employee.email || employee.employeeEmail || 'No email'}
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-100 dark:border-blue-900/30">
                    <div className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Credits</div>
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {employee.creditsCompleted || employee.credits_completed || 0}
                    </div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900/30">
                    <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium mb-1">Orders</div>
                    <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                      {employee.ordersCompleted || employee.orders_completed || 0}
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs gap-1.5"
                    onClick={() => router.push(`/a/reviews/employees/${employee.userId}`)}
                  >
                    <TrendingUp className="h-3 w-3" />
                    View Orders
                  </Button>
                  <Button
                    variant={(optimisticActiveStates[employee.userId] ?? employee.isActive ?? employee.is_active) ? "outline" : "default"}
                    size="sm"
                    className={`h-8 text-xs px-3 gap-1.5 ${
                      (optimisticActiveStates[employee.userId] ?? employee.isActive ?? employee.is_active)
                        ? 'text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30'
                        : ''
                    }`}
                    onClick={() => handleToggleActive(employee)}
                    title={(optimisticActiveStates[employee.userId] ?? employee.isActive ?? employee.is_active) ? "Stop assigning new orders" : "Start assigning new orders"}
                  >
                    {(optimisticActiveStates[employee.userId] ?? employee.isActive ?? employee.is_active) ? (
                      <>
                        <PauseCircle className="h-3 w-3" />
                        Stop Orders
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3" />
                        Start Orders
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {employees.length > 0 && (
        <div className="flex items-center justify-between bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

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
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`min-w-[32px] h-8 rounded text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-[#168BB0] text-white'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="h-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="h-8 border border-zinc-300 dark:border-zinc-600 rounded px-2 text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
            >
              <option value="10">10 / page</option>
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
              <option value="100">100 / page</option>
            </select>
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
