# `src/components/payroll/` — Payroll CRUD & Audit UI

## Responsibility

This module implements the **Payroll Record Management** user interface layer. It is responsible for the **presentation, inline editing, approval workflow, audit inspection, and payslip rendering** of individual employee payroll records. It acts as the **View + Controller** in a server-mediated MVC-like architecture, delegating all business logic (computation, persistence, role enforcement) to downstream hooks, libs, and context.

## Design Patterns

| Pattern | Implementation |
|---|---|
| **Modal Dialog (Edit)** | `EditModal` renders a `<Dialog>` (shadcn/ui) for inline payroll field editing. Opened/closed via a `useState` boolean (`editEmployee`) lifted to the parent `PayrollTable`. |
| **Side Sheet (Audit)** | `AuditLogSheet` renders a `<Sheet>` (shadcn/ui) to display audit history. Opened/closed via `useState` (`auditEmployee`) in the parent. |
| **Compound Component / Slot** | All four components compose shadcn/ui primitives (e.g. `<Dialog>`, `<Sheet>`, `<Table>`, `<Tooltip>`) as layout slots, passing `open`/`onOpenChange` for open-state coordination from above. |
| **Lifting State Up** | `PayrollTable` owns the `editEmployee` and `auditEmployee` state and passes it down as props (`open`, `onClose`) to `EditModal` and `AuditLogSheet`. The child never manages its own visibility. |
| **Container / Presenter** | `PayrollTable` is the **container** — it fetches derived data (`getEmployeeData`), manages open-state, wires mutations, and iterates the employee array. The inner `<Table>` rows, `EditModal`, and `AuditLogSheet` are **presenters** receiving pre-shaped props. |
| **Strategy (Role-based Field Permissions)** | `EditModal` delegates to `useRolePermissions().canEditField(key)` to decide whether each `<Input>` is editable or a read-only `<ReadOnlyInput>`. The strategy is injected via a hook, not passed as props. |
| **Live Preview / Optimistic UI** | `EditModal` uses `useWatch` + `useMemo` to compute a `live` payroll summary on every keystroke, displayed in a sidebar "Live Summary" card. The computation is client-side pure (`computePayroll`). |
| **Render Props (via Fragment map)** | Both `EditModal` and `PayslipCard` render lists of fields by mapping over declarative `{ key, label }` arrays, reducing boilerplate. |
| **Template Method (Print)** | `PayslipCard.handlePrint` generates a self-contained HTML document as a string, opens a new window, writes the DOM, and triggers `window.print()`. |

## Data & Control Flow

### Entry Point

All data enters this module via the `PayrollTable` component, which is rendered by an **external consumer** (likely a page component). Props received:

```
PayrollTable({
  employees,        // Array<Employee>  — shaped by payrollTransformer
  showBasic,         // boolean         — column toggle
  showEarnings,      // boolean
  showDeductions,    // boolean
  totals,            // Object | null   — pre-computed aggregate row
  isMonthly,         // boolean         — view mode toggle
})
```

### Internal Flow (PayrollTable)

1. **Employee Filtering** (`activeEmployees`): Filters `employees` to only those that have data for the current period (or either period in monthly mode).
2. **Per-row shaping** (`getEmployeeData(emp)`):
   - In **period mode**: extracts `payroll`, `computed` (from `computePayroll`), `status`, and `auditLog` from the employee, with fallback chains (`emp[payrollKey] || emp.payroll || {}`).
   - In **monthly mode**: calls `computeMonthlySummary(emp)` which sums Period 1 + Period 2 and recomputes totals.
3. **Action column** (period mode only):
   - **Edit** button → `setEditEmployee(emp)` → renders `<EditModal>`.
   - **Approve** / **Unapprove** buttons → calls `approvePayroll()` / `unapprovePayroll()` from `usePayroll()` hook.
   - **Audit Log** button → `setAuditEmployee(emp)` → renders `<AuditLogSheet>`.

### EditModal Flow

1. **Props**: `{ employee, open, onClose }`.
2. Reads `currentPeriod` from `usePayroll()`, resolves the correct `payroll_{period}` key.
3. Initializes **react-hook-form** with a `zodResolver(schema)` and `defaultValues` from `employee[payroll_{currentPeriod}]`.
4. Subscribes to live form state via `useWatch({ control })`.
5. Derives `live` (computed payroll) via `useMemo(() => computePayroll(watched), [watched])`.
6. On submit (`onSubmit`): calls `editPayroll(empId, data, userName, currentPeriod)` from `usePayroll()`. If successful, calls `onClose()`.
7. UI renders each field as either editable `<Input>` or `<ReadOnlyInput>` based on `perms.canEditField(key)`.

### AuditLogSheet Flow

1. **Props**: `{ employee, open, onClose, period }`.
2. Reads `employee[auditLog_{period}]`, sorts descending by `timestamp`.
3. Renders each log entry within a `<ScrollArea>`. For "Payroll Edited" entries, renders a change-detail `<Table>` showing field-level `from`/`to` diffs.
4. Currency formatting uses `toLocaleString("en-PH", { style: "currency", currency: "PHP" })`.

### PayslipCard Flow

1. **Props**: `{ employee, period, payrollData }`.
2. Computes payroll via `useMemo(() => computePayroll(payrollData || employee.payroll_period1))`.
3. Renders a static payslip card with **Basic Pay**, **Earnings**, **Deductions**, and **Net Pay** sections (each keyed by `EARNINGS_KEYS` / `DEDUCTIONS_KEYS`).
4. **handlePrint**: Constructs a standalone HTML document with embedded CSS, opens a popup, writes the HTML, and calls `window.print()` after 300ms.
5. **handleEmail**: Displays a `toast.success` placeholder (email sending not yet implemented server-side).

### Data Exit

- **Upward**: Calls to `editPayroll`, `approvePayroll`, `unapprovePayroll` propagate to `PayrollContext` → `usePayrollMutations` → Supabase. Mutations are **not** directly performed by components in this module.
- **Sideways**: No component in this module emits events to sibling modules (no callback props beyond `onClose`).

## Integration Points

### Dependencies (imported by this module)

| Import | Source | Used By |
|---|---|---|
| `usePayroll()` | `@/hooks/usePayroll` (re-exports `PayrollContext`) | `PayrollTable`, `EditModal` |
| `useRolePermissions()` | `@/hooks/useRolePermissions` | `PayrollTable`, `EditModal` |
| `computePayroll` | `@/lib/payrollUtils` | `PayrollTable`, `EditModal`, `PayslipCard` |
| `computeMonthlySummary` | `@/lib/payrollUtils` | `PayrollTable` |
| `formatCurrency` | `@/lib/payrollUtils` | `PayrollTable`, `EditModal`, `PayslipCard` |
| `zodResolver` / `z` | `@hookform/resolvers/zod`, `zod` | `EditModal` |
| `useForm` / `useWatch` | `react-hook-form` | `EditModal` |
| `format` | `date-fns` | `AuditLogSheet` |
| `cn` | `@/lib/utils` | `EditModal` |
| `toast` | `sonner` | `PayslipCard` |
| Shadcn/ui primitives | `@/components/ui/*` | All four components |
| Lucide icons | `lucide-react` | All four components |
| Logo image | `@/images/logo.png` | `PayslipCard` |

### Consumers (modules that import from this directory)

| Consumer | Imported Component | Usage |
|---|---|---|
| Pages / feature containers (external) | `PayrollTable` | Primary entry point. The page renders `<PayrollTable>` passing the `employees` array and column-toggle flags. |
| Pages / feature containers (external) | `PayslipCard` | Rendered on a dedicated payslip view or print route. |
| `PayrollTable` (this dir) | `EditModal`, `AuditLogSheet` | Internal use only — these are **not** exported for external consumption. |

### Exports (public API of this module)

| Export | Type | Purpose |
|---|---|---|
| `PayrollTable` | `default` (function component) | Main payroll data table with edit/approve/audit actions |
| `EditModal` | `default` (function component) | Payroll edit dialog (not directly used outside this dir) |
| `AuditLogSheet` | `default` (function component) | Audit log side sheet (not directly used outside this dir) |
| `PayslipCard` | `default` (function component) | Standalone payslip display card with print/email actions |

### Key Assumptions & Contracts

- **Employee shape**: Employees arrive pre-shaped by `shapeEmployees()` in `payrollTransformer`. Each employee is expected to have `id`, `name`, `position`, `department`, `email`, and period-keyed properties (`payroll_period1`, `payroll_period2`, `status_period1`, `status_period2`, `auditLog_period1`, `auditLog_period2`). Legacy fallback keys (`payroll`, `status`, `auditLog`) are supported but deprecated.
- **Period convention**: `"period1"` = first half of month (days 1–15), `"period2"` = second half (day 16+). `currentPeriod` is auto-detected from `new Date().getDate()`.
- **Payroll sent guard**: When `payrollSent` is `true`, the Edit, Approve, and Unapprove buttons in `PayrollTable` are disabled, and tooltips explain: "Edit/Approve disabled after payroll sent".
- **Role model**: Two roles (admin, moderator). Admin may edit all fields; moderator is restricted to `MODERATOR_EDITABLE_FIELDS` (`work_days`, `wellness_allowance`, `communication_allowance`, `birthday_allowance`, `allowance`). Only admin sees daily rate, final pay, totals row, approval buttons, and audit log button.
- **No direct Supabase calls**: Components never invoke `supabase.*` directly. All persistence flows through `PayrollContext` → `usePayrollMutations`.
