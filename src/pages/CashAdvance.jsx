import { useState, useMemo } from "react";
import { useCashAdvances } from "@/hooks/useCashAdvances";
import { formatCurrency } from "@/lib/payrollUtils";
import CashAdvanceCard from "@/components/cashadvance/CashAdvanceCard";
import CashAdvanceModal from "@/components/cashadvance/CashAdvanceModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, Plus, Wallet, Loader2 } from "lucide-react";

export default function CashAdvance() {
  const {
    records,
    employees,
    loading,
    mutationLoading,
    createRecord,
    updateRecord,
    recordPayment,
    deleteRecord,
  } = useCashAdvances();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("new");
  const [selectedRecord, setSelectedRecord] = useState(null);

  const filteredRecords = useMemo(() => {
    let data = [...records];

    const term = search.trim().toLowerCase();
    if (term) {
      data = data.filter((r) =>
        r.employee_name.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== "all") {
      data = data.filter((r) => r.status === statusFilter);
    }

    return data;
  }, [records, search, statusFilter]);

  const summary = useMemo(() => {
    const active = records.filter((r) => r.status === "active");
    return {
      totalLoans: records.length,
      activeLoans: active.length,
      totalAmount: records.reduce((s, r) => s + r.total_amount, 0),
      totalPaid: records.reduce((s, r) => s + r.present_paid, 0),
      totalBalance: records.reduce(
        (s, r) => s + (r.total_amount - r.present_paid),
        0
      ),
    };
  }, [records]);

  const handleNew = () => {
    setSelectedRecord(null);
    setModalMode("new");
    setModalOpen(true);
  };

  const handleEdit = (record) => {
    setSelectedRecord(record);
    setModalMode("edit");
    setModalOpen(true);
  };

  const handlePayment = (record) => {
    setSelectedRecord(record);
    setModalMode("payment");
    setModalOpen(true);
  };

  const handleComplete = async (record) => {
    await updateRecord(record.id, {
      ...record,
      status: "completed",
      present_paid: record.total_amount,
    });
  };

  const handleModalSubmit = async (data) => {
    let success = false;

    if (modalMode === "new") {
      success = await createRecord(data);
    } else if (modalMode === "edit" && selectedRecord) {
      success = await updateRecord(selectedRecord.id, data);
    } else if (modalMode === "payment" && selectedRecord) {
      success = await recordPayment(selectedRecord.id, data.amount);
    }

    if (success) setModalOpen(false);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Cash Advance
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track employee loans and payment progress.
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="h-4 w-4" />
          New Cash Advance
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Loans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.activeLoans}</p>
            <p className="text-xs text-muted-foreground">
              of {summary.totalLoans} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Loaned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {formatCurrency(summary.totalAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(summary.totalPaid)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {formatCurrency(summary.totalBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by employee..."
            className="pl-9 pr-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex rounded-lg border bg-card p-1 w-fit">
          {["all", "active", "completed"].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                statusFilter === f
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-8 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Wallet className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-muted-foreground">
            No cash advances found
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {records.length === 0
              ? "Create a new cash advance to get started."
              : "Try adjusting your search or filters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRecords.map((record) => (
            <CashAdvanceCard
              key={record.id}
              record={record}
              onEdit={handleEdit}
              onPayment={handlePayment}
              onComplete={handleComplete}
              onDelete={deleteRecord}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <CashAdvanceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        record={selectedRecord}
        employees={employees}
        onSubmit={handleModalSubmit}
        loading={mutationLoading}
      />
    </div>
  );
}
