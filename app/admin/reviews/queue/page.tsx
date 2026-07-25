"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getAllReviewOrdersAction,
  assignReviewToEmployeeAction,
  cancelReviewOrderAction,
  getAvailableEmployeesAction
} from "@/app/actions/admin-reviews";
import {
  Clock,
  User,
  Calendar,
  Star,
  X,
  Check,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from "lucide-react";

interface ReviewOrder {
  id: string;
  businessName: string;
  businessUrl?: string;
  reviewType: string;
  targetRating: string;
  reviewContent: string;
  reviewInstructions?: string;
  status: string;
  creditsConsumed: number;
  createdAt: string;
  clientName?: string;
  clientEmail?: string;
  assignedEmployeeId?: string;
  employeeName?: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  acceptingOrders: boolean;
  isAvailable: boolean;
  ordersCompleted: number;
  lastActiveAt?: string;
}

export default function AdminReviewsQueuePage() {
  const { t } = useTranslation("admin_reviews");
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [orders, setOrders] = useState<ReviewOrder[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Record<string, string>>({});

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [ordersRes, employeesRes] = await Promise.all([
        getAllReviewOrdersAction({ status: "PENDING" }),
        getAvailableEmployeesAction()
      ]);

      if (ordersRes.success) {
        // Normalize field names for dual-mode compatibility
        const normalizedOrders = (ordersRes.data as any[])?.map(order => ({
          id: order.id,
          businessName: order.business_name || order.businessName,
          businessUrl: order.business_url || order.businessUrl,
          reviewType: order.review_type || order.reviewType,
          targetRating: order.target_rating || order.targetRating,
          reviewContent: order.review_content || order.reviewContent,
          reviewInstructions: order.review_instructions || order.reviewInstructions,
          status: order.status,
          creditsConsumed: order.credits_consumed || order.creditsConsumed,
          createdAt: order.created_at || order.createdAt,
          clientName: order.clientName || order.client_name,
          clientEmail: order.clientEmail || order.client_email,
          assignedEmployeeId: order.assigned_employee_id || order.assignedEmployeeId,
          employeeName: order.employeeName || order.employee_name
        })) || [];
        setOrders(normalizedOrders);
      }

      if (employeesRes.success) {
        setEmployees(employeesRes.data as Employee[]);
      }
    } catch (err) {
      error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [error]);

  const handleAssign = async (orderId: string) => {
    const employeeId = selectedEmployees[orderId];
    if (!employeeId) {
      error("Please select an employee");
      return;
    }

    try {
      setAssigningOrderId(orderId);
      const result = await assignReviewToEmployeeAction({ orderId, employeeId });
      if (result.success) {
        success("Order assigned successfully");
        setSelectedEmployees({ ...selectedEmployees, [orderId]: "" });
        loadData();
      } else {
        error(result.error || "Failed to assign order");
      }
    } catch (err) {
      error("Failed to assign order");
    } finally {
      setAssigningOrderId(null);
    }
  };

  const handleCancel = async (orderId: string) => {
    // Custom cancel dialog with reason input
    const reason = prompt(t("queue.cancelDialog.reasonPlaceholder", "Enter the reason for cancellation..."));
    if (!reason || !reason.trim()) {
      error(t("queue.cancelDialog.reasonRequired", "Please provide a reason for cancellation"));
      return;
    }

    const confirmed = await confirm({
      title: t("queue.cancelDialog.title", "Cancel Order?"),
      message: t("queue.cancelDialog.message", "This will refund the credits to the client."),
      confirmText: t("queue.cancelDialog.confirm", "Cancel & Refund"),
      cancelText: t("queue.cancelDialog.back", "Back"),
      confirmVariant: "destructive"
    });

    if (confirmed) {
      try {
        const result = await cancelReviewOrderAction(orderId, reason);
        if (result.success) {
          success("Order cancelled and credits refunded");
          loadData();
        } else {
          error(result.error || "Failed to cancel order");
        }
      } catch (err) {
        error("Failed to cancel order");
      }
    }
  };

  const getPlatformIcon = (type: string) => {
    const platformColors: Record<string, string> = {
      GOOGLE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      TRUSTPILOT: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      YELP: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      FACEBOOK: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
      AMAZON: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${platformColors[type] || "bg-gray-100 text-gray-700"}`}>
        {type}
      </span>
    );
  };

  const getRatingStars = (rating: string) => {
    const count = parseInt(rating.split("_")[0]);
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${i < count ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
          />
        ))}
        <span className="text-xs text-zinc-500 ml-1">{rating.replace("_", " ")}</span>
      </div>
    );
  };

  const availableEmployees = employees.filter(e => e.isActive && e.acceptingOrders);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#168BB0]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t("queue.title", "Orders Queue")}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {t("queue.subtitle", "Assign pending review orders to available employees")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {t("queue.refresh", "Refresh")}
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-yellow-600" />
          <span className="text-zinc-600">
            {t("queue.pendingCount", "{{count}} pending", { count: orders.length })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-green-600" />
          <span className="text-zinc-600">
            {t("queue.availableCount", "{{count}} available employees", { count: availableEmployees.length })}
          </span>
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {t("queue.noOrders", "No Pending Orders")}
          </h3>
          <p className="text-sm text-zinc-500">
            {t("queue.noOrdersMessage", "All review orders have been assigned or processed.")}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Order Details */}
                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {order.businessName}
                      </h3>
                      {order.businessUrl && (
                        <a
                          href={order.businessUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#168BB0] hover:underline"
                        >
                          {order.businessUrl}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getPlatformIcon(order.reviewType)}
                      {getRatingStars(order.targetRating)}
                    </div>
                  </div>

                  {/* Review Content */}
                  <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {order.reviewContent}
                    </p>
                  </div>

                  {/* Instructions */}
                  {order.reviewInstructions && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
                        {t("queue.instructions", "Instructions")}:
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        {order.reviewInstructions}
                      </p>
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {order.creditsConsumed} credits
                    </div>
                    {order.clientName && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {order.clientName} ({order.clientEmail})
                      </div>
                    )}
                  </div>
                </div>

                {/* Assignment Actions */}
                <div className="lg:w-64 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 pt-4 lg:pt-0 lg:pl-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-600 mb-1 block">
                      {t("queue.assignTo", "Assign to Employee")}
                    </label>
                    <select
                      value={selectedEmployees[order.id] || ""}
                      onChange={(e) => setSelectedEmployees({ ...selectedEmployees, [order.id]: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
                      disabled={assigningOrderId === order.id}
                    >
                      <option value="">{t("queue.selectEmployee", "Select employee...")}</option>
                      {availableEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.ordersCompleted} completed)
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => handleAssign(order.id)}
                    disabled={!selectedEmployees[order.id] || assigningOrderId === order.id}
                  >
                    {assigningOrderId === order.id ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        {t("queue.assigning", "Assigning...")}
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        {t("queue.assignOrder", "Assign Order")}
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleCancel(order.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                    {t("queue.cancelOrder", "Cancel Order")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
