# `src/pages/` — Codemap

## Responsibility

**Route-level page components** — the topmost layer of the UI composition hierarchy. Each file in this directory is a **page-level React component** bound to a specific route in `src/App.jsx`. These components are responsible for:

- **Orchestrating layout** (page structure, headers, action bars) for their respective route.
- **Consuming global state** through custom hooks (`usePayroll`, `useAuth`, `useRolePermissions`) and passing derived data down to presentational child components.
- **Managing page-local UI state** (search terms, filters, pagination, dialog visibility, column toggles).
- **Handling user-initiated actions** (login, approval, payroll send, month creation) by calling mutation functions exposed by context hooks.
- **Rendering loading/empty/error states** before the primary content.

This directory does **not** contain data-fetching logic, API clients, or business logic — those are delegated to `src/context/`, `src/hooks/`, and `src/lib/`.

---

## Design Patterns

### 1. Container / Presentational (Controller / View)

Each page acts as a **container (controller)** that manages state and passes data as props to leaf **presentational (view)** components. Examples:

| Container (page)       | Presentational children consumed                            |
|------------------------|-------------------------------------------------------------|
| `Dashboard`            | `<StatCards>`, `<Card>`, `<Avatar>`, `<Button>`             |
| `Employees`            | `<PayslipCard>`, `<AddEmployeeModal>`, `<Table>`, `<Badge>` |
| `PayrollRun`           | `<PayrollTable>`, `<MonthPicker>`, `<Tooltip>`, `<AlertDialog>` |
| `Login`                | `<Input>`, `<Button>`, `<Label>` (all self-contained)       |

### 2. Custom Hook as State Interface

All page components consume shared application state exclusively through custom hooks, never directly calling Supabase or the reducer:

- **`usePayroll()`** — Returns `{ employees, payrollPeriod, payrollSent, currentPeriod, selectedMonth, availableMonths, switchPeriod, switchMonth, sendPayroll, createPayrollMonth, refreshPayrollData, editPayroll, approvePayroll, unapprovePayroll, generatePayrollForNewEmployee, loading, error, mutationLoading }`.
- **`useAuth()`** — Returns `{ user, isAuthenticated, login, logout, sessionExpiresAt }`.
- **`useRolePermissions()`** — Returns `{ isAdmin, isModerator, canEditPayroll, canApprovePayroll, ... }`.

### 3. useReducer + Context (Global State)

The `PayrollContext` (consumed via `usePayroll`) uses `useReducer` internally. The dispatch actions `SET_EMPLOYEES`, `SWITCH_PERIOD`, `SWITCH_MONTH`, `APPROVE_PAYROLL`, `SEND_PAYROLL`, etc. are triggered indirectly through hook-wrapped functions. Page components never import `dispatch` directly — they call functions like `switchPeriod(p.key)` or `approvePayroll(id, period)`.

### 4. useMemo for Derived / Computed Data

Each page computes view-specific derived data via `useMemo` to avoid recomputation on every render:

- **Dashboard**: `stats` (aggregated counts + total net payout), `payrollStatus` (derived badge state), `recentActivity` (flat-mapped + sorted audit logs).
- **Employees**: `filtered` (client-side search + sort over `employees`).
- **PayrollRun**: `filteredEmployees` (search + status filter), `approvedCount`, `totals` (summed payroll fields across all filtered employees).

### 5. Controlled Form + Zod Validation (Login)

The `Login` page uses `react-hook-form` with `@hookform/resolvers/zod` and a `z.object({ email, password })` schema for declarative client-side validation. This is an **adapter pattern** bridging Zod schemas to the form library.

### 6. Render Guard / Early Return Pattern

All three protected pages (`Dashboard`, `Employees`, `PayrollRun`) return early for loading and error states:

```jsx
if (loading) return <p>Loading...</p>;
if (error) return <p>Error: {error}</p>;
```

`PayrollRun` additionally returns a styled error card for database errors. `Login` does not have loading guards (its async state is tracked via `isLoading` and reflected in the submit button spinner).

### 7. Role-Gated Rendering

Feature visibility is controlled by permission booleans from `useRolePermissions()`:

- **Employees**: `isAdmin` controls the "Add Employee" button and `<AddEmployeeModal>`.
- **PayrollRun**: `isAdmin` controls the "New Payroll Month" button, the `<MonthPicker>` selector, and the `<Dialog>` for creating months.

### 8. Composed Dialog/Action Confirmation (Guard Pattern)

Destructive or irreversible actions are wrapped in a confirmation dialog before execution:

- **PayrollRun**: The "Send Payroll" button triggers an `<AlertDialog>` with the message *"This action is permanent and cannot be undone."* Confirmation calls `handleSend()` which invokes `sendPayroll(user.name, currentPeriod)`.
- **PayrollRun**: "New Payroll Month" opens a `<Dialog>` with a `<MonthPicker>`; the actual mutation `createPayrollMonth(newMonth)` only fires on explicit confirmation.

---

## Data & Control Flow

### Login Page (`Login.jsx`)

```
User fills form → react-hook-form + Zod validation
    ↓ (on valid submit)
onSubmit(data)
    ↓
useAuth().login(email, password)
    ↓
AuthContext.login() → fetch POST /functions/v1/swift-api { email, password }
    ↓
Response:
  success: true  → navigate("/dashboard", { replace: true })
  success: false → toast.error(result.error)
  catch          → toast.error("Something went wrong...")
```

State transitions in `AuthContext`:
- `login()` sets `user`, `isAuthenticated`, `sessionExpiresAt`, persists JWT to cookie + user to `localStorage`.
- On mount, `useEffect` in `AuthProvider` restores session from cookie or localStorage fallback.
- `useSessionTimeout` fires `handleTimeout` after 30 min of inactivity → clears state + cookie + redirects to `/login`.

### Dashboard Page (`Dashboard.jsx`)

```
usePayroll() → { employees, payrollPeriod, payrollSent, loading, error }
    ↓
useMemo: stats = employees.reduce({ totalEmployees, approved, pending, totalNetPayout })
    ↓         each emp → computePayroll(emp.payroll) → net_pay
useMemo: payrollStatus = derived label/color from payrollSent + stats.pending
useMemo: recentActivity = employees.flatMap(auditLog → sort by timestamp desc → slice(0,10))
    ↓
Props passed:
  <StatCards stats={stats} />
  <Card> renders recentActivity with getInitials(log.performedBy) avatar
  <Card> renders quick-action buttons → navigate("/payroll") / navigate("/employees")
```

### Employees Page (`Employees.jsx`)

```
usePayroll() → { employees, payrollPeriod, loading, error }
useRolePermissions() → { isAdmin }
    ↓
Client-side filtering:
  payrollKey = `payroll_${payrollPeriod}`
  activeEmployeesForPeriod = employees where emp[payrollKey] != null  (unused in render, computed but dead)
    ↓
useMemo: filtered = employees
  .filter(emp.name or emp.department matches search)
  .sort(by name, localeCompare, ascending/descending)
    ↓
Paginated: page = clamp(currentPage, 1, totalPages); paginated = filtered.slice((page-1)*10, page*10)
    ↓
Row click → openPayslip(emp) → setSelectedEmployee(emp) + setDialogOpen(true)
    ↓
<Dialog open={dialogOpen}>
  <PayslipCard employee={selectedEmployee} period={payrollPeriod} />
</Dialog>
```

State transitions:
- `search` change or `sortAsc` toggle → `useEffect` resets `currentPage` to 1.
- `isAdmin && <AddEmployeeModal open={isAddModalOpen} onClose={...} />` renders gated modal.

### PayrollRun Page (`PayrollRun.jsx`)

```
usePayroll() → {
  employees, payrollPeriod, payrollSent_period1, payrollSent_period2,
  currentPeriod, selectedMonth, availableMonths,
  switchPeriod, switchMonth, sendPayroll, createPayrollMonth,
  refreshPayrollData, loading, error, mutationLoading
}
useRolePermissions() → { isAdmin }
useAuth() → { user }
    ↓
Derived keys:
  isMonthly = currentPeriod === "monthly"
  statusKey = isMonthly ? null : `status_${currentPeriod}`
  payrollKey = isMonthly ? null : `payroll_${currentPeriod}`
  isPayrollSent = period1 ? payrollSent_period1 : payrollSent_period2
    ↓
useMemo: filteredEmployees = employees
  .filter(emp.name matches search)
  .filter(status === approved/pending if not monthly and filter !== "all")
    ↓
useMemo: approvedCount = employees where emp[statusKey] === "Approved"
  progress = approvedCount / totalCount
  canSend = !isMonthly && allApproved && !isPayrollSent
    ↓
useMemo: totals = filteredEmployees.reduce(accumulate payroll fields)
  For each employee:
    isMonthly ? computeMonthlySummary(emp) : computePayroll(emp[payrollKey] || emp.payroll)
  Accumulates: daily_pay, work_days, total_basic_pay, holiday_pay, ...,
  total_earnings, total_deductions, net_pay
    ↓
<PayrollTable employees={filteredEmployees} totals={totals}
              showBasic showEarnings showDeductions isMonthly />
    ↓
User Action: Send Payroll
  handleSend() → await sendPayroll(user.name, currentPeriod)
    → PayrollContext dispatches SEND_PAYROLL → sets payrollSent_{period} = true
    ↓
User Action: Create New Month
  handleCreatePayroll() → await createPayrollMonth(newMonth)
    → on success: toast + reset form + refreshPayrollData() (increments refreshKey → re-fetches)
```

Period switching:
```
switchPeriod(p.key) dispatched via PayrollContext
  → updates currentPeriod in reducer
  → triggers re-derivation of statusKey, payrollKey, isPayrollSent, canSend
```

Month switching:
```
switchMonth(monthKey)
  → dispatches SWITCH_MONTH (updates selectedMonth, currentPeriod, payrollPeriod)
  → reshapes employees via shapeEmployees(allPeriodData, month)
  → recalculates sent status from DB data
```

Error/Loading flow:
```
loading === true → skeleton placeholder (10 rows)
error truthy     → styled error card with err.message or err string
```

---

## Integration Points

### Dependencies (imported by pages)

| Module                       | Used By                 | Interface (exports consumed)                                                                 |
|------------------------------|-------------------------|-----------------------------------------------------------------------------------------------|
| `@/hooks/usePayroll`         | Dashboard, Employees, PayrollRun | `usePayroll()` → `{ employees, payrollPeriod, loading, error, switchPeriod, switchMonth, sendPayroll, createPayrollMonth, ... }` |
| `@/context/AuthContext`      | Login, PayrollRun       | `useAuth()` → `{ user, isAuthenticated, login, logout }`                                    |
| `@/hooks/useRolePermissions` | Employees, PayrollRun   | `useRolePermissions()` → `{ isAdmin, isModerator, canEditPayroll, ... }`                    |
| `@/lib/payrollUtils`         | Dashboard, PayrollRun   | `computePayroll(fields)` → `{ total_basic_pay, total_earnings, total_deductions, net_pay }`, `computeMonthlySummary(employee)` → summed payroll object |
| `@/lib/utils`                | Dashboard, Employees    | `getInitials(name)` → 2-char uppercase initials                                              |
| `react-router-dom`           | Dashboard, Login        | `useNavigate()` → `navigate(path, options)`; `Link` component                                |
| `react-hook-form`            | Login                   | `useForm({ resolver: zodResolver(schema) })` → `{ register, handleSubmit, formState }`       |
| `zod` + `@hookform/resolvers`| Login                   | `z.object({...})` → validation schema                                                        |
| `date-fns`                   | Dashboard               | `formatDistanceToNow(date, { addSuffix: true })`                                             |
| `sonner`                     | Login, PayrollRun       | `toast.error(msg)`, `toast.success(msg)`, `toast.info(msg)`                                  |
| `@/images/logo.png`          | Login                   | Static image asset                                                                           |

### Child Components Consumed

| Page         | Components                                                     |
|--------------|----------------------------------------------------------------|
| Dashboard    | `StatCards`, `Card`, `CardHeader`, `CardContent`, `CardTitle`, `Button`, `Avatar`, `AvatarFallback` |
| Employees    | `Table`, `TableBody/Head/Row/Cell`, `Card`, `Input`, `Button`, `Badge`, `Skeleton`, `Avatar`, `Pagination`, `PayslipCard`, `AddEmployeeModal`, `Dialog` |
| PayrollRun   | `PayrollTable`, `Card`, `Input`, `Button`, `Badge`, `Skeleton`, `MonthPicker`, `Tooltip`, `AlertDialog`, `Dialog` |
| Login        | `Button`, `Input`, `Label`                                      |

### Consumers (modules that import pages)

| Consumer   | Import statement                    |
|------------|-------------------------------------|
| `src/App.jsx` | `import Login from "@/pages/Login"` |
|             | `import Dashboard from "@/pages/Dashboard"` |
|             | `import Employees from "@/pages/Employees"` |
|             | `import PayrollRun from "@/pages/PayrollRun"` |

### Route Bindings (defined in `src/App.jsx`)

```jsx
<Route path="/login"       element={<AuthGuard><Login /></AuthGuard>} />
<Route path="/dashboard"   element={<Dashboard />}   />  {/* inside PrivateRoute */}
<Route path="/employees"   element={<Employees />}    />  {/* inside PrivateRoute */}
<Route path="/payroll"     element={<PayrollRun />}   />  {/* inside PrivateRoute */}
<Route path="*"            element={<Navigate to="/dashboard" />} />
```

### Context Provider Hierarchy

```
<ErrorBoundary>
  <AuthProvider>            ← provides useAuth()
    <SettingsProvider>
      <PayrollProvider>     ← provides usePayroll()
        <BrowserRouter>
          <Routes>...</Routes>
        </BrowserRouter>
      </PayrollProvider>
    </SettingsProvider>
  </AuthProvider>
</ErrorBoundary>
```

Pages consume both `AuthContext` (authentication) and `PayrollContext` (payroll data + mutations). The `PrivateRoute` wrapper (inside `AppShell`) gates access to `Dashboard`, `Employees`, and `PayrollRun` behind `isAuthenticated`. The `AuthGuard` wrapper redirects already-authenticated users from `/login` to `/dashboard`.

---

## File Summaries

| File            | Lines | Exports                | Key State (local)                                              | Key Derived Data (useMemo)                     |
|-----------------|-------|------------------------|----------------------------------------------------------------|------------------------------------------------|
| `Login.jsx`     | 242   | `Login` (default)      | `isLoading`, `showPassword`                                    | (none — form state via react-hook-form)        |
| `Dashboard.jsx` | 153   | `Dashboard` (default)  | (none)                                                         | `stats`, `payrollStatus`, `recentActivity`     |
| `Employees.jsx` | 295   | `Employees` (default)  | `search`, `sortAsc`, `currentPage`, `selectedEmployee`, `dialogOpen`, `isAddModalOpen` | `filtered` (search+sort), `paginated` |
| `PayrollRun.jsx`| 509   | `PayrollRun` (default) | `search`, `filter`, `showBasic/Earnings/Deductions`, `sendDialogOpen`, `createDialogOpen`, `newMonth`, `creating` | `filteredEmployees`, `approvedCount`, `totals` |
