import { useState, useMemo, useEffect } from "react";
import { usePayroll } from "@/hooks/usePayroll";
import { useAuth } from "@/context/AuthContext";
import { computePayroll, computeMonthlySummary } from "@/lib/payrollUtils";
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
import { toast } from "sonner";
import { Search, Send, X } from "lucide-react";

const PERIODS = [
  { key: "period1", label: "Period 1", sub: "Mid-Month" },
  { key: "period2", label: "Period 2", sub: "End-of-Month" },
  { key: "monthly", label: "Monthly", sub: "Summary" },
];

export default function PayrollRun() {
  const {
    employees,
    payrollPeriod,
    payrollSent_period1,
    payrollSent_period2,
    currentPeriod,
    switchPeriod,
    sendPayroll,
  } = usePayroll();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showBasic, setShowBasic] = useState(true);
  const [showEarnings, setShowEarnings] = useState(true);
  const [showDeductions, setShowDeductions] = useState(true);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, [currentPeriod]);

  const isMonthly = currentPeriod === "monthly";
  const statusKey = isMonthly ? null : `status_${currentPeriod}`;
  const payrollKey = isMonthly ? null : `payroll_${currentPeriod}`;
  const payrollSent = isMonthly ? false : currentPeriod === "period1" ? payrollSent_period1 : payrollSent_period2;

  const filteredEmployees = useMemo(() => {
    let data = [...employees];
    const term = search.trim().toLowerCase();
    if (term) {
      data = data.filter((emp) => emp.name.toLowerCase().includes(term));
    }
    if (!isMonthly && filter !== "all") {
      data = data.filter((emp) => emp[statusKey] === (filter === "approved" ? "Approved" : "Pending"));
    }
    return data;
  }, [employees, search, filter, isMonthly, statusKey]);

  const approvedCount = useMemo(() => {
    if (isMonthly) return 0;
    return employees.filter((e) => e[statusKey] === "Approved").length;
  }, [employees, isMonthly, statusKey]);

  const totalCount = employees.length;
  const progress = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  const allApproved = approvedCount === totalCount && totalCount > 0;
  const canSend = !isMonthly && allApproved && !payrollSent;

  const handleSend = () => {
    sendPayroll(user.name, currentPeriod);
    toast.success(`${PERIODS.find((p) => p.key === currentPeriod)?.label} payroll sent successfully!`);
    setSendDialogOpen(false);
  };

  const sendDisabledReason = isMonthly
    ? "Send is only available for individual periods"
    : payrollSent
    ? "Payroll has already been sent for this period"
    : !allApproved
    ? "All records must be approved before sending"
    : null;

  const totals = useMemo(() => {
    const t = {
      daily_pay: 0,
      work_days: 0,
      total_basic_pay: 0,
      holiday_pay: 0,
      snwh_pay: 0,
      wellness_allowance: 0,
      communication_allowance: 0,
      birthday_allowance: 0,
      commission: 0,
      allowance: 0,
      bonuses: 0,
      thirteenth_month_pay: 0,
      total_earnings: 0,
      cash_advance: 0,
      sss: 0,
      philhealth: 0,
      pagibig: 0,
      hmo: 0,
      others: 0,
      total_deductions: 0,
      net_pay: 0,
    };

    filteredEmployees.forEach((emp) => {
      let p, c;
      if (isMonthly) {
        c = computeMonthlySummary(emp);
        p = c;
      } else {
        p = emp[payrollKey];
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
      </div>

      {/* Period Selector */}
      <div className="flex rounded-lg border bg-card p-1 w-fit">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              switchPeriod(p.key);
              setLoading(true);
            }}
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
