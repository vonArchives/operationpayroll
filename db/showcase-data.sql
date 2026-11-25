-- Extra fake data so the showcase video has a trend line, approvals and activity.
-- LOCAL TEST DB ONLY. `npm run db:reset` removes it.

-- Two earlier months (Sep, Oct 2026) with varied pay for each employee.
WITH months(d, bump) AS (VALUES (DATE '2026-09-01', 0.90), (DATE '2026-10-01', 0.95)),
ins AS (
  INSERT INTO payroll_period (emp_id, date_from, date_to, status)
  SELECT e.emp_id, p.date_from, p.date_to, 'Sent'
  FROM employee e
  CROSS JOIN months m
  CROSS JOIN LATERAL (VALUES
    (m.d, m.d + 14),
    (m.d + 15, (m.d + INTERVAL '1 month - 1 day')::date)
  ) AS p(date_from, date_to)
  WHERE e.role <> 'devAdmin'
  RETURNING pr_period_id, emp_id, date_from
)
INSERT INTO payroll_basicpay (pr_period_id, monthly_pay, daily_pay, work_days)
SELECT ins.pr_period_id,
       ROUND(26000 * m.bump),
       ROUND(26000 * m.bump / 26, 2),
       13
FROM ins JOIN months m ON date_trunc('month', ins.date_from) = m.d;

INSERT INTO payroll_additions (pr_period_id, commission, allowance)
SELECT p.pr_period_id, (p.emp_id * 350) % 2000, 500
FROM payroll_period p
WHERE p.date_from < DATE '2026-11-01'
ON CONFLICT (pr_period_id) DO NOTHING;

INSERT INTO payroll_deductions (pr_period_id, sss, phil_health, pag_ibig)
SELECT p.pr_period_id, 581.30, 292.50, 100
FROM payroll_period p
WHERE p.date_from < DATE '2026-11-01'
ON CONFLICT (pr_period_id) DO NOTHING;

INSERT INTO payroll_remarks (pr_period_id)
SELECT p.pr_period_id FROM payroll_period p
WHERE p.date_from < DATE '2026-11-01'
ON CONFLICT (pr_period_id) DO NOTHING;

-- Current month: some earnings, and two employees approved for the mid-month period.
UPDATE payroll_additions a SET commission = 1500, allowance = 500
FROM payroll_period p
WHERE a.pr_period_id = p.pr_period_id AND p.date_from >= DATE '2026-11-01';

UPDATE payroll_period p SET status = 'Approved', approved_by = 'Alex Reyes'
FROM employee e
WHERE p.emp_id = e.emp_id AND p.date_from = DATE '2026-11-01'
  AND e.email IN ('sam@example.test', 'riley@example.test');

INSERT INTO audit_log (employee_id, pr_period_id, action, performed_by, "timestamp")
SELECT p.emp_id, p.pr_period_id, x.action, 'Alex Reyes', NOW() - x.ago
FROM payroll_period p
JOIN employee e ON e.emp_id = p.emp_id
JOIN (VALUES
  ('sam@example.test',   'Payroll Edited', INTERVAL '3 hours'),
  ('sam@example.test',   'Approved',       INTERVAL '2 hours'),
  ('riley@example.test', 'Approved',       INTERVAL '40 minutes'),
  ('jamie@example.test', 'Payroll Edited', INTERVAL '15 minutes')
) AS x(email, action, ago) ON x.email = e.email
WHERE p.date_from = DATE '2026-11-01';
