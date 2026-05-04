# `src/components/` — Feature & Shared UI Components

## Responsibility

This directory is the **component library layer** of Operation Payroll, organized into domain-specific subdirectories. It contains all reusable and feature-specific React components that are not page-level routes. Components here are consumed by pages (`src/pages/`) and by each other. The directory is split into:

- **`ui/`** — Primitive, presentational design-system atoms (shadcn/ui-based)
- **`layout/`** — Application shell (sidebar, topbar, outlet)
- **`dashboard/`** — Dashboard-specific presentational components
- **`employees/`** — Employee management UI (add employee modal)
- **`payroll/`** — Payroll CRUD, audit, and payslip components
- **`settings/`** — Settings/password change modal
- **Root files** — Cross-cutting utilities (`ErrorBoundary`, `PrivateRoute`)

## Directory Map

| Directory | Responsibility Summary | Detailed Map |
|-----------|----------------------|-------------|
| `ui/` | Primitive UI component library (16 files, 67 exports). Radix-backed atoms with CVA variants. No business logic. | [View Map](ui/codemap.md) |
| `layout/` | Application shell — sidebar, topbar, and outlet composition. Owns sidebar collapse state and cross-tab sync. | [View Map](layout/codemap.md) |
| `dashboard/` | StatCards — pure presentational summary card grid. No state, no side effects. | [View Map](dashboard/codemap.md) |
| `employees/` | AddEmployeeModal — controlled dialog for new employee creation with form validation and Supabase insert. | [View Map](employees/codemap.md) |
| `payroll/` | Payroll table, edit modal, audit log sheet, and payslip card. View + Controller layer for payroll records. | [View Map](payroll/codemap.md) |
| `settings/` | SettingsModal — change password dialog (currently stub backend). Controlled by SettingsContext. | [View Map](settings/codemap.md) |

## Root Files

| File | Purpose |
|------|---------|
| `ErrorBoundary.jsx` | React class component that catches render errors and displays a fallback UI with a "Refresh" button. Wraps the entire `<App />` in `main.jsx`. |
| `PrivateRoute.jsx` | Auth guard component. Reads `isAuthenticated` from `useAuth()`. Redirects to `/login` if not authenticated; renders children if authenticated. |

## Integration Points

- All subdirectories consume `@/components/ui/*` primitives.
- `layout/`, `payroll/`, `employees/`, `settings/` consume context hooks (`useAuth`, `usePayroll`, `useSettings`, `useRolePermissions`).
- `payroll/` and `employees/` consume `@/lib/payrollUtils` and `@/lib/supabaseClient`.
- Pages (`src/pages/`) are the primary consumers of all feature components.