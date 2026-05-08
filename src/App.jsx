import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { PayrollProvider } from "@/context/PayrollContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import PrivateRoute from "@/components/PrivateRoute";
import AdminRoute from "@/components/AdminRoute";
import AppShell from "@/components/layout/AppShell";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Employees from "@/pages/Employees";
import PayrollRun from "@/pages/PayrollRun";
import CashAdvance from "@/pages/CashAdvance";

function AuthGuard({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SettingsProvider>
          <PayrollProvider>
            <BrowserRouter>
              <Routes>
                <Route
                  path="/login"
                  element={
                    <AuthGuard>
                      <Login />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/*"
                  element={
                    <PrivateRoute>
                      <AppShell />
                    </PrivateRoute>
                  }
                >
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="employees" element={<Employees />} />
                  <Route path="payroll" element={<PayrollRun />} />
                  <Route
                    path="cash-advance"
                    element={
                      <AdminRoute>
                        <CashAdvance />
                      </AdminRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </PayrollProvider>
        </SettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
