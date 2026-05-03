import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { toast } from "sonner";

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

  // Restore session on mount from cookie + localStorage
  useEffect(() => {
    const token = getCookie(COOKIE_NAME);
    if (!token) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const payload = decodeJwt(token);
    if (!payload || !payload.exp) {
      deleteCookie(COOKIE_NAME);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowSec) {
      deleteCookie(COOKIE_NAME);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const savedUser = localStorage.getItem(STORAGE_KEY);
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setIsAuthenticated(true);
        setSessionExpiresAt(payload.exp * 1000);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Session timeout handler
  const handleTimeout = useCallback(() => {
    deleteCookie(COOKIE_NAME);
    localStorage.removeItem(STORAGE_KEY);
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
      const payload = decodeJwt(token);
      const expiresAt = payload?.exp ? payload.exp * 1000 : Date.now() + SESSION_TIMEOUT_MS;

      setUser(userData);
      setIsAuthenticated(true);
      setSessionExpiresAt(expiresAt);

      // Store token in cookie (30 min)
      setCookie(COOKIE_NAME, token, Math.floor(SESSION_TIMEOUT_MS / 1000));
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
