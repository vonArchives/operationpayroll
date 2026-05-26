/**
 * Format a number as PHP currency string.
 * @param {number|string} value
 * @returns {string}
 */
export function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });
}

/*
Moved the toNum function outside to 
handle all other toNum formatting in the same way.
*/
export const toNum = (val) => {
  if (val === "" || val === null || val === undefined) return 0;
  const n = Number(val);
  return Number.isNaN(n) ? 0 : n;
};

/**
 * Custom HR rounding rule for Basic Pay:
 * - Decimals < 0.25 round down to the whole number
 * - Decimals >= 0.25 but < 0.50 round to 0.50
 * - Decimals >= 0.50 round up to the next whole number
 */
export function roundBasicPay(value) {
  const whole = Math.floor(value); // Extracts the 15000
  const decimal = value - whole;   // Extracts the .49

  if (decimal < 0.25) {
    return whole;            // e.g., 15000.01 -> 15000
  } else if (decimal < 0.50) {
    return whole + 0.5;      // e.g., 15000.49 -> 15000.50
  } else {
    return whole + 1;        // e.g., 15000.50 -> 15001
  }
}

/**
 * Pure function to compute payroll totals from raw field inputs.
 * All inputs default to 0 if NaN, null, undefined, or empty string.
 * ONLY Total Basic Pay is rounded UP to the nearest integer.
 *
 * @param {Object} fields - Raw payroll fields
 * @returns {Object} Computed totals: { total_basic_pay, total_earnings, total_deductions, net_pay }
 */
export function computePayroll(fields = {}) {
  const daily_pay = toNum(fields.daily_pay);
  const work_days = toNum(fields.work_days);
  
  const raw_basic_pay = daily_pay * work_days;
  
  // 1. Apply the custom rounding ONLY to Total Basic Pay
  const total_basic_pay = roundBasicPay(raw_basic_pay);
  
  const holiday_total = toNum(fields.holiday_days) * toNum(fields.holiday_pay);
  const snwh_total = toNum(fields.snwh_days) * toNum(fields.snwh_pay);

  // 2. Normal addition (Decimals preserved)
  const total_earnings =
    total_basic_pay + 
    holiday_total +
    snwh_total +
    toNum(fields.wellness_allowance) +
    toNum(fields.communication_allowance) +
    toNum(fields.birthday_allowance) +
    toNum(fields.commission) +
    toNum(fields.allowance) +
    toNum(fields.bonuses) +
    toNum(fields.thirteenth_month_pay);

  // 3. Normal addition (Decimals preserved)
  const total_deductions =
    toNum(fields.cash_advance) +
    toNum(fields.sss) +
    toNum(fields.philhealth) +
    toNum(fields.pagibig) +
    toNum(fields.hmo) +
    toNum(fields.others);

  // 4. Normal subtraction (Decimals preserved)
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
    holiday_days: sum("holiday_days"),
    holiday_pay: sum("holiday_pay"),
    snwh_days: sum("snwh_days"),
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
    ...computePayroll(combined), // This will automatically use the new Math.ceil logic!
  };
}

/**
 * Converts a month string ("2026-02") and period ("period1") into a formatted date range.
 */
export function formatPayslipDateRange(monthString, periodKey) {
  if (!monthString) return periodKey; 
  
  const [year, month] = monthString.split("-");
  
  // JavaScript months are 0-indexed, so we subtract 1 from the month
  const date = new Date(year, parseInt(month) - 1, 1);
  const monthName = date.toLocaleString('en-US', { month: 'long' });
  
  // Magic Trick: Getting day '0' of the NEXT month returns the LAST day of the current month!
  const lastDay = new Date(year, parseInt(month), 0).getDate();

  if (periodKey === "period1") return `${monthName} 1-15, ${year}`;
  if (periodKey === "period2") return `${monthName} 16-${lastDay}, ${year}`;
  if (periodKey === "monthly") return `${monthName} 1-${lastDay}, ${year}`;
  
  return `${monthName} ${year}`;
}