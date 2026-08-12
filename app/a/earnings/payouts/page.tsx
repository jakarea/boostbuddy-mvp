"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getPayoutRequestsAction,
  processPayoutAction
} from "@/app/actions/admin-earnings";
import { useToast } from "@/context/ToastContext";

interface PayoutRequest {
  id: string;
  employeeEarningsId: string;
  employee: {
    name: string;
    email: string;
  };
  amount: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED";
  rejectionReason: string | null;
  requestedAt: string;
  processedAt: string | null;
  metadata: {
    paymentMethod?: string;
    reference?: string;
    notes?: string;
  } | null;
}

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [processingPayout, setProcessingPayout] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("BANK");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const { success: toastSuccess, error: toastError } = useToast();

  const loadPayouts = async (status?: string) => {
    setLoading(true);
    try {
      const result = await getPayoutRequestsAction({
        status: status as any,
        page: 1,
        pageSize: 50
      });

      if (result.success && result.data) {
        setPayouts(result.data);
      } else {
        toastError(result.error || "Failed to load payout requests");
      }
    } catch (error) {
      console.error("Failed to load payouts:", error);
      toastError("Failed to load payout requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayouts(statusFilter);
  }, [statusFilter]);

  const handleApprove = async () => {
    if (!selectedPayout) return;

    setProcessingPayout(selectedPayout.id);

    try {
      const result = await processPayoutAction(selectedPayout.id, "APPROVE", {
        paymentMethod,
        reference: paymentReference,
        notes: paymentNotes
      });

      if (result.success) {
        toastSuccess(`Payout of €${selectedPayout.amount.toFixed(2)} approved`);
        setShowApproveModal(false);
        setSelectedPayout(null);
        setPaymentMethod("BANK");
        setPaymentReference("");
        setPaymentNotes("");
        loadPayouts(statusFilter);
      } else {
        toastError(result.error || "Failed to approve payout");
      }
    } catch (error) {
      console.error("Failed to approve payout:", error);
      toastError("Failed to approve payout");
    } finally {
      setProcessingPayout(null);
    }
  };

  const handleReject = async () => {
    if (!selectedPayout) return;

    if (!rejectionReason.trim()) {
      toastError("Please provide a rejection reason");
      return;
    }

    setProcessingPayout(selectedPayout.id);

    try {
      const result = await processPayoutAction(selectedPayout.id, "REJECT", {
        rejectionReason
      });

      if (result.success) {
        toastSuccess("Payout rejected");
        setShowRejectModal(false);
        setSelectedPayout(null);
        setRejectionReason("");
        loadPayouts(statusFilter);
      } else {
        toastError(result.error || "Failed to reject payout");
      }
    } catch (error) {
      console.error("Failed to reject payout:", error);
      toastError("Failed to reject payout");
    } finally {
      setProcessingPayout(null);
    }
  };

  const openApproveModal = (payout: PayoutRequest) => {
    setSelectedPayout(payout);
    setPaymentMethod("BANK");
    setPaymentReference("");
    setPaymentNotes("");
    setShowApproveModal(true);
  };

  const openRejectModal = (payout: PayoutRequest) => {
    setSelectedPayout(payout);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-EU", {
      style: "currency",
      currency: "EUR"
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Payout Requests</h1>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value || "ALL")}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="ALL">All Statuses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Pending Amount</p>
          <p className="text-2xl font-bold">
            {formatCurrency(
              payouts
                .filter((p) => p.status === "PENDING")
                .reduce((sum, p) => sum + p.amount, 0)
            )}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Pending Requests</p>
          <p className="text-2xl font-bold">
            {payouts.filter((p) => p.status === "PENDING").length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Paid Out</p>
          <p className="text-2xl font-bold">
            {formatCurrency(
              payouts
                .filter((p) => p.status === "COMPLETED")
                .reduce((sum, p) => sum + p.amount, 0)
            )}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Completed Requests</p>
          <p className="text-2xl font-bold">
            {payouts.filter((p) => p.status === "COMPLETED").length}
          </p>
        </Card>
      </div>

      {/* Payout Requests Table */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Payout Requests</h2>

        {payouts.length === 0 ? (
          <p className="text-gray-500">No payout requests found</p>
        ) : (
          <div className="space-y-3">
            {payouts.map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{payout.employee?.name}</p>
                    <p className="text-sm text-gray-500">{payout.employee?.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        payout.status === "COMPLETED"
                          ? "default"
                          : payout.status === "PENDING"
                          ? "secondary"
                          : payout.status === "PROCESSING"
                          ? "outline"
                          : "destructive"
                      }
                    >
                      {payout.status}
                    </Badge>
                    <p className="text-lg font-bold">
                      {formatCurrency(payout.amount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Requested: {new Date(payout.requestedAt).toLocaleDateString()}
                    </p>
                    {payout.processedAt && (
                      <p className="text-xs text-gray-500">
                        Processed: {new Date(payout.processedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {payout.metadata && (
                    <p className="text-xs text-gray-500 mt-1">
                      Method: {payout.metadata.paymentMethod || "Not specified"}
                      {payout.metadata.reference && ` • Ref: ${payout.metadata.reference}`}
                    </p>
                  )}
                  {payout.rejectionReason && (
                    <p className="text-xs text-red-600 mt-1">
                      Reason: {payout.rejectionReason}
                    </p>
                  )}
                </div>

                {payout.status === "PENDING" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => openApproveModal(payout)}
                      disabled={processingPayout === payout.id}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openRejectModal(payout)}
                      disabled={processingPayout === payout.id}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Approve Modal */}
      {showApproveModal && selectedPayout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Approve Payout</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Employee</p>
                <p className="font-medium">{selectedPayout.employee?.name}</p>
                <p className="text-sm">{selectedPayout.employee?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(selectedPayout.amount)}
                </p>
              </div>
              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value || "BANK")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK">Bank Transfer</SelectItem>
                    <SelectItem value="PAYPAL">PayPal</SelectItem>
                    <SelectItem value="CRYPTO">Crypto</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reference">Reference / Transaction ID</Label>
                <Input
                  id="reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Enter transaction reference"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Additional notes (optional)"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedPayout(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApprove}
                disabled={processingPayout === selectedPayout.id}
              >
                {processingPayout === selectedPayout.id ? "Processing..." : "Approve"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedPayout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Reject Payout</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Employee</p>
                <p className="font-medium">{selectedPayout.employee?.name}</p>
                <p className="text-sm">{selectedPayout.employee?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(selectedPayout.amount)}</p>
              </div>
              <div>
                <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection"
                  required
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedPayout(null);
                  setRejectionReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processingPayout === selectedPayout.id}
              >
                {processingPayout === selectedPayout.id ? "Processing..." : "Reject"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
