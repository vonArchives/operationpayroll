import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { AppShellSkeleton } from "@/components/ui/page-skeletons";

export default function PrivateRoute({ children }) {
  const { isAuthenticated, isInitializing } = useAuth();

  // Wait for the saved session to load so a refresh keeps the current page
  // instead of bouncing through /login to /dashboard.
  if (isInitializing) {
    return <AppShellSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
