import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cn, getInitials } from "@/lib/utils";
import logo from "@/images/logo.png";
import {
  LayoutDashboard,
  Users,
  FileText,
  Wallet,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const baseNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Employees", href: "/employees", icon: Users },
  { name: "Payroll Summary", href: "/payroll", icon: FileText },
];

const adminNavItems = [
  { name: "Cash Advance", href: "/cash-advance", icon: Wallet },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  const initials = getInitials(user?.name, "U");

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo + Toggle */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <Link
          to="/dashboard"
          className={cn(
            "flex items-center font-bold text-lg text-sidebar-foreground transition-all",
            collapsed ? "gap-0" : "gap-2"
          )}
        >
          {!collapsed && (
            <>
              <img src={logo} alt="JPMC" className="h-8 w-8 object-contain rounded-lg shrink-0" />
              <span className="truncate">JPMC Payroll</span>
            </>
          )}
        </Link>
        <button
          onClick={onToggle}
          className={cn(
            "ml-auto rounded-md p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors",
            collapsed && "ml-0 mt-2"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {[...baseNavItems, ...(isAdmin ? adminNavItems : [])].map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60")} />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-2">
        <div className={cn("flex items-center", collapsed ? "flex-col gap-2" : "gap-3")}>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sm font-semibold text-sidebar-foreground shrink-0"
            title={collapsed ? user?.name : undefined}
          >
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                  user?.role === "admin"
                    ? "bg-sidebar-primary/20 text-sidebar-primary"
                    : "bg-sidebar-accent text-sidebar-foreground/80"
                )}
              >
                {user?.role}
              </span>
            </div>
          )}
          <button
            onClick={logout}
            className="rounded-md p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
