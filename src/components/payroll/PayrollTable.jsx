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
              className="sticky left-0 z-20 bg-card align-bottom font-bold text-foreground text-[10px] px-2 py-1"
            >
              Employee
            </TableHead>
            {showBasic && (
              <TableHead
                colSpan={perms.canViewDailyRate ? 4 : 1}
                className="bg-blue-50 text-center text-[10px] font-bold uppercase tracking-wider text-blue-700 px-2 py-1"
              >
                Basic Pay
              </TableHead>
            )}
            {showEarnings && (
              <TableHead
                colSpan={12}
                className="bg-green-50 text-center text-[10px] font-bold uppercase tracking-wider text-green-700 px-2 py-1"
              >
                Earnings
              </TableHead>
            )}
            {showDeductions && (
              <TableHead
                colSpan={7}
                className="bg-red-50 text-center text-[10px] font-bold uppercase tracking-wider text-red-700 px-2 py-1"
              >
                Deductions
              </TableHead>
            )}
            {perms.canViewFinalPay && (
              <TableHead
                rowSpan={2}
                className="bg-purple-50 text-center align-bottom text-[10px] font-bold uppercase tracking-wider text-purple-700 px-2 py-1"
              >
                Final Pay
              </TableHead>
            )}
            <TableHead
              rowSpan={2}
              className="align-bottom text-[10px] font-bold uppercase px-2 py-1"
            >
              Status
            </TableHead>
            {!isMonthly && !readOnly && (
              <TableHead
                rowSpan={2}
                className="align-bottom text-[10px] font-bold uppercase px-2 py-1"
              >
                Actions
              </TableHead>
            )}
          </TableRow>
          <TableRow>
            {showBasic && (
              <>
                {perms.canViewMonthlyPay && <TableHead className="bg-blue-50 text-[10px] text-blue-700 px-2 py-1 w-16">MonthlyPay</TableHead>}
                {perms.canViewDailyRate && <TableHead className="bg-blue-50 text-[10px] text-blue-700 px-2 py-1 w-16">Daily</TableHead>}
                <TableHead className="bg-blue-50 text-[10px] text-blue-700 px-2 py-1 w-16">Days</TableHead>
                {perms.canViewDailyRate && <TableHead className="bg-blue-50 text-[10px] text-blue-700 px-2 py-1 w-16">Total</TableHead>}
              </>
            )}
            {showEarnings && (
              <>
                <TableHead className="bg-green-50 text-[10px] text-green-700 px-2 py-1 w-[60px]">Holiday Days</TableHead>
                <TableHead className="bg-green-50 text-[10px] text-green-700 px-2 py-1 w-[60px]">Holiday Pay</TableHead>
                <TableHead className="bg-green-50 text-[10px] text-green-700 px-2 py-1 w-[60px]">SNWH Days</TableHead>
                <TableHead className="bg-green-50 text-[10px] text-green-700 px-2 py-1 w-[60px]">SNWH Pay</TableHead>
                <TableHead className="bg-green-50 text-[10px] text-green-700 px-2 py-1 w-[60px]">Wellness</TableHead>
                <TableHead className="bg-green-50 text-[10px] text-green-700 px-2 py-1 w-[60px]">Comm</TableHead>
                <TableHead className="bg-green-50 text-[10px] text-green-700 px-2 py-1 w-[60px]">Bday</TableHead>
                <TableHead className="bg-green-50 text-[10px] text-green-700 px-2 py-1 w-[60px]">Comm.</TableHead>
                <TableHead className="bg-green-50 text-[10px] text-green-700 px-2 py-1 w-[60px]">Allow</TableHead>
                <TableHead className="bg-green-50 text-[10px] text-green-700 px-2 py-1 w-[60px]">Bonus</TableHead>
                <TableHead className="bg-green-50 text-[10px] text-green-700 px-2 py-1 w-[60px]">13th</TableHead>
                <TableHead className="bg-green-50 text-[10px] text-green-700 px-2 py-1 w-[60px]">Total</TableHead>
              </>
            )}
            {showDeductions && (
              <>
                <TableHead className="bg-red-50 text-[10px] text-red-700 px-2 py-1 w-[60px]">Adv</TableHead>
                <TableHead className="bg-red-50 text-[10px] text-red-700 px-2 py-1 w-[60px]">SSS</TableHead>
                <TableHead className="bg-red-50 text-[10px] text-red-700 px-2 py-1 w-[60px]">PH</TableHead>
                <TableHead className="bg-red-50 text-[10px] text-red-700 px-2 py-1 w-[60px]">Pag</TableHead>
                <TableHead className="bg-red-50 text-[10px] text-red-700 px-2 py-1 w-[60px]">HMO</TableHead>
                <TableHead className="bg-red-50 text-[10px] text-red-700 px-2 py-1 w-[60px]">Other</TableHead>
                <TableHead className="bg-red-50 text-[10px] text-red-700 px-2 py-1 w-[60px]">Total</TableHead>
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
                <TableCell className="sticky left-0 z-10 bg-card font-medium text-xs px-2 py-1 w-32">
                  {emp.name}
                </TableCell>
                {showBasic && (
                  <>
                    {perms.canViewMonthlyPay && <TableCell className="text-xs px-2 py-1 w-16">{formatCurrency(payroll.monthly_pay)}</TableCell>}
                    {perms.canViewDailyRate && <TableCell className="text-xs px-2 py-1 w-16">{formatCurrency(payroll?.daily_pay)}</TableCell>}
                    <TableCell className="text-xs px-2 py-1 w-16">{payroll?.work_days || 0}</TableCell>
                    {perms.canViewTotalBasicPay && <TableCell className="font-medium text-xs px-2 py-1 w-16">{formatCurrency(computed?.total_basic_pay)}</TableCell>}
                  </>
                )}
                {showEarnings && (
                  <>
                    <TableCell className="text-xs px-2 py-1 w-[60px]">{payroll?.holiday_days || 0}</TableCell>
                    <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(payroll?.holiday_pay)}</TableCell>
                    <TableCell className="text-xs px-2 py-1 w-[60px]">{payroll?.snwh_days || 0}</TableCell>
                    <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(payroll?.snwh_pay)}</TableCell>
                    <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(payroll?.wellness_allowance)}</TableCell>
                    <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(payroll?.communication_allowance)}</TableCell>
                    <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(payroll?.birthday_allowance)}</TableCell>
                    <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(payroll?.commission)}</TableCell>
                    <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(payroll?.allowance)}</TableCell>
                    <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(payroll?.bonuses)}</TableCell>
                    <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(payroll?.thirteenth_month_pay)}</TableCell>
                    <TableCell className="font-medium text-xs px-2 py-1 w-[60px]">{formatCurrency(computed?.total_earnings)}</TableCell>
                  </>
                )}
                {showDeductions && (
                  <>
                    <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(payroll?.cash_advance)}</TableCell>
                    <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(payroll?.sss)}</TableCell>
                    <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(payroll?.philhealth)}</TableCell>
                    <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(payroll?.pagibig)}</TableCell>
                    <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(payroll?.hmo)}</TableCell>
                    <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(payroll?.others)}</TableCell>
                    <TableCell className="font-medium text-xs px-2 py-1 w-[60px]">{formatCurrency(computed?.total_deductions)}</TableCell>
                  </>
                )}
                {perms.canViewFinalPay && (
                  <TableCell className="font-bold text-purple-700 text-xs px-2 py-1 w-20">
                    {formatCurrency(computed?.net_pay)}
                  </TableCell>
                )}
                <TableCell className="text-xs px-2 py-1 w-[72px]">
                  {isMonthly ? (
                    <Badge variant="secondary">Combined</Badge>
                  ) : (
                    <Badge variant={status === "Approved" ? "success" : "warning"}>
                      {status}
                    </Badge>
                  )}
                </TableCell>
                {!isMonthly && !readOnly && (
                  <TableCell className="text-xs px-2 py-1 w-20">
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
              <TableCell className="sticky left-0 z-10 bg-muted text-xs px-2 py-1 w-32">TOTALS</TableCell>
              {showBasic && (
                <>
                  {perms.canViewMonthlyPay && <TableCell className="text-xs px-2 py-1 w-16">{formatCurrency(totals.monthly_pay)}</TableCell>}
                  {perms.canViewDailyRate && <TableCell className="text-xs px-2 py-1 w-16">{formatCurrency(totals?.daily_pay)}</TableCell>}
                  <TableCell className="text-xs px-2 py-1 w-16">{totals?.work_days || 0}</TableCell>
                  {perms.canViewTotalBasicPay && <TableCell className="text-xs px-2 py-1 w-16">{formatCurrency(totals?.total_basic_pay)}</TableCell>}
                </>
              )}
              {showEarnings && (
                <>
                  <TableCell className="text-xs px-2 py-1 w-[60px]">{totals?.holiday_days || 0}</TableCell>
                  <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(totals?.holiday_pay)}</TableCell>
                  <TableCell className="text-xs px-2 py-1 w-[60px]">{totals?.snwh_days || 0}</TableCell>
                  <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(totals?.snwh_pay)}</TableCell>
                  <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(totals?.wellness_allowance)}</TableCell>
                  <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(totals?.communication_allowance)}</TableCell>
                  <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(totals?.birthday_allowance)}</TableCell>
                  <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(totals?.commission)}</TableCell>
                  <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(totals?.allowance)}</TableCell>
                  <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(totals?.bonuses)}</TableCell>
                  <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(totals?.thirteenth_month_pay)}</TableCell>
                  <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(totals?.total_earnings)}</TableCell>
                </>
              )}
              {showDeductions && (
                <>
                  <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(totals?.cash_advance)}</TableCell>
                  <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(totals?.sss)}</TableCell>
                  <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(totals?.philhealth)}</TableCell>
                  <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(totals?.pagibig)}</TableCell>
                  <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(totals?.hmo)}</TableCell>
                  <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(totals?.others)}</TableCell>
                  <TableCell className="text-xs px-2 py-1 w-[60px]">{formatCurrency(totals?.total_deductions)}</TableCell>
                </>
              )}
              <TableCell className="text-purple-700 text-xs px-2 py-1 w-20">
                {formatCurrency(totals?.net_pay)}
              </TableCell>
              <TableCell className="text-xs px-2 py-1 w-[72px]" />
              {!isMonthly && !readOnly && <TableCell className="text-xs px-2 py-1 w-20" />}
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