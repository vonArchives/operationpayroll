import { useState } from "react";
import { usePayroll } from "@/hooks/usePayroll";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { computePayroll, computeMonthlySummary } from "@/lib/payrollUtils";
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

function formatCurrency(value) {
  return Number(value).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });
}

export default function PayrollTable({
  employees,
  showBasic,
  showEarnings,
  showDeductions,
  totals,
  isMonthly,
}) {
  const { approvePayroll, unapprovePayroll, payrollSent_period1, payrollSent_period2, currentPeriod } = usePayroll();
  const perms = useRolePermissions();
  const [editEmployee, setEditEmployee] = useState(null);
  const [auditEmployee, setAuditEmployee] = useState(null);

  const payrollSent = currentPeriod === "period2" ? payrollSent_period2 : payrollSent_period1;
  const payrollKey = isMonthly ? null : `payroll_${currentPeriod}`;
  const statusKey = isMonthly ? null : `status_${currentPeriod}`;
  const auditLogKey = isMonthly ? null : `auditLog_${currentPeriod}`;

  const getEmployeeData = (emp) => {
    if (isMonthly) {
      return computeMonthlySummary(emp);
    }
    const payroll = emp[payrollKey];
    const computed = computePayroll(payroll);
    return { payroll, computed, status: emp[statusKey], auditLog: emp[auditLogKey] };
  };

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
                colSpan={perms.canViewDailyRate ? 3 : 1}
                className="bg-blue-50 text-center text-xs font-bold uppercase tracking-wider text-blue-700"
              >
                Basic Pay
              </TableHead>
            )}
            {showEarnings && (
              <TableHead
                colSpan={10}
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
            {!isMonthly && (
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
                {perms.canViewDailyRate && <TableHead className="bg-blue-50 text-xs text-blue-700">Daily</TableHead>}
                <TableHead className="bg-blue-50 text-xs text-blue-700">Days</TableHead>
                {perms.canViewDailyRate && <TableHead className="bg-blue-50 text-xs text-blue-700">Total</TableHead>}
              </>
            )}
            {showEarnings && (
              <>
                <TableHead className="bg-green-50 text-xs text-green-700">Holiday</TableHead>
                <TableHead className="bg-green-50 text-xs text-green-700">SNWH</TableHead>
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
          {employees.map((emp) => {
            const data = getEmployeeData(emp);
            const payroll = isMonthly ? data : data.payroll;
            const computed = isMonthly ? data : data.computed;
            const status = isMonthly ? null : data.status;

            return (
              <TableRow key={emp.id}>
                <TableCell className="sticky left-0 z-10 bg-card font-medium">
                  {emp.name}
                </TableCell>
                {showBasic && (
                  <>
                    {perms.canViewDailyRate && <TableCell>{formatCurrency(payroll.daily_pay)}</TableCell>}
                    <TableCell>{payroll.work_days}</TableCell>
                    {perms.canViewTotalBasicPay && <TableCell className="font-medium">{formatCurrency(computed.total_basic_pay)}</TableCell>}
                  </>
                )}
                {showEarnings && (
                  <>
                    <TableCell>{formatCurrency(payroll.holiday_pay)}</TableCell>
                    <TableCell>{formatCurrency(payroll.snwh_pay)}</TableCell>
                    <TableCell>{formatCurrency(payroll.wellness_allowance)}</TableCell>
                    <TableCell>{formatCurrency(payroll.communication_allowance)}</TableCell>
                    <TableCell>{formatCurrency(payroll.birthday_allowance)}</TableCell>
                    <TableCell>{formatCurrency(payroll.commission)}</TableCell>
                    <TableCell>{formatCurrency(payroll.allowance)}</TableCell>
                    <TableCell>{formatCurrency(payroll.bonuses)}</TableCell>
                    <TableCell>{formatCurrency(payroll.thirteenth_month_pay)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(computed.total_earnings)}</TableCell>
                  </>
                )}
                {showDeductions && (
                  <>
                    <TableCell>{formatCurrency(payroll.cash_advance)}</TableCell>
                    <TableCell>{formatCurrency(payroll.sss)}</TableCell>
                    <TableCell>{formatCurrency(payroll.philhealth)}</TableCell>
                    <TableCell>{formatCurrency(payroll.pagibig)}</TableCell>
                    <TableCell>{formatCurrency(payroll.hmo)}</TableCell>
                    <TableCell>{formatCurrency(payroll.others)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(computed.total_deductions)}</TableCell>
                  </>
                )}
                {perms.canViewFinalPay && (
                  <TableCell className="font-bold text-purple-700">
                    {formatCurrency(computed.net_pay)}
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
                {!isMonthly && (
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
                                disabled={payrollSent}
                                onClick={() => setEditEmployee(emp)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {payrollSent && (
                            <TooltipContent>Edit disabled after payroll sent</TooltipContent>
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
                                    disabled={payrollSent}
                                    onClick={() => approvePayroll(emp.id, perms.user.name, currentPeriod)}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {payrollSent && (
                                <TooltipContent>Approve disabled after payroll sent</TooltipContent>
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
                                    disabled={payrollSent}
                                    onClick={() => unapprovePayroll(emp.id, perms.user.name, currentPeriod)}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {payrollSent && (
                                <TooltipContent>Unapprove disabled after payroll sent</TooltipContent>
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
          {perms.canViewTotalsRow && (
            <TableRow className="border-t-2 border-border bg-muted font-bold">
              <TableCell className="sticky left-0 z-10 bg-muted">TOTALS</TableCell>
              {showBasic && (
                <>
                  {perms.canViewDailyRate && <TableCell>{formatCurrency(totals.daily_pay)}</TableCell>}
                  <TableCell>{totals.work_days}</TableCell>
                  {perms.canViewTotalBasicPay && <TableCell>{formatCurrency(totals.total_basic_pay)}</TableCell>}
                </>
              )}
              {showEarnings && (
                <>
                  <TableCell>{formatCurrency(totals.holiday_pay)}</TableCell>
                  <TableCell>{formatCurrency(totals.snwh_pay)}</TableCell>
                  <TableCell>{formatCurrency(totals.wellness_allowance)}</TableCell>
                  <TableCell>{formatCurrency(totals.communication_allowance)}</TableCell>
                  <TableCell>{formatCurrency(totals.birthday_allowance)}</TableCell>
                  <TableCell>{formatCurrency(totals.commission)}</TableCell>
                  <TableCell>{formatCurrency(totals.allowance)}</TableCell>
                  <TableCell>{formatCurrency(totals.bonuses)}</TableCell>
                  <TableCell>{formatCurrency(totals.thirteenth_month_pay)}</TableCell>
                  <TableCell>{formatCurrency(totals.total_earnings)}</TableCell>
                </>
              )}
              {showDeductions && (
                <>
                  <TableCell>{formatCurrency(totals.cash_advance)}</TableCell>
                  <TableCell>{formatCurrency(totals.sss)}</TableCell>
                  <TableCell>{formatCurrency(totals.philhealth)}</TableCell>
                  <TableCell>{formatCurrency(totals.pagibig)}</TableCell>
                  <TableCell>{formatCurrency(totals.hmo)}</TableCell>
                  <TableCell>{formatCurrency(totals.others)}</TableCell>
                  <TableCell>{formatCurrency(totals.total_deductions)}</TableCell>
                </>
              )}
              <TableCell className="text-purple-700">
                {formatCurrency(totals.net_pay)}
              </TableCell>
              <TableCell />
              {!isMonthly && <TableCell />}
            </TableRow>
          )}
        </TableBody>
      </Table>

      {editEmployee && (
        <EditModal
          employee={editEmployee}
          open={!!editEmployee}
          onClose={() => setEditEmployee(null)}
        />
      )}

      {auditEmployee && (
        <AuditLogSheet
          employee={auditEmployee}
          open={!!auditEmployee}
          onClose={() => setAuditEmployee(null)}
        />
      )}
    </div>
  );
}
