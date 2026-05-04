# src/hooks/ — Custom React Hooks

## Responsibility

This directory provides **custom React Hooks** that encapsulate reusable, stateful logic for the payroll application. Specifically, each hook owns a distinct concern:

| Hook | Concern |
|------|---------|
| `usePayroll.js` | **Re-export / Facade** — re-exports `usePayroll` from `PayrollContext` so consumers import from `@/hooks/` rather than `@/context/`. |
| `usePayrollMutations.js` | **Mutations / Command** — Provides all payroll write operations (edit, approve, unapprove, send, create-month, generate-for-new-employee) as stable callbacks. Each operation performs Supabase persistence, calls `computePayroll`, dispatches reducer actions, and writes audit logs. |
| `useRolePermissions.js` | **Authorization / RBAC** — Reads `user` from `AuthContext` and exposes boolean permission flags and field-level access control for admin vs. moderator roles. |
| `useSessionTimeout.js` | **Session Management / Observer** — Monitors DOM user-activity events, tracks idle time via `setInterval`, and triggers a warning toast 1 minute before expiry, then calls an `onTimeout` callback. |

---

## Design Patterns

### 1. Custom Hook Pattern (all files)
Every module exports a function named `use*` that may call other hooks (`useEffect`, `useCallback`, `useState`, `useRef`, `useAuth`) and returns an object of values/functions. This is the canonical React composition pattern.

### 2. Re-export / Facade (usePayroll.js)
`usePayroll.js` is a one-liner that delegates to `@/context/PayrollContext`:
```js
export { usePayroll } from "@/context/PayrollContext";
```
This creates a **barrier of indirection** — consumers import from `@/hooks/` instead of reaching into `@/context/`, making the module boundary explicit.

### 3. Command / Action Dispatcher (usePayrollMutations.js)
Each exported function (`editPayroll`, `approvePayroll`, `unapprovePayroll`, `sendPayroll`, `createPayrollMonth`, `generatePayrollForNewEmployee`) is a **command** that:

1. Receives parameters (ids, field diffs, user info)
2. Persists to Supabase tables (`payroll_period`, `payroll_basicpay`, `payroll_additions`, `payroll_deductions`, `audit_log`)
3. Dispatches a typed action to the `payrollReducer` (e.g. `EDIT_PAYROLL`, `APPROVE_PAYROLL`, `UNAPPROVE_PAYROLL`, `SEND_PAYROLL`, `ADD_AUDIT_LOG`)
4. Uses `sonner` `toast` for user feedback
5. Returns `boolean` success/failure and wraps everything in `setMutationLoading(true/false)`

All commands are wrapped in `useCallback` with appropriate dependency arrays (`[employees, setMutationLoading, dispatch]`).

### 4. Strategy Pattern (usePayrollMutations.js — field maps)
Three lookup maps (`basicpayMap`, `additionsMap`, `deductionsMap`) act as a **strategy** for translating frontend field names to database column names:
```js
const basicpayMap  = { daily_pay: "daily_pay", work_days: "work_days", ... };
const additionsMap = { holiday_pay: "holiday_pay", ..., commission: "commission", ... };
const deductionsMap = { cash_advance: "cash_advance", sss: "sss", ... };
```
`Object.entries(updatedFields)` iterates once and routes each field to the correct sub-table via these maps — a form of **polymorphic dispatch without conditionals**.

### 5. Role-Based Access Control (useRolePermissions.js)
A fixed **authorization matrix** driven by the `user.role` property:
- `isAdmin = user?.role === "admin"`
- `isModerator = user?.role === "moderator"`
- **Boolean flags** for UI gating (e.g. `canViewDailyRate`, `canViewAuditLog`, `canApprovePayroll`)
- **`canEditField(field)`** — function-level permission using `MODERATOR_EDITABLE_FIELDS` allowlist
- **UI hint properties** (`editButtonText`, `editModalNote`) enable the consumer to adapt without extra logic

### 6. Observer Pattern (useSessionTimeout.js)
The hook subscribes to five DOM events (`mousemove`, `keydown`, `click`, `scroll`, `touchstart`) on `window` via `addEventListener`. On each event, an activity handler resets an idle timer. A `setInterval` running every 10s checks elapsed idle time against `timeoutMs`.

### 7. Throttle Pattern (useSessionTimeout.js)
The `handleActivity` callback uses a `throttleRef` to reject events firing more frequently than once per 1000ms:
```js
if (now - throttleRef.current > 1000) {
  resetActivity();
  throttleRef.current = now;
}
```
This prevents CPU saturation from high-frequency events like `mousemove` and `scroll`.

### 8. Ref + State Dual Storage (useSessionTimeout.js)
Two variables track warning state:
- `isWarning` (React state) — triggers UI re-render
- `isWarningRef` (ref) — avoids race conditions inside the interval callback

Similarly, `toastIdRef` holds the toast ID for programmatic dismissal.

---

## Data & Control Flow

### usePayroll.js
```
Consumer Component
  ↓ import { usePayroll } from "@/hooks/usePayroll"
  ↓ delegates to
  usePayroll()  ←  PayrollContext
  ↓ returns
  { employees, loading, error, mutationLoading, payrollSent, currentPeriod,
    selectedMonth, availableMonths, switchPeriod, switchMonth,
    editPayroll, approvePayroll, unapprovePayroll, sendPayroll,
    createPayrollMonth, refreshPayrollData, generatePayrollForNewEmployee }
```

### usePayrollMutations.js — Flow per command

**editPayroll(id, updatedFields, performedBy, period = "period1")**
1. Finds employee in `employees` array → extracts `pr_period_id_${period}`
2. Routes `updatedFields` through `basicpayMap` / `additionsMap` / `deductionsMap`
3. Sanitizes via `sanitizeForDB` (empty string/NaN → `0`)
4. Calls `supabase.from("payroll_basicpay|additions|deductions").upsert()`
5. On success, merges fields → calls `computePayroll(merged)` (pure function from `@/lib/payrollUtils`)
6. Updates `payroll_period.basicpay_total`, `additions_total`, `deductions_total`, `net_pay`
7. Inserts row into `audit_log` table
8. Dispatches `EDIT_PAYROLL` + `ADD_AUDIT_LOG` to reducer
9. Returns `true` / `false`

**approvePayroll(id, performedBy, approverId, period)**
1. Looks up `pr_period_id` → updates `payroll_period` with `{ status: "Approved", approved_by }`
2. Inserts audit log (action: `"Approved"`)
3. Dispatches `APPROVE_PAYROLL` + `ADD_AUDIT_LOG`

**unapprovePayroll(id, performedBy, period)** — inverse of approve
1. Updates `payroll_period` with `{ status: "Pending", approved_by: null }`
2. Audit action: `"Unapproved"`
3. Dispatches `UNAPPROVE_PAYROLL` + `ADD_AUDIT_LOG`

**sendPayroll(performedBy, period)**
1. Collects all `pr_period_id_${period}` values across all employees
2. Bulk-updates `payroll_period` → `{ status: "Sent" }` via `.in()`
3. Bulk-inserts audit entries for every employee
4. Dispatches `SEND_PAYROLL` + per-employee `ADD_AUDIT_LOG`

**createPayrollMonth(yearMonth)**
1. Splits `"YYYY-MM"` → computes `period1From` (01), `period1To` (15), `period2From` (16), `period2To` (last day)
2. Checks for existing `payroll_period` with `date_from === period1From` → rejects if exists
3. Fetches all `employee.emp_id`
4. Creates 2×`payroll_period` rows per employee (one per period)
5. Creates zero-filled child rows in `payroll_basicpay`, `payroll_additions`, `payroll_deductions`
6. Returns `{ success: boolean, error?: string }`

**generatePayrollForNewEmployee(empId)**
1. Detects current month boundaries
2. **Smart check**: queries `payroll_period` for any existing period1 entry → skips if admin hasn't generated payroll yet (_returns `{ success: true, skipped: true }`_)
3. If payroll exists, inserts 2 `payroll_period` rows + 3 child-table rows each
4. Returns `{ success: true, skipped: false }`

### useRolePermissions.js — Data flow
```
AuthProvider
  ↓ user object { role: "admin" | "moderator" }
useAuth()
  ↓
useRolePermissions()
  ↓ returns
  { user, isAdmin, isModerator,
    canViewDailyRate, canViewTotalBasicPay, canViewFinalPay, canViewTotalsRow,
    canEditPayroll, canEditAllFields, canEditField(field), canApprovePayroll,
    canUnapprovePayroll, canViewPayslip, canViewAuditLog, canEditEmployee,
    moderatorEditableFields, editButtonText, editModalNote }
```

### useSessionTimeout.js — Control flow
```
Mount
  ↓
lastActivityRef ← Date.now()
  ↓
addEventListener("mousemove|keydown|click|scroll|touchstart", handleActivity)
setInterval(every 10s, checkIdle)
  ↓
handleActivity (throttled to 1s) → resetActivity()
  ├─ lastActivityRef ← now
  ├─ isWarning ← false, isWarningRef ← false
  └─ toast.dismiss(warning toast)
  ↓
checkIdle loop:
  idle = now - lastActivityRef
  ├─ idle >= timeoutMs? → toast.dismiss() + onTimeout()     [session expired]
  ├─ idle >= timeoutMs - WARNING_MS && !isWarningRef?
  │     → setIsWarning(true)
  │     → toast.warning("Your session will expire in 60 seconds...",
  │         action: { label: "Continue", onClick: resetActivity })
  └─ else → no-op
  ↓
Unmount:
  removeEventListener (all 5) + clearInterval(timer) + toast.dismiss
```

**State machine:**
```
[Active] ──idle >= timeoutMs - WARNING_MS──→ [Warning] ──idle >= timeoutMs──→ [Expired → onTimeout()]
   ↑                                              │
   └── user activity (resetActivity) ─────────────┘
```

---

## Integration Points

### Dependencies (imported by these hooks)

| Import | Used by | Purpose |
|--------|---------|---------|
| `@/context/PayrollContext` | `usePayroll.js` | Re-exports `usePayroll` context consumer |
| `react` (`useCallback`, etc.) | `usePayrollMutations.js`, `useSessionTimeout.js` | React hook primitives |
| `@/lib/supabaseClient` | `usePayrollMutations.js` | Supabase client for DB operations |
| `@/lib/payrollUtils` (`computePayroll`) | `usePayrollMutations.js` | Pure function to calculate totals |
| `sonner` (`toast`) | `usePayrollMutations.js`, `useSessionTimeout.js` | Toast notifications |
| `@/context/AuthContext` (`useAuth`) | `useRolePermissions.js` | Consumes authenticated user + role |

### Consumers (modules that import these hooks)

| Hook | Consumer | Usage |
|------|----------|-------|
| `usePayroll` | Any component within `<PayrollProvider>` | Access payroll state and actions |
| `usePayrollMutations` | `PayrollContext.jsx` (line 319) | Instantiated inside `PayrollProvider` to expose mutation methods |
| `useRolePermissions` | Any component needing RBAC | Permission-gated UI rendering |
| `useSessionTimeout` | `AuthContext.jsx` (line 109) | Drives the idle-timeout → auto-logout flow |

### Database tables accessed (via Supabase)

| Table | Operations in `usePayrollMutations.js` |
|-------|----------------------------------------|
| `payroll_period` | `select`, `update` (status, totals, approved_by), `insert` (batch) |
| `payroll_basicpay` | `upsert` (by `pr_period_id`), `insert` (batch) |
| `payroll_additions` | `upsert` (by `pr_period_id`), `insert` (batch) |
| `payroll_deductions` | `upsert` (by `pr_period_id`), `insert` (batch) |
| `audit_log` | `insert` (single + batch) |
| `employee` | `select` (just `emp_id`) |

### Reducer action types dispatched

| Action type | Dispatched by |
|-------------|---------------|
| `EDIT_PAYROLL` | `editPayroll` |
| `APPROVE_PAYROLL` | `approvePayroll` |
| `UNAPPROVE_PAYROLL` | `unapprovePayroll` |
| `SEND_PAYROLL` | `sendPayroll` |
| `ADD_AUDIT_LOG` | `editPayroll`, `approvePayroll`, `unapprovePayroll`, `sendPayroll` |

### Events emitted / subscribed

| Event | Direction |
|-------|-----------|
| `window: mousemove\|keydown\|click\|scroll\|touchstart` | Subscribed (by `useSessionTimeout`) |
| `onTimeout` callback | Emitted (by `useSessionTimeout` → consumed by `AuthContext.handleTimeout`) |
| `toast.warning` with action button | Emitted (by `useSessionTimeout` → user clicks "Continue" → calls `resetActivity`) |
