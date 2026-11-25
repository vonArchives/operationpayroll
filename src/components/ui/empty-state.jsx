import { cn } from "@/lib/utils";

export function EmptyState({ icon: Icon, title, hint, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-4 py-10 text-center", className)}>
      {Icon && (
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;
