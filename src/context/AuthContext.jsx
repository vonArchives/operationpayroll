import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext(null);
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Helper to fetch HR file
  const fetchEmployeeProfile = async (authId) => {
    try {
      const { data, error } = await supabase
        .from("employee")
        .select("*")
        .eq("auth_id", authId)
        .maybeSingle();

      if (error) {
        console.error("❌ Database error while fetching profile:", error);
        return null;
      }
      return data;
    } catch (err) {
      console.error("❌ JS error while fetching profile:", err);
      return null;
    }
  };

 useEffect(() => {
    const initializeAuth = async () => {
      setIsInitializing(true); 
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log("Found existing session for:", session.user.email);
          const profile = await fetchEmployeeProfile(session.user.id);
          
          if (profile) {
            setUser({ ...profile, email: session.user.email });
            setIsAuthenticated(true);
          } else {
            console.warn("Session exists but no employee profile found.");
            await supabase.auth.signOut();
          }
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
      } finally {
        setIsInitializing(false); 
      }
    };

    // Run the initialization
    initializeAuth();

    // Set up the listener for logout events (e.g., from other tabs)
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setIsAuthenticated(false);
        if (window.location.pathname !== "/login") {
          window.location.replace("/login");
        }
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // NATIVE SUPABASE LOGIN
  const login = useCallback(async (email, password) => {
    try {
      console.log("Step 1: Asking Supabase to verify credentials...");
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.log("❌ Step 1 Failed: Invalid credentials.");
        return { success: false, error: authError.message };
      }

      console.log("Step 2: Credentials valid! Fetching HR Profile for UID:", authData.user.id);
      const employeeProfile = await fetchEmployeeProfile(authData.user.id);

      if (!employeeProfile) {
        console.log("❌ Step 2 Failed: No matching auth_id in the employee table.");
        await supabase.auth.signOut();
        return { success: false, error: "No associated employee profile found." };
      }

      console.log("Step 3: Profile found! Merging data and logging in...", employeeProfile.name);
      setUser({ ...employeeProfile, email: authData.user.email });
      setIsAuthenticated(true);

      return { success: true, user: employeeProfile };
    } catch (err) {
      console.error("❌ Critical login crash:", err);
      return { success: false, error: "Something went wrong. Please try again." };
    }
  }, []);

  // THE NUCLEAR LOGOUT
  const logout = useCallback(async () => {
    // 1. CLEAR EVERYTHING LOCALLY FIRST
    // We do this BEFORE the API call so no old tokens can be sent
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear the specific custom cookie from your old system
    document.cookie = "jpmc_auth_token=; Max-Age=0; path=/; SameSite=Lax;";
    
    // 2. Wipe React State immediately to stop re-renders
    setUser(null);
    setIsAuthenticated(false);

    try {
      // 3. Now tell Supabase to sign out (it will use the local storage 
      // it just cleared, which is fine)
      await supabase.auth.signOut();
    } catch (err) {
      console.error("SignOut error:", err);
    } finally {
      // 4. Force a hard reload to the login page
      // This kills all running JavaScript memory and starts fresh
      window.location.href = "/login";
    }
  }, []);

  // SESSION TIMEOUT
  const handleTimeout = useCallback(() => {
    logout();
    toast.info("Your session has expired. Please log in again.");
  }, [logout]);

  useSessionTimeout({ onTimeout: handleTimeout, timeoutMs: SESSION_TIMEOUT_MS });

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isInitializing, login, logout }}>
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