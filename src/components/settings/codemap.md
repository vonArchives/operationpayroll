# src/components/settings/

## Responsibility

**Change Password UI (single-screen modal).** This directory owns the presentation layer for the account password change feature. It is a self-contained React component (`SettingsModal`) that renders a three-field form with client-side validation and delegates the mutation to a context-layer action. It has no sub-routes, no data-fetching logic, and no persistent state of its own — it is purely a **controlled dialog** driven by an external boolean flag.

## Design Patterns

| Pattern | Application |
|---|---|
| **Controlled Modal** (via shadcn `Dialog`) | The `open` prop is wired to `isSettingsOpen` from `SettingsContext`. The modal does not manage its own visibility state; it is a passive consumer of the parent context. |
| **Form + Resolver** (react-hook-form + zod) | `useForm({ resolver: zodResolver(passwordSchema), mode: "onChange" })`. Schema (`passwordSchema`) defines three fields (`currentPassword`, `newPassword`, `confirmPassword`) plus a cross-field refinement that ensures `newPassword === confirmPassword`. Validation runs on every change. |
| **Strategy / Delegate** | The modal calls `updatePassword(currentPassword, newPassword)` but does **not** implement the password-update logic itself. That responsibility is delegated to `SettingsContext.updatePassword`, which currently returns a stub. This makes the component easy to test and the backend integration point explicit. |
| **Guard Clause** | `useSettings()` throws `"useSettings must be used within a SettingsProvider"` if called outside a `<SettingsProvider>` — a standard React context guard. |
| **Optimistic Reset on Success** | `onSubmit` calls `reset()` only when `result.success` is truthy, clearing the form fields after a successful password change. |

## Data & Control Flow

```
 Topbar (gear icon click)
       │
       │  openSettings()
       ▼
 SettingsContext
       │  isSettingsOpen = true
       ▼
 SettingsModal   ◄── renders when <Dialog open={true}>
       │
       │  User fills form, clicks "Update Password"
       │
       ▼
 react-hook-form
       │  client-side validation (zod)
       │  schema: currentPassword (min 1), newPassword (min 6),
       │          confirmPassword (min 1), refinement: match
       │
       ▼  onSubmit(data)  ───►  updatePassword(current, new)
                                      │
                                      ▼
                               SettingsContext.updatePassword
                                      │  (currently: toast.info + returns
                                      │   { success: false, error: "..." })
                                      │
                                      ▼  result.success?
                                     / \
                                   yes  no
                                    │    │
                                 reset()  │  (error handled in context)
                                    │      │
                                    ▼      ▼
                              (form cleared)  (form stays, user retries)
```

**Data entering the module:**
- `isSettingsOpen: boolean` — from `useSettings()` context; determines whether the Dialog renders.
- `closeSettings: () => void` — from `useSettings()` context; called on Cancel / close button.
- `updatePassword: (currentPassword, newPassword) => Promise<{success, error}>` — from `useSettings()` context; the mutation delegate.

**Data leaving the module:**
- Form field values (`currentPassword`, `newPassword`) flow **up** to `updatePassword()`.
- No data is emitted to sibling components, global stores, or query caches.
- Dialog open/close is side-effect-only (no return value).

## Integration Points

### Dependencies (imports)

| Import | Type | Purpose |
|---|---|---|
| `@/context/SettingsContext` | React Context module | Supplies `isSettingsOpen`, `closeSettings`, `updatePassword` via `useSettings()` hook. |
| `@/components/ui/dialog` | shadcn Radix Dialog | `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` — the modal shell. |
| `@/components/ui/button` | shadcn Button | "Cancel" (outline variant) and "Update Password" (submit) buttons. |
| `@/components/ui/input` | shadcn Input | Three password fields. |
| `@/components/ui/label` | shadcn Label | Label elements for each input. |
| `react-hook-form` | external | Form state management, registration, submission. |
| `@hookform/resolvers/zod` | external bridge | Connects zod schema to react-hook-form's resolver. |
| `zod` | external | Schema definition and client-side validation. |
| `lucide-react` | icon library | `Loader2` spinner for loading state. |

### Consumers (who uses this module)

| Consumer | File | Usage |
|---|---|---|
| `AppShell` | `src/components/layout/AppShell.jsx` | Renders `<SettingsModal />` unconditionally at the layout root. The modal is always mounted but visually hidden until `isSettingsOpen` becomes `true`. |
| `Topbar` | `src/components/layout/Topbar.jsx` | Calls `openSettings()` from `SettingsContext` on gear-icon click. This is the **sole trigger** that opens the modal. |

### Implicit Contracts

1. **SettingsContext lifetime**: `<SettingsProvider>` must wrap the entire subtree where `SettingsModal` is rendered (it does — `App.jsx` wraps `<SettingsProvider>` around `<AppShell />`).
2. **AuthContext dependency**: `SettingsContext.updatePassword` internally depends on `useAuth()` to access `user`. If no user is logged in, `updatePassword` short-circuits with `{ success: false, error: "No user logged in" }`.
3. **Backend stub**: `updatePassword` currently returns `{ success: false, error: "Not yet implemented" }` and shows a `toast.info`. The actual Supabase `updateUser` call is not wired — this is the designated extension point.
