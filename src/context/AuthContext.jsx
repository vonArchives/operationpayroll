import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

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

  const login = useCallback(async (email, password) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/swift-api`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email, password }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data?.error || "Invalid credentials or insufficient privileges",
      };
    }

    const userData = data.user;
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem("payroll_auth", JSON.stringify({ user: userData }));
    return { success: true, user: userData };

  } catch (err) {
    console.error("Login error:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}, []);

  const logout = useCallback(() => {
    localStorage.removeItem("payroll_auth");
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
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