# Phase 6: Sync Payroll Totals & Approval Tracking

**Date:** 2026-05-03
**Scope:** Close schema-review gaps — keep `payroll_period` totals in sync and track who approved each payroll.

---

## Problem Statement

The schema review revealed two gaps:

1. **`payroll_period` totals are never updated after creation.**  
   `editPayroll` updates `payroll_basicpay`, `payroll_additions`, and `payroll_deductions`, but leaves `basicpay_total`, `additions_total`, `deductions_total`, and `net_pay` in `payroll_period` at their initial zero values. The frontend computes correct totals on the fly via `computePayroll()`, but any backend process or future report that queries the DB directly sees stale data.

2. **`approved_by` is never written during approval.**  
   `approvePayroll` only sets `status = "Approved"`. The `approved_by` column (int4, nullable) stays null, making it impossible to know who approved a payroll without reading the audit log.

---

## Changes

### 1. `src/hooks/usePayrollMutations.js`

#### Added import
```js
import { computePayroll } from "@/lib/payrollUtils";
```

#### `editPayroll` — compute & write totals
After the 3 related-table upserts succeed, we now:
- Merge current payroll data with the updated fields
- Call `computePayroll()` to get canonical totals
- Write them back to `payroll_period`

```js
const currentPayroll = emp[`payroll_${period}`] || {};
const merged = { ...currentPayroll, ...updatedFields };
const computed = computePayroll(merged);

const { error: periodError } = await supabase
  .from("payroll_period")
  .update({
    basicpay_total: computed.total_basic_pay,
    additions_total: computed.total_earnings - computed.total_basic_pay,
    deductions_total: computed.total_deductions,
    net_pay: computed.net_pay,
  })
  .eq("pr_period_id", pr_period_id);
```

If the totals update fails, the mutation returns `false` and shows a toast error. The raw field updates already succeeded, but the caller is notified that something went wrong.

#### `approvePayroll` — accept & write `approverId`
Signature changed from:
```js
async (id, performedBy, period = "period1")
```
to:
```js
async (id, performedBy, approverId, period = "period1")
```

```js
const updateData = { status: "Approved" };
if (approverId != null) updateData.approved_by = approverId;

await supabase.from("payroll_period").update(updateData).eq("pr_period_id", pr_period_id);
```

#### `unapprovePayroll` — clear `approved_by`
```js
await supabase
  .from("payroll_period")
  .update({ status: "Pending", approved_by: null })
  .eq("pr_period_id", pr_period_id);
```

### 2. `src/components/payroll/PayrollTable.jsx`

Updated the `approvePayroll` call to pass the current user's `emp_id`:

```jsx
onClick={() => approvePayroll(emp.id, perms.user.name, perms.user?.emp_id, currentPeriod)}
```

`unapprovePayroll` does **not** need the extra argument — it unconditionally clears `approved_by` to `null`.

---

## Totals Mapping

| `computePayroll` return | `payroll_period` column | Meaning |
|------------------------|------------------------|---------|
| `total_basic_pay` | `basicpay_total` | Daily pay × work days |
| `total_earnings - total_basic_pay` | `additions_total` | Sum of all additions only |
| `total_deductions` | `deductions_total` | Sum of all deductions |
| `net_pay` | `net_pay` | Earnings − deductions |

This preserves the invariant:  
`basicpay_total + additions_total − deductions_total = net_pay`

---

## Backwards Compatibility

- `approverId` is optional. If the auth user object does not include `emp_id` (e.g., edge function returns a different shape), `approvePayroll` gracefully skips writing `approved_by` rather than failing.
- `editPayroll` callers do not change — the totals update is internal.
- `sendPayroll` is unchanged; it only flips status and does not modify field values, so totals remain correct from the last edit.

---

## Verification

- [ ] `npm run build` passes (0 errors)
- [ ] Editing a payroll field updates `payroll_period` totals in Supabase
- [ ] Approving a payroll writes `approved_by = <user emp_id>`
- [ ] Unapproving a payroll clears `approved_by` to `null`
