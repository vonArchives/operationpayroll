import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import SettingsModal from "@/components/settings/SettingsModal";

export default function AppShell() {
  const { pathname } = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    return saved ? JSON.parse(saved) : false;
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "sidebar_collapsed") {
        setSidebarCollapsed(e.newValue ? JSON.parse(e.newValue) : false);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <div className="relative isolate flex min-h-svh bg-background">
      {/* Soft brand-tinted light at the top so the canvas isn't flat gray */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(ellipse_80%_60%_at_60%_-10%,hsl(var(--brand-blue)/0.12),transparent_70%)]"
      />
      <div className="hidden lg:block">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((prev) => !prev)} />
      </div>
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar variant="drawer" onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>
      <div
        className={cn(
          "flex flex-1 flex-col min-w-0 transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "lg:ml-[84px]" : "lg:ml-[268px]"
        )}
      >
        <Topbar onOpenNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 pb-safe">
          <div className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8">
            {/* Re-keyed per route so each page fades in on navigation */}
            <div key={pathname} className="animate-fade-up">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
      <SettingsModal />
    </div>
  );
}
