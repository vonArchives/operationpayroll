import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function AdminRoute({ children }) {
  const { user, isAuthenticated, isInitializing } = useAuth();

  // 1. If we are still checking the session, show a loading screen
  // This prevents the "flash" of redirecting to /dashboard
  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0B2757]">
        <Loader2 className="h-8 w-8 animate-spin text-white opacity-50" />
      </div>
    );
  }

  // 2. If the user isn't logged in at all, send them to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 3. Check for Admin OR devAdmin (case-insensitive)
  const currentRole = user?.role?.toLowerCase();
  const hasAdminAccess = currentRole === "admin" || currentRole === "devadmin";

  if (!hasAdminAccess) {
    // If they are a moderator or employee, they can't be here
    return <Navigate to="/dashboard" replace />;
  }

  // 4. If everything clears, let them through!
  return children;
}