# `src/components/dashboard/` — StatCards Overview

## Directory Structure

```
dashboard/
├── StatCards.jsx       # Component (59 lines)
└── codemap.md          # This file
```

---

## Responsibility

The `dashboard/` directory contains a **single presentational (dumb) component**, `StatCards`, responsible for rendering a grid of summary statistic cards on the application's main dashboard view. Its sole concern is **visual layout and iconography mapping** — it holds no business logic, no state, and no side effects.

In standard software engineering terms, this module acts as a **pure view layer** that transforms a structured data object into a predetermined set of styled cards. It is a textbook example of the **Composite** pattern applied at the UI level: a single component composes multiple homogeneous card instances from a config array.

---

## Design Patterns

| Pattern | Application |
|---|---|
| **Presentational Component** | `StatCards` owns no state, receives all data via props, and renders UI exclusively. |
| **Configuration-Driven Rendering** | The `cards` array (lines 6–35) is a **static config list** that defines `label`, `value` key, `icon`, `color`, and `accent` for each card. The component iterates over this config to render `<Card>` instances. The array is **rebuilt on every render** (not memoized), but this is acceptable since it is small and constant. |
| **Polymorphic Icon Dispatch** | Each config entry specifies a Lucide icon component by reference (e.g., `Users`, `CheckCircle`). The component assigns it to a local variable (`const Icon = card.icon;`) and renders it as a JSX element, enabling polymorphic icon rendering without conditional branches. |
| **Slot / Children via Props (implicit)** | The `stats` object acts as a **data slot** whose keys (`totalEmployees`, `approved`, `pending`, `totalNetPayout`) are directly mapped into the `value` fields of each card config. This is a structural variation of the Slot pattern where data is projected into predefined template positions. |

---

## Data & Control Flow

### Entry Point

```
Dashboard.jsx (consumer)
    │
    │  usePayroll() → { employees, payrollPeriod, ... }
    │  useMemo(() => {
    │    employees.forEach(emp => {
    │      computePayroll(emp.payroll) → { net_pay }
    │      aggregate approved/pending counts
    │    })
    │    return { totalEmployees, approved, pending, totalNetPayout }
    │  }, [employees])
    │
    ▼
<StatCards stats={stats} />          ◄── single prop passed
```

The `stats` object shape:

```typescript
interface DashboardStats {
  totalEmployees: number;
  approved: number;
  pending: number;
  totalNetPayout: string;           // locale-formatted currency string
}
```

### Internal Flow (StatCards)

1. **Receive** `stats` prop.
2. **Rebuild** `cards` config array — each entry reads a key from `stats` for its `value` field.
3. **Render** a responsive 2-col (mobile) / 4-col (md+) grid via Tailwind `grid grid-cols-2 gap-4 md:grid-cols-4`.
4. **Iterate** over `cards` with `.map()`, creating for each:
   - A `<Card>` with a left-border accent (`border-l-4 border-{color}-{shade}`).
   - A `<CardHeader>` containing the label and the Lucide icon.
   - A `<CardContent>` displaying the formatted `value`.

### Exit Point

```
StatCards renders → 4× <Card> elements → DOM output (no callbacks, no events)
```

No events, no callbacks, no children, no render props are emitted upward. The component is a **pure leaf** in the component tree.

---

## Integration Points

### Upstream Dependencies (imports)

| Import | Source | Usage |
|---|---|---|
| `Card`, `CardContent`, `CardHeader`, `CardTitle` | `@/components/ui/card` | Structural card layout primitives. These are the application's design-system card components (likely shadcn/ui-based). |
| `Users`, `CheckCircle`, `Clock`, `Wallet` | `lucide-react` | SVG icon components used as visual indicators for each stat category. |
| `cn` | `@/lib/utils` | Tailwind class merge utility (`clsx` + `tailwind-merge` wrapper) for conditional class composition on card accents and icon/text colors. |

### Downstream Consumers

| Consumer | Location | Integration |
|---|---|---|
| `Dashboard` (page-level component) | `src/pages/Dashboard.jsx` | Imports `StatCards` at line 7, renders it at line 77 as `<StatCards stats={stats} />`. The `stats` object is derived via `useMemo` from the `usePayroll()` hook and `computePayroll()` utility. |

### No Direct External API / Store Integration

`StatCards` has no direct coupling to:
- Supabase / database layer
- React context or state management
- Router
- HTTP requests or server actions

All data arrives already computed and formatted via the `stats` prop, making the component **trivially testable** and **reusable** in any context that provides the correct shape.

---

## Performance Characteristics

- **Renders on every parent re-render** — no `React.memo` wrapper is applied. Given the small render tree (4 cards, no deep nesting), this is unlikely to be a bottleneck.
- **Cards config array is recreated each render** — acceptable for a 4-element constant array; would benefit from extraction to a module-level constant only if the component were rendered frequently or the list grew significantly.
- **No `useMemo`/`useCallback`** — appropriate for a pure presentational component with no expensive computations.

---

## Testability

`StatCards` is highly amenable to unit testing:
1. **Isolated rendering** — only requires a `stats` prop; no providers, no mocked hooks.
2. **Snapshot testing** — deterministic output given the same props.
3. **Structural assertions** — exactly 4 `<Card>` elements rendered; each contains expected label text and a value; icons can be asserted by data-testid or Lucide component class names.
4. **Edge cases** — zero values (`totalEmployees: 0`, `approved: 0`, `pending: 0`, `totalNetPayout: "₱0.00"`) should render without error.
