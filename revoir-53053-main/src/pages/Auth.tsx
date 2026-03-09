import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import {
  Loader2,
  Zap,
  BookOpen,
  Target,
  Trophy,
  ArrowRight,
} from "lucide-react";

const authSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
});

const features = [
  { icon: Target, text: "AI-generated learning roadmaps" },
  { icon: BookOpen, text: "Multi-agent curriculum pipeline" },
  { icon: Trophy, text: "Streak tracking & achievements" },
  { icon: Zap, text: "Pomodoro + battleground mode" },
];

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
    if (user) navigate("/");
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      authSchema.parse({ email, password });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(
            error.message.includes("Invalid login credentials")
              ? "Invalid email or password"
              : error.message,
          );
        } else {
          toast.success("Welcome back!");
          navigate("/");
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          toast.error(
            error.message.includes("User already registered")
              ? "An account with this email already exists"
              : error.message,
          );
        } else {
          toast.success("Account created! You can sign in now.");
          setIsLogin(true);
        }
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex overflow-hidden">
      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-orange-500/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-orange-600/8 blur-[100px]" />
          {/* Grid lines */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(#ff6b2b 1px, transparent 1px), linear-gradient(90deg, #ff6b2b 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        {/* Logo */}
        <div
          className={`flex items-center gap-3 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-white text-xl font-bold tracking-tight">
            Luminary
          </span>
        </div>

        {/* Hero text */}
        <div
          className={`space-y-6 transition-all duration-700 delay-150 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <div>
            <h1 className="text-5xl font-black text-white leading-tight tracking-tight">
              Learn smarter.
              <br />
              <span className="text-orange-400">Not harder.</span>
            </h1>
            <p className="mt-4 text-zinc-400 text-lg leading-relaxed max-w-sm">
              A multi-agent AI pipeline that builds your perfect learning path —
              from any topic, in seconds.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {features.map(({ icon: Icon, text }, i) => (
              <li
                key={i}
                className={`flex items-center gap-3 transition-all duration-500 ${mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
                style={{ transitionDelay: `${300 + i * 80}ms` }}
              >
                <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-3.5 w-3.5 text-orange-400" />
                </div>
                <span className="text-zinc-300 text-sm">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom quote */}
        <p
          className={`text-zinc-600 text-xs transition-all duration-700 delay-500 ${mounted ? "opacity-100" : "opacity-0"}`}
        >
          "The expert in anything was once a beginner."
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 px-8 sm:px-16 lg:px-20 relative">
        {/* Subtle right-side glow */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-64 h-64 bg-orange-500/5 blur-[80px] rounded-full pointer-events-none" />

        <div
          className={`w-full max-w-sm mx-auto transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-white font-bold">Luminary</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">
              {isLogin ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
              {isLogin
                ? "Sign in to continue your learning journey"
                : "Start building your personalized roadmap today"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-zinc-300 text-xs font-medium uppercase tracking-wider"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-orange-500 focus:ring-orange-500/20 h-11 rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-zinc-300 text-xs font-medium uppercase tracking-wider"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                minLength={6}
                className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-orange-500 focus:ring-orange-500/20 h-11 rounded-lg"
              />
              {!isLogin && (
                <p className="text-zinc-600 text-xs mt-1">
                  Must be at least 6 characters
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-lg shadow-lg shadow-orange-500/25 transition-all duration-200 hover:shadow-orange-500/40 hover:-translate-y-px active:translate-y-0 mt-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <span className="text-zinc-600 text-sm">
              {isLogin
                ? "Don't have an account? "
                : "Already have an account? "}
            </span>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              disabled={loading}
              className="text-orange-400 text-sm font-medium hover:text-orange-300 transition-colors"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>

          {/* Divider hint */}
          <div className="mt-10 pt-6 border-t border-zinc-800/60">
            <p className="text-zinc-700 text-xs text-center">
              Powered by a 4-agent LLM curriculum pipeline
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
