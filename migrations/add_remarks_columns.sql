-- SQL Migration: Payroll Summary Improvements
-- Run this in your Supabase SQL Editor

-- 1. Add remark columns to payroll_additions
ALTER TABLE payroll_additions
  ADD COLUMN IF NOT EXISTS holiday_remarks TEXT,
  ADD COLUMN IF NOT EXISTS snwh_remarks TEXT,
  ADD COLUMN IF NOT EXISTS commission_remarks TEXT;

-- 2. After running this migration, update the select query in
--    src/context/PayrollContext.jsx (around line 173) to include:
--      holiday_remarks,
--      snwh_remarks,
--      commission_remarks,
--    in the payroll_additions select block.

-- No new tables needed for Cash Advance — it reuses existing payroll_deductions.cash_advance
