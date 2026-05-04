# `src/context/` — React Context Providers for Global State

---

## Responsibility

This directory is the **global state management layer** of Operation Payroll. It owns three React Context Providers that collectively expose authentication, payroll data, and settings UI state to the entire component tree. Its purpose is to **decouple stateful concerns from presentation** by providing a centralized, hook-based interface that any descendant component can consume without prop drilling.

Each context follows a **Provider–Consumer** contract: a `<Provider>` component wraps the application (or a subtree) and makes state + actions available via a paired hook (`useAuth`, `usePayroll`, `useSettings`). The directory is the single source of truth for:
- Who the current user is and whether they are authenticated.
- The payroll employee dataset, period/month selection, approval/send status, and mutation operations.
- The settings panel visibility toggle and stub password-change capability.

---

## Design Patterns

| Pattern | Description | Where |
|---|---|---|
| **Context Provider** | The core structural pattern. Each file exports a `createContext(null)` → `<XxxContext.Provider>` → custom `useXxx()` hook triad. | All three files |
| **Singleton (per Provider)** | Each context instance is a singleton within its Provider subtree. The context object is created once at module scope and never replaced. | `AuthContext`, `PayrollContext`, `SettingsContext` |
| **Reducer / Command** | `PayrollContext` uses `useReducer` with a pure `payrollReducer` function that interprets action types (commands) to derive new state. Actions: `SET_EMPLOYEES`, `SWITCH_MONTH`, `EDIT_PAYROLL`, `APPROVE_PAYROLL`, `UNAPPROVE_PAYROLL`, `SEND_PAYROLL`, `SET_PAYROLL_SENT`, `ADD_AUDIT_LOG`. | `PayrollContext.jsx` |
| **Adapter / Gateway** | The `login` function in `AuthProvider` acts as an adapter between the application and the Supabase edge function (`swift-api`), translating raw HTTP responses into the `{ success, user/error }` contract. | `AuthContext.jsx:111-163` |
| **Hook Composition** | Both `AuthProvider` and `PayrollProvider` delegate to custom hooks (`useSessionTimeout`, `usePayrollMutations`) for cross-cutting or complex logic, composing multiple hooks internally. | `AuthContext.jsx:109`, `PayrollContext.jsx:319` |
| **Strategy (implicit)** | The session-restoration logic in `AuthProvider` implements a two-strategy fallback: **Path 1** (JWT cookie from new edge function) vs. **Path 2** (localStorage expiry from old edge function). Ordering is fixed with Path 1 preferred. | `AuthContext.jsx:46-94` |
| **Encapsulated Module (self-contained helpers)** | `AuthContext.jsx` defines module-private helper functions for cookie read/write/delete (`setCookie`, `getCookie`, `deleteCookie`) and JWT decoding (`decodeJwt`) that never leak outside the module. | `AuthContext.jsx:14-36` |

### Key Abstractions

- **`AuthProvider`** exposes `{ user, isAuthenticated, login, logout, sessionExpiresAt }`.
- **`PayrollProvider`** exposes `{ employees, currentPeriod, selectedMonth, availableMonths, payrollPeriod, loading, error, mutationLoading, payrollSent, switchPeriod, switchMonth, editPayroll, approvePayroll, unapprovePayroll, sendPayroll, createPayrollMonth, refreshPayrollData, generatePayrollForNewEmployee }`.
- **`SettingsProvider`** exposes `{ isSettingsOpen, openSettings, closeSettings, updatePassword }`.
- **Guard clause**: every `useXxx()` hook throws `"useXxx must be used within a XxxProvider"` if called outside a Provider — enforces correct composition at runtime.

---

## Data & Control Flow

### AuthContext

```
┌─ Mount ─────────────────────────────────────────────┐
│ useEffect([], [])  ← runs once on mount             │
│   ├─ getCookie("jpmc_auth_token") → token?          │
│   │   ├─ decodeJwt(token) → payload                │
│   │   ├─ payload.exp > now?                         │
│   │   │   ├─ localStorage("jpmc_session_user")      │
│   │   │   ├─ setUser(parsed)                        │
│   │   │   ├─ setIsAuthenticated(true)               │
│   │   │   ├─ setSessionExpiresAt(payload.exp*1000)   │
│   │   │   ├─ supabase.rest.headers.Authorization     │
│   │   │   └─ supabase.realtime.setAuth(token)       │
│   │   └─ else → deleteCookie + fallthrough          │
│   └─ localStorage("jpmc_session_expiry") → stored?   │
│       ├─ stored > Date.now()                         │
│       │   ├─ localStorage("jpmc_session_user")       │
│       │   └─ setUser + setIsAuthenticated(true)      │
│       └─ else → clear localStorage                   │
│                                                      │
│ useSessionTimeout({ onTimeout, timeoutMs: 30min })   │
│   └─ handleTimeout → clears all state + redirects    │
└──────────────────────────────────────────────────────┘

┌─ login(email, password) ────────────────────────────┐
│ fetch POST {VITE_SUPABASE_URL}/functions/v1/swift-api│
│   Authorization: Bearer {VITE_SUPABASE_ANON_KEY}     │
│                                                      │
│ response.ok && data.success?                         │
│   ├─ Yes:                                           │
│   │   ├─ setUser(userData)                          │
│   │   ├─ setIsAuthenticated(true)                   │
│   │   ├─ token exists?                              │
│   │   │   ├─ Yes (JWT path): setCookie, setAuth     │
│   │   │   └─ No (legacy): localStorage expiry       │
│   │   └─ localStorage("jpmc_session_user")          │
│   │   return { success: true, user }                │
│   └─ No: return { success: false, error }           │
└──────────────────────────────────────────────────────┘

┌─ logout() ──────────────────────────────────────────┐
│ deleteCookie, clear localStorage, clear supabase    │
│ setUser(null), setIsAuthenticated(false)             │
└──────────────────────────────────────────────────────┘
```

**State transitions**: `isAuthenticated` toggles `false→true` on successful login/session-restore and `true→false` on logout or timeout. `user` is `null` or a deserialized user object. `sessionExpiresAt` is an epoch-ms timestamp or `null`.

### PayrollContext

```
┌─ Initial State ─────────────────────────────────────┐
│ employees: [],                                       │
│ payrollSent_period1/2: false,                        │
│ currentPeriod: auto (period1 if day ≤ 15)            │
│ selectedMonth: YYYY-MM (current month)               │
│ availableMonths: [],                                 │
│ payrollPeriod: "Month Year" string                   │
└──────────────────────────────────────────────────────┘

┌─ useEffect([refreshKey]) ───────────────────────────┐
│ fetchEmployees()                                     │
│   supabase.from("payroll_period").select(`           │
│     ... + audit_log, payroll_basicpay,               │
│     payroll_additions, payroll_deductions,           │
│     employee (emp_id, first_name, ...)               │
│   `)                                                 │
│   ├─ Build availableMonths from distinct dates       │
│   ├─ dispatch(SET_AVAILABLE_MONTHS)                  │
│   ├─ Fallback to most recent month if current gone   │
│   ├─ Compute payrollSent per period from status      │
│   ├─ dispatch(SET_PAYROLL_SENT)                      │
│   ├─ shapeEmployees(data, selectedMonth)             │
│   └─ dispatch(SET_EMPLOYEES)                         │
│                                                      │
│ Called again when refreshKey increments              │
└──────────────────────────────────────────────────────┘

┌─ switchMonth(month) ────────────────────────────────┐
│ 1. dispatch(SWITCH_MONTH, month)                     │
│ 2. shapeEmployees(allPeriodData, month)              │
│    → dispatch(SET_EMPLOYEES)                         │
│ 3. Recompute payrollSent for new month's periods     │
│    → dispatch(SET_PAYROLL_SENT)                      │
└──────────────────────────────────────────────────────┘

┌─ Mutation flow (via usePayrollMutations) ───────────┐
│ editPayroll(id, updatedFields, period)               │
│   → dispatch(EDIT_PAYROLL, { id, updatedFields, period }) │
│                                                      │
│ approvePayroll(id, period)                           │
│   → dispatch(APPROVE_PAYROLL, { id, period })        │
│   + Supabase upsert side-effect                      │
│                                                      │
│ unapprovePayroll(id, period)                         │
│   → dispatch(UNAPPROVE_PAYROLL, { id, period })      │
│                                                      │
│ sendPayroll(period)                                  │
│   → dispatch(SEND_PAYROLL, { period })               │
│   + Supabase batch-update side-effect                │
│                                                      │
│ createPayrollMonth(year, month)                      │
│ generatePayrollForNewEmployee(employeeId, ...)       │
│                                                      │
│ All mutations setMutationLoading(true/false)          │
└──────────────────────────────────────────────────────┘
```

**Data transformation**: Raw Supabase rows flow through `shapeEmployees()` (imported from `@/lib/payrollTransformer`) before being stored in the reducer. The `allPeriodData` ref stores the raw dataset to enable month-switching without re-fetching.

### SettingsContext

```
┌─ openSettings() ──→ isSettingsOpen: false → true
├─ closeSettings() ─→ isSettingsOpen: false
└─ updatePassword() ─→ stub, returns { success: false, error: "Not yet implemented" }
```

SettingsContext depends on `AuthContext` for the current `user`, but only for the `updatePassword` guard (`if (!user) return error`).

---

## Integration Points

### Dependencies (imports)

| Context | Import | Source |
|---|---|---|
| **AuthContext** | `useSessionTimeout` | `@/hooks/useSessionTimeout` |
| | `toast` | `sonner` (npm) |
| | `supabase` | `@/lib/supabaseClient` |
| **PayrollContext** | `supabase` | `@/lib/supabaseClient` |
| | `toast` | `sonner` (npm) |
| | `shapeEmployees` | `@/lib/payrollTransformer` |
| | `usePayrollMutations` | `@/hooks/usePayrollMutations` |
| **SettingsContext** | `useAuth` | `./AuthContext` (sibling) |
| | `toast` | `sonner` (npm) |

### API / Database Endpoints

| Context | Endpoint | Method | Purpose |
|---|---|---|---|
| AuthContext | `POST {VITE_SUPABASE_URL}/functions/v1/swift-api` | HTTP POST | Login — validates credentials, returns JWT + user data |
| PayrollContext | `supabase.from("payroll_period").select(...)` | Supabase SDK (REST) | Fetch payroll periods with joins to `audit_log`, `payroll_basicpay`, `payroll_additions`, `payroll_deductions`, `employee` |
| PayrollContext | Supabase upsert/update/batch | Supabase SDK (REST) | Called inside mutations via `usePayrollMutations` (approve, unapprove, send, create month) |

### Consumer Hooks

| Hook | Context |
|---|---|
| `useAuth()` | Consumed by any component needing user session state |
| `usePayroll()` | Consumed by payroll screens, tables, and action buttons |
| `useSettings()` | Consumed by settings panel/modal components |

### Environment Variables

| Variable | Used In |
|---|---|
| `VITE_SUPABASE_URL` | `AuthContext` — edge function base URL |
| `VITE_SUPABASE_ANON_KEY` | `AuthContext` — edge function auth header |

### Cookie / Storage Keys

| Key | Type | Owner |
|---|---|---|
| `jpmc_auth_token` | Cookie (Secure, SameSite=Lax, Path=/) | AuthContext |
| `jpmc_session_user` | localStorage | AuthContext |
| `jpmc_session_expiry` | localStorage | AuthContext (legacy path) |

---

## Error Handling

- **AuthContext**: Wraps `login` fetch in try/catch, returns `{ success: false, error: string }` on failure. Invalid JWT cookies are silently deleted. `JSON.parse` failures for stored user data are caught and the stale entry is removed.
- **PayrollContext**: Catches Supabase fetch errors, sets `error` state, and shows a `toast.error()`. All mutation loading is gated by `mutationLoading`.
- **SettingsContext**: `updatePassword` is a stub — returns a non-success result with an explanatory message. No backend integration exists yet.

---

## Composition Requirements

The Providers must be nested in the correct order:

```jsx
<AuthProvider>
  <PayrollProvider>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </PayrollProvider>
</AuthProvider>
```

`SettingsProvider` depends on `AuthContext` via `useAuth()`; therefore it must be a descendant of `AuthProvider`. `PayrollProvider` is independent of the other two but is typically placed inside `AuthProvider` since payroll data requires authentication.
