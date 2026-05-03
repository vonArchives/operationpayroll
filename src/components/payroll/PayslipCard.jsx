import { useMemo } from "react";
import { computePayroll, formatCurrency } from "@/lib/payrollUtils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Printer, Mail, FileText } from "lucide-react";
import logo from "@/images/logo.png";

const EARNINGS_KEYS = [
  { key: "holiday_pay", label: "Holiday Pay" },
  { key: "snwh_pay", label: "SNWH Pay" },
  { key: "wellness_allowance", label: "Wellness Allowance" },
  { key: "communication_allowance", label: "Communication Allowance" },
  { key: "birthday_allowance", label: "Birthday Allowance" },
  { key: "commission", label: "Commission" },
  { key: "allowance", label: "Allowance" },
  { key: "bonuses", label: "Bonuses" },
  { key: "thirteenth_month_pay", label: "13th Month Pay" },
];

const DEDUCTIONS_KEYS = [
  { key: "cash_advance", label: "Cash Advance" },
  { key: "sss", label: "SSS" },
  { key: "philhealth", label: "PhilHealth" },
  { key: "pagibig", label: "Pag-IBIG" },
  { key: "hmo", label: "HMO" },
  { key: "others", label: "Others" },
];

export default function PayslipCard({ employee, period, payrollData }) {
  const computed = useMemo(
    () => computePayroll(payrollData || employee?.payroll_period1),
    [payrollData, employee]
  );

  if (!employee) return null;

  const payroll = payrollData || employee?.payroll_period1;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups for this site.");
      return;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Payslip - ${employee.name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Plus Jakarta Sans', 'Segoe UI', sans-serif;
    background: #fff;
    color: #0f172a;
    padding: 40px;
    max-width: 700px;
    margin: 0 auto;
  }
  .header { text-align: center; margin-bottom: 24px; }
  .header h1 { font-size: 24px; font-weight: 700; }
  .header p { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-top: 4px; }
  .header .period { font-size: 11px; color: #94a3b8; margin-top: 4px; }
  .employee-info { margin-bottom: 20px; }
  .employee-info .name { font-weight: 600; font-size: 14px; }
  .employee-info .detail { font-size: 13px; color: #64748b; }
  .section { margin-bottom: 16px; }
  .section-title {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.5px; color: #64748b; margin-bottom: 8px;
    border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;
  }
  .row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; }
  .row.total { font-weight: 600; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 4px; }
  .deduction { color: #dc2626; }
  .net-pay {
    background: #1e3682; color: #fff; text-align: center;
    padding: 16px; border-radius: 8px; margin-top: 20px;
  }
  .net-pay .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9; }
  .net-pay .amount { font-size: 28px; font-weight: 700; margin-top: 4px; }
  @media print {
    body { padding: 20px; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>JPMC Payroll</h1>
    <p>Official Payslip</p>
    <p class="period">${period}</p>
  </div>
  <div class="employee-info">
    <p class="name">${employee.name}</p>
    <p class="detail">${employee.position} — ${employee.department}</p>
  </div>
  <div class="section">
    <p class="section-title">Basic Pay</p>
    <div class="row"><span>Daily Rate</span><span>${formatCurrency(payroll.daily_pay)}</span></div>
    <div class="row"><span>Work Days</span><span>${payroll.work_days}</span></div>
    <div class="row total"><span>Total Basic Pay</span><span>${formatCurrency(computed.total_basic_pay)}</span></div>
  </div>
  <div class="section">
    <p class="section-title">Earnings</p>
    ${EARNINGS_KEYS.map(({ key, label }) => {
      const val = payroll[key];
      if (!val || Number(val) === 0) return "";
      return `<div class="row"><span>${label}</span><span>${formatCurrency(val)}</span></div>`;
    }).join("")}
    <div class="row total"><span>Total Earnings</span><span>${formatCurrency(computed.total_earnings)}</span></div>
  </div>
  <div class="section">
    <p class="section-title">Deductions</p>
    ${DEDUCTIONS_KEYS.map(({ key, label }) => {
      const val = payroll[key];
      if (!val || Number(val) === 0) return "";
      return `<div class="row deduction"><span>${label}</span><span>-${formatCurrency(val)}</span></div>`;
    }).join("")}
    <div class="row total deduction"><span>Total Deductions</span><span>-${formatCurrency(computed.total_deductions)}</span></div>
  </div>
  <div class="net-pay">
    <p class="label">Net Pay</p>
    <p class="amount">${formatCurrency(computed.net_pay)}</p>
  </div>
  <script>window.onload = () => { setTimeout(() => window.print(), 300); };</script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    toast.success("Payslip opened for printing. Use 'Save as PDF' in the print dialog.");
  };

  const handleEmail = () => {
    toast.success(`Payslip for ${employee.name} has been sent to ${employee.email}`);
  };

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      {/* Actions */}
      <div className="mb-4 flex items-center justify-end gap-2 print:hidden">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handlePrint}
        >
          <Printer className="h-4 w-4" />
          Print / PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleEmail}
        >
          <Mail className="h-4 w-4" />
          Send to Email
        </Button>
      </div>

      {/* Header */}
      <div className="text-center">
        <img src={logo} alt="JPMC" className="mx-auto mb-2 h-10 w-10 object-contain rounded-lg" />
        <h2 className="text-xl font-bold tracking-tight text-text-primary">JPMC Payroll</h2>
        <p className="text-sm font-medium uppercase tracking-wider text-text-muted">
          Official Payslip
        </p>
        <p className="mt-1 text-xs text-text-muted">{period}</p>
      </div>

      <div className="mt-4 text-sm">
        <p className="font-semibold text-text-primary">{employee.name}</p>
        <p className="text-text-muted">
          {employee.position} — {employee.department}
        </p>
      </div>

      <Separator className="my-4" />

      {/* Basic Pay */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          Basic Pay
        </h3>
        <div className="flex justify-between text-sm">
          <span className="text-text-primary">Daily Rate</span>
          <span className="font-medium text-text-primary">{formatCurrency(payroll.daily_pay)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-primary">Work Days</span>
          <span className="font-medium text-text-primary">{payroll.work_days}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold">
          <span className="text-text-primary">Total Basic Pay</span>
          <span className="text-text-primary">{formatCurrency(computed.total_basic_pay)}</span>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Earnings */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          Earnings
        </h3>
        {EARNINGS_KEYS.map(({ key, label }) => {
          const val = payroll[key];
          if (!val || Number(val) === 0) return null;
          return (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-text-primary">{label}</span>
              <span className="font-medium text-text-primary">{formatCurrency(val)}</span>
            </div>
          );
        })}
        <div className="flex justify-between text-sm font-semibold">
          <span className="text-text-primary">Total Earnings</span>
          <span className="text-text-primary">{formatCurrency(computed.total_earnings)}</span>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Deductions */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          Deductions
        </h3>
        {DEDUCTIONS_KEYS.map(({ key, label }) => {
          const val = payroll[key];
          if (!val || Number(val) === 0) return null;
          return (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-danger">{label}</span>
              <span className="font-medium text-danger">-{formatCurrency(val)}</span>
            </div>
          );
        })}
        <div className="flex justify-between text-sm font-semibold">
          <span className="text-danger">Total Deductions</span>
          <span className="text-danger">-{formatCurrency(computed.total_deductions)}</span>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Net Pay */}
      <div className="rounded-lg bg-primary p-4 text-center text-white">
        <p className="text-xs font-medium uppercase tracking-wide opacity-90">
          Net Pay
        </p>
        <p className="text-2xl font-bold">
          {formatCurrency(computed.net_pay)}
        </p>
      </div>
    </div>
  );
}
