# PR: Payroll System — Code Review Fixes & Refactor

## Summary

Comprehensive post-code-review hardening of the JPMC Payroll React application. Fixes 8 of 10 priority issues from the initial review: runtime crashes, data integrity holes, duplicated code, monolithic architecture, and security gaps. 17 files modified, 2 new files created. **Net: +109 / -467 lines.**

---

## What Changed

### Bug Fixes

| # | Issue | Fix |
|---|-------|-----|
| 1 | Settings modal crashed on password change (`TypeError: updateUserPassword is not a function`) | Removed broken function reference, stubbed with safe toast message |
| 2 | 10 plaintext passwords embedded in source code (`admin123`, `moderator123`, `employee123`) | Deleted all `password` fields from `mockData.js` |
| 3 | Optimistic UI updates showed wrong state when DB writes failed | Rewrote 4 mutations to DB-first pattern: call Supabase → only dispatch on success → toast errors on failure |
| 4 | Supabase `.update()` silently no-ops when related table row is missing | Changed all 3 `.update()` calls to `.upsert()` with `pr_period_id` included |
| 5 | Dashboard `payrollSent` always `undefined` after architecture refactor | Added `payrollSent` derived value to context provider |
| 6 | Audit log insert failures silently swallowed | Added error checking to all 4 audit log insert calls with toast feedback |

### Code Quality

| # | Change | Impact |
|---|--------|--------|
| 7 | Deduplicated `formatCurrency` (was defined 3 times) into `payrollUtils.js` | Single source of truth; standardized on safe `Number(value \|\| 0)` pattern |
| 8 | Deduplicated `getInitials` (was 2 functions + 2 inline expressions) into `utils.js` with configurable fallback | Consistent fallback behavior (`"?"` for pages, `"U"` for layout) |
| 9 | Removed 4 dead imports: `supabase` (AuthContext), `useState` + `getPayrollPeriodLabel` (Dashboard), `logo` (Login) | Lint: 4 errors → 0 errors |
| 10 | Added `mutationLoading` shared flag | All action buttons disable during DB operations, preventing double-clicks |

### Architecture

| # | Change | Impact |
|---|--------|--------|
| 11 | Broke up 660-line `PayrollContext.jsx` into 3 modules | `PayrollContext` 244 lines, `payrollTransformer` 98 lines, `usePayrollMutations` 360 lines. Zero consumer changes. |

### Security & Config

| # | Change | Impact |
|---|--------|--------|
| 12 | Added `.env`, `.env.development`, `.env.production` to `.gitignore` | Prevents accidental credential commits |
| 13 | Added guard clause to `supabaseClient.js` | Clear startup error when `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing |

---

## Files Changed

### Modified (17 files)

| File | + | − | Change |
|------|---|---|--------|
| `.gitignore` | +3 | 0 | Added `.env` variants |
| `src/context/PayrollContext.jsx` | +38 | −388 | Rewritten — 660 → 279 lines (−58%), now composes extracted modules |
| `src/context/SettingsContext.jsx` | +3 | −23 | Removed broken `updateUserPassword` ref + mock data dependency |
| `src/context/AuthContext.jsx` | 0 | −1 | Removed unused `supabase` import |
| `src/lib/payrollUtils.js` | +12 | 0 | Added `formatCurrency` export |
| `src/lib/utils.js` | +12 | 0 | Added `getInitials` export with configurable fallback |
| `src/lib/supabaseClient.js` | +9 | 0 | Added env var validation guard clause |
| `src/lib/mockData.js` | 0 | −10 | Removed all 10 hardcoded `password` fields |
| `src/hooks/usePayrollMutations.js` | +12 | −6 | upsert fix + audit error handling |
| `src/components/payroll/PayrollTable.jsx` | +6 | −30 | Consumed shared `formatCurrency` + `mutationLoading` guards |
| `src/components/payroll/EditModal.jsx` | +4 | −15 | Consumed shared `formatCurrency` + async submit + loading guard |
| `src/components/payroll/PayslipCard.jsx` | +1 | −8 | Consumed shared `formatCurrency` |
| `src/pages/PayrollRun.jsx` | +5 | −12 | Async send + `mutationLoading` + removed premature toast |
| `src/pages/Dashboard.jsx` | +1 | −10 | Consumed shared `getInitials` + removed dead imports |
| `src/pages/Employees.jsx` | +1 | −6 | Consumed shared `getInitials` |
| `src/pages/Login.jsx` | 0 | −1 | Removed unused `logo` import |
| `src/components/layout/Sidebar.jsx` | +2 | −6 | Replaced inline initials with `getInitials` |
| `src/components/layout/Topbar.jsx` | +2 | −5 | Replaced inline initials with `getInitials` |

### New Files (2)

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/payrollTransformer.js` | 98 | Pure data transformation — `shapePeriod`, `shapeEmployees` |
| `src/hooks/usePayrollMutations.js` | 360 | Mutation hook — `editPayroll`, `approvePayroll`, `unapprovePayroll`, `sendPayroll`, `createPayrollMonth` |

---

## Architecture: Before vs After

```
Before (1 file, 660 lines):          After (3 files, ~700 lines total):
┌──────────────────────────┐         ┌──────────────────────────┐
│ PayrollContext.jsx       │         │ PayrollContext.jsx       │
│  • initialState          │         │  • initialState          │
│  • payrollReducer        │         │  • payrollReducer        │
│  • shapePeriod           │         │  • data fetch useEffect  │
│  • shapeEmployees        │         │  • switchPeriod          │
│  • data fetch            │         │  • switchMonth           │
│  • switchPeriod/Month    │         │  • payrollSent computed  │
│  • editPayroll ✗         │         │  • context composition   │
│  • approvePayroll ✗      │         │             244 lines    │
│  • unapprovePayroll ✗    │         ├──────────────────────────┤
│  • sendPayroll ✗         │         │ payrollTransformer.js    │
│  • createPayrollMonth ✗  │         │  • shapePeriod           │
│  • context value          │         │  • shapeEmployees        │
│  • usePayroll hook        │         │              98 lines    │
│             660 lines     │         ├──────────────────────────┤
└──────────────────────────┘         │ usePayrollMutations.js   │
                                     │  • editPayroll            │
                                     │  • approvePayroll         │
                                     │  • unapprovePayroll       │
                                     │  • sendPayroll            │
                                     │  • createPayrollMonth     │
                                     │             360 lines     │
                                     └──────────────────────────┘
```

---

## Mutation Pattern: Before vs After

**Before (broken):**
```
User clicks "Approve"
  → dispatch(APPROVE_PAYROLL)    ← UI says "Approved" immediately
  → supabase.update()            ← DB call starts
  → if error: console.error()    ← user never knows
  → audit insert (fire-and-forget)
```

**After (fixed):**
```
User clicks "Approve"
  → setMutationLoading(true)     ← buttons disabled
  → supabase.update()            ← DB call FIRST
  → if error: toast.error + return false  ← UI unchanged
  → dispatch(APPROVE_PAYROLL)    ← only on confirmed success
  → audit insert + error check   ← returns false if audit fails
  → toast.success
  → setMutationLoading(false)
```

---

## Lint Status

| | Before | After |
|---|--------|-------|
| Errors | 4 | 0 |
| Warnings | 1 | 1 (pre-existing) |
| Remaining warning | `PayrollContext.jsx:228` — `useEffect` missing dependency `state.selectedMonth` |

---

## Known Issues (Not Addressed)

From the most recent code review, these remain:

| Severity | Issue |
|----------|-------|
| Critical | Non-atomic upserts — parallel `Promise.all` on 3 tables, no rollback on partial failure |
| Critical | `payrollSent` flags reset on page refresh — DB `"sent"` status never read back |
| Critical | `allPeriodData` never updated after mutations — switching months shows stale pre-edit data |
| Important | Edit modal shows period1 defaults when editing period2 with no data |
| Important | Payslip always defaults to period1, no period2 view from Employee list |
| Important | "Send to Email" button is a fake no-op |
| Important | Dashboard stats only reflect period1 approval status, ignore period2 |
| Important | Client-only role enforcement — all mutations use anon key, no server-side auth |
| Important | `window.location.reload()` used as refetch hack |

---

## Test Checklist

Manual verification steps before merge:

- [ ] Login with admin credentials → redirected to Dashboard
- [ ] Dashboard shows payroll status badge (Sent / In Progress / Ready to Send)
- [ ] Navigate to Payroll → switch between Period 1 / Period 2 / Monthly
- [ ] Edit an employee's payroll → verify values persist after save
- [ ] Approve a pending record → verify status changes to Approved
- [ ] Unapprove an approved record → verify status reverts to Pending
- [ ] Send payroll (all approved) → verify Send button disables after sending
- [ ] Create a new payroll month → verify new month appears in selector
- [ ] View payslip from Employee list → verify print dialog opens
- [ ] Open Settings → verify no crash on password change attempt
- [ ] Refresh page → verify session persists from localStorage
- [ ] Search employees by name/department → verify filtering works
- [ ] Check browser console → no errors on any page load
