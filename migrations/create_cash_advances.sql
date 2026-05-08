-- SQL Migration: Create cash_advances table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS cash_advances (
  id SERIAL PRIMARY KEY,
  emp_id INTEGER REFERENCES employee(emp_id) ON DELETE CASCADE NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  per_period_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  present_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  start_date DATE,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: index for faster lookups by employee
CREATE INDEX IF NOT EXISTS idx_cash_advances_emp_id ON cash_advances(emp_id);
CREATE INDEX IF NOT EXISTS idx_cash_advances_status ON cash_advances(status);
