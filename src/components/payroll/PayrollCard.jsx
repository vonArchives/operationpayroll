import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Pencil,
  CheckCircle,
  XCircle,
  ClipboardList,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatCurrency, computePayroll, computeMonthlySummary } from "@/lib/payrollUtils";
import { usePayroll } from "@/hooks/usePayroll";

export default function PayrollCard({
  employee,
  showBasic,
  showEarnings,
  showDeductions,
  isMonthly,
  perms,
  onEdit,
  onAudit,
}) {
  const { approvePayroll, unapprovePayroll, payrollSent_period1, payrollSent_period2, currentPeriod, mutationLoading } = usePayroll();
  const [expanded, setExpanded] = useState(false);

  const payrollSent = currentPeriod === "period2" ? payrollSent_period2 : payrollSent_period1;
  const payrollKey = isMonthly ? null : `payroll_${currentPeriod}`;
  const statusKey = isMonthly ? null : `status_${currentPeriod}`;

  let payroll, computed, status;
  if (isMonthly) {
    computed = computeMonthlySummary(employee) || {};
    payroll = computed;
    status = null;
  } else {
    const empPayroll = employee[payrollKey] || employee.payroll || {};
    payroll = empPayroll;
    computed = Object.keys(empPayroll).length > 0 ? computePayroll(empPayroll) : {};
    status = employee[statusKey] || employee.status || "Pending";
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Header row: name + status badge */}
      <div className="flex items-center justify-between">
        <span className="font-medium">{employee.name}</span>
        {isMonthly ? (
          <Badge variant="secondary">Combined</Badge>
        ) : (
          <Badge variant={status === "Approved" ? "success" : "warning"}>
            {status}
          </Badge>
        )}
      </div>

      {/* Net Pay hero */}
      {perms.canViewFinalPay && (
        <div className="text-right">
          <span className="text-2xl font-bold text-purple-700">
            {formatCurrency(computed?.net_pay)}
          </span>
        </div>
      )}

      {/* Summary row: 3 compact stats */}
      <div className="grid grid-cols-3 gap-2 text-sm">
        {showBasic && (
          <div>
            <span className="text-xs text-muted-foreground">Basic</span>
            <p className="font-medium">{formatCurrency(computed?.total_basic_pay)}</p>
          </div>
        )}
        {showEarnings && (
          <div>
            <span className="text-xs text-muted-foreground">Earnings</span>
            <p className="font-medium">{formatCurrency(computed?.total_earnings)}</p>
          </div>
        )}
        {showDeductions && (
          <div>
            <span className="text-xs text-muted-foreground">Deductions</span>
            <p className="font-medium">{formatCurrency(computed?.total_deductions)}</p>
          </div>
        )}
      </div>

      {/* Expand/collapse button */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="space-y-3 border-t pt-3">
          {/* Basic Pay section */}
          {showBasic && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">
                Basic Pay
              </p>
              <div className="grid grid-cols-2 gap-2">
                {perms.canViewMonthlyPay && (
                  <div>
                    <span className="text-xs text-muted-foreground">Monthly Pay</span>
                    <p className="text-sm font-medium">{formatCurrency(payroll?.monthly_pay)}</p>
                  </div>
                )}
                {perms.canViewDailyRate && (
                  <div>
                    <span className="text-xs text-muted-foreground">Daily Rate</span>
                    <p className="text-sm font-medium">{formatCurrency(payroll?.daily_pay)}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-muted-foreground">Work Days</span>
                  <p className="text-sm font-medium">{payroll?.work_days || 0}</p>
                </div>
                {perms.canViewTotalBasicPay && (
                  <div>
                    <span className="text-xs text-muted-foreground">Total Basic Pay</span>
                    <p className="text-sm font-medium">{formatCurrency(computed?.total_basic_pay)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Earnings section */}
          {showEarnings && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-green-700 mb-2">
                Earnings
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-muted-foreground">Holiday Days</span>
                  <p className="text-sm font-medium">{payroll?.holiday_days || 0}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Holiday Pay</span>
                  <p className="text-sm font-medium">{formatCurrency(payroll?.holiday_pay)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">SNWH Days</span>
                  <p className="text-sm font-medium">{payroll?.snwh_days || 0}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">SNWH Pay</span>
                  <p className="text-sm font-medium">{formatCurrency(payroll?.snwh_pay)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Wellness</span>
                  <p className="text-sm font-medium">{formatCurrency(payroll?.wellness_allowance)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Communication</span>
                  <p className="text-sm font-medium">{formatCurrency(payroll?.communication_allowance)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Birthday</span>
                  <p className="text-sm font-medium">{formatCurrency(payroll?.birthday_allowance)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Commission</span>
                  <p className="text-sm font-medium">{formatCurrency(payroll?.commission)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Allowance</span>
                  <p className="text-sm font-medium">{formatCurrency(payroll?.allowance)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Bonuses</span>
                  <p className="text-sm font-medium">{formatCurrency(payroll?.bonuses)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">13th Month</span>
                  <p className="text-sm font-medium">{formatCurrency(payroll?.thirteenth_month_pay)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Total Earnings</span>
                  <p className="text-sm font-medium">{formatCurrency(computed?.total_earnings)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Deductions section */}
          {showDeductions && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-red-700 mb-2">
                Deductions
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-muted-foreground">Cash Advance</span>
                  <p className="text-sm font-medium">{formatCurrency(payroll?.cash_advance)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">SSS</span>
                  <p className="text-sm font-medium">{formatCurrency(payroll?.sss)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">PhilHealth</span>
                  <p className="text-sm font-medium">{formatCurrency(payroll?.philhealth)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Pag-IBIG</span>
                  <p className="text-sm font-medium">{formatCurrency(payroll?.pagibig)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">HMO</span>
                  <p className="text-sm font-medium">{formatCurrency(payroll?.hmo)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Others</span>
                  <p className="text-sm font-medium">{formatCurrency(payroll?.others)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Total Deductions</span>
                  <p className="text-sm font-medium">{formatCurrency(computed?.total_deductions)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions row (only if !isMonthly) */}
      {!isMonthly && (
        <div className="flex items-center justify-end gap-1 border-t pt-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-border bg-card hover:bg-muted"
                    disabled={payrollSent || mutationLoading}
                    onClick={() => onEdit(employee)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              {(payrollSent || mutationLoading) && (
                <TooltipContent>
                  {payrollSent ? "Edit disabled after payroll sent" : "Saving..."}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {perms.canApprovePayroll && (
            status === "Pending" ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                        disabled={payrollSent || mutationLoading}
                        onClick={() => approvePayroll(employee.id, perms.user?.name, perms.user?.emp_id, currentPeriod)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {(payrollSent || mutationLoading) && (
                    <TooltipContent>
                      {payrollSent ? "Approve disabled after payroll sent" : "Saving..."}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                        disabled={payrollSent || mutationLoading}
                        onClick={() => unapprovePayroll(employee.id, perms.user?.name, currentPeriod)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {(payrollSent || mutationLoading) && (
                    <TooltipContent>
                      {payrollSent ? "Unapprove disabled after payroll sent" : "Saving..."}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )
          )}

          {perms.canViewAuditLog && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-border bg-card hover:bg-muted"
              onClick={() => onAudit(employee)}
            >
              <ClipboardList className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
