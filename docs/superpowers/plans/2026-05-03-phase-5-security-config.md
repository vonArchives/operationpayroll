# Phase 5: Security & Config Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent accidental credential leaks via `.gitignore`, add runtime crash-prevention for missing Supabase config, and clean 4 pre-existing lint errors (dead imports).

**Architecture:** Three independent tasks — `.gitignore` hardening (config-only), Supabase client validation (guard clause), and dead-import cleanup (4 files, mechanical). No consumer changes, no behavioral changes.

**Tech Stack:** Vite (`import.meta.env`), Supabase JS client v2, ESLint 9

---

### Task 1: Harden `.gitignore` against env file leaks

**Files:**
- Modify: `.gitignore`

**Context:** Only `.env.local` is in `.gitignore`. Vite supports `.env`, `.env.development`, and `.env.production` files. If a developer creates any of these with Supabase keys, `git add .` would commit them.

- [ ] **Step 1: Add missing env file patterns**

Insert after `.env.local` in `.gitignore`:

```
.env.local
.env
.env.development
.env.production
```

- [ ] **Step 2: Verify via git status**

```bash
git status
```
Expected: No `.env` files appear as tracked or untracked.

---

### Task 2: Add Supabase env var validation

**Files:**
- Modify: `src/lib/supabaseClient.js`

**Context:** `createClient(undefined, undefined)` succeeds silently but all subsequent calls fail with opaque errors. A guard clause catches this at app startup.

- [ ] **Step 1: Insert guard clause before client creation**

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

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint
```
Expected: Same pre-existing errors, 0 new.

---

### Task 3: Clean 4 pre-existing lint errors (dead imports)

**Files:**
- Modify: `src/context/AuthContext.jsx`
- Modify: `src/pages/Dashboard.jsx`
- Modify: `src/pages/Login.jsx`

**Context:** These 4 unused imports have been in lint output since before Phase 1. AuthContext uses `fetch()` directly to the edge function, not the Supabase JS client. Login branding uses inline `<div>P</div>`, not the logo image. Dashboard's `useState` and `getPayrollPeriodLabel` imports became dead after earlier refactors.

- [ ] **Step 1: Remove unused `supabase` import from AuthContext.jsx**

Delete line 2: `import { supabase } from "@/lib/supabaseClient";`

- [ ] **Step 2: Remove unused `useState` from Dashboard.jsx**

Change: `import { useMemo, useState } from "react";` → `import { useMemo } from "react";`

- [ ] **Step 3: Remove unused `getPayrollPeriodLabel` from Dashboard.jsx**

Change: `import { computePayroll, getPayrollPeriodLabel } from "@/lib/payrollUtils";` → `import { computePayroll } from "@/lib/payrollUtils";`

- [ ] **Step 4: Remove unused `logo` import from Login.jsx**

Delete line: `import logo from "@/images/logo.png";`

- [ ] **Step 5: Run lint to verify**

```bash
npm run lint
```
Expected: Only 1 warning remains (`PayrollContext.jsx` useEffect dependency — pre-existing).

---

### Self-Review

**Spec coverage:** All 3 requirements covered (`.gitignore`, supabase validation, dead imports).

**Placeholder scan:** No TODOs, all code explicit.

**Type consistency:** No cross-task type dependencies.
