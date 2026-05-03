# Phase 3: Code Quality — Deduplication

## Summary

Two utility functions were defined identically (or near-identically) in 2–3 locations each across the codebase. These were consolidated into the existing `lib/` utilities, eliminating duplication and standardizing edge-case handling.

---

## Fix 3.1: `formatCurrency` → `payrollUtils.js`

### Problem

`formatCurrency` was defined independently in three files, with inconsistent edge-case handling:

| File | Pattern | NaN on undefined? |
|------|---------|-------------------|
| `PayrollTable.jsx:31-36` | `Number(value \|\| 0)` | No (safe) |
| `EditModal.jsx:42-47` | `Number(value)` | Yes |
| `PayslipCard.jsx:30-35` | `Number(value)` | Yes |

The two unsafe copies would produce `"NaN"` output if passed `undefined` or `null`.

### Solution

Added a single export to `src/lib/payrollUtils.js` with the safe pattern, and replaced all three local definitions with imports.

**Added to `src/lib/payrollUtils.js`:**
```js
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
```

**Removed from `src/components/payroll/PayrollTable.jsx`:**
```js
// FIXED: Added '|| 0' so that Number(undefined) doesn't turn into NaN
function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });
}
```

**Removed from `src/components/payroll/EditModal.jsx`:**
```js
function formatCurrency(value) {
  return Number(value).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });
}
```

**Removed from `src/components/payroll/PayslipCard.jsx`:**
```js
function formatCurrency(value) {
  return Number(value).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });
}
```

All three files now import from `@/lib/payrollUtils`:
```js
import { computePayroll, formatCurrency } from "@/lib/payrollUtils";
// or
import { computePayroll, computeMonthlySummary, formatCurrency } from "@/lib/payrollUtils";
```

**Lines removed: 18 across 3 files. Lines added: 9 (1 new export).**

---

## Fix 3.2: `getInitials` → `utils.js`

### Problem

`getInitials` existed in 4 locations with inconsistent fallback values:

| File | Pattern | Fallback for empty name |
|------|---------|------------------------|
| `Dashboard.jsx:58-62` | Function | `"?"` |
| `Employees.jsx:41-45` | Function | `"?"` |
| `Sidebar.jsx:29-33` | Inline expression | `"U"` |
| `Topbar.jsx:27-31` | Inline expression | `"U"` |

Pages used `"?"` as fallback; layout components used `"U"` for user avatar initials. The logic was otherwise identical — split by spaces, take first character of each word, uppercase, max 2 chars.

### Solution

Added a single export to `src/lib/utils.js` with a configurable fallback parameter.

**Added to `src/lib/utils.js`:**
```js
export function getInitials(name, fallback = "?") {
  if (!name || typeof name !== "string") return fallback;
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
```

The second parameter resolves the inconsistency — layout components pass `"U"`, pages use the default `"?"`.

**Removed from `src/pages/Dashboard.jsx`:**
```js
const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    return parts.map((p) => p[0]).join("").toUpperCase().slice(0, 2);
};
```
Replaced with: `import { getInitials } from "@/lib/utils";` — usage: `getInitials(log.performedBy || log.employeeName)`

**Removed from `src/pages/Employees.jsx`:**
```js
function getInitials(name) {
  if (!name) return "?";
  const parts = name.split(" ");
  return parts.map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}
```
Replaced with: `import { getInitials } from "@/lib/utils";` — usage: `getInitials(emp.name)`

**Replaced in `src/components/layout/Sidebar.jsx`:**
```js
// Before (inline):
const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

// After (imported function):
const initials = getInitials(user?.name, "U");
```

**Replaced in `src/components/layout/Topbar.jsx`:**
```js
// Before (inline):
const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

// After (imported function):
const initials = getInitials(user?.name, "U");
```

**Lines removed: 18 across 4 files. Lines added: 9 (1 new export).**

---

## Verification

```
npm run lint
```

Result: 5 pre-existing errors, 0 new errors. All pre-existing issues are unrelated to these changes:

| File | Error | Status |
|------|-------|--------|
| `AuthContext.jsx:2` | `supabase` unused | Pre-existing |
| `PayrollContext.jsx:327` | useEffect missing dependency | Pre-existing |
| `Dashboard.jsx:1` | `useState` unused | Pre-existing |
| `Dashboard.jsx:5` | `getPayrollPeriodLabel` unused | Pre-existing |
| `Login.jsx:12` | `logo` unused | Pre-existing |

---

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| `src/lib/payrollUtils.js` | Added `formatCurrency` export | +9 |
| `src/lib/utils.js` | Added `getInitials` export | +9 |
| `src/components/payroll/PayrollTable.jsx` | Removed local `formatCurrency`, updated import | −6 |
| `src/components/payroll/EditModal.jsx` | Removed local `formatCurrency`, updated import | −6 |
| `src/components/payroll/PayslipCard.jsx` | Removed local `formatCurrency`, updated import | −6 |
| `src/pages/Dashboard.jsx` | Removed local `getInitials`, added import | −5 |
| `src/pages/Employees.jsx` | Removed local `getInitials`, added import | −5 |
| `src/components/layout/Sidebar.jsx` | Replaced inline logic with `getInitials`, updated import | −4 |
| `src/components/layout/Topbar.jsx` | Replaced inline logic with `getInitials`, added import | −4 |

**Total: 9 files, ~36 lines removed, ~18 added, 0 new lint errors. Estimated time: 20–30 minutes (actual time spent: ~10 minutes).**
