import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import logo from "@/images/logo.png";
import mainpanel from "@/images/mainpanel.jpg";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

function FieldError({ children }) {
  if (!children) return null;
  return <p className="text-xs text-danger">{children}</p>;
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);
  const cardRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const triggerShake = () => {
    setShake(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setShake(true);
        setTimeout(() => setShake(false), 480);
      });
    });
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const result = await login(data.email, data.password);
      if (result.success) {
        navigate("/dashboard", { replace: true });
      } else {
        setError("root", { message: result.error || "Invalid credentials" });
        toast.error(result.error || "Invalid credentials");
        triggerShake();
      }
    } catch {
      setError("root", { message: "Something went wrong. Please try again." });
      toast.error("Something went wrong. Please try again.");
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const onError = () => {
    triggerShake();
  };

  const inputClass = (hasError) =>
    cn(
      "h-11 rounded-lg bg-card pl-10 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/70",
      "focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:ring-offset-0",
      hasError && "border-danger focus-visible:border-danger focus-visible:ring-danger/15"
    );

  return (
    <div className="flex min-h-svh bg-background font-sans">
      {/* Brand panel */}
      <aside className="relative hidden w-[46%] max-w-[640px] flex-col justify-between overflow-hidden bg-brand-navy p-12 text-white lg:flex">
        {/* Depth: brand gradient + photo + glows + logo-style diagonals */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy via-brand-navy to-brand" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay"
          style={{ backgroundImage: `url(${mainpanel})` }}
          aria-hidden="true"
        />
        <div className="absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-brand/40 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-40 -left-24 h-[380px] w-[380px] rounded-full bg-brand-blue-light/20 blur-3xl" aria-hidden="true" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-28 top-1/4 h-[440px] w-[440px] rotate-45 rounded-[48px] border border-white/10 bg-white/[0.03]" />
          <div className="absolute -right-10 top-[38%] h-[300px] w-[300px] rotate-45 rounded-[36px] border border-white/10 bg-gradient-to-br from-white/[0.08] to-transparent" />
          <div className="absolute -bottom-16 left-1/3 h-48 w-48 rotate-45 rounded-3xl border border-white/[0.07]" />
        </div>
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(white 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "linear-gradient(to bottom, black, transparent 70%)",
          }}
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-lg shadow-black/10">
            <img src={logo} alt="" className="h-full w-full object-contain" />
          </span>
          <p className="text-sm font-semibold">Payroll System</p>
        </div>

        <div className="stagger relative max-w-md space-y-4">
          <h2 className="text-4xl font-bold uppercase leading-[1.1] tracking-tight drop-shadow-[0_2px_12px_rgb(0_0_0/0.25)] xl:text-5xl">
            JP Management
            <br />
            Consultancy OPC
          </h2>
          <p className="flex items-center gap-3 text-lg italic text-white/80">
            <span className="h-0.5 w-6 bg-white/80" />
            We build your edge
          </p>
        </div>

        <p className="relative text-xs text-white/50">
          © {new Date().getFullYear()} JP Management Consultancy OPC. All rights reserved.
        </p>
      </aside>

      {/* Form panel */}
      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-5 py-10 sm:px-8">
        {/* Soft lighting so the card sits on something */}
        <div className="absolute -top-40 right-0 h-[480px] w-[480px] rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-40 -left-20 h-[420px] w-[420px] rounded-full bg-brand-navy/[0.06] blur-3xl" aria-hidden="true" />
        <div
          ref={cardRef}
          className={cn(
            "stagger relative w-full max-w-[400px]",
            shake && "animate-[shake_480ms_ease-in-out_both]"
          )}
        >
          {/* Mobile brand */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-navy p-1.5">
              <img src={logo} alt="" className="h-full w-full rounded object-contain" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">JPMC Payroll</p>
              <p className="text-xs text-muted-foreground">JP Management Consultancy OPC</p>
            </div>
          </div>

          <div className="mb-8 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your payroll account to continue.</p>
          </div>

          {errors.root && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2.5 text-sm text-danger"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errors.root.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit, onError)} noValidate className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@jpmcopc.com"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  {...register("email", { onChange: () => clearErrors(["email", "root"]) })}
                  className={inputClass(errors.email)}
                />
              </div>
              <FieldError>{errors.email?.message}</FieldError>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  {...register("password", { onChange: () => clearErrors(["password", "root"]) })}
                  className={cn(inputClass(errors.password), "pr-10")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FieldError>{errors.password?.message}</FieldError>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/30 transition-all hover:bg-primary/90 hover:shadow-md hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Authorized JPMC personnel only. Contact HR if you can&apos;t sign in.
          </p>

          <p className="mt-10 text-center text-xs text-muted-foreground lg:hidden">
            © {new Date().getFullYear()} JP Management Consultancy OPC
          </p>
        </div>
      </main>
    </div>
  );
}
