/**
 * Payroll data transformation utilities.
 * Pure functions that map Supabase nested data to client-side shapes.
 * No React or side effects.
 */

function shapePeriod(period) {
  if (!period) return null;
  const basicpay = Array.isArray(period.payroll_basicpay)
    ? period.payroll_basicpay[0] || {}
    : period.payroll_basicpay || {};
  const additions = Array.isArray(period.payroll_additions)
    ? period.payroll_additions[0] || {}
    : period.payroll_additions || {};
  const deductions = Array.isArray(period.payroll_deductions)
    ? period.payroll_deductions[0] || {}
    : period.payroll_deductions || {};
  const auditLog = (period.audit_log || []).map((log) => ({
    id: log.id,
    action: log.action,
    performedBy: log.performed_by,
    timestamp: log.timestamp,
    changes: log.changes || {},
  }));

  return {
    pr_period_id: period.pr_period_id,
    date_from: period.date_from,
    date_to: period.date_to,
    status: period.status || "Pending",
    auditLog,
    daily_pay: basicpay.daily_pay,
    work_days: basicpay.work_days,
    monthly_pay: basicpay.monthly_pay,
    holiday_pay: additions.holiday_pay,
    snwh_pay: additions.snwh_pay,
    wellness_allowance: additions.wellness_alw,
    communication_allowance: additions.comms_alw,
    birthday_allowance: additions.birthday_alw,
    commission: additions.commission,
    allowance: additions.allowance,
    bonuses: additions.bonus,
    thirteenth_month_pay: additions.thirteenth_mp,
    cash_advance: deductions.cash_advance,
    sss: deductions.sss,
    philhealth: deductions.phil_health,
    pagibig: deductions.pag_ibig,
    hmo: deductions.hmo,
    others: deductions.others,
  };
}

// Group all periods into employees, filtered by selected month
export function shapeEmployees(data, selectedMonth) {
  const [selYear, selMonth] = selectedMonth.split("-").map(Number);

  const employeeMap = {};
  data.forEach((period) => {
    const emp = period.employee;
    if (!emp) return;
    const empId = emp.emp_id;
    if (!employeeMap[empId]) {
      employeeMap[empId] = { emp, allPeriods: [] };
    }
    employeeMap[empId].allPeriods.push(period);
  });

  return Object.values(employeeMap).map(({ emp, allPeriods }) => {
    // Filter to selected month
    const monthPeriods = allPeriods
      .filter((p) => {
        const d = new Date(p.date_from);
        return (
          d.getFullYear() === selYear &&
          d.getMonth() + 1 === selMonth
        );
      })
      .sort((a, b) => new Date(a.date_from) - new Date(b.date_from));

    const period1 = shapePeriod(monthPeriods.find(p => Number(p.date_from.split('-')[2]) <= 15));
    const period2 = shapePeriod(monthPeriods.find(p => Number(p.date_from.split('-')[2]) > 15));

    return {
      id: emp.emp_id,
      name: `${emp.first_name} ${emp.last_name}`,
      first_name: emp.first_name,
      last_name: emp.last_name,
      position: emp.position,
      department: emp.department,
      role: emp.role,
      email: emp.email,
      payroll_period1: period1,
      status_period1: period1?.status || "Pending",
      pr_period_id_period1: period1?.pr_period_id,
      auditLog_period1: period1?.auditLog || [],
      payroll_period2: period2,
      status_period2: period2?.status || "Pending",
      pr_period_id_period2: period2?.pr_period_id,
      auditLog_period2: period2?.auditLog || [],
      payroll: period1 || {},
      status: period1?.status || "Pending",
      auditLog: period1?.auditLog || [],
    };
  });
}
