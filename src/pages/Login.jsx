import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowRight, Shield } from "lucide-react";
import { toast } from "sonner";
import logo from "@/images/logo.png";
import mainpanel from "@/images/mainpanel.jpg";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

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

  return (
    <div className="flex min-h-svh font-['Jost',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif]">
      {/* Sidebar */}
      <aside className="hidden md:flex w-[300px] flex-col justify-between bg-gradient-to-br from-[#1E3A8A] via-[#2563EB] to-[#3C72FC] relative overflow-hidden p-10 pb-10 shadow-[8px_0_32px_rgba(0,0,0,0.45)]">
        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />

        {/* Circular glow */}
        <div className="absolute -bottom-[100px] -left-[70px] w-[280px] h-[280px] rounded-full bg-[rgba(235,241,255,0.09)] pointer-events-none" />

        {/* Top section */}
        <div className="relative z-10">
          {/* Logo row */}
          <div className="flex items-center gap-2.5 mb-7">
            <div className="w-[30px] h-[30px] bg-white rounded flex items-center justify-center flex-shrink-0">
              <img
                src={logo}
                alt="JP Management Consultancy OPC"
                className="w-7 h-7 object-contain"
              />
            </div>
            <div className="flex flex-col gap-px">
              <span className="text-[15px] font-bold text-white leading-tight">
                JP Management Consultancy OPC
              </span>
            </div>
          </div>

          {/* Rule */}
          <div className="w-7 h-[2px] bg-white/35 rounded-full mb-5" />

          {/* Company name */}
          <div className="text-[22px] font-bold text-white leading-snug tracking-wide mb-2">
            JP Management Consultancy OPC
          </div>

          {/* Tagline */}
          <p className="text-[13px] font-normal text-white/[0.48] tracking-[0.14em] uppercase mb-10">
            We Build Your Edge
          </p>

          {/* Decorative bars */}
          <div className="flex flex-col gap-[7px] relative z-10">
            <div className="h-[3px] rounded-full bg-white/15" style={{ width: "65%" }} />
            <div className="h-[3px] rounded-full bg-white/15" style={{ width: "42%" }} />
            <div className="h-[3px] rounded-full bg-white/15" style={{ width: "78%" }} />
            <div className="h-[3px] rounded-full bg-white/15" style={{ width: "30%" }} />
          </div>
        </div>

        {/* Bottom text */}
        <div className="relative z-10">
          <div className="text-[13px] font-light text-white/[0.38] leading-normal">
            Building business<br />edges since day one.
          </div>
        </div>
      </aside>

      {/* Main panel */}
      <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-5 py-12 md:px-10 md:py-12">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${mainpanel})` }}
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-[rgba(8,18,42,0.55)]" />

        {/* Glass card */}
        <div
          ref={cardRef}
          className={`relative z-10 w-full max-w-[400px] bg-white/10 backdrop-blur-[20px] border border-white/[0.18] rounded-[14px] p-10 shadow-[0_24px_64px_rgba(0,0,0,0.35)] ${shake ? "animate-[shake_480ms_ease-in-out_both]" : ""}`}
        >
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-4 h-[1.5px] bg-[#3C72FC] rounded-full" />
            <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/55">
              Payroll System
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-[22px] font-bold text-white uppercase tracking-[0.05em] leading-tight mb-1.5">
            Payroll System<br />Login
          </h1>

          {/* Sub */}
          <p className="text-xs font-normal text-white/50 mb-7 leading-relaxed">
            Secure access for authorized personnel only.
          </p>

          <form onSubmit={handleSubmit(onSubmit, onError)} noValidate>
            {/* Email */}
            <div className="flex flex-col gap-1.5 mb-4">
              <label
                htmlFor="email"
                className="text-[10px] font-semibold text-white/65 uppercase tracking-[0.12em]"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@jpmcopc.com"
                  autoComplete="email"
                  {...register("email", {
                    onChange: () => clearErrors("email"),
                  })}
                  className="h-12 pl-10 pr-3 bg-white/[0.08] border-white/[0.15] text-sm font-normal text-white placeholder:text-white/30 rounded-md focus:border-[#3C72FC] focus:bg-[rgba(60,114,252,0.12)] focus:shadow-[0_0_0_3px_rgba(60,114,252,0.2)] focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200"
                  style={{
                    boxShadow: errors.email ? "0 0 0 3px rgba(207,46,46,0.15)" : undefined,
                    borderColor: errors.email ? "#CF2E2E" : undefined,
                  }}
                />
              </div>
              {errors.email && (
                <p className="text-[11px] font-normal text-[#ff8080] leading-snug">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5 mb-4">
              <label
                htmlFor="password"
                className="text-[10px] font-semibold text-white/65 uppercase tracking-[0.12em]"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  {...register("password", {
                    onChange: () => clearErrors("password"),
                  })}
                  className="h-12 pl-10 pr-10 bg-white/[0.08] border-white/[0.15] text-sm font-normal text-white placeholder:text-white/30 rounded-md focus:border-[#3C72FC] focus:bg-[rgba(60,114,252,0.12)] focus:shadow-[0_0_0_3px_rgba(60,114,252,0.2)] focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200"
                  style={{
                    boxShadow: errors.password ? "0 0 0 3px rgba(207,46,46,0.15)" : undefined,
                    borderColor: errors.password ? "#CF2E2E" : undefined,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-[18px] w-[18px]" />
                  ) : (
                    <Eye className="h-[18px] w-[18px]" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] font-normal text-[#ff8080] leading-snug">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Root error */}
            {errors.root && (
              <p className="text-[11px] font-normal text-[#ff8080] mb-3 leading-snug">
                {errors.root.message}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-5 mt-5 inline-flex items-center justify-center gap-2.5 text-[13px] font-bold uppercase tracking-[0.12em] text-white bg-[#3C72FC] border-none rounded-md cursor-pointer transition-all duration-200 hover:bg-[#2C5EE0] hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(60,114,252,0.4)] active:scale-[0.98] active:shadow-none disabled:opacity-75 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <Loader2 className="h-[17px] w-[17px] animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-[15px] w-[15px] opacity-70 transition-transform duration-200 group-hover:translate-x-[3px]" />
                </>
              )}
            </button>
          </form>

          {/* Secure badge */}
          <div className="flex items-center justify-center gap-1.5 mt-5 text-[11px] text-white/28">
            <Shield className="h-[13px] w-[13px]" />
            <span>256-bit encrypted connection</span>
          </div>
        </div>

        {/* Footer */}
        <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-[11px] font-normal text-white/22 whitespace-nowrap tracking-wide">
          © 2025 JP Management Consultancy OPC. All rights reserved.
        </footer>
      </main>
    </div>
  );
}
