import { cn } from "@/lib/utils"

// Slightly darker than bg-muted so it's visible on both cards and the page background.
function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-foreground/[0.07]", className)}
      {...props}
    />
  )
}

export { Skeleton }
