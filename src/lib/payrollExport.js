import { computeMonthlySummary, computePayroll, toNum } from "./payrollUtils";

const CURRENCY_FORMAT = '"₱"#,##0.00;[Red]-"₱"#,##0.00';

function numericColumn(header, field, { currency = false } = {}) {
  return {
    header,
    totalKey: field,
    currency,
    get: ({ payroll }) => toNum(payroll?.[field]),
  };
}

function computedColumn(header, field) {
  return {
    header,
    totalKey: field,
    currency: true,
    get: ({ computed }) => toNum(computed?.[field]),
  };
}

function buildColumns({ showBasic, showEarnings, showDeductions, permissions }) {
  const columns = [
    {
      header: "Employee",
      width: 28,
      get: ({ employee }) => employee.name || "",
    },
    {
      header: "Position",
      width: 24,
      get: ({ employee }) => employee.position || "",
    },
    {
      header: "Role",
      width: 14,
      get: ({ employee }) => employee.role || "",
    },
  ];

  if (showBasic) {
    if (permissions.canViewMonthlyPay) {
      columns.push({ ...numericColumn("Monthly Pay", "monthly_pay", { currency: true }), width: 16 });
    }
    if (permissions.canViewDailyRate) {
      columns.push({ ...numericColumn("Daily Rate", "daily_pay", { currency: true }), width: 14 });
    }
    columns.push({ ...numericColumn("Work Days", "work_days"), width: 12 });
    if (permissions.canViewTotalBasicPay) {
      columns.push({ ...computedColumn("Total Basic Pay", "total_basic_pay"), width: 18 });
    }
  }

  if (showEarnings) {
    columns.push(
      { ...numericColumn("Holiday Days", "holiday_days"), width: 14 },
      { ...numericColumn("Holiday Pay", "holiday_pay", { currency: true }), width: 14 },
      { ...numericColumn("SNWH Days", "snwh_days"), width: 12 },
      { ...numericColumn("SNWH Pay", "snwh_pay", { currency: true }), width: 14 },
      { ...numericColumn("Wellness", "wellness_allowance", { currency: true }), width: 14 },
      { ...numericColumn("Communication", "communication_allowance", { currency: true }), width: 16 },
      { ...numericColumn("Birthday", "birthday_allowance", { currency: true }), width: 14 },
      { ...numericColumn("Commission", "commission", { currency: true }), width: 14 },
      { ...numericColumn("Allowance", "allowance", { currency: true }), width: 14 },
      { ...numericColumn("Bonus", "bonuses", { currency: true }), width: 14 },
      { ...numericColumn("13th Month", "thirteenth_month_pay", { currency: true }), width: 16 },
      { ...computedColumn("Total Earnings", "total_earnings"), width: 18 }
    );
  }

  if (showDeductions) {
    columns.push(
      { ...numericColumn("Cash Advance", "cash_advance", { currency: true }), width: 16 },
      { ...numericColumn("SSS", "sss", { currency: true }), width: 12 },
      { ...numericColumn("PhilHealth", "philhealth", { currency: true }), width: 14 },
      { ...numericColumn("Pag-IBIG", "pagibig", { currency: true }), width: 14 },
      { ...numericColumn("HMO", "hmo", { currency: true }), width: 12 },
      { ...numericColumn("Other", "others", { currency: true }), width: 12 },
      { ...computedColumn("Total Deductions", "total_deductions"), width: 20 }
    );
  }

  if (permissions.canViewFinalPay) {
    columns.push({ ...computedColumn("Net Pay", "net_pay"), width: 16 });
  }

  columns.push({
    header: "Status",
    width: 14,
    get: ({ employee, isMonthly, statusKey }) =>
      isMonthly ? "Combined" : employee[statusKey] || employee.status || "Pending",
  });

  return columns;
}

export async function exportPayrollSummary({
  employees,
  isMonthly,
  payrollKey,
  statusKey,
  selectedMonth,
  currentPeriod,
  showBasic,
  showEarnings,
  showDeductions,
  permissions,
  totals,
}) {
  const XLSX = await import("xlsx");
  const columns = buildColumns({ showBasic, showEarnings, showDeductions, permissions });
  const headers = columns.map((column) => column.header);

  const rows = employees.map((employee) => {
    const payroll = isMonthly
      ? computeMonthlySummary(employee)
      : employee[payrollKey] || employee.payroll || {};
    const computed = computePayroll(payroll);
    const context = { employee, payroll, computed, isMonthly, statusKey };

    return Object.fromEntries(
      columns.map((column) => [column.header, column.get(context)])
    );
  });

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  const totalsRow = Object.fromEntries(
    columns.map((column) => [
      column.header,
      column.totalKey ? toNum(totals?.[column.totalKey]) : column.header === "Employee" ? "TOTALS" : "",
    ])
  );
  XLSX.utils.sheet_add_json(worksheet, [totalsRow], {
    header: headers,
    skipHeader: true,
    origin: -1,
  });

  worksheet["!cols"] = columns.map((column) => ({ wch: column.width || 14 }));
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  worksheet["!autofilter"] = { ref: XLSX.utils.encode_range(range) };

  columns.forEach((column, columnIndex) => {
    if (!column.currency) return;

    for (let rowIndex = 1; rowIndex <= range.e.r; rowIndex += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      if (worksheet[cellAddress]) worksheet[cellAddress].z = CURRENCY_FORMAT;
    }
  });

  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: "Payroll Summary",
    Subject: `${selectedMonth} ${currentPeriod} payroll summary`,
    Author: "Operation Payroll",
  };
  XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll Summary");

  const safePeriod = String(currentPeriod || "payroll").replace(/[^a-z0-9_-]/gi, "-");
  const safeMonth = String(selectedMonth || "export").replace(/[^a-z0-9_-]/gi, "-");
  XLSX.writeFile(workbook, `payroll-summary-${safeMonth}-${safePeriod}.xlsx`);

  return rows.length;
}
