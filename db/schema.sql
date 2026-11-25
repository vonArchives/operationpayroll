-- Local test schema for Operation Payroll.
-- Reconstructed from how the app queries Supabase (src/, supabase/functions/).
-- The real Supabase schema is not in this repo, so column types/constraints
-- here are best guesses; adjust if production differs.

CREATE TABLE IF NOT EXISTS employee (
  emp_id      SERIAL PRIMARY KEY,
  auth_id     UUID UNIQUE,                      -- Supabase auth.users id
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  position    TEXT,
  role        TEXT NOT NULL DEFAULT 'employee', -- devAdmin | admin | moderator | employee
  status      TEXT NOT NULL DEFAULT 'Active',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_auth (
  emp_id        INTEGER PRIMARY KEY REFERENCES employee(emp_id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,                  -- bcrypt
  last_login    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payroll_period (
  pr_period_id     SERIAL PRIMARY KEY,
  emp_id           INTEGER NOT NULL,
  date_from        DATE NOT NULL,
  date_to          DATE NOT NULL,
  status           TEXT NOT NULL DEFAULT 'Pending', -- Pending | Approved | Sent
  approved_by      TEXT,
  basicpay_total   NUMERIC(12,2) DEFAULT 0,
  additions_total  NUMERIC(12,2) DEFAULT 0,
  deductions_total NUMERIC(12,2) DEFAULT 0,
  net_pay          NUMERIC(12,2) DEFAULT 0,
  CONSTRAINT payroll_period_emp_id_fkey
    FOREIGN KEY (emp_id) REFERENCES employee(emp_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_payroll_period_date_from ON payroll_period(date_from);

CREATE TABLE IF NOT EXISTS payroll_basicpay (
  pr_period_id INTEGER PRIMARY KEY REFERENCES payroll_period(pr_period_id) ON DELETE CASCADE,
  monthly_pay  NUMERIC(12,2) DEFAULT 0,
  daily_pay    NUMERIC(12,2) DEFAULT 0,
  work_days    NUMERIC(6,2)  DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payroll_additions (
  pr_period_id  INTEGER PRIMARY KEY REFERENCES payroll_period(pr_period_id) ON DELETE CASCADE,
  holiday_days  NUMERIC(6,2)  DEFAULT 0,
  holiday_pay   NUMERIC(12,2) DEFAULT 0,
  snwh_days     NUMERIC(6,2)  DEFAULT 0,
  snwh_pay      NUMERIC(12,2) DEFAULT 0,
  wellness_alw  NUMERIC(12,2) DEFAULT 0,
  comms_alw     NUMERIC(12,2) DEFAULT 0,
  birthday_alw  NUMERIC(12,2) DEFAULT 0,
  commission    NUMERIC(12,2) DEFAULT 0,
  allowance     NUMERIC(12,2) DEFAULT 0,
  bonus         NUMERIC(12,2) DEFAULT 0,
  thirteenth_mp NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payroll_deductions (
  pr_period_id INTEGER PRIMARY KEY REFERENCES payroll_period(pr_period_id) ON DELETE CASCADE,
  cash_advance NUMERIC(12,2) DEFAULT 0,
  sss          NUMERIC(12,2) DEFAULT 0,
  phil_health  NUMERIC(12,2) DEFAULT 0,
  pag_ibig     NUMERIC(12,2) DEFAULT 0,
  hmo          NUMERIC(12,2) DEFAULT 0,
  others       NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payroll_remarks (
  pr_period_id       INTEGER PRIMARY KEY REFERENCES payroll_period(pr_period_id) ON DELETE CASCADE,
  holiday_remarks    TEXT DEFAULT '',
  snwh_remarks       TEXT DEFAULT '',
  commission_remarks TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS audit_log (
  id           SERIAL PRIMARY KEY,
  employee_id  INTEGER REFERENCES employee(emp_id) ON DELETE CASCADE,
  pr_period_id INTEGER REFERENCES payroll_period(pr_period_id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  performed_by TEXT,
  changes      JSONB,
  "timestamp"  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payslip_records (
  id            SERIAL PRIMARY KEY,
  reference_no  TEXT UNIQUE NOT NULL,
  emp_id        INTEGER REFERENCES employee(emp_id) ON DELETE CASCADE,
  employee_name TEXT,
  period_label  TEXT,
  net_pay       NUMERIC(12,2),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- payroll_run is referenced only in docs (src/lib/codemap.md); kept minimal.
CREATE TABLE IF NOT EXISTS payroll_run (
  id         SERIAL PRIMARY KEY,
  emp_id     INTEGER REFERENCES employee(emp_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
