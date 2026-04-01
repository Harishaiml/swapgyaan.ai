import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { APP_NAME } from "@/lib/branding";
import BrandLogo from "@/components/BrandLogo";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, resetPassword, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isForgot) {
        await resetPassword(email);
        toast.success("Password reset email sent! Check your inbox.");
        setIsForgot(false);
      } else if (isLogin) {
        await signIn(email, password);
        toast.success("Welcome back! 🎉");
        navigate("/dashboard");
      } else {
        await signUp(email, password, name);
        toast.success("Account created! Check your email to confirm.");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const formTitle = isForgot ? "Reset password" : isLogin ? "Welcome back" : "Create account";
  const formSubtitle = isForgot
    ? "Enter your email to receive a reset link"
    : isLogin
    ? "Sign in to continue your learning journey"
    : "Start swapping skills with peers today";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-600 to-teal-600" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_60%,rgba(255,255,255,0.12),transparent)]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-500/20 rounded-full translate-x-48 translate-y-48" />
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-400/20 rounded-full -translate-x-32 -translate-y-32" />

        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <BrandLogo size="md" className="!gap-3" />

          {/* Hero content */}
          <div>
            <h2 className="text-4xl font-bold font-display text-white mb-4 leading-tight">
              Learn by sharing.<br />Grow together.
            </h2>
            <p className="text-blue-100 text-base mb-8 leading-relaxed max-w-sm">
              Connect with peers, swap skills, get AI-powered guidance, and earn verifiable certificates.
            </p>

            {/* Feature badges */}
            <div className="space-y-3">
              {[
                { emoji: "🤝", text: "Peer-to-peer skill exchange" },
                { emoji: "🤖", text: "AI tutor for instant help" },
                { emoji: "🎓", text: "Verifiable certificates" },
              ].map(({ emoji, text }) => (
                <div key={text} className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5">
                  <span className="text-lg">{emoji}</span>
                  <span className="text-white text-sm font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-blue-200/60 text-xs">© 2025 {APP_NAME}. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <BrandLogo size="md" />
          </div>

          {/* Back to home */}
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors group">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to home
          </Link>

          {/* Form header */}
          <AnimatePresence mode="wait">
            <motion.div
              key={formTitle}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mb-8"
            >
              <h1 className="text-3xl font-bold font-display text-foreground mb-2">{formTitle}</h1>
              <p className="text-muted-foreground text-sm">{formSubtitle}</p>
            </motion.div>
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !isForgot && (
              <div className="space-y-1.5">
                <Label htmlFor="auth-name" className="text-sm font-semibold text-foreground">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="auth-name"
                    placeholder="Your full name"
                    className="pl-10 h-11 rounded-xl bg-muted/40 border-border focus-visible:ring-primary/30"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="auth-email" className="text-sm font-semibold text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10 h-11 rounded-xl bg-muted/40 border-border focus-visible:ring-primary/30"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {!isForgot && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auth-password" className="text-sm font-semibold text-foreground">Password</Label>
                  {isLogin && !isForgot && (
                    <button
                      type="button"
                      onClick={() => setIsForgot(true)}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-11 rounded-xl bg-muted/40 border-border focus-visible:ring-primary/30"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-sm rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Please wait..." : isForgot ? "Send Reset Link" : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            {isForgot ? (
              <button onClick={() => setIsForgot(false)} className="text-primary hover:underline font-medium">
                ← Back to sign in
              </button>
            ) : (
              <>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary hover:underline font-semibold"
                >
                  {isLogin ? "Sign up free" : "Sign in"}
                </button>
              </>
            )}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
