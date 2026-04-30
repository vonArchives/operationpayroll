/**
 * Pure function to compute payroll totals from raw field inputs.
 * All inputs default to 0 if NaN, null, undefined, or empty string.
 *
 * @param {Object} fields - Raw payroll fields
 * @returns {Object} Computed totals: { total_basic_pay, total_earnings, total_deductions, net_pay }
 */
export function computePayroll(fields = {}) {
  const toNum = (val) => {
    if (val === "" || val === null || val === undefined) return 0;
    const n = Number(val);
    return Number.isNaN(n) ? 0 : n;
  };

  const daily_pay = toNum(fields.daily_pay);
  const work_days = toNum(fields.work_days);
  const total_basic_pay = daily_pay * work_days;

  const total_earnings =
    total_basic_pay +
    toNum(fields.holiday_pay) +
    toNum(fields.snwh_pay) +
    toNum(fields.wellness_allowance) +
    toNum(fields.communication_allowance) +
    toNum(fields.birthday_allowance) +
    toNum(fields.commission) +
    toNum(fields.allowance) +
    toNum(fields.bonuses) +
    toNum(fields.thirteenth_month_pay);

  const total_deductions =
    toNum(fields.cash_advance) +
    toNum(fields.sss) +
    toNum(fields.philhealth) +
    toNum(fields.pagibig) +
    toNum(fields.hmo) +
    toNum(fields.others);

  const net_pay = total_earnings - total_deductions;

  return {
    total_basic_pay,
    total_earnings,
    total_deductions,
    net_pay,
  };
}

/**
 * Returns "Mid-Month" if current day < 15, "End-of-Month" if day >= 15.
 */
export function getPeriodLabel() {
  const now = new Date();
  return now.getDate() < 15 ? "Mid-Month" : "End-of-Month";
}

/**
 * Returns the full payroll period label, e.g. "Mid-Month payroll for April 2026".
 */
export function getPayrollPeriodLabel() {
  const periodType = getPeriodLabel();
  const now = new Date();
  const monthYear = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  return `${periodType} payroll for ${monthYear}`;
}

/**
 * Calculate approximate work days for the current bimonthly period.
 * Mid-Month (1st-15th): ~11 work days (assuming 22 work days/month)
 * End-of-Month (16th-end): ~11 work days
 * Returns a multiplier to adjust payroll calculations.
 */
export function getPeriodMultiplier() {
  return 0.5; // Each period covers half the month
}

/**
 * Compute monthly summary by summing Period 1 and Period 2 payrolls.
 *
 * @param {Object} employee - Employee with payroll_period1 and payroll_period2
 * @returns {Object} Summed payroll fields + computed totals
 */
export function computeMonthlySummary(employee) {
  const p1 = employee?.payroll_period1 || {};
  const p2 = employee?.payroll_period2 || {};

  const sum = (key) => (p1[key] || 0) + (p2[key] || 0);

  const combined = {
    daily_pay: p1.daily_pay || 0,
    work_days: sum("work_days"),
    holiday_pay: sum("holiday_pay"),
    snwh_pay: sum("snwh_pay"),
    wellness_allowance: sum("wellness_allowance"),
    communication_allowance: sum("communication_allowance"),
    birthday_allowance: sum("birthday_allowance"),
    commission: sum("commission"),
    allowance: sum("allowance"),
    bonuses: sum("bonuses"),
    thirteenth_month_pay: sum("thirteenth_month_pay"),
    cash_advance: sum("cash_advance"),
    sss: sum("sss"),
    philhealth: sum("philhealth"),
    pagibig: sum("pagibig"),
    hmo: sum("hmo"),
    others: sum("others"),
  };

  return {
    ...combined,
    ...computePayroll(combined),
  };
}
