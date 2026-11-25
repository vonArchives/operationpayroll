// Run the frontend against a fully local backend (no Supabase account).
//
//   npm run dev:local
//
// Starts:
//   - the local Postgres test cluster (scripts/test-db.ps1, port 54329)
//   - PostgREST on port 54330 (tools/postgrest/postgrest.exe)
//   - a gateway on port 54321 that looks like Supabase to supabase-js:
//       /rest/v1/*      -> PostgREST
//       /auth/v1/*      -> fake auth backed by local_auth_users (db/local-auth.sql)
//       /functions/v1/* -> stubbed, logs the call and returns { ok: true }
//   - Vite in dev mode with VITE_SUPABASE_URL/ANON_KEY pointing at the gateway
//
// Your .env (real Supabase) is left untouched; `npm run dev` still uses it.
// Test logins: any seeded email (e.g. alex@example.test) / password123

import http from "node:http";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GATEWAY_PORT = 54321;
const PGRST_PORT = 54330;
const DB_URI = "postgres://authenticator@localhost:54329/payroll_test";
// Local-only signing secret. Never use this anywhere real.
const JWT_SECRET = "local-dev-only-jwt-secret-not-for-production-use";
const TOKEN_TTL = 3600;
// Artificial latency for previewing loading states/skeletons.
// Start with LOCAL_API_DELAY_MS=1500, or change live: GET /__dev/delay?ms=1500 (0 to turn off).
let apiDelayMs = Number(process.env.LOCAL_API_DELAY_MS) || 0;

// ---------- JWT (HS256) ----------
const b64url = (buf) => Buffer.from(buf).toString("base64url");
function signJwt(payload) {
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}
function verifyJwt(token) {
  const [head, body, sig] = (token || "").split(".");
  if (!sig) return null;
  const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${head}.${body}`).digest("base64url");
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString());
  if (payload.exp && payload.exp < Date.now() / 1000) return null;
  return payload;
}
const ANON_KEY = signJwt({ iss: "local", role: "anon", iat: 1700000000, exp: 4102444800 });

// ---------- helpers ----------
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Expose-Headers": "Content-Range, Content-Location, Preference-Applied",
};
function send(res, status, data) {
  res.writeHead(status, { ...CORS, "Content-Type": "application/json" });
  res.end(data === undefined ? "" : JSON.stringify(data));
}
function authError(res, status, code, msg) {
  send(res, status, { code: status, error_code: code, msg, error: code, error_description: msg });
}
function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}
const bearer = (req) => (req.headers.authorization || "").replace(/^Bearer\s+/i, "");

async function rpc(fn, args, token = ANON_KEY) {
  const r = await fetch(`http://localhost:${PGRST_PORT}/rpc/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`${fn}: ${r.status} ${await r.text()}`);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

function toUser(row) {
  return {
    id: row.id, aud: "authenticated", role: "authenticated", email: row.email,
    email_confirmed_at: row.created_at, created_at: row.created_at, updated_at: row.created_at,
    app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, identities: [],
  };
}
function session(row) {
  const now = Math.floor(Date.now() / 1000);
  const claims = { sub: row.id, email: row.email, role: "authenticated", aud: "authenticated", iat: now };
  return {
    access_token: signJwt({ ...claims, exp: now + TOKEN_TTL }),
    refresh_token: signJwt({ sub: row.id, typ: "refresh", iat: now, exp: now + 30 * 86400 }),
    token_type: "bearer", expires_in: TOKEN_TTL, expires_at: now + TOKEN_TTL,
    user: toUser(row),
  };
}

// ---------- fake auth ----------
async function handleAuth(req, res, url) {
  const route = url.pathname.replace(/^\/auth\/v1/, "");
  const body = req.method === "GET" ? {} : JSON.parse((await readBody(req)).toString() || "{}");

  if (route === "/token" && url.searchParams.get("grant_type") === "password") {
    const [row] = await rpc("local_auth_login", { p_email: body.email || "", p_password: body.password || "" });
    if (!row) return authError(res, 400, "invalid_credentials", "Invalid login credentials");
    return send(res, 200, session(row));
  }
  if (route === "/token" && url.searchParams.get("grant_type") === "refresh_token") {
    const claims = verifyJwt(body.refresh_token);
    if (!claims || claims.typ !== "refresh") return authError(res, 400, "refresh_token_not_found", "Invalid Refresh Token");
    const [row] = await rpc("local_auth_user", { p_id: claims.sub });
    if (!row) return authError(res, 400, "user_not_found", "User not found");
    return send(res, 200, session(row));
  }
  if (route === "/user") {
    const token = bearer(req);
    const claims = verifyJwt(token);
    if (!claims?.sub) return authError(res, 401, "bad_jwt", "Invalid JWT");
    if (req.method === "PUT" && body.password) await rpc("local_auth_set_password", { p_password: body.password }, token);
    const [row] = await rpc("local_auth_user", { p_id: claims.sub });
    if (!row) return authError(res, 404, "user_not_found", "User not found");
    return send(res, 200, toUser(row));
  }
  if (route === "/logout") return send(res, 204);
  if (route === "/settings") return send(res, 200, { external: { email: true }, disable_signup: true });

  console.warn(`[auth] not implemented locally: ${req.method} ${url.pathname}`);
  return authError(res, 501, "not_implemented", `Local auth does not support ${route}`);
}

// ---------- proxy to PostgREST ----------
async function proxyRest(req, res, url) {
  const target = `http://localhost:${PGRST_PORT}${url.pathname.replace(/^\/rest\/v1/, "") || "/"}${url.search}`;
  const headers = { ...req.headers };
  delete headers.host;
  delete headers.apikey;
  if (!headers.authorization) headers.authorization = `Bearer ${ANON_KEY}`;
  const body = ["GET", "HEAD"].includes(req.method) ? undefined : await readBody(req);
  const r = await fetch(target, { method: req.method, headers, body });
  const out = {};
  r.headers.forEach((v, k) => {
    if (["content-encoding", "content-length", "transfer-encoding"].includes(k) || k.startsWith("access-control-")) return;
    out[k] = v;
  });
  res.writeHead(r.status, { ...out, ...CORS });
  res.end(Buffer.from(await r.arrayBuffer()));
}

const gateway = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${GATEWAY_PORT}`);
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }
  if (url.pathname === "/__dev/delay") {
    if (url.searchParams.has("ms")) apiDelayMs = Math.max(0, Number(url.searchParams.get("ms")) || 0);
    console.log(`[gateway] API delay is now ${apiDelayMs}ms`);
    return send(res, 200, { delayMs: apiDelayMs });
  }
  if (apiDelayMs && url.pathname.startsWith("/rest/v1")) {
    await new Promise((r) => setTimeout(r, apiDelayMs));
  }
  try {
    if (url.pathname.startsWith("/rest/v1")) return await proxyRest(req, res, url);
    if (url.pathname.startsWith("/auth/v1")) return await handleAuth(req, res, url);
    if (url.pathname.startsWith("/functions/v1/")) {
      const body = await readBody(req);
      console.log(`[functions] stubbed ${url.pathname} (${body.length} bytes) - nothing was sent`);
      return send(res, 200, { ok: true, stubbed: true });
    }
    send(res, 404, { message: "Not found" });
  } catch (err) {
    console.error("[gateway]", err);
    send(res, 500, { message: String(err.message || err) });
  }
});

// ---------- start everything ----------
const children = [];
function shutdown() {
  for (const c of children) { try { c.kill(); } catch { /* already gone */ } }
  gateway.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("Starting local Postgres...");
const db = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(ROOT, "scripts", "test-db.ps1"), "start"], { stdio: "inherit" });
if (db.status !== 0) {
  console.error("Could not start Postgres. First run: powershell -ExecutionPolicy Bypass -File .\\scripts\\test-db.ps1 setup");
  process.exit(1);
}

const pgrst = spawn(path.join(ROOT, "tools", "postgrest", "postgrest.exe"), [], {
  env: {
    ...process.env,
    PGRST_DB_URI: DB_URI,
    PGRST_DB_SCHEMAS: "public",
    PGRST_DB_ANON_ROLE: "anon",
    PGRST_JWT_SECRET: JWT_SECRET,
    PGRST_SERVER_PORT: String(PGRST_PORT),
    PGRST_SERVER_HOST: "127.0.0.1",
    PGRST_LOG_LEVEL: "warn",
  },
  stdio: ["ignore", "inherit", "inherit"],
});
children.push(pgrst);
pgrst.on("exit", (code) => { console.error(`PostgREST exited (${code})`); shutdown(); });

gateway.listen(GATEWAY_PORT, "127.0.0.1", () => {
  console.log(`Local Supabase gateway on http://localhost:${GATEWAY_PORT}`);
  console.log("Test login: alex@example.test / password123 (admin)");
  if (process.argv.includes("--no-vite")) return;
  const vite = spawn(process.execPath, [path.join(ROOT, "node_modules", "vite", "bin", "vite.js")], {
    cwd: ROOT,
    env: { ...process.env, VITE_SUPABASE_URL: `http://localhost:${GATEWAY_PORT}`, VITE_SUPABASE_ANON_KEY: ANON_KEY },
    stdio: "inherit",
  });
  children.push(vite);
  vite.on("exit", shutdown);
});
