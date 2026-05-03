import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { usePayroll } from "@/hooks/usePayroll";
import { computePayroll } from "@/lib/payrollUtils";
import { getInitials } from "@/lib/utils";
import StatCards from "@/components/dashboard/StatCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRight, Users, FileText } from "lucide-react";

export default function Dashboard() {
  const { employees, payrollPeriod, payrollSent, loading, error } = usePayroll();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let totalNetPayout = 0;

    employees.forEach((emp) => {
      if (emp.status === "Approved") approved++;
      else pending++;
      const computed = computePayroll(emp.payroll);
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
  }, [employees]);

  const payrollStatus = useMemo(() => {
    if (payrollSent) return { label: "Sent", color: "text-green-600 bg-green-50" };
    if (stats.pending > 0) return { label: "In Progress", color: "text-yellow-600 bg-yellow-50" };
    return { label: "Ready to Send", color: "text-blue-600 bg-blue-50" };
  }, [payrollSent, stats.pending]);

  const recentActivity = useMemo(() => {
    const allLogs = employees.flatMap((emp) =>
      emp.auditLog.map((log) => ({
        ...log,
        employeeName: emp.name,
        employeeId: emp.id,
      }))
    );
    return allLogs
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
  }, [employees]);

  if (loading) return <p className="p-6">Loading...</p>;
  if (error) return <p className="p-6 text-red-500">Error: {error}</p>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your payroll for{" "}
          <span className="font-medium text-foreground">{payrollPeriod}</span>
          <span
            className={`ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${payrollStatus.color}`}
          >
            {payrollStatus.label}
          </span>
        </p>
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
              onClick={() => navigate("/payroll")}
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Go to Payroll Run
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