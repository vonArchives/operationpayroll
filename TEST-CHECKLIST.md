# Test Checklist — JPMC Payroll (`experimental` branch)

Run each set before deployment. All must pass.

---

## Set 1: Auth — Login, Refresh, Timeout

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | Login with valid credentials | Redirect to `/dashboard` | ☐ |
| 2 | Login with wrong password | Toast: "Invalid credentials" | ☐ |
| 3 | **Refresh browser after login** | Stay on dashboard, not kicked to login | ☐ |
| 4 | Open 2 tabs, logout in one | Other tab works until next navigation | ☐ |
| 5 | Login → close tab → reopen within 30 min | Restore session (no re-login) | ☐ |
| 6 | Remove `jpmc_session_user` from localStorage → refresh | Redirect to login | ☐ |
| 7 | Remove `jpmc_session_expiry` from localStorage → refresh | Redirect to login | ☐ |

---

## Set 2: Payroll — Edit & Save

| # | Test | Expected | Result |
|---|------|----------|--------|
| 8 | Edit `work_days` on one employee → Save | Toast "Payroll updated", value updates | ☐ |
| 9 | Edit multiple fields at once (daily_pay + work_days) → Save | All fields saved, totals recalculate | ☐ |
| 10 | Open edit modal → click Save with no changes | No DB calls, no error | ☐ |
| 11 | Edit → Save → immediately close modal | No race condition crash | ☐ |
| 12 | Check Supabase `payroll_period.basicpay_total` | Matches `daily_pay × work_days` | ☐ |

---

## Set 3: Payroll — Approve / Unapprove

| # | Test | Expected | Result |
|---|------|----------|--------|
| 13 | Approve a "Pending" payroll | Status → "Approved", toast success | ☐ |
| 14 | Check Supabase `payroll_period.approved_by` | Contains the approver's `emp_id` | ☐ |
| 15 | Unapprove an "Approved" payroll | Status → "Pending", toast success | ☐ |
| 16 | Check Supabase `approved_by` after unapprove | `null` | ☐ |

---

## Set 4: Payroll — Send

| # | Test | Expected | Result |
|---|------|----------|--------|
| 17 | Approve ALL employees → click "Send Payroll" | Toast "Sent", status → "Sent" | ☐ |
| 18 | After send, verify edit/approve buttons are disabled | All action buttons grayed out | ☐ |
| 19 | Switch period → verify sent status persists | Shows "Sent" in PayrollTable | ☐ |

---

## Set 5: Branding (no "PaySync" remnants)

| # | Test | Expected | Result |
|---|------|----------|--------|
| 20 | Login page logo | Shows "J" icon + "JPMC Payroll" | ☐ |
| 21 | Browser tab title | "JPMC Payroll" | ☐ |
| 22 | Search DevTools/console for "PaySync" in rendered HTML | Zero instances | ☐ |

---

## Set 6: Error Handling

| # | Test | Expected | Result |
|---|------|----------|--------|
| 23 | Block network request (DevTools → Offline) → try to edit | Toast "Failed to save", no crash | ☐ |
| 24 | Try to edit after payroll is "Sent" | Edit button disabled | ☐ |
| 25 | Click Settings gear icon in topbar | Opens settings modal (no crash) | ☐ |
| 26 | Open Employees page | List loads without crash | ☐ |

---

## Set 7: Audit Trail

| # | Test | Expected | Result |
|---|------|----------|--------|
| 27 | Edit payroll → open audit clipboard icon | Shows "Payroll Edited" + timestamp + user | ☐ |
| 28 | Approve → check audit log | Shows "Approved" entry | ☐ |
| 29 | Audit log ordering | Most recent action at top | ☐ |

---

## Quick Smoke Test (3 min)

```
1. Login → refresh → verify you stay on dashboard
2. Payroll → edit work_days → save → check toast + value updates
3. Approve one employee → check status changes + audit log
4. DevTools → localStorage → verify jpmc_session_expiry exists
5. DevTools → cookies → verify jpmc_auth_token exists (new edge function only)
```

If all sets pass, the branch is ready to merge.
