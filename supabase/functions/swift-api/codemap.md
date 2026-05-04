# supabase/functions/swift-api/

## Responsibility

Serves as a **Backend-for-Frontend (BFF)** authentication endpoint for the Swift (iOS/macOS) mobile client. It implements a custom **password-based authentication flow** that bypasses Supabase Auth in favor of a bespoke credential store (`employee_auth` table) and issues self-signed JWTs for session management. The function acts as a **serverless HTTP handler** (Deno Edge Function) responsible for credential validation, identity assertion, and session token issuance.

## Design Patterns

| Pattern | Usage |
|---|---|
| **Edge Function / Serverless Handler** | Single entry point via `serve()` from `std@0.168.0/http/server.ts` — the runtime creates one HTTP listener per deployment. |
| **Backend-for-Frontend (BFF)** | Abstraction layer tailored specifically to the Swift mobile client's authentication needs; hides internal database schema and auth logic from the client. |
| **Request-Response** | Synchronous POST → process → JSON response cycle with no streaming or long-lived connections. |
| **Authentication Middleware Pipeline** | Linear pipeline of guard clauses: HTTP method check → body parsing → input validation → employee lookup → status check → auth record lookup → password verification → token generation → login timestamp update → response. |
| **Repository / Data Access Object** | Two explicit queries via `@supabase/supabase-js` acting as DAOs over the `employee` and `employee_auth` tables. |
| **Self-Signed JWT (Bearer Token)** | Uses `jose@5.2.0` (`SignJWT`) to issue HS256-signed tokens embedding `sub`, `role`, `email`, and `name` claims — no reliance on external identity providers. |
| **Password Verification via bcrypt** | Uses `bcryptjs@2.4.3` (`bcrypt.compare`) to verify the plaintext password against a stored bcrypt hash. |
| **Session Carried via HttpOnly Cookie** | Token delivery via `Set-Cookie` header (`jpmc_auth_token`) with `HttpOnly`, `Secure`, `SameSite=Lax` attributes and a 30-minute `Max-Age`. |

## Data & Control Flow

```
┌──────────────────────────────────────────────────────────┐
│  External: Swift Mobile Client                           │
│  POST /swift-api  { email, password }                   │
└─────────────────────┬────────────────────────────────────┘
                      │ HTTP POST
                      ▼
┌──────────────────────────────────────────────────────────┐
│  1. Method Guard                   (line 14)             │
│     Rejects non-POST with 405                            │
├──────────────────────────────────────────────────────────┤
│  2. Body Parsing                   (line 22)             │
│     `req.json()` → destructure { email, password }       │
├──────────────────────────────────────────────────────────┤
│  3. Input Validation               (line 24)             │
│     Rejects missing email/password with 400              │
├──────────────────────────────────────────────────────────┤
│  4. Supabase Client Init           (line 31-33)          │
│     `createClient(SUPABASE_URL, SERVICE_ROLE_KEY)`       │
├──────────────────────────────────────────────────────────┤
│  5. Employee Lookup                (line 36-40)          │
│     `employee` table: SELECT emp_id, first_name,         │
│     last_name, role, email, status WHERE email=? LIMIT 1 │
│     Rejects no match with 401                            │
├──────────────────────────────────────────────────────────┤
│  6. Status Gate                    (line 52)             │
│     Rejects `status !== "active"` with 403               │
├──────────────────────────────────────────────────────────┤
│  7. Auth Record Lookup             (line 60-64)          │
│     `employee_auth` table: SELECT password_hash,         │
│     last_login WHERE emp_id=?                            │
│     Rejects no match with 401                            │
├──────────────────────────────────────────────────────────┤
│  8. Password Verification          (line 74)             │
│     `bcrypt.compare(password, hash)`                     │
│     Rejects mismatch with 401                            │
├──────────────────────────────────────────────────────────┤
│  9. JWT Signing                    (line 84-96)          │
│     Claims: { sub: emp_id, role, email, name }           │
│     Protected: alg=HS256, iat=now, exp=now+1800s         │
│     Key: JWT_SECRET env var                              │
├──────────────────────────────────────────────────────────┤
│ 10. Login Timestamp Update         (line 99-102)         │
│     `employee_auth` UPDATE last_login=now()              │
├──────────────────────────────────────────────────────────┤
│ 11. Response Assembly              (line 104-121)        │
│     Body: { success:true, user:{...}, token }            │
│     Header: Set-Cookie: jpmc_auth_token=...              │
│     Status: 200                                          │
└─────────────────────┬────────────────────────────────────┘
                      │ HTTP JSON Response
                      ▼
┌──────────────────────────────────────────────────────────┐
│  External: Swift Mobile Client                           │
│  Stores token and/or cookie for subsequent requests      │
└──────────────────────────────────────────────────────────┘
```

**Error paths** (all return JSON `{ success: false, error: "<message>" }`):
- `405` — Method not allowed (non-POST)
- `400` — Missing email/password
- `401` — Invalid credentials (employee not found, auth record not found, or password mismatch — generic message to avoid enumeration)
- `403` — Account not active
- `500` — Unhandled exceptions (caught by outer `try/catch` at line 122)

## Integration Points

### Dependencies (runtime)

| Dependency | Version | Import | Used For |
|---|---|---|---|
| `std/http/server` | 0.168.0 | `serve()` | HTTP request listener |
| `jose/jwt/sign` | 5.2.0 | `SignJWT` | HS256 JWT signing |
| `@supabase/supabase-js` | 2.39.0 | `createClient()` | Postgres queries via Service Role |
| `bcryptjs` | 2.4.3 | `bcrypt.compare()` | Password hash verification |

### Environment Variables

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Symmetric key for HS256 JWT signing (required — throws at import if missing) |
| `SUPABASE_URL` | Supabase project URL (defaults to `""`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for privileged DB access (defaults to `""`) |

### Database Tables (Supabase Postgres)

| Table | Columns Read | Columns Written | Key |
|---|---|---|---|
| `employee` | `emp_id`, `first_name`, `last_name`, `role`, `email`, `status` | — | `email` |
| `employee_auth` | `password_hash`, `last_login` | `last_login` | `emp_id` (FK → employee) |

### Consumer

- **Swift (iOS/macOS) Mobile Client** — The sole consumer. The endpoint name `swift-api` and the cookie name `jpmc_auth_token` both indicate it is designed for a JPMC-branded Swift application. The client POSTs `{ email, password }` and receives a JWT (both in JSON body and as an HttpOnly cookie) for subsequent authenticated requests.

### Contract

```
POST /swift-api
Content-Type: application/json

Request:
  { "email": "<string>", "password": "<string>" }

Response (200):
  { "success": true, "user": { "emp_id", "first_name", "last_name", "name", "role", "email" }, "token": "<jwt>" }
  Set-Cookie: jpmc_auth_token=<jwt>; Max-Age=1800; Path=/; SameSite=Lax; Secure; HttpOnly

Response (4xx/5xx):
  { "success": false, "error": "<message>" }
```
