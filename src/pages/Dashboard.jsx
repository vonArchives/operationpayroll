import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { usePayroll } from "@/hooks/usePayroll";
import { computePayroll } from "@/lib/payrollUtils";
import { getInitials } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, ProgressBar } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeaderSkeleton, StatCardsSkeleton } from "@/components/ui/page-skeletons";
import PayoutTrendChart, { PayoutSparkline } from "@/components/dashboard/PayoutTrendChart";
import PayBreakdownChart from "@/components/dashboard/PayBreakdownChart";
import { formatPHP } from "@/components/dashboard/chartUtils";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  History,
  Users,
  Wallet,
  PartyPopper,
} from "lucide-react";

const ACTION_VARIANT = {
  Approved: "success",
  Unapproved: "warning",
  "Payroll Sent": "info",
  "Payroll Edited": "neutral",
};

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <PageHeaderSkeleton actions={2} />
      <StatCardsSkeleton />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-56" />
          </CardHeader>
          <CardContent>
            <div className="flex h-[260px] items-end gap-3 border-b border-l border-border/60 px-2 pb-2">
              {[40, 55, 48, 70, 62, 80].map((h, i) => (
                <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%` }} />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-24" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="mx-auto h-40 w-40 rounded-full" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { employees, payrollPeriod, selectedMonth, monthlyTrend = [], loading, error } = usePayroll();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    let approved = 0;
    let pending = 0;
    employees.forEach((emp) => {
      if (emp.status === "Approved") approved++;
      else pending++;
    });
    const total = employees.length;
    return { total, approved, pending, progress: total ? Math.round((approved / total) * 100) : 0 };
  }, [employees]);

  const currentMonth = useMemo(
    () => monthlyTrend.find((m) => m.key === selectedMonth) || monthlyTrend[monthlyTrend.length - 1],
    [monthlyTrend, selectedMonth]
  );

  const monthChange = useMemo(() => {
    const idx = monthlyTrend.findIndex((m) => m.key === currentMonth?.key);
    const prev = idx > 0 ? monthlyTrend[idx - 1] : null;
    if (!prev || !prev.netPay) return null;
    return ((currentMonth.netPay - prev.netPay) / prev.netPay) * 100;
  }, [monthlyTrend, currentMonth]);

  const pendingEmployees = useMemo(
    () =>
      employees
        .filter((e) => e.status !== "Approved")
        .map((e) => ({ ...e, net: computePayroll(e.payroll).net_pay }))
        .slice(0, 5),
    [employees]
  );

  const recentActivity = useMemo(() => {
    const allLogs = employees.flatMap((emp) =>
      emp.auditLog.map((log) => ({ ...log, employeeName: emp.name, employeeId: emp.id }))
    );
    return allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 8);
  }, [employees]);

  if (loading) return <DashboardSkeleton />;
  if (error) {
    return (
      <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger">
        <p className="font-medium">Couldn&apos;t load the dashboard</p>
        <p>{String(error.message || error)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Payroll overview for ${payrollPeriod}`}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/employees")}>
              <Users />
              Employees
            </Button>
            <Button onClick={() => navigate("/payroll")}>
              <FileText />
              Go to payroll
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          hero
          label="Net payout this month"
          value={formatPHP(currentMonth?.netPay)}
          icon={Wallet}
          hint={
            monthChange === null
              ? `Mid-month ${formatPHP(currentMonth?.period1Net, { maximumFractionDigits: 0 })} · End ${formatPHP(currentMonth?.period2Net, { maximumFractionDigits: 0 })}`
              : `${monthChange >= 0 ? "▲" : "▼"} ${Math.abs(monthChange).toFixed(1)}% vs last month`
          }
          className="sm:col-span-2 xl:col-span-1"
        >
          <PayoutSparkline data={monthlyTrend} />
        </StatCard>
        <StatCard label="Employees" value={stats.total} icon={Users} tone="primary" hint="On this month's payroll" />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} tone="success" hint={`${stats.progress}% of mid-month period`}>
          <ProgressBar value={stats.progress} />
        </StatCard>
        <StatCard label="Pending review" value={stats.pending} icon={Clock} tone="warning" hint="Awaiting approval" />
      </div>

      {/* Charts */}
      <div className="stagger grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle>Net payout trend</CardTitle>
              <CardDescription>Total net pay per month, both periods combined</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <PayoutTrendChart data={monthlyTrend} />
            {monthlyTrend.length < 2 && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                The trend line appears once there are 2 or more payroll months.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pay breakdown</CardTitle>
            <CardDescription>{payrollPeriod}</CardDescription>
          </CardHeader>
          <CardContent>
            <PayBreakdownChart month={currentMonth} />
          </CardContent>
        </Card>
      </div>

      {/* Lists */}
      <div className="stagger grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest changes to this month&apos;s payroll</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <EmptyState icon={History} title="No activity yet" hint="Edits, approvals and sends will show up here." />
            ) : (
              <ol className="stagger relative space-y-4 border-l border-border pl-5">
                {recentActivity.map((log) => (
                  <li key={log.id} className="relative">
                    <span className="absolute -left-[27px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border bg-card text-[9px] font-semibold text-muted-foreground">
                      {getInitials(log.performedBy || log.employeeName)}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{log.performedBy || "System"}</span>
                      <Badge variant={ACTION_VARIANT[log.action] || "neutral"}>{log.action}</Badge>
                      {log.employeeName && <span className="text-muted-foreground">on {log.employeeName}</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle>Pending approvals</CardTitle>
              <CardDescription>Mid-month period</CardDescription>
            </div>
            {stats.pending > 0 && (
              <Link to="/payroll" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Review all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {pendingEmployees.length === 0 ? (
              <EmptyState icon={PartyPopper} title="All caught up" hint="Every employee is approved for this period." />
            ) : (
              <ul className="stagger divide-y">
                {pendingEmployees.map((emp) => (
                  <li key={emp.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                      {getInitials(emp.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{emp.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{emp.position || emp.role}</p>
                    </div>
                    <span className="text-sm font-medium tabular-nums">{formatPHP(emp.net)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
