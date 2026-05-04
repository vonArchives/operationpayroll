# src/components/layout/

## Responsibility

This directory implements the **application shell** (also called _chrome_ or _frame_) of the Operation Payroll SPA. It provides the persistent visual structure — sidebar navigation, top bar, and content outlet — that wraps every authenticated page. The three components collectively own the **layout composition**, **sidebar collapse state**, and **page-level chrome** (title, nav highlighting, user badge, settings entry point).

The module follows the **Composite Layout** pattern: `AppShell` acts as the orchestrator (the "composite" node), while `Sidebar` and `Topbar` are discrete, reusable leaf composites with single responsibilities.

---

## Design Patterns

### 1. Composite Layout Pattern (Container / Orchestrator)
- **`AppShell`** (default export) is the root layout component. It composes `Sidebar`, `Topbar`, `<Outlet />` (from `react-router`), and `SettingsModal` into a single responsive shell.
- `AppShell` owns the **sidebar collapse state** and passes it down to `Sidebar` via props — it never reads from `Sidebar` directly.
- `Topbar` is stateless (no props); it self-consults auth/settings contexts.

### 2. Controlled Component / State Lifting
- Collapse state (`sidebarCollapsed`) is lifted to `AppShell` via `useState` and threaded into `Sidebar` as `collapsed` + `onToggle`.
- `Sidebar` is a fully controlled component — it has no internal state for the collapsed flag. It only fires `onToggle` upward and renders according to the `collapsed` prop.

### 3. Observer Pattern (Cross-tab Synchronisation)
- `AppShell` subscribes to the browser `storage` event (line 15–19). When another tab writes to `localStorage` key `sidebar_collapsed`, the state is synchronised across tabs.
- `Sidebar` mirrors the canonical collapsed value back to `localStorage` via a `useEffect` on line 25–27, making `AppShell` the single source of truth and `localStorage` the shared bus.

### 4. Slot / Outlet Pattern
- `react-router`'s `<Outlet />` serves as a **content slot** inside `AppShell` (line 35). Nested route components render here, making the layout independent of any specific page content.

### 5. Context Access Pattern
- Both `Sidebar` and `Topbar` consume React Contexts directly (rather than receiving data through props):
  - `useAuth()` → `user`, `logout`
  - `useSettings()` → `openSettings` (Topbar)

### 6. Static Route Mapping
- `Sidebar` declares navigation as a **static array** (`navItems`, line 15–19) of `{ name, href, icon }` tuples.
- `Topbar` maintains a `pageTitles` lookup map (line 14–18) resolving `pathname` → display string.
- This is a **poor man's routing table** — no dynamic generation or permission-based filtering.

### Key Abstractions & Interfaces

| Abstraction | Interface | Owner |
|---|---|---|
| `AppShell` | `() => JSX.Element` | Default export, no props |
| `Sidebar` | `({ collapsed: boolean, onToggle: () => void }) => JSX.Element` | Named/default export |
| `Topbar` | `() => JSX.Element` | Named/default export |

All three components have **no generic type parameters** and are pure render components with side-effect hooks.

---

## Data & Control Flow

### Sidebar Collapse State

```
AppShell (useState) ──props──▸ Sidebar (collapsed, onToggle)
     │                               │
     │ useEffect(storage)            │ useEffect(localStorage.setItem)
     ▼                               ▼
  localStorage("sidebar_collapsed") ◄─┘
```

1. User clicks toggle button in `Sidebar` → calls `onToggle`.
2. `AppShell` flips `sidebarCollapsed` via `setSidebarCollapsed(prev => !prev)`.
3. Re-render passes updated `collapsed` to `Sidebar`.
4. `Sidebar`'s `useEffect` persists the new value to `localStorage`.
5. Other tabs detect the change via the `storage` event listener in `AppShell` and reconcile.

### Authentication Data

```
AuthContext (provider)
  ├── useAuth() in Sidebar → user, logout, sessionExpiresAt
  └── useAuth() in Topbar  → user
```

- `user` object shape (inferred): `{ name: string, role: "admin" | "employee", ... }`
- `logout()` is called directly from `Sidebar`'s logout button `onClick`.

### Settings Modal Trigger

```
Topbar ──openSettings()──▸ SettingsContext ──isSettingsOpen──▸ SettingsModal
```

- `Topbar` calls `openSettings()` (from `useSettings()` context) on gear icon click.
- `SettingsModal` (rendered unconditionally in `AppShell`) reads `isSettingsOpen` from the same context to show/hide.

### Page Title Resolution

```
pathname (useLocation)
     │
     ▼
pageTitles[pathname] ?? "JPMC Payroll"   ← fallback string
     │
     ▼
<h1>{title}</h1>  (Topbar renders)
```

### Navigation Activation

```
pathname (useLocation in Sidebar)
     │
     ▼
navItems.map(item => isActive = pathname === item.href)
     │
     ▼
active Link gets "bg-primary/10 text-primary" class
```

---

## Integration Points

### Dependencies (import graph)

| Component | External Imports (besides React) | Imported from this directory |
|---|---|---|
| `AppShell` | `react-router-dom` (`Outlet`), `@/lib/utils` (`cn`), `@/components/settings/SettingsModal` | `./Sidebar`, `./Topbar` |
| `Sidebar` | `react-router-dom` (`Link`, `useLocation`), `@/context/AuthContext` (`useAuth`), `@/lib/utils` (`cn`, `getInitials`), `@/images/logo.png`, `lucide-react` (6 icons) | — |
| `Topbar` | `react-router-dom` (`useLocation`), `@/context/AuthContext` (`useAuth`), `@/context/SettingsContext` (`useSettings`), `date-fns` (`format`), `@/lib/utils` (`getInitials`), `lucide-react` (`Settings`), `@/components/ui/tooltip` | — |

### Consumers

| Consumer | How this module is consumed |
|---|---|
| **Router** (parent, likely `@/router` or `main.jsx`) | Renders `<AppShell />` as the layout route wrapper containing `<Outlet />` for nested page routes |
| **Nested route components** (e.g., Dashboard, Employees, Payroll) | Render inside `AppShell`'s `<Outlet />`; never import layout components directly |
| **SettingsModal** (sibling module) | Rendered inside `AppShell`; controlled via shared `SettingsContext` |

### Indirect Contracts (Context Agreements)

- `Sidebar` and `Topbar` assume an `AuthProvider` exists in the ancestor tree providing `{ user, logout }`.
- `Topbar` and `SettingsModal` assume a `SettingsProvider` exists providing `{ openSettings, isSettingsOpen }`.
- `AppShell` assumes a `<Router>` ancestor for `Outlet` to function.
- Both `Sidebar` and `Topbar` rely on `@/lib/utils` exporting `cn` (class merge) and `getInitials` (name→initials transform).

### Side Effects

| Effect | Component | Mechanism |
|---|---|---|
| Persist sidebar collapse | `Sidebar` | `useEffect` → `localStorage.setItem("sidebar_collapsed", …)` |
| Cross-tab collapse sync | `AppShell` | `window.addEventListener("storage", …)` |
| Logout (session clear) | `Sidebar` | `logout()` from `useAuth()` context (clears Supabase session, cookies, local state) |

### Styling Contracts

- All components use Tailwind CSS classes exclusively (`cn()` for conditional merging).
- Responsive breakpoint at `lg:`: sidebar is fixed-position and content margin adjusts via `lg:ml-16` / `lg:ml-64`.
- The shell uses `min-h-svh` (full viewport height) and `bg-background` (CSS variable from theme).
