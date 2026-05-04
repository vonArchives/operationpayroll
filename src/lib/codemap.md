# `src/lib/` — Operation Payroll

## Responsibility

The **library layer** (`src/lib/`) is a collection of zero-dependency (or minimal-dependency) utility modules that provide **pure business-logic functions**, **data-transformation pipelines**, **formatting helpers**, and the **Supabase client singleton**. It is the sole gateway for database access and payroll arithmetic. All modules are side-effect-free (except `supabaseClient.js` which initialises a singleton) and contain **no React hooks, JSX, or component logic**. This layer enforces the separation of concerns between data/domain logic and UI/presentation.

---

## Design Patterns

### 1. Singleton Pattern — `supabaseClient.js`
- **Module-level export**: `supabase` is a single `createClient(...)` instance created at import time.
- Guards against missing environment variables via an eager throw at module evaluation.
- **Contract**: Exposes the full Supabase JS client API (`.from()`, `.auth`, etc.) to consumers.

### 2. Adapter / Transformer Pattern — `payrollTransformer.js`
- **`shapePeriod(period)`**: Adapts the normalized Supabase relational schema (split across `payroll_basicpay`, `payroll_additions`, `payroll_deductions`, `audit_log` sub-tables) into a flat client-consumable shape.
- **`shapeEmployees(data, selectedMonth)`**: Orchestrator function that groups raw period rows by employee, filters by `selectedMonth`, sorts chronologically, assigns Period 1 (day `<= 15`) vs. Period 2 (day `> 15`), and calls `shapePeriod` per period. Returns a flat array of employee objects with `payroll_period1` / `payroll_period2` keys.
- **Abstraction**: The consumer (`PayrollContext`) never touches relational joins; the transformer abstracts the nested Supabase response shape.

### 3. Pure Function / Computation Pattern — `payrollUtils.js`
- **`computePayroll(fields)`**: Deterministic, stateless function. Takes raw field values, sanitises via `toNum()` (coercing `null`/`undefined`/`NaN`/`""` to `0`), computes `total_basic_pay = daily_pay * work_days`, sums earnings and deductions, and returns `{ total_basic_pay, total_earnings, total_deductions, net_pay }`.
- **`computeMonthlySummary(employee)`**: Aggregation function that sums Period 1 and Period 2 fields, then passes the combined object through `computePayroll`. Used for month-level rollups.
- **`formatCurrency(value)`**: Idempotent locale-aware formatting function using `Intl.NumberFormat` with `"en-PH"` locale and `"PHP"` currency.

### 4. Factory / Builder Pattern — `mockData.js`
- **`splitPayroll(payroll)`**: Pure splitter that halves all monetary values and work days across two semi-monthly periods. Uses `Math.ceil` for work-day distribution and `Math.round` for monetary splits.
- **`baseEmployees` → `mockEmployees`**: The factory iterates `baseEmployees` (static seed data), applies `splitPayroll` per employee, and enriches each entry with `payroll_period1`, `payroll_period2`, and empty `auditLog` arrays. **Export**: `mockEmployees` — the only named export.

### 5. Utility Composition Pattern — `utils.js`
- **`cn(...inputs)`**: Combines `clsx` (conditional class resolution) with `tailwind-merge` (intelligent Tailwind class deduplication). Standard shadcn/ui pattern.
- **`getInitials(name, fallback)`**: Pure string transformer; extracts first two uppercase initials from a space-separated name, with a fallback of `"?"`.

### Abstractions & Interfaces

| Module | Export | Signature | Category |
|---|---|---|---|
| `supabaseClient` | `supabase` | `SupabaseClient` (singleton) | IO / Side-effect |
| `payrollTransformer` | `shapeEmployees` | `(data: Row[], selectedMonth: string) => Employee[]` | Pure / Adapter |
| `payrollUtils` | `formatCurrency` | `(value: number\|string) => string` | Pure / Formatting |
| `payrollUtils` | `computePayroll` | `(fields: Object) => Totals` | Pure / Computation |
| `payrollUtils` | `computeMonthlySummary` | `(employee: Object) => Totals` | Pure / Aggregation |
| `payrollUtils` | `getPeriodLabel` | `() => "Mid-Month"\|"End-of-Month"` | Pure / Calendar |
| `payrollUtils` | `getPayrollPeriodLabel` | `() => string` | Pure / Calendar |
| `payrollUtils` | `getPeriodMultiplier` | `() => 0.5` | Pure / Constant |
| `utils` | `cn` | `(...inputs: ClassValue[]) => string` | Pure / Style |
| `utils` | `getInitials` | `(name: string, fallback?: string) => string` | Pure / String |
| `mockData` | `mockEmployees` | `Employee[]` (constant array) | Seed / Data |

---

## Data & Control Flow

### Flow A: Supabase → Component (read path)

```
                  Supabase REST API
                        │
          ┌─────────────▼──────────────────┐
          │   supabase.from("payroll_run") │  (singleton client)
          │   .select("..., employee(...)) │
          └─────────────┬──────────────────┘
                        │ raw nested rows
          ┌─────────────▼──────────────────┐
          │  shapeEmployees(data, month)   │  (payrollTransformer.js)
          │  ① Build employeeMap           │
          │  ② Filter by selectedMonth     │
          │  ③ Sort by date_from           │
          │  ④ Split P1 (day≤15)/P2 (>15) │
          │  ⑤ shapePeriod() per period    │
          │     → flat payroll fields      │
          │     → remap audit_log          │
          └─────────────┬──────────────────┘
                        │ Employee[] (flat)
          ┌─────────────▼──────────────────┐
          │       PayrollContext            │  (context/PayrollContext.jsx)
          │   stores in state (employees)  │
          └─────────────┬──────────────────┘
                        │ consumed by
          ┌─────────────▼──────────────────┐
          │  PayrollTable / EditModal /    │
          │  PayslipCard / Dashboard etc.  │
          └────────────────────────────────┘
```

### Flow B: Computation chain (display path)

```
  Employee.payroll_period1 / .payroll_period2
                    │
     ┌─────────────▼──────────────────┐
     │  computeMonthlySummary(emp)     │  (payrollUtils.js)
     │   ① sum fields across periods   │
     │   ② computePayroll(combined)    │
     │      → total_basic_pay          │
     │      → total_earnings           │
     │      → total_deductions         │
     │      → net_pay                  │
     └─────────────┬──────────────────┘
                    │
     ┌─────────────▼──────────────────┐
     │  formatCurrency(value)          │  (payrollUtils.js)
     │    → "₱1,234.56"               │
     └─────────────┬──────────────────┘
                    │
     ┌─────────────▼──────────────────┐
     │  PayrollTable / PayslipCard    │
     └────────────────────────────────┘
```

### Flow C: Write path (EditModal → Supabase)

```
  EditModal (edits field values)
       │
       ▼
  computePayroll(fields)  ← real-time preview (pure, no side effect)
       │
       ▼
  usePayrollMutations.updatePayrollPeriod()
       │
       ├── supabase.from("payroll_basicpay").upsert(...)
       ├── supabase.from("payroll_additions").upsert(...)
       └── supabase.from("payroll_deductions").upsert(...)
```

### State transitions within `shapeEmployees`

1. **Grouping**: Raw `period[]` → `Map<empId, { emp, allPeriods }>`
2. **Filtering**: `allPeriods.filter(p → date_from ∈ selectedMonth)`
3. **Sorting**: `.sort((a, b) → date_from ASC)`
4. **Period assignment**: `date_from.day ≤ 15 → period1`, else `period2`
5. **Shaping**: Each period passed through `shapePeriod()` which:
   - Extracts `payroll_basicpay[0]` (or falls back to `{}`)
   - Extracts `payroll_additions[0]` (or falls back to `{}`)
   - Extracts `payroll_deductions[0]` (or falls back to `{}`)
   - Maps `audit_log[]` → `{ id, action, performedBy, timestamp, changes }`
6. **Flat output**: Returns one object per employee with all period data as sibling keys.

### Data shape contract (output of `shapeEmployees`)

```typescript
interface Employee {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  position: string;
  department: string;
  role: "admin" | "moderator" | "employee";
  email: string;
  payroll_period1: PeriodShape | null;
  status_period1: string;
  pr_period_id_period1: number | null;
  auditLog_period1: AuditEntry[];
  payroll_period2: PeriodShape | null;
  status_period2: string;
  pr_period_id_period2: number | null;
  auditLog_period2: AuditEntry[];
  // Legacy aliases (backward compat):
  payroll: PeriodShape;
  status: string;
  auditLog: AuditEntry[];
}
```

---

## Integration Points

### Dependencies (external packages)

| Module | Dependency | Version (inferred) | Usage |
|---|---|---|---|
| `supabaseClient.js` | `@supabase/supabase-js` | latest | Client creation |
| `utils.js` | `clsx` | latest | Conditional class joining |
| `utils.js` | `tailwind-merge` | latest | Tailwind class deduplication |
| `payrollUtils.js` | *(none)* | — | Vanilla JS only |
| `payrollTransformer.js` | *(none)* | — | Vanilla JS only |
| `mockData.js` | *(none)* | — | Vanilla JS only |

### Environment variables

| Variable | Consumed by | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | `supabaseClient.js` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `supabaseClient.js` | Supabase anonymous API key |

### Consumers (modules importing from `src/lib/`)

| Consumer | Imports | Module |
|---|---|---|
| `context/AuthContext.jsx` | `supabase` | `supabaseClient` |
| `context/PayrollContext.jsx` | `supabase`, `shapeEmployees` | `supabaseClient`, `payrollTransformer` |
| `hooks/usePayrollMutations.js` | `supabase`, `computePayroll` | `supabaseClient`, `payrollUtils` |
| `components/payroll/PayrollTable.jsx` | `computePayroll`, `computeMonthlySummary`, `formatCurrency` | `payrollUtils` |
| `components/payroll/EditModal.jsx` | `computePayroll`, `formatCurrency`, `cn` | `payrollUtils`, `utils` |
| `components/payroll/PayslipCard.jsx` | `computePayroll`, `formatCurrency` | `payrollUtils` |
| `pages/PayrollRun.jsx` | `computePayroll`, `computeMonthlySummary` | `payrollUtils` |
| `pages/Dashboard.jsx` | `computePayroll`, `getInitials` | `payrollUtils`, `utils` |
| `pages/Employees.jsx` | `getInitials` | `utils` |
| `components/employees/AddEmployeeModal.jsx` | `supabase` | `supabaseClient` |
| `components/layout/Topbar.jsx` | `getInitials` | `utils` |
| `components/layout/Sidebar.jsx` | `cn`, `getInitials` | `utils` |
| `components/layout/AppShell.jsx` | `cn` | `utils` |
| `components/dashboard/StatCards.jsx` | `cn` | `utils` |
| `components/ui/*.jsx` (15+ files) | `cn` | `utils` |
| `components/ui/MonthPicker.jsx` | `cn` | `utils` |

### Notes

- **`mockData.js` has zero production consumers.** It is only imported during development/testing (no grep matches in `src/` via `@/lib/mockData` path). It serves as a fixture/seed-data module for local development without a live Supabase instance.
- The `cn` utility from `utils.js` is the single most widely imported export (used by ~15 UI components and the `AppShell`/`StatCards` layout components).
- `formatCurrency` uses `Intl.NumberFormat` with locale `"en-PH"` (Philippine English) and currency `"PHP"`. Node.js and modern browsers both support this locale.
