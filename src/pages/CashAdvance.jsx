import { useState, useMemo } from "react";
import { useCashAdvances } from "@/hooks/useCashAdvances";
import { formatCurrency } from "@/lib/payrollUtils";
import CashAdvanceCard from "@/components/cashadvance/CashAdvanceCard";
import CashAdvanceModal from "@/components/cashadvance/CashAdvanceModal";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, ProgressBar } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCardsSkeleton } from "@/components/ui/page-skeletons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, Plus, Wallet, Loader2, HandCoins, TrendingUp, AlertCircle } from "lucide-react";

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
    <div className="space-y-6">
      <PageHeader
        title="Cash Advance"
        description="Track employee loans and payment progress."
        actions={
          <Button onClick={handleNew}>
            <Plus />
            New cash advance
          </Button>
        }
      />

      {/* Summary Cards */}
      {loading ? (
        <StatCardsSkeleton />
      ) : (
      <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active loans" value={summary.activeLoans} icon={Wallet} tone="primary" hint={`of ${summary.totalLoans} total`} />
        <StatCard label="Total loaned" value={formatCurrency(summary.totalAmount)} icon={HandCoins} />
        <StatCard
          label="Total collected"
          value={formatCurrency(summary.totalPaid)}
          icon={TrendingUp}
          tone="success"
          hint={summary.totalAmount ? `${Math.round((summary.totalPaid / summary.totalAmount) * 100)}% repaid` : undefined}
        >
          <ProgressBar value={summary.totalAmount ? (summary.totalPaid / summary.totalAmount) * 100 : 0} />
        </StatCard>
        <StatCard label="Outstanding" value={formatCurrency(summary.totalBalance)} icon={AlertCircle} tone="danger" />
      </div>
      )}

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

        <div className="flex w-fit rounded-lg border bg-card p-0.5 shadow-sm">
          {["all", "active", "completed"].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors ${
                statusFilter === f
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        <Card>
          <EmptyState
            icon={Wallet}
            title="No cash advances found"
            hint={
              records.length === 0
                ? "Create a new cash advance to get started."
                : "Try adjusting your search or filters."
            }
            action={
              records.length === 0 && (
                <Button variant="outline" onClick={handleNew}>
                  <Plus />
                  New cash advance
                </Button>
              )
            }
            className="py-14"
          />
        </Card>
      ) : (
        <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
