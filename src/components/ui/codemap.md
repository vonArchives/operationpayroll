# `src/components/ui/` — Primitive UI Component Library

## Responsibility

This directory implements a **shared, reusable primitive UI component library** for the Operation Payroll application. It provides the foundational visual building blocks (atoms) that all feature components and pages compose into screens. The directory owns all presentational concerns at the atomic/sub-atomic level: styling, accessibility, animation, and layout scaffolding. It does **not** contain business logic, data fetching, or state management — those belong in `pages/` and feature-level `components/` subdirectories.

## Design Patterns

### 1. Compound Component Pattern

The dominant structural pattern. Components that produce a coherent UI widget export multiple sub-components (usually 3–10) that must be composed declaratively by the consumer.

| Parent Module | Exported Sub-Components |
|---|---|
| `card.jsx` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| `dialog.jsx` | `Dialog`, `DialogPortal`, `DialogOverlay`, `DialogClose`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription` |
| `alert-dialog.jsx` | `AlertDialog`, `AlertDialogPortal`, `AlertDialogOverlay`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel` |
| `sheet.jsx` | `Sheet`, `SheetPortal`, `SheetOverlay`, `SheetTrigger`, `SheetClose`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription` |
| `pagination.jsx` | `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationPrevious`, `PaginationNext`, `PaginationEllipsis` |
| `table.jsx` | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption` |
| `avatar.jsx` | `Avatar`, `AvatarImage`, `AvatarFallback` |
| `tooltip.jsx` | `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent` |

**Abstraction interface**: Every compound component follows the same contract — each sub-component accepts `className` and `...props` forwarded to the underlying DOM element, enabling tailwind overrides and standard HTML attributes.

### 2. Variant Pattern with CVA (`class-variance-authority`)

Three components define a `cva(...)` specification that maps semantic variant/size keys to Tailwind class strings:

- **`button.jsx` — `buttonVariants`**: Two variant axes — `variant` (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`) and `size` (`default`, `sm`, `lg`, `icon`). Consumed directly by the `Button` component and re-exported for use by `alert-dialog.jsx`.
- **`badge.jsx` — `badgeVariants`**: Single axis — `variant` (`default`, `secondary`, `destructive`, `outline`, `success`, `warning`). Exported alongside `Badge`.
- **`label.jsx` — `labelVariants`**: Single preset (no variant axis), defines base styling for the Label primitive.
- **`sheet.jsx` — `sheetVariants`**: Single axis — `side` (`top`, `bottom`, `left`, `right`). Controls slide-in direction and Tailwind enter/exit animations.

**Variant Resolution Contract**: Each variant function returns a class string. Consumers merge it via `cn(variants({ variant, size }), className)` where `cn` is `clsx` + `twMerge`.

### 3. Wrapper/Adapter Pattern (Radix UI Primitives)

Every Radix-backed component follows the same structure:
```
import * as Primitive from "@radix-ui/react-<name>"
const LocalComponent = React.forwardRef(({ className, ...props }, ref) => (
  <Primitive.Root className={cn("base-tailwind-classes", className)} ref={ref} {...props} />
))
LocalComponent.displayName = Primitive.Root.displayName
```
This provides:
- **Accessibility**: Radix handles keyboard navigation, focus trapping, ARIA attributes, and portal management.
- **Styling isolation**: The wrapper layer owns all visual Tailwind classes while Radix owns behavior.
- **API passthrough**: All Radix props (e.g., `sideOffset` on TooltipContent, `orientation` on Separator) are forwarded via `...props`.

Components using this pattern: `alert-dialog.jsx`, `avatar.jsx`, `dialog.jsx`, `label.jsx`, `scroll-area.jsx`, `separator.jsx`, `sheet.jsx`, `tooltip.jsx`.

### 4. Polymorphic Component Pattern (As-Child)

`Button` in `button.jsx` accepts an `asChild` prop. When `true`, it renders via `@radix-ui/react-slot`'s `<Slot>` component, merging its props and ref into the single child element. This allows consumers to render a Button-styled `<a>` tag (for React Router links) or any other element while retaining Button's visual identity.

```jsx
const Comp = asChild ? Slot : "button"
```

### 5. Forwarded Refs Pattern

All interactive components use `React.forwardRef` to forward a `ref` to the underlying DOM node. This enables imperative access (focus management, measurement) by parent components and libraries like `react-hook-form`. Exceptions: simple layout-only sub-components (`CardHeader`, `CardFooter`, `DialogHeader`, `DialogFooter`, `SheetHeader`, `SheetFooter`, `AlertDialogHeader`, `AlertDialogFooter`, `Badge`, `Pagination`, `PaginationLink`, `PaginationPrevious`, `PaginationNext`, `PaginationEllipsis`, `Skeleton`).

### 6. Controlled Component Pattern

`MonthPicker.jsx` is the only component that manages internal state (via `useState`). It operates as a **controlled input**:

- **Input**: `value` (string in `"YYYY-MM"` format), `onChange` (callback), `disabledMonths` (optional `Set<string>`)
- **Internal state**: `open` (popover visibility), `viewYear` (calendar year being browsed)
- **Output**: Calls `onChange(key)` with `"YYYY-MM"` string when a month is selected
- **Side-effect**: Registers a `mousedown` listener on `document` to close the popover on outside click (cleanup on `open` change)

### 7. Skeleton Placeholder Pattern

`Skeleton` renders a generic pulsing placeholder `div` with `animate-pulse rounded-md bg-muted`. Consumers apply specific dimensions via `className` (e.g., `className="h-4 w-full"`).

## Data & Control Flow

### Data Entry

1. **Props**: All data enters via React props passed by consumer components (pages and feature components). No component fetches data internally.
   - `className: string` — Tailwind class overrides (all components)
   - `children: ReactNode` — Nested content (all compound components)
   - `variant`, `size`, `side` — Semantic variant selectors (`button`, `badge`, `sheet`)
   - `asChild: boolean` — Polymorphic rendering flag (`Button`)
   - `disabledMonths: Set<string>` — Month availability constraint (`MonthPicker`)
   - `value: string`, `onChange: function` — Controlled value (`MonthPicker`)
   - `orientation: "horizontal" | "vertical"` — Axis selection (`Separator`, `ScrollBar`)
   - `isActive: boolean` — Active page indicator (`PaginationLink`)

2. **Refs**: `ref` forwarded via `React.forwardRef` for imperative DOM access by parent components or libraries.

### Data Transformation

1. **ClassName merging**: All components pass `className` through the `cn()` utility (`@/lib/utils`), which applies `clsx` for conditional class merging then `twMerge` to resolve Tailwind conflicts.
2. **Variant resolution**: CVA variant functions (`buttonVariants`, `badgeVariants`, `sheetVariants`) transform semantic variant/size keys into concrete Tailwind class strings.
3. **Date formatting**: `MonthPicker` displays the formatted label using `toLocaleDateString("en-US", { month: "long", year: "numeric" })`.
4. **Key generation**: `MonthPicker.handleSelect` generates `"YYYY-MM"` keys from `viewYear` and zero-indexed month index.

### Data Exit

1. **DOM rendering**: All components render standard HTML elements (`div`, `button`, `table`, `th`, `td`, `input`, `a`, `ul`, `li`, `span`, `nav`) or Radix primitives (which render accessible DOM).
2. **Callback invocation**: `MonthPicker` calls `onChange(key)` on month selection.
3. **Event propagation**: Standard React synthetic events bubble to parent handlers (onClick, onSubmit, etc.).
4. **Portal rendering**: `DialogContent`, `AlertDialogContent`, and `SheetContent` render into `document.body` via Radix Portal, escaping the parent DOM hierarchy.

### Internal State (only `MonthPicker`)

```
open (boolean) ↔ Popover visibility (toggled by trigger button click, closed by outside click or month selection)
viewYear (number) ↔ Calendar year being browsed (incremented/decremented by year nav buttons)
```

## Integration Points

### Dependencies (external packages)

| Package | Version | Used By |
|---|---|---|
| `@radix-ui/react-alert-dialog` | ^1.1.15 | `alert-dialog.jsx` |
| `@radix-ui/react-avatar` | ^1.1.11 | `avatar.jsx` |
| `@radix-ui/react-dialog` | ^1.1.15 | `dialog.jsx`, `sheet.jsx` (aliased as SheetPrimitive) |
| `@radix-ui/react-label` | ^2.1.8 | `label.jsx` |
| `@radix-ui/react-scroll-area` | ^1.2.10 | `scroll-area.jsx` |
| `@radix-ui/react-separator` | ^1.1.8 | `separator.jsx` |
| `@radix-ui/react-slot` | ^1.2.4 | `button.jsx` |
| `@radix-ui/react-tooltip` | ^1.2.8 | `tooltip.jsx` |
| `class-variance-authority` | ^0.7.1 | `button.jsx`, `badge.jsx`, `label.jsx`, `sheet.jsx` |
| `lucide-react` | ^1.8.0 | `dialog.jsx`, `sheet.jsx`, `MonthPicker.jsx`, `pagination.jsx` |
| `clsx` + `tailwind-merge` | ^2.1.1 / ^3.5.0 | All (via `@/lib/utils` → `cn()`) |

### Internal Dependencies

| Source | Dependency | How |
|---|---|---|
| `alert-dialog.jsx` | `@/components/ui/button` | Imports `buttonVariants` for `AlertDialogAction` (default variant) and `AlertDialogCancel` (`outline` variant) |
| All files | `@/lib/utils` | Imports `cn()` for className merging |

### Consumer Modules (pages)

| Consumer Page | Components Used |
|---|---|
| `src/pages/Employees.jsx` | `Table`, `Card`, `Input`, `Button`, `Badge`, `Skeleton`, `Avatar`, `Dialog`, `Pagination` |
| `src/pages/PayrollRun.jsx` | `Card`, `Input`, `Button`, `Badge`, `Skeleton`, `MonthPicker`, `Tooltip`, `AlertDialog`, `Dialog` |
| `src/pages/Login.jsx` | `Button`, `Input`, `Label` |
| `src/pages/Dashboard.jsx` | `Card`, `Button`, `Avatar` |

### Consumer Modules (feature components)

| Consumer Component | Components Used |
|---|---|
| `src/components/employees/AddEmployeeModal.jsx` | `Dialog`, `Button`, `Input`, `Label` |
| `src/components/payroll/EditModal.jsx` | `Dialog`, `Button`, `Input`, `Label`, `Separator`, `ScrollArea` |
| `src/components/payroll/PayrollTable.jsx` | `Table`, `Badge`, `Button`, `Tooltip` |
| `src/components/payroll/PayslipCard.jsx` | `Separator`, `Button` |
| `src/components/payroll/AuditLogSheet.jsx` | `Sheet`, `ScrollArea`, `Separator`, `Table` |
| `src/components/layout/Topbar.jsx` | `Tooltip` |
| `src/components/settings/SettingsModal.jsx` | `Dialog`, `Button`, `Input`, `Label` |
| `src/components/dashboard/StatCards.jsx` | `Card` |
| `src/components/ErrorBoundary.jsx` | `Button` |

### Re-exported Symbols (API Surface)

| Module | Exported Symbols |
|---|---|
| `alert-dialog.jsx` | `AlertDialog`, `AlertDialogPortal`, `AlertDialogOverlay`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel` |
| `avatar.jsx` | `Avatar`, `AvatarImage`, `AvatarFallback` |
| `badge.jsx` | `Badge`, `badgeVariants` |
| `button.jsx` | `Button`, `buttonVariants` |
| `card.jsx` | `Card`, `CardHeader`, `CardFooter`, `CardTitle`, `CardDescription`, `CardContent` |
| `dialog.jsx` | `Dialog`, `DialogPortal`, `DialogOverlay`, `DialogClose`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription` |
| `input.jsx` | `Input` |
| `label.jsx` | `Label` |
| `MonthPicker.jsx` | `MonthPicker` |
| `pagination.jsx` | `Pagination`, `PaginationContent`, `PaginationEllipsis`, `PaginationItem`, `PaginationLink`, `PaginationNext`, `PaginationPrevious` |
| `scroll-area.jsx` | `ScrollArea`, `ScrollBar` |
| `separator.jsx` | `Separator` |
| `sheet.jsx` | `Sheet`, `SheetPortal`, `SheetOverlay`, `SheetTrigger`, `SheetClose`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription` |
| `skeleton.jsx` | `Skeleton` |
| `table.jsx` | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption` |
| `tooltip.jsx` | `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` |

## File Inventory

| File | Components | Key Patterns | Lines |
|---|---|---|---|
| `alert-dialog.jsx` | 11 | Compound, Radix Wrapper, ForwardRef | 101 |
| `avatar.jsx` | 3 | Compound, Radix Wrapper, ForwardRef | 32 |
| `badge.jsx` | 1 (+ `badgeVariants`) | CVA Variant | 33 |
| `button.jsx` | 1 (+ `buttonVariants`) | CVA Variant, Polymorphic (Slot), ForwardRef | 48 |
| `card.jsx` | 6 | Compound, ForwardRef | 54 |
| `dialog.jsx` | 10 | Compound, Radix Wrapper, ForwardRef | 89 |
| `input.jsx` | 1 | ForwardRef | 19 |
| `label.jsx` | 1 (+ `labelVariants`) | CVA, Radix Wrapper, ForwardRef | 19 |
| `MonthPicker.jsx` | 1 | Controlled Component, Custom Popover | 130 |
| `pagination.jsx` | 7 | Compound, Semantic HTML (`nav`, `ul`, `li`, `a`) | 91 |
| `scroll-area.jsx` | 2 | Radix Wrapper, ForwardRef, Slot (ScrollBar) | 39 |
| `separator.jsx` | 1 | Radix Wrapper, ForwardRef | 23 |
| `sheet.jsx` | 10 | Compound, Radix Wrapper (Dialog alias), CVA Variant, ForwardRef | 106 |
| `skeleton.jsx` | 1 | Presentational | 12 |
| `table.jsx` | 8 | Compound, Semantic HTML, ForwardRef | 83 |
| `tooltip.jsx` | 4 | Compound, Radix Wrapper | 22 |

**Total**: 67 exported components/symbols across 16 files. All styling uses Tailwind CSS v4 with `tailwind-merge` for conflict resolution.
