-- Fake test data for the local test database. Not real people.

INSERT INTO employee (first_name, last_name, email, position, role, status) VALUES
  ('Dev',   'Admin',   'devadmin@example.test', 'Developer',       'devAdmin',  'Active'),
  ('Alex',  'Reyes',   'alex@example.test',     'HR Manager',      'admin',     'Active'),
  ('Sam',   'Cruz',    'sam@example.test',      'Team Lead',       'moderator', 'Active'),
  ('Jamie', 'Santos',  'jamie@example.test',    'Sales Associate', 'employee',  'Active'),
  ('Riley', 'Garcia',  'riley@example.test',    'Support Agent',   'employee',  'Active');

-- Two pay periods for the current month for every non-devAdmin employee.
WITH m AS (SELECT date_trunc('month', CURRENT_DATE)::date AS d)
INSERT INTO payroll_period (emp_id, date_from, date_to, status)
SELECT e.emp_id, p.date_from, p.date_to, 'Pending'
FROM employee e
CROSS JOIN m
CROSS JOIN LATERAL (VALUES
  (m.d,      m.d + 14),
  (m.d + 15, (m.d + INTERVAL '1 month - 1 day')::date)
) AS p(date_from, date_to)
WHERE e.role <> 'devAdmin';

INSERT INTO payroll_basicpay (pr_period_id, monthly_pay, daily_pay, work_days)
SELECT pr_period_id, 26000, 1000, 13 FROM payroll_period;

INSERT INTO payroll_additions (pr_period_id)  SELECT pr_period_id FROM payroll_period;
INSERT INTO payroll_deductions (pr_period_id, phil_health)
SELECT pr_period_id, ((26000 / 2.0) * 0.05) / 2 FROM payroll_period;
INSERT INTO payroll_remarks (pr_period_id)    SELECT pr_period_id FROM payroll_period;

INSERT INTO cash_advances (emp_id, total_amount, per_period_deduction, status, start_date, remarks)
SELECT emp_id, 5000, 500, 'active', date_trunc('month', CURRENT_DATE)::date, 'Test loan'
FROM employee WHERE email = 'jamie@example.test';
