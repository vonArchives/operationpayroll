import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { usePayroll } from "@/hooks/usePayroll";
import { computePayroll, getPayrollPeriodLabel } from "@/lib/payrollUtils";
import StatCards from "@/components/dashboard/StatCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRight, Users, FileText } from "lucide-react";

export default function Dashboard() {
  const { employees, payrollSent_period1, payrollSent_period2, switchPeriod } = usePayroll();
  const navigate = useNavigate();
  const [activeDashPeriod, setActiveDashPeriod] = useState("period1");

  const statusKey = `status_${activeDashPeriod}`;
  const payrollKey = `payroll_${activeDashPeriod}`;
  const payrollSent = activeDashPeriod === "period2" ? payrollSent_period2 : payrollSent_period1;

  const stats = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let totalNetPayout = 0;

    employees.forEach((emp) => {
      if (emp[statusKey] === "Approved") approved++;
      else pending++;
      const computed = computePayroll(emp[payrollKey]);
      totalNetPayout += computed.net_pay;
    });

    return {
      totalEmployees: employees.length,
      approved,
      pending,
      totalNetPayout: totalNetPayout.toLocaleString("en-PH", {
        style: "currency",
        currency: "PHP",
      }),
    };
  }, [employees, statusKey, payrollKey]);

  const payrollStatus = useMemo(() => {
    if (payrollSent) return { label: "Sent", color: "text-green-600 bg-green-50" };
    if (stats.pending > 0) return { label: "In Progress", color: "text-yellow-600 bg-yellow-50" };
    return { label: "Ready to Send", color: "text-blue-600 bg-blue-50" };
  }, [payrollSent, stats.pending]);

  const recentActivity = useMemo(() => {
    const auditLogKey = `auditLog_${activeDashPeriod}`;
    const allLogs = employees.flatMap((emp) =>
      emp[auditLogKey].map((log) => ({
        ...log,
        employeeName: emp.name,
        employeeId: emp.id,
      }))
    );
    return allLogs
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
  }, [employees, activeDashPeriod]);

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    return parts.map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleNavigateToPayroll = () => {
    switchPeriod(activeDashPeriod);
    navigate("/payroll");
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of <span className="font-medium text-foreground">{getPayrollPeriodLabel()}</span>
            <span
              className={`ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${payrollStatus.color}`}
            >
              {payrollStatus.label}
            </span>
          </p>
        </div>
        <div className="flex rounded-lg border bg-card p-1 w-fit">
          {[
            { key: "period1", label: "Period 1", sub: "Mid-Month" },
            { key: "period2", label: "Period 2", sub: "End-of-Month" },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setActiveDashPeriod(p.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeDashPeriod === p.key
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {p.label}
              <span className={`ml-1 text-xs ${activeDashPeriod === p.key ? "text-white/80" : ""}`}>
                {p.sub}
              </span>
            </button>
          ))}
        </div>
      </div>

      <StatCards stats={stats} />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              recentActivity.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(log.performedBy || log.employeeName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">
                        {log.performedBy || "System"}
                      </span>{" "}
                      — {log.action}{" "}
                      {log.employeeName && (
                        <span className="text-muted-foreground">
                          on {log.employeeName}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.timestamp), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={handleNavigateToPayroll}
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Go to Payroll Summary
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate("/employees")}
            >
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                View Employees
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
