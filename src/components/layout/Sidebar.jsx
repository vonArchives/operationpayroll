import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useRolePermissions } from "@/hooks/useRolePermissions";
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

const NAVY_BG = "#0B2757";
const NAVY_LIGHT = "#0f3369";
const NAVY_BORDER = "#0f3369";
const BRAND_BLUE = "#1972F9";
const BRAND_BLUE_LIGHT = "#518FFB";
const WHITE = "#ffffff";
const WHITE_60 = "rgba(255,255,255,0.6)";
const WHITE_70 = "rgba(255,255,255,0.7)";

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
  const { isAdmin } = useRolePermissions();

  /*
   added this to clear entire react memory tree
   and keep data from persisting between different logins
  */
  const handleLogoutClick = () => {
    logout();
    window.location.href = "/login"; 
  };

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  const initials = getInitials(user?.name, "U");

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-72"
      )}
      style={{ backgroundColor: NAVY_BG, borderRight: `1px solid ${NAVY_BORDER}` }}
    >
      {/* Logo + Toggle */}
      <div
        className="flex h-20 items-center px-5"
        style={{ borderBottom: `1px solid ${NAVY_BORDER}` }}
      >
        <Link
          to="/dashboard"
          className={cn(
            "flex items-center font-bold text-xl transition-all",
            collapsed ? "gap-0" : "gap-2"
          )}
          style={{ color: WHITE }}
        >
          {!collapsed && (
            <>
              <div className="bg-white rounded-xl p-1.5 shrink-0">
                <img src={logo} alt="JPMC" className="h-8 w-8 object-contain" />
              </div>
              <span className="truncate">JPMC Payroll</span>
            </>
          )}
        </Link>
        <button
          onClick={onToggle}
          className={cn(
            "ml-auto rounded-md p-1 transition-colors",
            collapsed && "ml-0 mt-2"
          )}
          style={{ color: WHITE_60 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = WHITE)}
          onMouseLeave={(e) => (e.currentTarget.style.color = WHITE_60)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-3">
        {[...baseNavItems, ...(isAdmin ? adminNavItems : [])].map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-4 rounded-xl px-4 py-3.5 text-base font-medium transition-colors",
                collapsed && "justify-center px-2"
              )}
              style={{
                color: isActive ? WHITE : WHITE_70,
                backgroundColor: isActive ? NAVY_LIGHT : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = NAVY_LIGHT;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
              }}
              title={collapsed ? item.name : undefined}
            >
              <item.icon
                className="h-6 w-6 shrink-0"
                style={{ color: isActive ? BRAND_BLUE : WHITE_60 }}
              />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3" style={{ borderTop: `1px solid ${NAVY_BORDER}` }}>
        <div className={cn("flex items-center", collapsed ? "flex-col gap-3" : "gap-4")}>
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full text-base font-semibold shrink-0"
            style={{ backgroundColor: NAVY_LIGHT, color: WHITE }}
            title={collapsed ? user?.name : undefined}
          >
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium truncate" style={{ color: WHITE }}>
                {user?.name}
              </p>
              <span
                className="inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium capitalize"
                style={{
                  backgroundColor: isAdmin ? "rgba(25,114,249,0.2)" : NAVY_LIGHT,
                  color: user?.role === "admin" ? BRAND_BLUE : WHITE_70,
                }}
              >
                {user?.role}
              </span>
            </div>
          )}
          <button
            onClick={handleLogoutClick}
            className="rounded-lg p-2.5 transition-colors"
            style={{ color: WHITE_60 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = WHITE)}
            onMouseLeave={(e) => (e.currentTarget.style.color = WHITE_60)}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
