# `src/` — Application Source Code

## Responsibility

The `src/` directory contains all client-side application source code for Operation Payroll, a React 19 + Vite SPA for payroll management. It is organized into:

- **`context/`** — Global state management (Auth, Payroll, Settings) via React Context + useReducer
- **`hooks/`** — Custom React hooks for mutations, role permissions, and session timeout
- **`lib/`** — Pure utility modules (Supabase client, payroll math, data transformers, classnames)
- **`pages/`** — Route-level page components (Login, Dashboard, Employees, PayrollRun)
- **`components/`** — Feature and primitive UI components organized by domain
- **Root files** — App entry (`main.jsx`, `App.jsx`) and global styles (`index.css`)

## Directory Map

| Directory | Responsibility Summary | Detailed Map |
|-----------|----------------------|-------------|
| `context/` | Global state providers — AuthContext (login/session), PayrollContext (employee data + mutations via useReducer), SettingsContext (modal visibility + password stub). | [View Map](context/codemap.md) |
| `hooks/` | Custom hooks — usePayroll (facade), usePayrollMutations (command dispatcher), useRolePermissions (RBAC), useSessionTimeout (idle observer). | [View Map](hooks/codemap.md) |
| `lib/` | Pure utility layer — Supabase client singleton, payroll transformer, payroll computation, currency formatting, classnames, mock data. | [View Map](lib/codemap.md) |
| `pages/` | Route-level containers — Login (form + auth), Dashboard (stats + activity), Employees (table + search + payslip), PayrollRun (table + edit + approve + send). | [View Map](pages/codemap.md) |
| `components/` | Feature & shared UI — layout shell, payroll CRUD, employee modal, dashboard cards, settings modal, primitive UI library. | [View Map](components/codemap.md) |

## Root Files

| File | Purpose |
|------|---------|
| `main.jsx` | Application entry point. Renders `<App />` inside `<StrictMode>` with `<Toaster>` from sonner. |
| `App.jsx` | Root component. Composes provider hierarchy (`AuthProvider > SettingsProvider > PayrollProvider`), `BrowserRouter`, route definitions (`/login`, `/dashboard`, `/employees`, `/payroll`), `AuthGuard`, `PrivateRoute`, and `AppShell`. |
| `index.css` | Global Tailwind CSS v4 import and custom CSS variables for theming. |

## Architecture Overview

```
main.jsx
  └─ App.jsx
       ├─ ErrorBoundary
       ├─ AuthProvider
       │    └─ SettingsProvider
       │         └─ PayrollProvider
       │              └─ BrowserRouter
       │                   ├─ /login → AuthGuard → Login
       │                   └─ /* → PrivateRoute → AppShell
       │                        ├─ Sidebar
       │                        ├─ Topbar
       │                        ├─ SettingsModal
       │                        └─ <Outlet>
       │                             ├─ /dashboard → Dashboard
       │                             ├─ /employees → Employees
       │                             └─ /payroll → PayrollRun
       └─ <Toaster />
```

## Data Flow Summary

1. **Auth**: `Login` → `AuthContext.login()` → `swift-api` edge function → JWT cookie + localStorage → `AuthProvider` restores session on mount.
2. **Payroll Data**: `PayrollProvider` → `supabase.from("payroll_period").select(...)` → `shapeEmployees()` → reducer state → consumed via `usePayroll()` hook.
3. **Mutations**: Pages/components → `usePayroll()` actions → `usePayrollMutations` → Supabase upsert/update → reducer dispatch → state update.
4. **RBAC**: `useRolePermissions()` reads `user.role` from `AuthContext` → exposes boolean flags and `canEditField()` for UI gating.