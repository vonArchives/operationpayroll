import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { format } from "date-fns";
import { getInitials } from "@/lib/utils";
import { CalendarDays, ChevronRight, Menu, Settings } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const pageTitles = {
  "/dashboard": "Dashboard",
  "/employees": "Employees",
  "/payroll": "Payroll Summary",
  "/cash-advance": "Cash Advance",
};

export default function Topbar({ onOpenNav }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { openSettings } = useSettings();

  const title = pageTitles[pathname] || "JPMC Payroll";
  const today = format(new Date(), "EEE, MMM d, yyyy");
  const initials = getInitials(user?.name, "U");

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/70 bg-card/75 px-4 shadow-[0_1px_0_rgb(255_255_255/0.6)_inset] backdrop-blur-md pt-safe lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={onOpenNav}
          className="-ml-1 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
          <span className="hidden text-muted-foreground sm:inline">JPMC Payroll</span>
          <ChevronRight className="hidden h-3.5 w-3.5 text-muted-foreground/60 sm:inline" />
          <span className="truncate font-medium text-foreground">{title}</span>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1 text-xs text-muted-foreground md:inline-flex">
          <CalendarDays className="h-3.5 w-3.5" />
          {today}
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={openSettings}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Settings"
              >
                <Settings className="h-[18px] w-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          title={user?.name}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
