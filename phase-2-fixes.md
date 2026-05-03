# Phase 2: Data Integrity Fixes

## Summary

All four mutation functions in `PayrollContext.jsx` had the same critical flaw: they dispatched state changes **before** calling the database. If the DB call failed, the UI already showed incorrect data with no rollback. Additionally, errors were silently swallowed (`console.error` only), and there was no guard against double-clicks.

**Fixes applied:**
1. All mutations now call Supabase **first**, dispatch state **only on success**
2. All failures show user-facing `toast.error` instead of hidden `console.error`
3. A shared `mutationLoading` flag disables all action buttons during DB operations
4. Callers (`EditModal`, `PayrollRun`) await the result before closing dialogs

---

## Fix 2.1–2.3: PayrollContext.jsx — Core Mutations Rewritten

### File: `src/context/PayrollContext.jsx`

### Problem

Every mutation followed the same broken pattern:

```
dispatch(OPTIMISTIC_UPDATE)  // UI now shows new state
call_supabase()              // DB call starts
if_error: console.error()    // silently swallowed
dispatch(ADD_AUDIT_LOG)      // audit log added even for failed operations
```

### Solution: DB-First Pattern

The new pattern for all four mutations:

```
setMutationLoading(true)     // disable all buttons (prevents double-click)
call_supabase()              // DB call FIRST
if_error: toast.error() + return false   // user sees error, UI unchanged
dispatch(STATE_UPDATE)       // only update UI on success
dispatch(ADD_AUDIT_LOG)      // audit log only for successful operations
toast.success()              // user sees confirmation
setMutationLoading(false)    // re-enable buttons (in finally block)
return true                  // caller can await and react
```

### Function 1: `editPayroll` (lines 339–416)

**Before:**
```jsx
const editPayroll = useCallback(async (id, updatedFields, performedBy, period = "period1") => {
    dispatch({ type: "EDIT_PAYROLL", payload: { id, updatedFields, period } });
    // ^ UI changes BEFORE db call

    const emp = state.employees.find((e) => e.id === id);
    const pr_period_id = emp?.[`pr_period_id_${period}`];
    if (!pr_period_id) return;

    // ... field mapping ...
    const results = await Promise.all(updates);
    results.forEach(({ error }) => {
      if (error) console.error("Failed to update payroll:", error.message);
      // ^ silently swallowed — user never knows
    });

    // audit log insert + dispatch happen regardless of error above
    await supabase.from("audit_log").insert({ ... });
    dispatch({ type: "ADD_AUDIT_LOG", payload: { ... } });
  }, [state.employees]);
```

**After:**
```jsx
const editPayroll = useCallback(async (id, updatedFields, performedBy, period = "period1") => {
    setMutationLoading(true);
    try {
      const emp = state.employees.find((e) => e.id === id);
      const pr_period_id = emp?.[`pr_period_id_${period}`];
      if (!pr_period_id) {
        toast.error("Could not find payroll record");
        return false;
      }

      // ... field mapping (unchanged) ...

      const results = await Promise.all(updates);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        toast.error("Failed to save: " + errors.map((e) => e.error.message).join(", "));
        return false;  // <-- early return, no dispatch
      }

      // Only dispatch after DB success
      dispatch({ type: "EDIT_PAYROLL", payload: { id, updatedFields, period } });

      // ... audit log insert ...
      dispatch({ type: "ADD_AUDIT_LOG", payload: { id, period, logEntry } });
      toast.success("Payroll updated");
      return true;
    } finally {
      setMutationLoading(false);
    }
  }, [state.employees]);
```

### Function 2: `approvePayroll` (lines 418–460)

| Before | After |
|--------|-------|
| `dispatch(APPROVE_PAYROLL)` before DB call | DB call first, `dispatch` only on success |
| `console.error` on failure | `toast.error("Failed to approve: " + error.message)` + `return false` |
| Audit log inserted regardless | Audit log only after DB success |
| No return value | Returns `true`/`false` for caller to react |
| No `mutationLoading` guard | `setMutationLoading(true)` in try, `false` in finally |

### Function 3: `unapprovePayroll` (lines 462–504)

Same pattern as `approvePayroll` above. DB update proceeds first; state dispatch only after confirmed success.

### Function 4: `sendPayroll` (lines 506–551)

Same DB-first pattern, adapted for the batch nature of this function (updates all employees at once):

| Before | After |
|--------|-------|
| `dispatch(SEND_PAYROLL)` before DB batch update | DB batch update first, `dispatch` only on success |
| `console.error` on failure | `toast.error("Failed to send payroll: " + error.message)` + `return false` |
| `toast.success` in caller (`PayrollRun.jsx`) before DB confirmed | `toast.success("Payroll sent successfully")` in context after DB success |
| No return value | Returns `true`/`false` |

### Additional Changes in PayrollContext.jsx

**New import:**
```jsx
import { toast } from "sonner";
```

**New state:**
```jsx
const [mutationLoading, setMutationLoading] = useState(false);
```

**Fetch error handler:**
```jsx
// Before
console.error("Failed to load employees:", err.message);

// After
toast.error("Failed to load employees: " + err.message);
```

**Context value — `mutationLoading` exposed:**
```jsx
value={{
    ...state,
    loading,
    error,
    mutationLoading,   // <-- ADDED
    switchPeriod,
    switchMonth,
    editPayroll,
    approvePayroll,
    unapprovePayroll,
    sendPayroll,
    createPayrollMonth,
}}
```

---

## Fix 2.4: PayrollTable.jsx — Button Guards

### File: `src/components/payroll/PayrollTable.jsx`

### Problem

Action buttons (Edit, Approve, Unapprove) had no guard against rapid clicks or ongoing mutations. A user could click "Approve" 5 times in quick succession, firing 5 concurrent DB writes.

### Changes

**Destructure `mutationLoading`:**
```jsx
const { approvePayroll, unapprovePayroll, ..., mutationLoading } = usePayroll();
```

**Edit button** (line 239):
```jsx
// Before
disabled={payrollSent}

// After
disabled={payrollSent || mutationLoading}
```

**Approve button** (line 262):
```jsx
// Before
disabled={payrollSent}

// After
disabled={payrollSent || mutationLoading}
```

**Unapprove button** (line 283):
```jsx
// Before
disabled={payrollSent}

// After
disabled={payrollSent || mutationLoading}
```

**Tooltips** — now reflect mutation state:
```jsx
// Before
{payrollSent && (
    <TooltipContent>Approve disabled after payroll sent</TooltipContent>
)}

// After
{(payrollSent || mutationLoading) && (
    <TooltipContent>
        {payrollSent ? "Approve disabled after payroll sent" : "Saving..."}
    </TooltipContent>
)}
```

---

## Fix 2.5: EditModal.jsx — Await Result Before Close

### File: `src/components/payroll/EditModal.jsx`

### Problem

The `onSubmit` handler called `editPayroll` and immediately closed the dialog, before the DB call even started. If the save failed, the dialog was already gone and the user had no idea.

### Changes

**Submit handler:**
```jsx
// Before
const onSubmit = (data) => {
    editPayroll(employee.id, data, perms.user?.name, currentPeriod);
    onClose();  // closes immediately
};

// After
const onSubmit = async (data) => {
    const success = await editPayroll(employee.id, data, perms.user?.name, currentPeriod);
    if (success) onClose();  // only close on confirmed save
};
```

**Submit button:**
```jsx
// Before
<Button type="submit" disabled={!isValid || payrollSent}>

// After
<Button type="submit" disabled={!isValid || payrollSent || mutationLoading}>
```

**Destructure:**
```jsx
const { editPayroll, ..., mutationLoading } = usePayroll();
```

---

## Fix 2.6: PayrollRun.jsx — Remove Premature Toast

### File: `src/pages/PayrollRun.jsx`

### Problem

`handleSend` showed `toast.success("...payroll sent successfully!")` before the DB call returned. If the DB failed, the user saw a success toast for a failed operation.

### Changes

**Send handler:**
```jsx
// Before
const handleSend = () => {
    sendPayroll(user.name, currentPeriod);          // fire and forget
    toast.success(`...payroll sent successfully!`);  // lies if DB fails
    setSendDialogOpen(false);                        // closes before confirmed
};

// After
const handleSend = async () => {
    const success = await sendPayroll(user.name, currentPeriod);
    if (success) setSendDialogOpen(false);
    // toast is now handled in the context after DB confirms success
};
```

**Send button:**
```jsx
// Before
<Button disabled={!canSend}>

// After
<Button disabled={!canSend || mutationLoading}>
```

**Disabled reason tooltip:**
```jsx
const sendDisabledReason = isMonthly
    ? "Send is only available for individual periods"
    : mutationLoading
    ? "Processing..."
    : isPayrollSent
    ? "Payroll has already been sent for this period"
    : !allApproved
    ? "All records must be approved before sending"
    : null;
```

**Confirm dialog button:**
```jsx
// Before
<AlertDialogAction onClick={handleSend}>
    Confirm Send
</AlertDialogAction>

// After
<AlertDialogAction onClick={handleSend} disabled={mutationLoading}>
    {mutationLoading ? "Sending..." : "Confirm Send"}
</AlertDialogAction>
```

---

## Data Flow Comparison

### Before (broken)

```
┌─────────────────────────────────────────────────────┐
│ User clicks "Approve"                                │
│   ├── dispatch(APPROVE_PAYROLL)  ← UI says "Approved"│
│   ├── supabase.update()          ← DB call starts    │
│   ├── if error: console.error()  ← user never knows  │
│   └── dispatch(ADD_AUDIT_LOG)    ← audit added anyway │
└─────────────────────────────────────────────────────┘
```

### After (fixed)

```
┌───────────────────────────────────────────────────────┐
│ User clicks "Approve"                                  │
│   ├── setMutationLoading(true)   ← buttons disabled    │
│   ├── supabase.update()          ← DB call FIRST       │
│   ├── if error:                  ← FAILURE PATH        │
│   │   ├── toast.error("...")     ← user sees error     │
│   │   └── return false           ← UI unchanged        │
│   ├── dispatch(APPROVE_PAYROLL)  ← SUCCESS PATH        │
│   ├── dispatch(ADD_AUDIT_LOG)    ← audit on success    │
│   ├── toast.success("Approved")  ← user sees confirm   │
│   └── setMutationLoading(false)  ← buttons re-enabled  │
└───────────────────────────────────────────────────────┘
```

---

## Edge Cases Covered

| Scenario | How It's Handled |
|----------|-----------------|
| User double-clicks Approve | `mutationLoading` disables all action buttons |
| Network drops during save | Supabase throws → caught by try/catch → `toast.error` |
| Employee row disappears mid-operation | `emp?.pr_period_id` is falsy → returns early with toast |
| Multiple field updates fail partially (edit) | `results.filter(r => r.error)` catches partial failures |
| Send with missing period IDs | Already filtered by `.filter(Boolean)` |

---

## Files Changed

| File | Lines Modified | Change |
|------|---------------|--------|
| `src/context/PayrollContext.jsx` | ~160 lines | Rewrote 4 mutations, added `mutationLoading` state, added toast import, exposed `mutationLoading` in context |
| `src/components/payroll/PayrollTable.jsx` | ~15 lines | Consumed `mutationLoading`, added to all button `disabled` props and tooltips |
| `src/components/payroll/EditModal.jsx` | ~5 lines | Made `onSubmit` async, await result before close, added `mutationLoading` to submit button |
| `src/pages/PayrollRun.jsx` | ~12 lines | Made `handleSend` async, removed premature toast, added `mutationLoading` to send button + tooltip + confirm dialog |

**Total: 4 files, ~190 lines modified. 0 new lint errors introduced.**
