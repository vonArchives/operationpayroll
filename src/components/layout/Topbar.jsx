import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { format } from "date-fns";
import { getInitials } from "@/lib/utils";
import { Menu, Settings } from "lucide-react";
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
};

export default function Topbar({ onOpenNav }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { openSettings } = useSettings();

  const title = pageTitles[pathname] || "JPMC Payroll";
  const today = format(new Date(), "MMMM d, yyyy");

  const initials = getInitials(user?.name, "U");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card/80 backdrop-blur px-4 lg:px-6 pt-safe shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenNav}
          className="lg:hidden rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground hidden sm:inline">{today}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initials}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={openSettings}
                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
}
