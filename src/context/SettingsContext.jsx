import { createContext, useContext, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient"; // Make sure this path matches your project structure
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

 const updatePassword = useCallback(
    async (currentPassword, newPassword) => {
      console.log("1. Starting password update process...");

      if (!user?.email) {
        console.error("❌ Failed: No user email found in AuthContext.");
        toast.error("No authenticated user found.");
        return { success: false, error: "No user logged in" };
      }

      try {
        console.log(`2. Attempting to verify old password for: ${user.email}`);
        
        // Step 1: Verify Current Password
        const { data: verifyData, error: verifyError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });

        if (verifyError) {
          console.error("❌ Verification Failed! Supabase says:", verifyError.message, verifyError);
          toast.error(`Verification Failed: ${verifyError.message}`);
          return { success: false, error: verifyError.message };
        }

        console.log("✅ Verification passed! User is who they say they are.");
        console.log("3. Sending new password to Supabase...");

        // Step 2: Update Password
        const { data: updateData, error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateError) {
          console.error("❌ Update Failed! Supabase says:", updateError.message, updateError);
          toast.error(`Update Failed: ${updateError.message}`);
          return { success: false, error: updateError.message };
        }

        console.log("✅ Password successfully updated in Supabase!", updateData);
        toast.success("Password updated successfully!");
        closeSettings();
        return { success: true };

      } catch (error) {
        console.error("❌ A major code crash occurred:", error);
        toast.error(error.message || "An unexpected error occurred.");
        return { success: false, error: error.message };
      }
    },
    [user, closeSettings]
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