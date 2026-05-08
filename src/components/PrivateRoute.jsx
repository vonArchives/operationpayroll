import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";

export default function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();

  const isDevBypass =
    import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

  if (!isAuthenticated && !isDevBypass) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
