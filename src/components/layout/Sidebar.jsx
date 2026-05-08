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

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Employees", href: "/employees", icon: Users },
  { name: "Payroll Summary", href: "/payroll", icon: FileText },
  { name: "Cash Advance", href: "/cash-advance", icon: Wallet },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  const initials = getInitials(user?.name, "U");

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-card transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo + Toggle */}
      <div className="flex h-16 items-center border-b px-4">
        <Link
          to="/dashboard"
          className={cn(
            "flex items-center font-bold text-lg text-primary transition-all",
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
            "ml-auto rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
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
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t p-2">
        <div className={cn("flex items-center", collapsed ? "flex-col gap-2" : "gap-3")}>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary shrink-0"
            title={collapsed ? user?.name : undefined}
          >
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                  user?.role === "admin"
                    ? "bg-[#1e3682]/10 text-[#1e3682]"
                    : "bg-purple-100 text-purple-700"
                )}
              >
                {user?.role}
              </span>
            </div>
          )}
          <button
            onClick={logout}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
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
