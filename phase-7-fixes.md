# Phase 7: JWT + Cookie Session Management with 30-Min Timeout

**Date:** 2026-05-03
**Scope:** Replace indefinite localStorage auth with JWT-based sessions, cookies, and idle timeout.

---

## Problem Statement

The previous auth system stored the user object in `localStorage` under `payroll_auth` with **no expiry mechanism**. This meant:
- Sessions lasted forever until the user manually logged out or cleared storage
- No protection against stolen tokens (localStorage is accessible by XSS)
- No automatic logout after inactivity
- No way to know if a session was still valid without checking the server

The edge function (`swift-api`) previously returned only `{ success: true, user: {...} }` with no token, making the frontend fully responsible for session management.

---

## Solution Overview

1. **Edge function generates a signed JWT** on successful login, returned in the response body AND via `Set-Cookie` header
2. **Frontend stores the JWT in a cookie** (not localStorage) for persistence across page refreshes
3. **User data is stored separately** in localStorage (non-sensitive, no token)
4. **Idle timer** tracks user activity and auto-logouts after 30 minutes of inactivity
5. **Warning toast** appears 1 minute before expiry with a "Continue" button to reset the timer
6. **Session expiry check** runs on mount — invalid/expired JWTs are cleared immediately

---

## Files Created

### 1. `src/hooks/useSessionTimeout.js`

Standalone React hook that:
- Listens for `mousemove`, `keydown`, `click`, `scroll`, `touchstart` on `window`
- Checks idle time every 10 seconds
- Shows a `toast.warning(...)` with a "Continue" action button 1 minute before timeout
- Calls `onTimeout()` callback when idle exceeds 30 minutes

**Key design:** Uses `useRef` for the idle tracker and warning state to avoid re-triggering the `useEffect` interval on state changes.

### 2. `supabase/functions/swift-api/index.ts`

Enhanced edge function that:
- Accepts `email` + `password` via POST
- Queries `employee` joined with `employee_auth`
- Verifies password using **bcryptjs** (npm package, Deno-compatible)
- Generates a JWT with `jose` (HS256, signed with `JWT_SECRET`)
- JWT payload: `{ sub: emp_id, role, email, name, iat, exp }`
- Sets `Set-Cookie: jpmc_auth_token=<jwt>; ... HttpOnly; Secure; SameSite=Lax`
- Returns `{ success: true, user, token }`

**Environment variables required:**
- `JWT_SECRET` — 64+ character random string (set via `supabase secrets set JWT_SECRET=...`)
- `SUPABASE_URL` — auto-provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — auto-provided by Supabase

---

## Files Modified

### 3. `src/context/AuthContext.jsx` (rewritten)

#### Before
```js
localStorage.setItem("payroll_auth", JSON.stringify({ user: userData }));
```

#### After
```js
setCookie(COOKIE_NAME, token, 1800);           // 30 min cookie
localStorage.setItem(STORAGE_KEY, JSON.stringify(userData)); // user data only
```

**New auth flow:**
1. `login(email, password)` → calls edge function → receives `{ user, token }` → sets cookie + localStorage → returns success
2. `useEffect` on mount → reads cookie → decodes JWT (no verification, just expiry check) → restores session if valid
3. `useSessionTimeout` hook → tracks activity → auto-logout after 30 min idle
4. `logout()` → deletes cookie + clears localStorage + resets state

**New context values:**
- `sessionExpiresAt` — `number | null` (Unix timestamp in ms, for UI countdown if needed)

**Removed:**
- `payroll_auth` localStorage key (replaced with `jpmc_auth_token` cookie + `jpmc_session_user` localStorage)

---

## Security Improvements

| Before | After |
|--------|-------|
| Token in localStorage (XSS-vulnerable) | Token in cookie with `Secure; SameSite=Lax` |
| No expiry | JWT `exp` claim + 30-min idle timeout |
| No session validation | Decodes and checks `exp` on every mount |
| No auto-logout | Auto-logout after 30 min inactivity |
| No warning | 1-minute warning toast before expiry |

---

## Deployment Notes

The edge function must be deployed manually:

```bash
# 1. Set the JWT secret (one-time)
supabase secrets set JWT_SECRET=$(openssl rand -base64 64)

# 2. Deploy the function
supabase functions deploy swift-api
```

**Caveat:** The existing deployed edge function at `/functions/v1/swift-api` will be overwritten by this new version. The old function returned `{ success, user }` without a token; this new version returns `{ success, user, token }`. The frontend is backwards-compatible with the extra `token` field (it just ignores it if present, but now it uses it).

If the existing edge function is still needed during transition, deploy under a different name first.

---

## Backwards Compatibility

- **Old `payroll_auth` localStorage entries** are ignored on mount. Users will need to log in again once.
- **API signature unchanged:** `login(email, password)` still returns `{ success, user }` (now with token internally)
- **`useAuth()` returns the same shape** plus `sessionExpiresAt` (safe to ignore by existing callers)
- **Edge function response** adds `token` field — old frontend ignores it, new frontend uses it

---

## Verification

- [ ] `npm run build` passes (0 errors)
- [ ] `npm run lint` passes (0 errors, 1 pre-existing warning)
- [ ] Edge function deploys successfully to Supabase
- [ ] Login stores `jpmc_auth_token` cookie
- [ ] Idle for 29 minutes shows warning toast
- [ ] Idle for 30 minutes auto-redirects to `/login`
- [ ] Closing and reopening browser (within 30 min) restores session
- [ ] After 30 min, cookie is rejected and user is logged out
