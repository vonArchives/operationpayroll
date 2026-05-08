import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext(null);

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const COOKIE_NAME = "jpmc_auth_token";
const STORAGE_KEY = "jpmc_session_user";

// ---- Cookie helpers ----------------------------------------------------------

function setCookie(name, value, maxAgeSec) {
  document.cookie = `${name}=${value}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax; Secure`;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : null;
}

function deleteCookie(name) {
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
}

// ---- JWT helpers -------------------------------------------------------------

function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

// ---- Provider ----------------------------------------------------------------

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null);

  // Dev bypass: auto-login as mock admin in development
  useEffect(() => {
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === "true") {
      const mockUser = {
        name: "Dev Admin",
        role: "admin",
        emp_id: "DEV001",
        email: "dev@local",
      };
      setUser(mockUser);
      setIsAuthenticated(true);
      setSessionExpiresAt(Date.now() + SESSION_TIMEOUT_MS);
      return;
    }
  }, []);

  // Restore session on mount from cookie (JWT) or localStorage fallback
  useEffect(() => {
    // Path 1: JWT cookie (new edge function)
    const token = getCookie(COOKIE_NAME);
    if (token) {
      const payload = decodeJwt(token);
      if (payload?.exp && payload.exp > Math.floor(Date.now() / 1000)) {
        const savedUser = localStorage.getItem(STORAGE_KEY);
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            setUser(parsed);
            setIsAuthenticated(true);
            setSessionExpiresAt(payload.exp * 1000);

            // Tell Supabase to use this token for all database requests
            supabase.rest.headers.Authorization = `Bearer ${token}`;
            supabase.realtime.setAuth(token);

            return;
          } catch {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      }
      // Invalid/expired JWT — clean up
      deleteCookie(COOKIE_NAME);
    }

    // Path 2: localStorage expiry fallback (old edge function, no JWT)
    const storedExpiry = localStorage.getItem("jpmc_session_expiry");
    if (storedExpiry && Number(storedExpiry) > Date.now()) {
      const savedUser = localStorage.getItem(STORAGE_KEY);
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          setIsAuthenticated(true);
          setSessionExpiresAt(Number(storedExpiry));
          return;
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    }

    // No valid session — clean up everything
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("jpmc_session_expiry");
  }, []);

  // Session timeout handler
  const handleTimeout = useCallback(() => {
    deleteCookie(COOKIE_NAME);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("jpmc_session_expiry");
    delete supabase.rest.headers.Authorization;
    setUser(null);
    setIsAuthenticated(false);
    setSessionExpiresAt(null);
    toast.info("Your session has expired. Please log in again.");
    window.location.href = "/login";
  }, []);

  useSessionTimeout({ onTimeout: handleTimeout, timeoutMs: SESSION_TIMEOUT_MS });

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
      const token = data.token;
      const expiresAt = Date.now() + SESSION_TIMEOUT_MS;

      setUser(userData);
      setIsAuthenticated(true);
      setSessionExpiresAt(expiresAt);

      if (token) {
        // New edge function with JWT: store token in cookie
        const payload = decodeJwt(token);
        const jwtExpiresAt = payload?.exp ? payload.exp * 1000 : expiresAt;
        setSessionExpiresAt(jwtExpiresAt);
        setCookie(COOKIE_NAME, token, Math.floor(SESSION_TIMEOUT_MS / 1000));
        supabase.rest.headers.Authorization = `Bearer ${token}`;
        supabase.realtime.setAuth(token);
      } else {
        // Old edge function (no JWT): store expiry timestamp in localStorage
        localStorage.setItem("jpmc_session_expiry", String(expiresAt));
      }

      // Store user data in localStorage (non-sensitive, no token)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));

      return { success: true, user: userData };
    } catch (err) {
      console.error("Login error:", err);
      return { success: false, error: "Something went wrong. Please try again." };
    }
  }, []);

  const logout = useCallback(() => {
    deleteCookie(COOKIE_NAME);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("jpmc_session_expiry");
    delete supabase.rest.headers.Authorization;
    setUser(null);
    setIsAuthenticated(false);
    setSessionExpiresAt(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, login, logout, sessionExpiresAt }}
    >
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
