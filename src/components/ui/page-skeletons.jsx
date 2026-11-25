import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Title + description (+ optional action buttons) placeholder. */
export function PageHeaderSkeleton({ actions = 1, className }) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      {actions > 0 && (
        <div className="flex gap-2">
          {Array.from({ length: actions }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-32 rounded-lg" />
          ))}
        </div>
      )}
    </div>
  );
}

/** Matches StatCard: label + icon chip, value, hint. */
export function StatCardSkeleton({ className }) {
  return (
    <div className={cn("rounded-xl border border-border/80 bg-card p-5 shadow-card", className)}>
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-7 w-32" />
      <Skeleton className="mt-2 h-3 w-20" />
    </div>
  );
}

export function StatCardsSkeleton({ count = 4, className }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Generic table body placeholder: optional avatar column + N text columns. */
export function TableRowsSkeleton({ rows = 6, columns = 4, avatar = false, className }) {
  return (
    <div className={cn("divide-y", className)}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {avatar && (
            <div className="flex min-w-[200px] items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          )}
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn("h-3.5 flex-1", c === columns - 1 && "ml-auto max-w-[120px]")}
              style={{ maxWidth: c === columns - 1 ? undefined : `${120 - ((r + c) % 3) * 20}px` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Full app frame shown while the saved session loads (on first open / refresh),
 * so users see the layout instead of a lone spinner.
 */
export function AppShellSkeleton() {
  return (
    <div className="flex min-h-svh bg-background" aria-busy="true" aria-label="Loading">
      <aside className="fixed inset-y-3 left-3 hidden w-64 flex-col rounded-xl bg-sidebar-background p-3 lg:flex">
        <div className="flex h-16 items-center gap-2.5 px-1">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-white/20" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-24 animate-pulse rounded bg-white/20" />
            <div className="h-2.5 w-16 animate-pulse rounded bg-white/10" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-white/10" />
          ))}
        </div>
        <div className="mt-auto flex items-center gap-3 p-2">
          <div className="h-8 w-8 animate-pulse rounded-full bg-white/20" />
          <div className="h-3.5 w-24 animate-pulse rounded bg-white/15" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col lg:ml-[268px]">
        <div className="flex h-14 items-center justify-between border-b border-border/70 bg-card/75 px-4 lg:px-8">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
          <PageHeaderSkeleton actions={2} />
          <StatCardsSkeleton />
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-72 rounded-xl lg:col-span-2" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
