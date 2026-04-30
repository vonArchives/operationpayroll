import { createContext, useContext, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { mockEmployees } from "@/lib/mockData";
import { toast } from "sonner";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const { user, updateUserPassword } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  const updatePassword = useCallback(
    async (currentPassword, newPassword) => {
      if (!user) return { success: false, error: "No user logged in" };

      const employee = mockEmployees.find(
        (emp) => emp.id === user.id && emp.password === currentPassword
      );

      if (!employee) {
        toast.error("Current password is incorrect");
        return { success: false, error: "Current password is incorrect" };
      }

      const result = await updateUserPassword(user.id, newPassword);
      if (result.success) {
        toast.success("Password updated successfully");
        closeSettings();
      } else {
        toast.error(result.error || "Failed to update password");
      }
      return result;
    },
    [user, updateUserPassword, closeSettings]
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
