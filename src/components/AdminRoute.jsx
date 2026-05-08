import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function AdminRoute({ children }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
