"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getAllEmployeeEarningsAction, getEmployeeEarningsDetailAction } from "@/app/actions/admin-earnings";
import { useToast } from "@/context/ToastContext";

interface EmployeeEarning {
  id: string;
  userId: string;
  user: {
    name: string;
    email: string;
  };
  balance: number;
  totalEarned: number;
  currentPeriodEarned: number;
  status: "ACTIVE" | "FROZEN" | "BANNED";
  payoutMethod?: string;
}

export default function AdminEarningsPage() {
  const [earnings, setEarnings] = useState<EmployeeEarning[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 0
  });

  const { success: toastSuccess, error: toastError } = useToast();

  const loadEarnings = async (search?: string, pageNum = 1) => {
    setLoading(true);
    try {
      const result = await getAllEmployeeEarningsAction({
        searchTerm: search,
        page: pageNum,
        pageSize: 20
      });

      if (result.success && result.data) {
        setEarnings(result.data);
        setPagination({
          totalCount: result.pagination?.totalCount || 0,
          totalPages: result.pagination?.totalPages || 0
        });
      } else {
        toastError(result.error || "Failed to load earnings");
      }
    } catch (error) {
      console.error("Failed to load earnings:", error);
      toastError("Failed to load earnings data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEarnings();
  }, []);

  const handleSearch = () => {
    setPage(1);
    loadEarnings(searchTerm, 1);
  };

  const loadEmployeeDetail = async (userId: string) => {
    try {
      const result = await getEmployeeEarningsDetailAction(userId);

      if (result.success && result.data) {
        setSelectedEmployee(result.data);
      } else {
        toastError(result.error || "Failed to load employee details");
      }
    } catch (error) {
      console.error("Failed to load employee details:", error);
      toastError("Failed to load employee details");
    }
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
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Employee Earnings</h1>
        <div className="flex gap-2">
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            className="w-64"
          />
          <Button onClick={handleSearch}>Search</Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Employees</p>
          <p className="text-2xl font-bold">{pagination.totalCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Paid Out</p>
          <p className="text-2xl font-bold">
            {formatCurrency(
              earnings.reduce((sum, e) => sum + (e.totalEarned - e.balance), 0)
            )}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Active Balances</p>
          <p className="text-2xl font-bold">
            {formatCurrency(earnings.reduce((sum, e) => sum + e.balance, 0))}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Earned All Time</p>
          <p className="text-2xl font-bold">
            {formatCurrency(earnings.reduce((sum, e) => sum + e.totalEarned, 0))}
          </p>
        </Card>
      </div>

      {/* Employee Earnings Table */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">All Employee Earnings</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Employee</th>
                <th className="text-left p-2">Status</th>
                <th className="text-right p-2">Total Earned</th>
                <th className="text-right p-2">Current Period</th>
                <th className="text-right p-2">Balance</th>
                <th className="text-right p-2">Payment Method</th>
                <th className="text-center p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((earning) => (
                <tr key={earning.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">
                    <div>
                      <p className="font-medium">{earning.user?.name || "Unknown"}</p>
                      <p className="text-sm text-gray-500">{earning.user?.email}</p>
                    </div>
                  </td>
                  <td className="p-2">
                    <Badge
                      variant={
                        earning.status === "ACTIVE"
                          ? "default"
                          : earning.status === "FROZEN"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {earning.status}
                    </Badge>
                  </td>
                  <td className="text-right p-2 font-medium">
                    {formatCurrency(earning.totalEarned)}
                  </td>
                  <td className="text-right p-2">
                    {formatCurrency(earning.currentPeriodEarned)}
                  </td>
                  <td className="text-right p-2 font-bold">
                    {formatCurrency(earning.balance)}
                  </td>
                  <td className="text-right p-2 text-sm">
                    {earning.payoutMethod || "Not set"}
                  </td>
                  <td className="text-center p-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadEmployeeDetail(earning.userId)}
                    >
                      View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => {
                const newPage = page - 1;
                setPage(newPage);
                loadEarnings(searchTerm, newPage);
              }}
            >
              Previous
            </Button>
            <span className="flex items-center">
              Page {page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page === pagination.totalPages}
              onClick={() => {
                const newPage = page + 1;
                setPage(newPage);
                loadEarnings(searchTerm, newPage);
              }}
            >
              Next
            </Button>
          </div>
        )}
      </Card>

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {selectedEmployee.earnings.user?.name}
              </h2>
              <Button
                variant="ghost"
                onClick={() => setSelectedEmployee(null)}
              >
                ✕
              </Button>
            </div>

            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Earned</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(selectedEmployee.earnings.totalEarned)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Current Period</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(selectedEmployee.earnings.currentPeriodEarned)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Wallet Balance</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(selectedEmployee.earnings.balance)}
                      </p>
                    </div>
                  </div>

              {/* Earnings by Type */}
              <div>
                <h3 className="font-semibold mb-2">Earnings by Review Type</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedEmployee.byType || {}).map(
                    ([type, amount]) => (
                      <div
                        key={type}
                        className="flex justify-between p-2 bg-gray-50 rounded"
                      >
                        <span>{type}</span>
                        <span className="font-medium">
                          {formatCurrency(amount as number)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Recent Transactions */}
              <div>
                <h3 className="font-semibold mb-2">Recent Transactions</h3>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {selectedEmployee.transactions?.slice(0, 10).map((tx: any) => (
                    <div
                      key={tx.id}
                      className="flex justify-between p-2 border rounded text-sm"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(tx.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-medium ${
                            tx.amount > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {tx.amount > 0 ? "+" : ""}
                          {formatCurrency(tx.amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(tx.balanceAfter)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payouts */}
              {selectedEmployee.payouts && selectedEmployee.payouts.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Payout History</h3>
                  <div className="space-y-2">
                    {selectedEmployee.payouts.map((payout: any) => (
                      <div
                        key={payout.id}
                        className="flex justify-between p-2 border rounded"
                      >
                        <div>
                          <p className="font-medium">
                            {formatCurrency(parseFloat(payout.amount))}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(payout.requested_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            payout.status === "COMPLETED"
                              ? "default"
                              : payout.status === "PENDING"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {payout.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
