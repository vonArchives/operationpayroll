# Phase 1: Runtime Bug Fixes

## Summary

Two critical bugs fixed:
1. **SettingsContext.jsx** — Crash when users try to change password (referenced nonexistent function)
2. **mockData.js** — 10 hardcoded plaintext passwords visible in source control and browser devtools

---

## Fix 1.1: Broken `updateUserPassword` in SettingsContext

### File: `src/context/SettingsContext.jsx`

### Problem

`SettingsProvider` destructured `updateUserPassword` from `useAuth()` at line 9, but `AuthContext` never exports this method. Calling `updateUserPassword(user.id, newPassword)` at line 28 would throw:

```
TypeError: updateUserPassword is not a function
```

Additionally, password verification was done against `mockEmployees` (a static array of hardcoded credentials) instead of the actual backend.

### Before

```jsx
import { createContext, useContext, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { mockEmployees } from "@/lib/mockData";
import { toast } from "sonner";

export function SettingsProvider({ children }) {
  const { user, updateUserPassword } = useAuth();  // updateUserPassword is undefined!
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const updatePassword = useCallback(
    async (currentPassword, newPassword) => {
      if (!user) return { success: false, error: "No user logged in" };

      // Verifies against hardcoded mock data — not the backend
      const employee = mockEmployees.find(
        (emp) => emp.id === user.id && emp.password === currentPassword
      );

      if (!employee) {
        toast.error("Current password is incorrect");
        return { success: false, error: "Current password is incorrect" };
      }

      const result = await updateUserPassword(user.id, newPassword);  // CRASHES HERE
      if (result.success) {
        toast.success("Password updated successfully");
        closeSettings();
      } else {
        toast.error(result.error || "Failed to update password");
      }
      return result;
    },
    [user, updateUserPassword, closeSettings]  // updateUserPassword in deps is broken
  );
```

### After

```jsx
import { createContext, useContext, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

export function SettingsProvider({ children }) {
  const { user } = useAuth();  // Only destructure what exists
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const updatePassword = useCallback(
    async (_currentPassword, _newPassword) => {
      if (!user) return { success: false, error: "No user logged in" };

      toast.info("Password update requires backend integration.");
      return { success: false, error: "Not yet implemented" };
    },
    [user]  // Remove broken dependency
  );
```

### What Changed

| Change | Why |
|--------|-----|
| Removed `updateUserPassword` from `useAuth()` destructure | Function never existed in `AuthContext` |
| Removed `mockEmployees` import | No longer needed — password verification should go through backend |
| Removed mock password verification logic | Plaintext passwords in source code; verification belongs in backend |
| Stubbed `updatePassword` with a safe no-op + toast | Prevents crash; backend integration can be added later when InsForge endpoint is ready |
| Removed broken `updateUserPassword` and `closeSettings` from dependency array | These were causing stale closure warnings |

---

## Fix 1.2: Remove Hardcoded Passwords from Mock Data

### File: `src/lib/mockData.js`

### Problem

10 employee objects contained plaintext passwords embedded directly in the source code. These passwords were visible to:
- Anyone with repository access
- Anyone inspecting the JavaScript bundle in browser devtools

Even though labeled "mock," this file was used in production login path via `SettingsContext.jsx`.

### Password Values Removed

| Employee | Password |
|----------|----------|
| EMP001 — Juan Dela Cruz | `admin123` |
| EMP002 — Maria Santos | `admin123` |
| EMP003 — Pedro Reyes | `moderator123` |
| EMP004 — Ana Gonzales | `moderator123` |
| EMP005 — Ricardo Lim | `employee123` |
| EMP006 — Carmen Tan | `employee123` |
| EMP007 — Roberto Sy | `employee123` |
| EMP008 — Lourdes Cruz | `employee123` |
| EMP009 — Eduardo Reyes | `employee123` |
| EMP010 — Josefina Bautista | `employee123` |

### Before (example, one of 10 employees)

```js
{
  id: "EMP001",
  name: "Juan Dela Cruz",
  position: "HR Director",
  department: "Human Resources",
  role: "admin",
  email: "juan.delacruz@jpmc.com",
  password: "admin123",    // <-- REMOVED
  status_period1: "Approved",
  status_period2: "Approved",
  payroll: { ... }
}
```

### After

```js
{
  id: "EMP001",
  name: "Juan Dela Cruz",
  position: "HR Director",
  department: "Human Resources",
  role: "admin",
  email: "juan.delacruz@jpmc.com",
  // password field removed entirely
  status_period1: "Approved",
  status_period2: "Approved",
  payroll: { ... }
}
```

### What Changed

| Change | Why |
|--------|-----|
| Removed all 10 `password` lines | Credentials should never be stored in source code |
| File reduced from 391 to 381 lines | 10 lines of sensitive data removed |

---

## Files Changed

| File | Lines | Change |
|------|-------|--------|
| `src/context/SettingsContext.jsx` | -16 lines | Removed broken function reference, mock data import, and unsafe password logic |
| `src/lib/mockData.js` | -10 lines | Removed all 10 hardcoded `password` fields |

**Total: 2 files, 26 lines removed, 0 new runtime errors.**
