import { cn } from "@/lib/utils";

const TONES = {
  default: "bg-muted text-muted-foreground ring-border",
  primary: "bg-info/10 text-info ring-info/20",
  success: "bg-success/10 text-success ring-success/20",
  warning: "bg-warning/10 text-warning ring-warning/20",
  danger: "bg-danger/10 text-danger ring-danger/20",
};

/**
 * KPI tile. `hero` renders the brand-blue variant.
 * `children` is a slot under the value (progress bar, sparkline...).
 */
export function StatCard({ label, value, icon: Icon, hint, tone = "default", hero = false, className, children }) {
  return (
    <div
      className={cn(
        "relative isolate flex flex-col overflow-hidden rounded-xl border p-5 transition-all duration-200 hover:-translate-y-0.5",
        hero
          ? "border-transparent bg-gradient-to-br from-primary to-[hsl(225_62%_46%)] text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--brand-blue)/0.65)] hover:shadow-[0_16px_36px_-10px_hsl(var(--brand-blue)/0.75)]"
          : "border-border/80 bg-card shadow-card hover:shadow-card-hover",
        className
      )}
    >
      {hero && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -right-10 -top-12 h-36 w-36 rotate-45 rounded-3xl border border-white/15 bg-white/[0.06]" />
          <div className="absolute -bottom-16 right-10 h-28 w-28 rotate-45 rounded-2xl border border-white/10" />
          <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <p className={cn("text-sm font-medium", hero ? "text-white/80" : "text-muted-foreground")}>{label}</p>
        {Icon && (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
              hero ? "bg-white/15 text-white ring-white/20" : TONES[tone]
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className={cn("mt-2 text-2xl font-semibold tracking-tight tabular-nums break-words", hero ? "text-white" : "text-foreground")}>
        {value}
      </p>
      {hint && <p className={cn("mt-1 text-xs", hero ? "text-white/70" : "text-muted-foreground")}>{hint}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function ProgressBar({ value, className, barClassName }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full bg-success transition-all", barClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default StatCard;
