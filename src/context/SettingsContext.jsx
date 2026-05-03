import { createContext, useContext, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  const updatePassword = useCallback(
    async (_currentPassword, _newPassword) => {
      if (!user) return { success: false, error: "No user logged in" };

      toast.info("Password update requires backend integration.");
      return { success: false, error: "Not yet implemented" };
    },
    [user]
  );

  return (
    <SettingsContext.Provider
      value={{ isSettingsOpen, openSettings, closeSettings, updatePassword }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
