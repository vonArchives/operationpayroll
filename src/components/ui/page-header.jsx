import { cn } from "@/lib/utils";

/**
 * Consistent page title row: title + optional description/badge on the left,
 * actions on the right. `children` renders below (e.g. progress or tabs).
 */
export function PageHeader({ title, description, badge, actions, children, className }) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            {badge}
          </div>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:shrink-0">{actions}</div>
        )}
      </div>
      {children}
    </div>
  );
}

export default PageHeader;
