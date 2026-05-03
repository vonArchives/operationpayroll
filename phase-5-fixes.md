# Phase 5: Security & Config Hardening

## Summary

Four security and code quality fixes:
1. `.gitignore` hardened to prevent accidental credential commits
2. Supabase client validates env vars at startup instead of failing with opaque errors later
3. Four dead imports removed — lint output down from 4 errors + 1 warning to 0 errors + 1 warning

---

## Fix 5.1: Harden `.gitignore` Against Env File Leaks

### File: `.gitignore`

### Problem

Only `.env.local` was gitignored. Vite supports `.env`, `.env.development`, and `.env.production` files. If a developer created any of these containing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, running `git add .` would commit plaintext Supabase credentials to the repository.

### Before

```gitignore
*.local
.env.local

# Editor directories and files
```

### After

```gitignore
*.local
.env.local
.env
.env.development
.env.production

# Editor directories and files
```

### What Changed

| Change | Why |
|--------|-----|
| Added `.env` | Vite's default env file name |
| Added `.env.development` | Vite mode-specific env file |
| Added `.env.production` | Vite mode-specific env file |

---

## Fix 5.2: Supabase Client Env Var Validation

### File: `src/lib/supabaseClient.js`

### Problem

`createClient(undefined, undefined)` succeeds silently. All subsequent Supabase calls fail with opaque errors like `"URL is required"` at runtime — often deep inside a data fetch or mutation, making the root cause hard to trace.

Adding a guard clause catches the missing config immediately at app startup with a clear, actionable error message.

### Before

```js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### After

```js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
    "Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### What Changed

| Change | Why |
|--------|-----|
| Added `if (!supabaseUrl \|\| !supabaseAnonKey) throw` guard | Fail-fast at import time with a clear message instead of failing deep in a data fetch with an opaque error |

---

## Fix 5.3: Remove 4 Pre-existing Dead Imports

### Problem

Four unused imports had been generating lint errors since before Phase 1:

| File | Import | Why Dead |
|------|--------|----------|
| `AuthContext.jsx:2` | `supabase` | Auth uses `fetch()` directly to Supabase edge function, not the JS client |
| `Dashboard.jsx:1` | `useState` | Became dead after earlier refactors removed the local `getInitials` function that used it |
| `Dashboard.jsx:5` | `getPayrollPeriodLabel` | Function is defined in `payrollUtils.js` but never called in Dashboard |
| `Login.jsx:12` | `logo` | Branding panel uses inline `<div>P</div>`, never references the imported image |

### Fixes

**`src/context/AuthContext.jsx`:**
```diff
  import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
- import { supabase } from "@/lib/supabaseClient";
```

**`src/pages/Dashboard.jsx`:**
```diff
- import { useMemo, useState } from "react";
+ import { useMemo } from "react";
```

```diff
- import { computePayroll, getPayrollPeriodLabel } from "@/lib/payrollUtils";
+ import { computePayroll } from "@/lib/payrollUtils";
```

**`src/pages/Login.jsx`:**
```diff
- import logo from "@/images/logo.png";
```

---

## Lint Verification

### Before (4 errors, 1 warning)

```
D:\...\AuthContext.jsx
  2:10  error  'supabase' is defined but never used                     no-unused-vars

D:\...\PayrollContext.jsx
  228:6  warning  React Hook useEffect has a missing dependency           react-hooks/exhaustive-deps

D:\...\Dashboard.jsx
  1:19  error  'useState' is defined but never used                      no-unused-vars
  5:26  error  'getPayrollPeriodLabel' is defined but never used         no-unused-vars

D:\...\Login.jsx
  12:8  error  'logo' is defined but never used                          no-unused-vars

✖ 5 problems (4 errors, 1 warning)
```

### After (0 errors, 1 warning)

```
D:\...\PayrollContext.jsx
  228:6  warning  React Hook useEffect has a missing dependency           react-hooks/exhaustive-deps

✖ 1 problem (0 errors, 1 warning)
```

All 4 dead-import errors eliminated. The remaining warning is the pre-existing `useEffect` dependency concern in `PayrollContext.jsx` (left intentionally for future work).

---

## Files Changed

| File | Lines Changed | Change |
|------|--------------|--------|
| `.gitignore` | +3 lines | Added `.env`, `.env.development`, `.env.production` |
| `src/lib/supabaseClient.js` | +5 lines | Added env var validation guard clause |
| `src/context/AuthContext.jsx` | −1 line | Removed unused `supabase` import |
| `src/pages/Dashboard.jsx` | −2 imports | Removed unused `useState` and `getPayrollPeriodLabel` |
| `src/pages/Login.jsx` | −1 line | Removed unused `logo` import |

**Total: 5 files, +8 lines, −4 lines. 4 lint errors resolved. No behavioral changes.**
