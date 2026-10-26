"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Logo from "@/components/ui/Logo";
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [legalModal, setLegalModal] = useState<null | "terms" | "privacy">(null);
  const { register } = useAuth();
  const router = useRouter();

  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[@$!%*?&#]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!agreeTerms) {
      setError("Please agree to the Terms and Privacy Policy to continue");
      return;
    }
    if (!hasLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setError("Password doesn't meet requirements");
      return;
    }
    setLoading(true);
    try {
      await register({ firstName, lastName, username, email, password });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const PasswordRule = ({ label, met }: { label: string; met: boolean }) => (
    <div className={`flex items-center gap-2 text-xs transition-colors ${met ? "text-green-500" : "text-muted-foreground"}`}>
      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${met ? "bg-green-500/20 border border-green-500/40" : "border border-border"}`}>
        {met && <Check className="w-2.5 h-2.5 text-green-500" />}
      </div>
      {label}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background px-4">
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/15 rounded-full blur-[128px] animate-float" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/10 rounded-full blur-[128px] animate-float" style={{ animationDelay: "-3s" }} />

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md"
      >
        <div className="glass-strong rounded-3xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
              <Logo size={40} rounded="rounded-xl" />
              <span className="text-xl font-bold text-gradient">NOVAX</span>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-1">
              NOVAX — Think Beyond Social
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                type="text"
                placeholder="John"
                icon={<User className="w-4 h-4" />}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <Input
                label="Last Name"
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <Input
              label="Username"
              type="text"
              placeholder="johndoe"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              icon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                icon={<Lock className="w-4 h-4" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[42px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Password must contain:</p>
              <PasswordRule label="8+ characters" met={hasLength} />
              <PasswordRule label="One uppercase letter" met={hasUpper} />
              <PasswordRule label="One lowercase letter" met={hasLower} />
              <PasswordRule label="One number" met={hasNumber} />
              <PasswordRule label="One special character (@$!%*?&#)" met={hasSpecial} />
            </div>

            <label className="flex items-start gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-border bg-muted accent-primary shrink-0"
              />
              <span>
                I agree to the{" "}
                <button type="button" onClick={() => setLegalModal("terms")} className="text-primary hover:text-primary/80 underline underline-offset-2">
                  Terms
                </button>
                {" "}and{" "}
                <button type="button" onClick={() => setLegalModal("privacy")} className="text-primary hover:text-primary/80 underline underline-offset-2">
                  Privacy Policy
                </button>
              </span>
            </label>

            <Button className="w-full" size="lg" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-glass text-xs text-muted-foreground">or sign up with</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() => {
                window.location.href = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"}/auth/google`;
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </Button>
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() => alert("GitHub login is coming soon. Use Google or email instead.")}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>

      {legalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setLegalModal(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-strong rounded-2xl w-full max-w-md p-6 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-foreground mb-3">
              {legalModal === "terms" ? "NOVAX Terms of Service" : "NOVAX Privacy Policy"}
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              {legalModal === "terms" ? (
                <>
                  <p>By creating an account you agree to use NOVAX responsibly. You are responsible for content you post, and you agree not to share hateful, illegal, or harmful material.</p>
                  <p>We may update these Terms from time to time. Continued use after changes means you accept the updated Terms.</p>
                  <p>NOVAX may suspend accounts that violate these Terms. You can delete your account at any time from Settings.</p>
                </>
              ) : (
                <>
                  <p>NOVAX collects basic account information (name, email, username) to provide the service. Your data is never sold to third parties.</p>
                  <p>Content you make public is visible to other users. Private data such as your email stays private.</p>
                  <p>You can request a copy or deletion of your data at any time by contacting support.</p>
                </>
              )}
            </div>
            <Button className="w-full mt-5" size="md" onClick={() => setLegalModal(null)}>
              Close
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
