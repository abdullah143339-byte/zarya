"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Logo from "@/components/ui/Logo";
import api from "@/lib/api";
import {
  Mail,
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle2,
  ShieldQuestion,
  KeyRound,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

const FIELD_CLASS =
  "bg-[#1D222C] border border-white/10 text-white placeholder:text-white/35 " +
  "focus:ring-[#6C63FF]/60 focus:border-[#6C63FF] focus:bg-[#1D222C]";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_RE = /^\d{6}$/;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const sendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    const value = email.trim();
    if (!value) {
      setEmailError("Email address is required");
      return;
    }
    if (!EMAIL_RE.test(value)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    setEmailError("");
    setLoading(true);
    try {
      const res = await api.forgotPassword(value);
      setDevOtp(res.data?.devOtp ?? null);
      setCooldown(60);
      setStep("otp");
    } catch (err) {
      setError((err as Error)?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const code = otp.trim();
    if (!OTP_RE.test(code)) {
      setOtpError("Enter the 6-digit verification code");
      return;
    }
    setOtpError("");
    setLoading(true);
    try {
      await api.validateResetToken(code);
      router.push(`/reset-password?token=${encodeURIComponent(code)}`);
    } catch (err) {
      setOtpError((err as Error)?.message || "That code is invalid or has expired. Request a new one.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-white relative overflow-hidden flex items-center justify-center px-4">
      <div
        aria-hidden
        className="absolute top-[-10%] left-[-5%] w-[45vw] h-[45vw] rounded-full blur-[140px] opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle, #6C63FF 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="absolute bottom-[-15%] right-[-5%] w-[40vw] h-[40vw] rounded-full blur-[140px] opacity-25 pointer-events-none"
        style={{ background: "radial-gradient(circle, #7C3AED 0%, transparent 70%)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative z-10 w-full max-w-md"
      >
        <div
          className="rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/50 backdrop-blur-xl border border-white/10"
          style={{ background: "rgba(23, 27, 34, 0.85)" }}
        >
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-6" aria-label="NOVAX home">
              <Logo size={40} rounded="rounded-xl" />
              <span className="text-xl font-bold tracking-tight text-white">NOVAX</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {step === "otp" ? "Verify your identity" : "Reset password"}
            </h1>
            <p className="text-sm text-white/50 mt-1.5">
              {step === "otp"
                ? `Enter the 6-digit code sent to ${email.trim()}`
                : "Enter your email and we&apos;ll send you a verification code"}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="alert"
                className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm flex items-start gap-2.5"
              >
                <ShieldQuestion className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {step === "email" ? (
              <motion.form
                key="email-step"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
                onSubmit={sendCode}
                noValidate
              >
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  icon={<Mail className="w-4 h-4" />}
                  className={FIELD_CLASS}
                  aria-invalid={!!emailError}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  error={emailError}
                />

                <Button
                  className="w-full h-12 rounded-xl font-semibold shadow-lg shadow-[#6C63FF]/25"
                  style={{ background: "linear-gradient(135deg, #6C63FF, #7C3AED)" }}
                  size="lg"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Verification Code
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </motion.form>
            ) : (
              <motion.div key="otp-step" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm flex items-center gap-2.5 mb-5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>A verification code has been sent to {email.trim()}.</span>
                </div>

                {devOtp && (
                  <div
                    className="p-4 rounded-xl text-left border mb-5"
                    style={{ background: "rgba(108, 99, 255, 0.08)", borderColor: "rgba(108, 99, 255, 0.25)" }}
                  >
                    <p className="text-xs text-white/50 mb-1.5">
                      Development mode — your code (also sent to your email):
                    </p>
                    <p className="text-2xl font-mono font-bold tracking-[0.5em] text-[#A78BFA]">
                      {devOtp}
                    </p>
                  </div>
                )}

                <form className="space-y-5" onSubmit={verifyOtp} noValidate>
                  <Input
                    label="Verification code"
                    type="text"
                    placeholder="000000"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    icon={<KeyRound className="w-4 h-4" />}
                    className={FIELD_CLASS}
                    aria-invalid={!!otpError}
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, ""));
                      if (otpError) setOtpError("");
                    }}
                    error={otpError}
                  />

                  <Button
                    className="w-full h-12 rounded-xl font-semibold shadow-lg shadow-[#6C63FF]/25"
                    style={{ background: "linear-gradient(135deg, #6C63FF, #7C3AED)" }}
                    size="lg"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify &amp; Continue
                        <ShieldCheck className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>

                <button
                  type="button"
                  onClick={() => sendCode()}
                  disabled={loading || cooldown > 0}
                  className="w-full flex items-center justify-center gap-2 text-sm text-white/50 hover:text-white disabled:opacity-50 disabled:hover:text-white/50 disabled:cursor-not-allowed transition-colors py-1 mt-3"
                >
                  {cooldown > 0 ? (
                    <>
                      Resend code in {cooldown}s
                      <RefreshCw className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      Didn&apos;t receive it? Resend code
                      <RefreshCw className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                    setOtpError("");
                    setDevOtp(null);
                  }}
                  className="w-full text-sm text-white/50 hover:text-white transition-colors py-1 mt-2"
                >
                  Use a different email
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-white/50 hover:text-white mt-7 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
