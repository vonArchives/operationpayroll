# `supabase/functions/` — Supabase Edge Functions

## Responsibility

This directory contains Deno-based serverless edge functions deployed to Supabase. Each subdirectory is an independent function with its own `index.ts` entry point.

## Directory Map

| Directory | Responsibility Summary | Detailed Map |
|-----------|----------------------|-------------|
| `swift-api/` | Backend-for-Frontend authentication endpoint for the Swift mobile client. Validates credentials against `employee_auth` table, issues HS256 JWTs, and sets HttpOnly cookies. | [View Map](swift-api/codemap.md) |