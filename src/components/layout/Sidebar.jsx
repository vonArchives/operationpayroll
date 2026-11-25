import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { cn, getInitials } from "@/lib/utils";
import logo from "@/images/logo.png";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Users,
  FileText,
  Wallet,
  LogOut,
  Settings,
  ChevronsUpDown,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Payroll",
    items: [
      { name: "Payroll Summary", href: "/payroll", icon: FileText },
      { name: "Cash Advance", href: "/cash-advance", icon: Wallet, adminOnly: true },
    ],
  },
  {
    label: "People",
    items: [{ name: "Employees", href: "/employees", icon: Users }],
  },
];

function NavItem({ item, active, collapsed, onNavigate }) {
  const link = (
    <Link
      to={item.href}
      onClick={() => onNavigate?.()}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-white"
          : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-white",
        collapsed && "justify-center px-0"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
      )}
      <item.icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-sidebar-primary" : "text-sidebar-muted group-hover:text-white"
        )}
      />
      {!collapsed && <span className="truncate">{item.name}</span>}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.name}</TooltipContent>
    </Tooltip>
  );
}

function UserMenu({ user, collapsed, onSettings, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initials = getInitials(user?.name, "U");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent/60",
          open && "bg-sidebar-accent/60",
          collapsed && "justify-center"
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
          {initials}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">{user?.name}</span>
              <span className="block truncate text-xs capitalize text-sidebar-muted">{user?.role}</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-muted" />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute bottom-full z-50 mb-2 w-56 overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg",
            collapsed ? "left-0" : "left-0 right-0 w-auto"
          )}
        >
          <div className="border-b px-3 py-2">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSettings();
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            Settings
          </button>
          <button
            role="menuitem"
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ collapsed, onToggle, variant = "desktop", onNavigate }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { openSettings } = useSettings();
  const { isAdmin } = useRolePermissions();

  const isDrawer = variant === "drawer";
  const isCollapsed = !isDrawer && collapsed;

  /*
   added this to clear entire react memory tree
   and keep data from persisting between different logins
  */
  const handleLogoutClick = () => {
    logout();
    window.location.href = "/login";
  };

  useEffect(() => {
    if (!isDrawer) {
      localStorage.setItem("sidebar_collapsed", JSON.stringify(collapsed));
    }
  }, [collapsed, isDrawer]);

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "isolate flex flex-col bg-gradient-to-b from-[hsl(225.6_58%_36%)] to-sidebar-background",
          isDrawer
            ? "relative h-full w-72"
            : "fixed inset-y-3 left-3 z-40 rounded-xl shadow-xl shadow-brand-navy/25 transition-[width] duration-300 ease-in-out",
          !isDrawer && (collapsed ? "w-[72px]" : "w-64")
        )}
      >
        {/* Decorative depth, clipped separately so the user menu can overflow */}
        <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", !isDrawer && "rounded-xl")}>
          <div className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10" />
          <div className="absolute -bottom-24 -left-16 h-64 w-64 rotate-45 rounded-[40px] border border-white/[0.07] bg-white/[0.03]" />
          <div className="absolute -right-20 top-10 h-40 w-40 rounded-full bg-brand/30 blur-3xl" />
        </div>

        {/* Brand + collapse toggle */}
        <div
          className={cn(
            "flex items-center gap-2 px-3",
            isCollapsed ? "flex-col justify-center py-3" : "h-16"
          )}
        >
          <Link to="/dashboard" onClick={() => onNavigate?.()} className="flex min-w-0 flex-1 items-center gap-2.5 pl-1">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white p-1">
              <img src={logo} alt="JPMC" className="h-full w-full object-contain" />
            </span>
            {!isCollapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">JPMC Payroll</span>
                <span className="block truncate text-[11px] text-sidebar-muted">JP Management</span>
              </span>
            )}
          </Link>
          {!isDrawer && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggle}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-accent/60 hover:text-white"
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent>
            </Tooltip>
          )}
        </div>
        {!isDrawer && <div className="mx-3 h-px bg-sidebar-border" />}

        {/* Navigation */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {NAV_SECTIONS.map((section) => {
            const items = section.items.filter((i) => !i.adminOnly || isAdmin);
            if (items.length === 0) return null;
            return (
              <div key={section.label} className="space-y-1">
                {isCollapsed ? (
                  <div className="mx-auto mb-2 h-px w-6 bg-sidebar-border" />
                ) : (
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-white/60">
                    {section.label}
                  </p>
                )}
                {items.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    active={pathname === item.href}
                    collapsed={isCollapsed}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3">
          <UserMenu
            user={user}
            collapsed={isCollapsed}
            onSettings={() => {
              onNavigate?.();
              openSettings();
            }}
            onLogout={handleLogoutClick}
          />
        </div>
      </aside>
    </TooltipProvider>
  );
}
