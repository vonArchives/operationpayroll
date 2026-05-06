import { useState, useMemo } from "react";
import { usePayroll } from "@/hooks/usePayroll";
import { computePayroll, computeMonthlySummary } from "@/lib/payrollUtils";
import PayrollTable from "@/components/payroll/PayrollTable";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, Wallet } from "lucide-react";

const PERIODS = [
  { key: "period1", label: "Period 1", sub: "Mid-Month" },
  { key: "period2", label: "Period 2", sub: "End-of-Month" },
  { key: "monthly", label: "Monthly", sub: "Summary" },
];

export default function CashAdvance() {
  const { employees, payrollPeriod, currentPeriod, switchPeriod, loading, error } = usePayroll();
  const [search, setSearch] = useState("");
  const [showBasic, setShowBasic] = useState(true);
  const [showEarnings, setShowEarnings] = useState(true);
  const [showDeductions, setShowDeductions] = useState(true);

  const isMonthly = currentPeriod === "monthly";
  const payrollKey = isMonthly ? null : `payroll_${currentPeriod}`;

  const cashAdvanceEmployees = useMemo(() => {
    let data = employees.filter((emp) => {
      if (isMonthly) {
        const p1 = emp.payroll_period1;
        const p2 = emp.payroll_period2;
        const hasCa = (p1 && (p1.cash_advance || 0) > 0) || (p2 && (p2.cash_advance || 0) > 0);
        return hasCa;
      }
      const payroll = emp[payrollKey] || emp.payroll;
      return payroll && (payroll.cash_advance || 0) > 0;
    });

    const term = search.trim().toLowerCase();
    if (term) {
      data = data.filter((emp) => emp.name.toLowerCase().includes(term));
    }
    return data;
  }, [employees, search, isMonthly, payrollKey]);

  const totals = useMemo(() => {
    const t = {
      daily_pay: 0, work_days: 0, total_basic_pay: 0, holiday_days: 0, holiday_pay: 0,
      snwh_days: 0, snwh_pay: 0, wellness_allowance: 0, communication_allowance: 0,
      birthday_allowance: 0, commission: 0, allowance: 0, bonuses: 0,
      thirteenth_month_pay: 0, total_earnings: 0, cash_advance: 0,
      sss: 0, philhealth: 0, pagibig: 0, hmo: 0, others: 0,
      total_deductions: 0, net_pay: 0,
    };

    cashAdvanceEmployees.forEach((emp) => {
      let p, c;
      if (isMonthly) {
        c = computeMonthlySummary(emp);
        p = c;
      } else {
        p = emp[payrollKey] || emp.payroll;
        if (!p) return;
        c = computePayroll(p);
      }

      t.daily_pay += p.daily_pay || 0;
      t.work_days += p.work_days || 0;
      t.total_basic_pay += c.total_basic_pay || 0;
      t.holiday_days += p.holiday_days || 0;
      t.holiday_pay += p.holiday_pay || 0;
      t.snwh_days += p.snwh_days || 0;
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
  }, [cashAdvanceEmployees, isMonthly, payrollKey]);

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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Cash Advance — {payrollPeriod}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View employees with cash advance deductions.
          </p>
        </div>
      </div>

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Employees with Cash Advance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{cashAdvanceEmployees.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cash Advance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {Number(totals?.cash_advance || 0).toLocaleString("en-PH", {
                style: "currency",
                currency: "PHP",
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Net Pay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-700">
              {Number(totals?.net_pay || 0).toLocaleString("en-PH", {
                style: "currency",
                currency: "PHP",
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : cashAdvanceEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wallet className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                No employees with cash advances
              </p>
              <p className="text-xs text-muted-foreground">
                Cash advance records will appear here when an employee has a cash advance deduction.
              </p>
            </div>
          ) : (
            <PayrollTable
              employees={cashAdvanceEmployees}
              showBasic={showBasic}
              showEarnings={showEarnings}
              showDeductions={showDeductions}
              totals={totals}
              isMonthly={isMonthly}
              readOnly
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
