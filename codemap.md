# Repository Atlas: Operation Payroll

## Project Responsibility

Operation Payroll is a **payroll management web application** for JPMC (a Philippine payroll context). It provides a React 19 SPA frontend backed by Supabase (Postgres + Edge Functions) for employee payroll data management, including:

- **Authentication** — Custom JWT-based login via a Supabase edge function (`swift-api`) with HttpOnly cookie sessions and 30-minute idle timeout.
- **Payroll CRUD** — View, edit, approve, unapprove, and send payroll records across semi-monthly periods (Period 1: days 1–15, Period 2: days 16+).
- **Role-Based Access Control** — Admin and Moderator roles with field-level edit permissions and UI gating.
- **Audit Logging** — Full audit trail of payroll edits, approvals, and sends.
- **Payslip Generation** — View and print payslips per employee per period.
- **Employee Management** — Add new employees with automatic payroll initialization.
- **Dashboard** — Summary statistics, approval progress, and recent activity feed.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, React Router 7 |
| UI Components | shadcn/ui (Radix UI primitives + Tailwind CSS v4 + CVA) |
| State Management | React Context + useReducer |
| Forms | react-hook-form + Zod validation |
| Backend | Supabase (Postgres + Edge Functions) |
| Auth | Custom JWT (jose) + bcrypt, HttpOnly cookies |
| Styling | Tailwind CSS v4, tailwind-merge, clsx |
| Notifications | sonner (toast) |
| Date Utilities | date-fns |
| Deployment | Vercel (SPA rewrite config) |

## System Entry Points

| Entry Point | Purpose |
|-------------|---------|
| `src/main.jsx` | React app bootstrap — renders `<App />` inside `<StrictMode>` with `<Toaster>`. |
| `src/App.jsx` | Root component — composes providers, router, and route definitions. |
| `supabase/functions/swift-api/index.ts` | Deno edge function — authentication endpoint for Swift mobile client. |
| `vite.config.js` | Vite build config with React plugin, Tailwind CSS plugin, and `@/` path alias. |
| `vercel.json` | SPA rewrite rule — all routes → `index.html`. |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React SPA)                                        │
│                                                             │
│  main.jsx → App.jsx                                         │
│    ├─ ErrorBoundary                                         │
│    ├─ AuthProvider ── SettingsProvider ── PayrollProvider    │
│    │     │                  │                    │            │
│    │     useAuth()    useSettings()       usePayroll()      │
│    │     │                  │                    │            │
│    │     └──────────┬───────┴────────────┬─────┘            │
│    │                │                    │                    │
│    │         Pages & Components          │                    │
│    │    (Login, Dashboard,       Hooks & Libs               │
│    │     Employees, PayrollRun)  (mutations, utils)          │
│    └─────────────────────────────────────────────────────────│
│                          │                                  │
│                    Supabase Client                          │
│                    (singleton)                               │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase (Postgres + Edge Functions)                       │
│                                                             │
│  Tables: employee, employee_auth, payroll_period,          │
│          payroll_basicpay, payroll_additions,               │
│          payroll_deductions, audit_log                      │
│                                                             │
│  Edge Function: swift-api (POST /functions/v1/swift-api)   │
└─────────────────────────────────────────────────────────────┘
```

## Directory Map (Aggregated)

| Directory | Responsibility Summary | Detailed Map |
|-----------|----------------------|-------------|
| `src/` | Application source — React SPA with context-based state, custom hooks, utility libs, pages, and components. | [View Map](src/codemap.md) |
| `src/context/` | Global state providers — AuthContext (login/session), PayrollContext (employee data + useReducer), SettingsContext (modal + password stub). | [View Map](src/context/codemap.md) |
| `src/hooks/` | Custom hooks — usePayroll (facade), usePayrollMutations (command dispatcher), useRolePermissions (RBAC), useSessionTimeout (idle observer). | [View Map](src/hooks/codemap.md) |
| `src/lib/` | Pure utility layer — Supabase client singleton, payroll transformer, payroll computation, currency formatting, classnames, mock data. | [View Map](src/lib/codemap.md) |
| `src/pages/` | Route-level containers — Login, Dashboard, Employees, PayrollRun. Each page orchestrates hooks and delegates to feature components. | [View Map](src/pages/codemap.md) |
| `src/components/` | Feature & shared UI — layout shell, payroll CRUD, employee modal, dashboard cards, settings modal, primitive UI library. | [View Map](src/components/codemap.md) |
| `src/components/ui/` | Primitive UI component library (16 files, 67 exports). Radix-backed atoms with CVA variants. No business logic. | [View Map](src/components/ui/codemap.md) |
| `src/components/layout/` | Application shell — sidebar, topbar, outlet. Owns sidebar collapse state and cross-tab sync. | [View Map](src/components/layout/codemap.md) |
| `src/components/payroll/` | Payroll table, edit modal, audit log sheet, payslip card. View + Controller layer for payroll records. | [View Map](src/components/payroll/codemap.md) |
| `src/components/dashboard/` | StatCards — pure presentational summary card grid. | [View Map](src/components/dashboard/codemap.md) |
| `src/components/employees/` | AddEmployeeModal — controlled dialog for new employee creation. | [View Map](src/components/employees/codemap.md) |
| `src/components/settings/` | SettingsModal — change password dialog (stub backend). | [View Map](src/components/settings/codemap.md) |
| `supabase/` | Supabase configuration and edge functions. | [View Map](supabase/codemap.md) |
| `supabase/functions/` | Deno edge functions — authentication API for Swift mobile client. | [View Map](supabase/functions/codemap.md) |
| `supabase/functions/swift-api/` | BFF auth endpoint — credential validation, JWT issuance, HttpOnly cookie session. | [View Map](supabase/functions/swift-api/codemap.md) |

## Key Data Flow

1. **Authentication**: `Login` page → `AuthContext.login()` → `POST /functions/v1/swift-api` → JWT in HttpOnly cookie + localStorage → session restore on mount → 30-min idle timeout via `useSessionTimeout`.
2. **Payroll Read**: `PayrollProvider` → `supabase.from("payroll_period").select(...)` → `shapeEmployees()` → reducer state → consumed via `usePayroll()` hook.
3. **Payroll Write**: UI action → `usePayroll()` mutation method → `usePayrollMutations` → Supabase upsert/update → reducer dispatch → state update + audit log insert.
4. **RBAC**: `useRolePermissions()` reads `user.role` from `AuthContext` → exposes boolean flags (`isAdmin`, `canEditPayroll`, etc.) and `canEditField()` for UI gating.

## Environment Variables

| Variable | Used In | Purpose |
|----------|---------|---------|
| `VITE_SUPABASE_URL` | `src/lib/supabaseClient.js` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabaseClient.js`, `src/context/AuthContext.jsx` | Supabase anonymous API key |
| `JWT_SECRET` | `supabase/functions/swift-api/index.ts` | HS256 JWT signing key |
| `SUPABASE_URL` | `supabase/functions/swift-api/index.ts` | Supabase project URL (edge function) |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabase/functions/swift-api/index.ts` | Service role key for privileged DB access |

## Database Schema (Supabase Postgres)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `employee` | Employee records | `emp_id`, `first_name`, `last_name`, `email`, `role`, `department`, `position`, `status` |
| `employee_auth` | Auth credentials | `emp_id` (FK), `password_hash`, `last_login` |
| `payroll_period` | Semi-monthly payroll periods | `id`, `emp_id` (FK), `date_from`, `date_to`, `status`, `approved_by`, `basicpay_total`, `additions_total`, `deductions_total`, `net_pay` |
| `payroll_basicpay` | Basic pay fields per period | `pr_period_id` (FK), `daily_pay`, `work_days`, etc. |
| `payroll_additions` | Earnings per period | `pr_period_id` (FK), `holiday_pay`, `overtime_pay`, etc. |
| `payroll_deductions` | Deductions per period | `pr_period_id` (FK), `sss`, `philhealth`, `pagibig`, etc. |
| `audit_log` | Change audit trail | `id`, `pr_period_id` (FK), `action`, `performed_by`, `timestamp`, `changes` |