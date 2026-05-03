import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, Eye, EyeOff, Shield } from "lucide-react";
import { toast } from "sonner";
import logo from "@/images/logo.png";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const result = await login(data.email, data.password);
      if (result.success) {
        navigate("/dashboard", { replace: true });
      } else {
        toast.error(result.error || "Invalid credentials");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-svh items-center justify-center overflow-hidden p-4"
      style={{
        background: "linear-gradient(180deg, #0a1628 0%, #0f3060 100%)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 -left-20 h-96 w-96 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.15), transparent 70%)",
          }}
        />
        <div
          className="absolute -top-20 right-1/4 h-80 w-80 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.12), transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.08), transparent 70%)",
          }}
        />
      </div>

      {/* Glass card */}
      <div
        className="relative z-10 w-full max-w-[420px] rounded-2xl p-8 shadow-2xl"
        style={{
          background: "rgba(255, 255, 255, 0.06)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          {/* Logo + Brand */}
          <div className="flex items-center gap-3 mb-4">
            {/* Company Logo */}
            <img
              src={logo}
              alt="JPMC Payroll"
              className="h-11 w-11 object-contain rounded-xl"
            />
            <div className="flex flex-col">
              <h1
                className="text-xl font-bold text-white leading-tight"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                JPMC Payroll
              </h1>
              <span className="text-xs text-white/50 tracking-wide">
                Enterprise Platform
              </span>
            </div>
          </div>

        </div>

        {/* Welcome text */}
        <div className="text-center mb-6">
          <h2
            className="text-2xl font-semibold text-white mb-1"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Welcome back
          </h2>
          <p className="text-sm text-white/50">
            Sign in to access your payroll dashboard
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-xs font-medium text-white/60 uppercase tracking-wider"
            >
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
              <Input
                id="email"
                type="email"
                placeholder="name@jpmorgan.com"
                {...register("email")}
                className="h-11 pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-400/50 focus:ring-indigo-400/20 transition-all duration-200"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="password"
                className="text-xs font-medium text-white/60 uppercase tracking-wider"
              >
                Password
              </Label>
              <button
                type="button"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                onClick={() => toast.info("Contact IT to reset your password")}
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                {...register("password")}
                className="h-11 pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-400/50 focus:ring-indigo-400/20 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 mt-2 text-white font-semibold border-0 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              boxShadow: "0 4px 14px rgba(59, 130, 246, 0.35)",
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-white/30">
            <Shield className="h-3 w-3" />
            <span className="text-[10px]">
              Protected by JPMC Security Policy · Privacy Notice
            </span>
          </div>
          <p className="text-[10px] text-white/20">
            Unauthorized access is prohibited and monitored
          </p>
        </div>
      </div>
    </div>
  );
}
