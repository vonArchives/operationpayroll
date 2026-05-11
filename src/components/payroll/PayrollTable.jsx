import { useState } from "react";
import { usePayroll } from "@/hooks/usePayroll";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { computePayroll, computeMonthlySummary, formatCurrency } from "@/lib/payrollUtils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import EditModal from "./EditModal";
import AuditLogSheet from "./AuditLogSheet";
import {
  Pencil,
  CheckCircle,
  XCircle,
  ClipboardList,
} from "lucide-react";

export default function PayrollTable({
  employees,
  showBasic,
  showEarnings,
  showDeductions,
  totals,
  isMonthly,
  readOnly = false,
}) {
  const { approvePayroll, unapprovePayroll, payrollSent_period1, payrollSent_period2, currentPeriod, mutationLoading } = usePayroll();
  const perms = useRolePermissions();
  const [editEmployee, setEditEmployee] = useState(null);
  const [auditEmployee, setAuditEmployee] = useState(null);

  const payrollSent = currentPeriod === "period2" ? payrollSent_period2 : payrollSent_period1;
  const payrollKey = isMonthly ? null : `payroll_${currentPeriod}`;
  const statusKey = isMonthly ? null : `status_${currentPeriod}`;
  const auditLogKey = isMonthly ? null : `auditLog_${currentPeriod}`;

  const getEmployeeData = (emp) => {
    if (isMonthly) {
      return computeMonthlySummary(emp) || {};
    }
    
    // FIXED: Added fallback to emp.payroll and default empty object
    const payroll = emp[payrollKey] || emp.payroll || {}; 
    
    // FIXED: Only compute if payroll has data to prevent compute errors
    const computed = Object.keys(payroll).length > 0 ? computePayroll(payroll) : {};

    return { 
      payroll, 
      computed, 
      status: emp[statusKey] || emp.status || "Pending", 
      auditLog: emp[auditLogKey] || emp.auditLog || [] 
    };
  };

  const activeEmployees = employees.filter((emp) => {
    if (isMonthly) {
      // In Monthly view, show them if they have data in either period
      return emp.payroll_period1 || emp.payroll_period2;
    }
    // In Period view, strictly require data for this specific period
    return emp[payrollKey] !== undefined && emp[payrollKey] !== null;
  });

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          {/* Grouped subheaders */}
          <TableRow className="border-b-0">
            <TableHead
              rowSpan={2}
              className="sticky left-0 z-20 bg-card align-bottom font-bold text-foreground"
            >
              Employee
            </TableHead>
            {showBasic && (
              <TableHead
                colSpan={perms.canViewDailyRate ? 4 : 1}
                className="bg-blue-50 text-center text-xs font-bold uppercase tracking-wider text-blue-700"
              >
                Basic Pay
              </TableHead>
            )}
            {showEarnings && (
              <TableHead
                colSpan={12}
                className="bg-green-50 text-center text-xs font-bold uppercase tracking-wider text-green-700"
              >
                Earnings
              </TableHead>
            )}
            {showDeductions && (
              <TableHead
                colSpan={7}
                className="bg-red-50 text-center text-xs font-bold uppercase tracking-wider text-red-700"
              >
                Deductions
              </TableHead>
            )}
            {perms.canViewFinalPay && (
              <TableHead
                rowSpan={2}
                className="bg-purple-50 text-center align-bottom text-xs font-bold uppercase tracking-wider text-purple-700"
              >
                Final Pay
              </TableHead>
            )}
            <TableHead
              rowSpan={2}
              className="align-bottom text-xs font-bold uppercase"
            >
              Status
            </TableHead>
            {!isMonthly && !readOnly && (
              <TableHead
                rowSpan={2}
                className="align-bottom text-xs font-bold uppercase"
              >
                Actions
              </TableHead>
            )}
          </TableRow>
          <TableRow>
            {showBasic && (
              <>
                {perms.canViewMonthlyPay && <TableHead className="bg-blue-50 text-xs text-blue-700">MonthlyPay</TableHead>}
                {perms.canViewDailyRate && <TableHead className="bg-blue-50 text-xs text-blue-700">Daily</TableHead>}
                <TableHead className="bg-blue-50 text-xs text-blue-700">Days</TableHead>
                {perms.canViewDailyRate && <TableHead className="bg-blue-50 text-xs text-blue-700">Total</TableHead>}
              </>
            )}
            {showEarnings && (
              <>
                <TableHead className="bg-green-50 text-xs text-green-700">Holiday Days</TableHead>
                <TableHead className="bg-green-50 text-xs text-green-700">Holiday Pay</TableHead>
                <TableHead className="bg-green-50 text-xs text-green-700">SNWH Days</TableHead>
                <TableHead className="bg-green-50 text-xs text-green-700">SNWH Pay</TableHead>
                <TableHead className="bg-green-50 text-xs text-green-700">Wellness</TableHead>
                <TableHead className="bg-green-50 text-xs text-green-700">Comm</TableHead>
                <TableHead className="bg-green-50 text-xs text-green-700">Bday</TableHead>
                <TableHead className="bg-green-50 text-xs text-green-700">Comm.</TableHead>
                <TableHead className="bg-green-50 text-xs text-green-700">Allow</TableHead>
                <TableHead className="bg-green-50 text-xs text-green-700">Bonus</TableHead>
                <TableHead className="bg-green-50 text-xs text-green-700">13th</TableHead>
                <TableHead className="bg-green-50 text-xs text-green-700">Total</TableHead>
              </>
            )}
            {showDeductions && (
              <>
                <TableHead className="bg-red-50 text-xs text-red-700">Adv</TableHead>
                <TableHead className="bg-red-50 text-xs text-red-700">SSS</TableHead>
                <TableHead className="bg-red-50 text-xs text-red-700">PH</TableHead>
                <TableHead className="bg-red-50 text-xs text-red-700">Pag</TableHead>
                <TableHead className="bg-red-50 text-xs text-red-700">HMO</TableHead>
                <TableHead className="bg-red-50 text-xs text-red-700">Other</TableHead>
                <TableHead className="bg-red-50 text-xs text-red-700">Total</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeEmployees.map((emp) => {
            const data = getEmployeeData(emp);
            const payroll = isMonthly ? data : data.payroll || {};
            const computed = isMonthly ? data : data.computed || {};
            const status = isMonthly ? null : data.status;

            return (
              <TableRow key={emp.id}>
                <TableCell className="sticky left-0 z-10 bg-card font-medium">
                  {emp.name}
                </TableCell>
                {showBasic && (
                  <>
                    {perms.canViewMonthlyPay && <TableCell>{formatCurrency(payroll.monthly_pay)}</TableCell>}
                    {perms.canViewDailyRate && <TableCell>{formatCurrency(payroll?.daily_pay)}</TableCell>}
                    <TableCell>{payroll?.work_days || 0}</TableCell>
                    {perms.canViewTotalBasicPay && <TableCell className="font-medium">{formatCurrency(computed?.total_basic_pay)}</TableCell>}
                  </>
                )}
                {showEarnings && (
                  <>
                    <TableCell>{payroll?.holiday_days || 0}</TableCell>
                    <TableCell>{formatCurrency(payroll?.holiday_pay)}</TableCell>
                    <TableCell>{payroll?.snwh_days || 0}</TableCell>
                    <TableCell>{formatCurrency(payroll?.snwh_pay)}</TableCell>
                    <TableCell>{formatCurrency(payroll?.wellness_allowance)}</TableCell>
                    <TableCell>{formatCurrency(payroll?.communication_allowance)}</TableCell>
                    <TableCell>{formatCurrency(payroll?.birthday_allowance)}</TableCell>
                    <TableCell>{formatCurrency(payroll?.commission)}</TableCell>
                    <TableCell>{formatCurrency(payroll?.allowance)}</TableCell>
                    <TableCell>{formatCurrency(payroll?.bonuses)}</TableCell>
                    <TableCell>{formatCurrency(payroll?.thirteenth_month_pay)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(computed?.total_earnings)}</TableCell>
                  </>
                )}
                {showDeductions && (
                  <>
                    <TableCell>{formatCurrency(payroll?.cash_advance)}</TableCell>
                    <TableCell>{formatCurrency(payroll?.sss)}</TableCell>
                    <TableCell>{formatCurrency(payroll?.philhealth)}</TableCell>
                    <TableCell>{formatCurrency(payroll?.pagibig)}</TableCell>
                    <TableCell>{formatCurrency(payroll?.hmo)}</TableCell>
                    <TableCell>{formatCurrency(payroll?.others)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(computed?.total_deductions)}</TableCell>
                  </>
                )}
                {perms.canViewFinalPay && (
                  <TableCell className="font-bold text-purple-700">
                    {formatCurrency(computed?.net_pay)}
                  </TableCell>
                )}
                <TableCell>
                  {isMonthly ? (
                    <Badge variant="secondary">Combined</Badge>
                  ) : (
                    <Badge variant={status === "Approved" ? "success" : "warning"}>
                      {status}
                    </Badge>
                  )}
                </TableCell>
                {!isMonthly && !readOnly && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 border-border bg-card hover:bg-muted"
                                disabled={payrollSent || mutationLoading}
                                onClick={() => setEditEmployee(emp)}
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
                                    onClick={() => approvePayroll(emp.id, perms.user?.name, perms.user?.emp_id, currentPeriod)}
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
                                    onClick={() => unapprovePayroll(emp.id, perms.user?.name, currentPeriod)}
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
                          onClick={() => setAuditEmployee(emp)}
                        >
                          <ClipboardList className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}

          {/* Totals row */}
          {perms.canViewTotalsRow && totals && (
            <TableRow className="border-t-2 border-border bg-muted font-bold">
              <TableCell className="sticky left-0 z-10 bg-muted">TOTALS</TableCell>
              {showBasic && (
                <>
                  {perms.canViewMonthlyPay && <TableCell>{formatCurrency(totals.monthly_pay)}</TableCell>}
                  {perms.canViewDailyRate && <TableCell>{formatCurrency(totals?.daily_pay)}</TableCell>}
                  <TableCell>{totals?.work_days || 0}</TableCell>
                  {perms.canViewTotalBasicPay && <TableCell>{formatCurrency(totals?.total_basic_pay)}</TableCell>}
                </>
              )}
              {showEarnings && (
                <>
                  <TableCell>{totals?.holiday_days || 0}</TableCell>
                  <TableCell>{formatCurrency(totals?.holiday_pay)}</TableCell>
                  <TableCell>{totals?.snwh_days || 0}</TableCell>
                  <TableCell>{formatCurrency(totals?.snwh_pay)}</TableCell>
                  <TableCell>{formatCurrency(totals?.wellness_allowance)}</TableCell>
                  <TableCell>{formatCurrency(totals?.communication_allowance)}</TableCell>
                  <TableCell>{formatCurrency(totals?.birthday_allowance)}</TableCell>
                  <TableCell>{formatCurrency(totals?.commission)}</TableCell>
                  <TableCell>{formatCurrency(totals?.allowance)}</TableCell>
                  <TableCell>{formatCurrency(totals?.bonuses)}</TableCell>
                  <TableCell>{formatCurrency(totals?.thirteenth_month_pay)}</TableCell>
                  <TableCell>{formatCurrency(totals?.total_earnings)}</TableCell>
                </>
              )}
              {showDeductions && (
                <>
                  <TableCell>{formatCurrency(totals?.cash_advance)}</TableCell>
                  <TableCell>{formatCurrency(totals?.sss)}</TableCell>
                  <TableCell>{formatCurrency(totals?.philhealth)}</TableCell>
                  <TableCell>{formatCurrency(totals?.pagibig)}</TableCell>
                  <TableCell>{formatCurrency(totals?.hmo)}</TableCell>
                  <TableCell>{formatCurrency(totals?.others)}</TableCell>
                  <TableCell>{formatCurrency(totals?.total_deductions)}</TableCell>
                </>
              )}
              <TableCell className="text-purple-700">
                {formatCurrency(totals?.net_pay)}
              </TableCell>
              <TableCell />
              {!isMonthly && !readOnly && <TableCell />}
            </TableRow>
          )}
        </TableBody>
      </Table>

      {editEmployee && (
        <EditModal
          employee={editEmployee}
          open={!!editEmployee}
          onClose={() => setEditEmployee(null)}
          period={currentPeriod}
        />
      )}

      {auditEmployee && (
        <AuditLogSheet
          employee={auditEmployee}
          open={!!auditEmployee}
          onClose={() => setAuditEmployee(null)}
          period={currentPeriod}
        />
      )}
    </div>
  );
}