import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { mockEmployees } from "@/lib/mockData";

/**
 * AuthContext
 *
 * Manages authentication state for PaySync.
 * Only users with role "admin" or "moderator" may log in.
 * Persists session to localStorage under key "payroll_auth".
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("payroll_auth");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.user) {
          setUser(parsed.user);
          setIsAuthenticated(true);
        }
      } catch {
        localStorage.removeItem("payroll_auth");
      }
    }
  }, []);

  /**
   * Authenticate a user by email + password.
   * Only admin and moderator roles are allowed.
   * Simulates a 600ms network delay.
   */
  const login = useCallback((email, password) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const employee = mockEmployees.find(
          (emp) =>
            emp.email.toLowerCase() === email.toLowerCase() &&
            emp.password === password &&
            (emp.role === "admin" || emp.role === "moderator")
        );

        if (employee) {
          const userData = {
            id: employee.id,
            name: employee.name,
            role: employee.role,
            email: employee.email,
            position: employee.position,
            department: employee.department,
          };
          setUser(userData);
          setIsAuthenticated(true);
          localStorage.setItem("payroll_auth", JSON.stringify({ user: userData }));
          resolve({ success: true, user: userData });
        } else {
          resolve({ success: false, error: "Invalid credentials or insufficient privileges" });
        }
      }, 600);
    });
  }, []);

  /** Update the user's password. */
  const updateUserPassword = useCallback((userId, newPassword) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const employee = mockEmployees.find((emp) => emp.id === userId);
        if (employee) {
          employee.password = newPassword;
          setUser((prev) => (prev ? { ...prev, password: newPassword } : prev));
          resolve({ success: true });
        } else {
          resolve({ success: false, error: "User not found" });
        }
      }, 300);
    });
  }, []);

  /** Clear session and reset state. */
  const logout = useCallback(() => {
    localStorage.removeItem("payroll_auth");
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, updateUserPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
