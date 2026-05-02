import { useState, useMemo } from "react";
import { usePayroll } from "@/hooks/usePayroll";
import { useAuth } from "@/context/AuthContext";
import { computePayroll, computeMonthlySummary } from "@/lib/payrollUtils";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import PayrollTable from "@/components/payroll/PayrollTable";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Send, X, Plus } from "lucide-react";

const PERIODS = [
  { key: "period1", label: "Period 1", sub: "Mid-Month" },
  { key: "period2", label: "Period 2", sub: "End-of-Month" },
  { key: "monthly", label: "Monthly", sub: "Summary" },
];

export default function PayrollRun() {
  const { isAdmin } = useRolePermissions();
  const {
    employees,
    payrollPeriod,
    payrollSent_period1,
    payrollSent_period2,
    currentPeriod,
    selectedMonth,
    availableMonths,
    switchPeriod,
    switchMonth,
    sendPayroll,
    loading,
    error,
    createPayrollMonth,
  } = usePayroll();
  
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showBasic, setShowBasic] = useState(true);
  const [showEarnings, setShowEarnings] = useState(true);
  const [showDeductions, setShowDeductions] = useState(true);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newMonth, setNewMonth] = useState("");
  const [creating, setCreating] = useState(false);

  // Period-specific dynamic keys
  const isMonthly = currentPeriod === "monthly";
  const statusKey = isMonthly ? null : `status_${currentPeriod}`;
  const payrollKey = isMonthly ? null : `payroll_${currentPeriod}`;
  
  // Handles both V1 explicit variables and V2 unified database variables
  const isPayrollSent = isMonthly
    ? false
    : currentPeriod === "period1" ? payrollSent_period1 : payrollSent_period2;

  const filteredEmployees = useMemo(() => {
    let data = [...employees];
    const term = search.trim().toLowerCase();
    
    if (term) {
      data = data.filter((emp) => emp.name.toLowerCase().includes(term));
    }
    
    if (!isMonthly && filter !== "all") {
      // Fallback allows for nested period data OR flattened Supabase data
      data = data.filter((emp) => {
        const empStatus = emp[statusKey] || emp.status;
        return empStatus === (filter === "approved" ? "Approved" : "Pending");
      });
    }
    return data;
  }, [employees, search, filter, isMonthly, statusKey]);

  const approvedCount = useMemo(() => {
    if (isMonthly) return 0;
    return employees.filter((e) => (e[statusKey] || e.status) === "Approved").length;
  }, [employees, isMonthly, statusKey]);

  const totalCount = employees.length;
  const progress = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  const allApproved = approvedCount === totalCount && totalCount > 0;
  const canSend = !isMonthly && allApproved && !isPayrollSent;

  const handleSend = () => {
    // Passing both user and period just in case the Supabase hook requires it
    sendPayroll(user.name, currentPeriod);
    toast.success(`${PERIODS.find((p) => p.key === currentPeriod)?.label} payroll sent successfully!`);
    setSendDialogOpen(false);
  };

  const handleCreatePayroll = async () => {
    if (!newMonth) return;
    setCreating(true);
    const result = await createPayrollMonth(newMonth);
    setCreating(false);
    if (result.success) {
      toast.success(`Payroll for ${new Date(newMonth + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })} created successfully!`);
      setCreateDialogOpen(false);
      setNewMonth("");
      // Reload the page to fetch new data
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to create payroll.");
    }
  };

  const sendDisabledReason = isMonthly
    ? "Send is only available for individual periods"
    : isPayrollSent
    ? "Payroll has already been sent for this period"
    : !allApproved
    ? "All records must be approved before sending"
    : null;

  const totals = useMemo(() => {
    const t = {
      daily_pay: 0, work_days: 0, total_basic_pay: 0, holiday_pay: 0,
      snwh_pay: 0, wellness_allowance: 0, communication_allowance: 0,
      birthday_allowance: 0, commission: 0, allowance: 0, bonuses: 0,
      thirteenth_month_pay: 0, total_earnings: 0, cash_advance: 0,
      sss: 0, philhealth: 0, pagibig: 0, hmo: 0, others: 0,
      total_deductions: 0, net_pay: 0,
    };

    filteredEmployees.forEach((emp) => {
      let p, c;
      if (isMonthly) {
        c = computeMonthlySummary(emp);
        p = c;
      } else {
        // Fallback to emp.payroll if the Supabase object is flattened
        p = emp[payrollKey] || emp.payroll;
        if (!p) return; // Prevent crashes if data is missing during load
        c = computePayroll(p);
      }

      t.daily_pay += p.daily_pay || 0;
      t.work_days += p.work_days || 0;
      t.total_basic_pay += c.total_basic_pay || 0;
      t.holiday_pay += p.holiday_pay || 0;
      t.snwh_pay += p.snwh_pay || 0;
      t.wellness_allowance += p.wellness_allowance || 0;
      t.communication_allowance += p.communication_allowance || 0;
      t.birthday_allowance += p.birthday_allowance || 0;
      t.commission += p.commission || 0;
      t.allowance += p.allowance || 0;
      t.bonuses += p.bonuses || 0;
      t.thirteenth_month_pay += p.thirteenth_month_pay || 0;
      t.total_earnings += c.total_earnings || 0;
      t.cash_advance += p.cash_advance || 0;
      t.sss += p.sss || 0;
      t.philhealth += p.philhealth || 0;
      t.pagibig += p.pagibig || 0;
      t.hmo += p.hmo || 0;
      t.others += p.others || 0;
      t.total_deductions += c.total_deductions || 0;
      t.net_pay += c.net_pay || 0;
    });
    return t;
  }, [filteredEmployees, isMonthly, payrollKey]);

  // Handle actual database errors immediately
  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          <p className="font-medium">Error loading payroll data</p>
          <p className="text-sm">{error.message || error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left — Title and progress */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Payroll Summary — {payrollPeriod}
          </h1>
          {!isMonthly && (
            <div className="mt-2 flex items-center gap-3">
              <div className="h-2 w-48 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground">
                {approvedCount} of {totalCount} approved ({progress}%)
              </span>
            </div>
          )}
        </div>

        {/* Right — Action buttons */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <AlertDialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button disabled={!canSend} className="gap-2">
                        <Send className="h-4 w-4" />
                        Send Payroll
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Send Payroll?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Send {PERIODS.find((p) => p.key === currentPeriod)?.label} payroll to all {totalCount} employees? This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSend}>
                          Confirm Send
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </span>
              </TooltipTrigger>
              {sendDisabledReason && (
                <TooltipContent>
                  <p>{sendDisabledReason}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {isAdmin && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New Payroll Month
            </Button>
          )}
        </div>
      </div>

      {/* Create Payroll Month Dialog */}
      {isAdmin && (
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Create New Payroll Month</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                This will create Period 1 (1st–15th) and Period 2 (16th–end) for all employees with zero values ready to be edited.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Month</label>
                <input
                  type="month"
                  value={newMonth}
                  onChange={(e) => setNewMonth(e.target.value)}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  setNewMonth("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePayroll}
                disabled={!newMonth || creating}
                className="gap-2"
              >
                {creating ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Month Selector — Admin only */}
      {isAdmin && availableMonths.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">
            Month:
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => switchMonth(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {availableMonths.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Period Selector */}
      <div className="flex rounded-lg border bg-card p-1 w-fit">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => switchPeriod && switchPeriod(p.key)}
            className={`relative rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              currentPeriod === p.key
                ? "bg-primary text-white"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <span>{p.label}</span>
            <span className={`ml-1 text-xs ${currentPeriod === p.key ? "text-white/80" : ""}`}>
              {p.sub}
            </span>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name..."
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
        <div className="flex flex-wrap items-center gap-2">
          {!isMonthly && (
            <div className="flex rounded-lg border bg-card p-1">
              {["all", "pending", "approved"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                    filter === f
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={showBasic}
                onChange={(e) => setShowBasic(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Basic
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={showEarnings}
                onChange={(e) => setShowEarnings(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Earnings
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={showDeductions}
                onChange={(e) => setShowDeductions(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Deductions
            </label>
          </div>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                No employees found
              </p>
              <p className="text-xs text-muted-foreground">
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <PayrollTable
              employees={filteredEmployees}
              showBasic={showBasic}
              showEarnings={showEarnings}
              showDeductions={showDeductions}
              totals={totals}
              isMonthly={isMonthly}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}