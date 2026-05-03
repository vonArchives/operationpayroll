import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SignJWT } from "https://esm.sh/jose@5.2.0/jwt/sign";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import * as bcrypt from "npm:bcryptjs@2.4.3";

const JWT_SECRET = Deno.env.get("JWT_SECRET");
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

const SESSION_TIMEOUT_MIN = 30;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Email and password are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find employee by email
    const { data: employees, error: empError } = await supabase
      .from("employee")
      .select("emp_id, first_name, last_name, role, email, status")
      .eq("email", email)
      .limit(1);

    if (empError || !employees || employees.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid credentials" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const employee = employees[0];

    // Check employee status
    if (employee.status !== "active") {
      return new Response(
        JSON.stringify({ success: false, error: "Account is not active" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get auth record
    const { data: authRecord, error: authError } = await supabase
      .from("employee_auth")
      .select("password_hash, last_login")
      .eq("emp_id", employee.emp_id)
      .single();

    if (authError || !authRecord) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid credentials" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, authRecord.password_hash);

    if (!isValid) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid credentials" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate JWT
    const nowSec = Math.floor(Date.now() / 1000);
    const expSec = nowSec + SESSION_TIMEOUT_MIN * 60;

    const token = await new SignJWT({
      sub: String(employee.emp_id),
      role: employee.role,
      email: employee.email,
      name: `${employee.first_name} ${employee.last_name}`,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(nowSec)
      .setExpirationTime(expSec)
      .sign(new TextEncoder().encode(JWT_SECRET));

    // Update last_login
    await supabase
      .from("employee_auth")
      .update({ last_login: new Date().toISOString() })
      .eq("emp_id", employee.emp_id);

    const user = {
      emp_id: employee.emp_id,
      first_name: employee.first_name,
      last_name: employee.last_name,
      name: `${employee.first_name} ${employee.last_name}`,
      role: employee.role,
      email: employee.email,
    };

    const maxAge = SESSION_TIMEOUT_MIN * 60;

    return new Response(JSON.stringify({ success: true, user, token }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `jpmc_auth_token=${token}; Max-Age=${maxAge}; Path=/; SameSite=Lax; Secure; HttpOnly`,
      },
    });
  } catch (err) {
    console.error("Swift API error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
