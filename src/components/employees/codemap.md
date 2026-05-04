# src/components/employees/

## Responsibility

**Employee Onboarding UI Component.** This directory contains a single presentational-form component responsible for creating new employee records in the system. It serves as the **data entry gateway** for the employee lifecycle — accepting structured user input, validating it, persisting it to the `employee` table in Supabase, and triggering downstream payroll initialisation.

It is a **leaf UI module** (no child components of its own) consumed exclusively by the page-level `Employees` component.

## Design Patterns

| Pattern | Application |
|---|---|
| **Controlled Dialog (Modal)** | The parent (`Employees` page) manages the `open`/`onClose` props. `AddEmployeeModal` is a passive, stateless-with-respect-to-visibility component — it does not own its open/close state. |
| **Compound Component (shadcn/ui Dialog)** | Uses `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` as a coherent set of sub-components for accessible modal rendering. |
| **Form + Resolver (react-hook-form + zod)** | Declarative form state management via `useForm` with a Zod schema resolver (`zodResolver`). Validation errors are surfaced inline per field. |
| **Fire-and-Forget Side-Effect Chain** | `onSubmit` executes a strict 3-step pipeline: (1) `supabase.from("employee").insert(...)` → (2) `generatePayrollForNewEmployee(emp_id)` → (3) `refreshPayrollData()`. Each step awaits the previous one but the caller does not inspect results beyond error handling. |
| **Guard Pattern (isAdmin gate)** | The consumer (`Employees` page) conditionally renders `<AddEmployeeModal>` behind an `isAdmin` permission check, restricting the create action to admin-role users. |
| **Optimistic Toast UX** | On success, `toast.success(...)` provides immediate user feedback. On failure, `toast.error(...)` surfaces the error message. The `isSubmitting` boolean disables the submit button and shows a `Loader2` spinner during the async operation. |

## Data & Control Flow

### Entry

1. **Props** — `AddEmployeeModal` receives two props:
   - `open: boolean` — visibility toggle from the parent.
   - `onClose: () => void` — callback to signal the parent should close the modal.

2. **User Input** — The form captures six fields via `useForm` + Zod schema:
   - `first_name`, `last_name`, `email`, `role` (enum: `admin | moderator | employee`), `position`, `department`.

### Processing (inside `onSubmit`)

```
[Form submit] → handleSubmit(onSubmit)
                  │
                  ├─ 1. supabase.from("employee").insert({ ...data, status: "Active" })
                  │       .select("emp_id").single()
                  │       └─ On failure: throw → catch → toast.error
                  │
                  ├─ 2. generatePayrollForNewEmployee(emp_id)
                  │       (async — generates zero-value payroll rows via Smart Function)
                  │       └─ On failure: throw → catch → toast.error
                  │
                  ├─ 3. refreshPayrollData()
                  │       (triggers refetch from PayrollContext → global state update)
                  │
                  ├─ 4. toast.success(...)
                  ├─ 5. reset()   — clears form default values
                  └─ 6. onClose() — signals parent to close the modal
```

### Exit

| Output | Mechanism |
|---|---|
| **Database INSERT** | `supabase.from("employee").insert(...)` persists the new employee with `status: "Active"` |
| **Payroll Initialisation** | `generatePayrollForNewEmployee(emp_id)` kicks off a server-side Smart Function to create zero-value payroll rows |
| **Global State Sync** | `refreshPayrollData()` triggers a refetch in `PayrollContext`, propagating updated employee list to all subscribers |
| **UI Feedback** | `toast.success()` / `toast.error()` via the `sonner` toast library |
| **Modal Close** | `onClose()` — parent sets `isAddModalOpen = false`, unmounting the component |

## Integration Points

### Dependencies (imported by this module)

| Dependency | Type | Role |
|---|---|---|
| `@/lib/supabaseClient` (`.js`) | Supabase client singleton | `supabase.from("employee").insert(...)` — persistence |
| `@/hooks/usePayroll` | React Context hook (from `PayrollContext.jsx`) | Provides `generatePayrollForNewEmployee` and `refreshPayrollData` |
| `react-hook-form` / `@hookform/resolvers/zod` / `zod` | Third-party form + validation | `useForm`, `zodResolver`, form state, schema validation |
| `@/components/ui/dialog` | shadcn/ui Dialog compound | Modal chrome (header, content, footer) |
| `@/components/ui/button` | shadcn/ui Button | Cancel / Save actions |
| `@/components/ui/input` | shadcn/ui Input | Text field rendering |
| `@/components/ui/label` | shadcn/ui Label | Accessible form labels |
| `sonner` | Toast library | `toast.success` / `toast.error` |
| `lucide-react` | Icon library | `Loader2` spinner icon |
| `react` (useState) | React built-in | `isSubmitting` loading state |

### Consumers (modules that import this component)

| Consumer | Location | Integration |
|---|---|---|
| `Employees` page | `src/pages/Employees.jsx:36` | Renders `<AddEmployeeModal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />` behind an `isAdmin` guard. Passes local boolean state for `open`/`onClose`. |

### Contract with PayrollContext

`AddEmployeeModal` destructures exactly two values from `usePayroll()`:
- `generatePayrollForNewEmployee(emp_id)` — expected to accept a numeric `emp_id` and return a Promise (no return value inspected).
- `refreshPayrollData()` — expected to initiate a global state refetch (void return, no inspection).

Any change to the signature or behaviour of these two functions in `PayrollContext` will directly affect this modal's post-insert pipeline.
