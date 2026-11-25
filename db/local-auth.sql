-- Local stand-in for Supabase roles + auth. LOCAL TESTING ONLY.
-- Applied by scripts/test-db.ps1 after schema + seed.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Roles PostgREST switches between (same names Supabase uses).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator LOGIN NOINHERIT;
  END IF;
END $$;
GRANT anon, authenticated TO authenticator;

-- Signed-in users can do everything (no RLS locally). Anonymous users can only log in.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Local login accounts (replaces Supabase auth.users).
CREATE TABLE IF NOT EXISTS local_auth_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
REVOKE ALL ON local_auth_users FROM anon, authenticated;

-- One account per seeded employee, all with password "password123".
INSERT INTO local_auth_users (email, password_hash)
SELECT email, crypt('password123', gen_salt('bf'))
FROM employee
ON CONFLICT (email) DO NOTHING;

UPDATE employee e SET auth_id = u.id
FROM local_auth_users u WHERE u.email = e.email;

CREATE OR REPLACE FUNCTION local_auth_login(p_email TEXT, p_password TEXT)
RETURNS TABLE (id UUID, email TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.email, u.created_at FROM local_auth_users u
  WHERE lower(u.email) = lower(p_email)
    AND u.password_hash = crypt(p_password, u.password_hash);
$$;

CREATE OR REPLACE FUNCTION local_auth_user(p_id UUID)
RETURNS TABLE (id UUID, email TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.email, u.created_at FROM local_auth_users u WHERE u.id = p_id;
$$;

CREATE OR REPLACE FUNCTION local_auth_set_password(p_password TEXT)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE local_auth_users
  SET password_hash = crypt(p_password, gen_salt('bf'))
  WHERE id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
$$;

REVOKE ALL ON FUNCTION local_auth_login(TEXT, TEXT), local_auth_user(UUID), local_auth_set_password(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION local_auth_login(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION local_auth_user(UUID)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION local_auth_set_password(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
