"use client";

import { Suspense, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Logo from "@/components/ui/Logo";
import api from "@/lib/api";
import {
  ArrowLeft,
  Lock,
  Loader2,
  CheckCircle2,
  ShieldQuestion,
  Eye,
  EyeOff,
} from "lucide-react";

const FIELD_CLASS =
  "bg-[#1D222C] border border-white/10 text-white placeholder:text-white/35 " +
  "focus:ring-[#6C63FF]/60 focus:border-[#6C63FF] focus:bg-[#1D222C]";

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<"validating" | "valid" | "invalid">("validating");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function validate() {
      if (!token) {
        setStatus("invalid");
        return;
      }
      try {
        await api.validateResetToken(token);
        if (!cancelled) setStatus("valid");
      } catch {
        if (!cancelled) setStatus("invalid");
      }
    }
    validate();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const errors: { password?: string; confirm?: string } = {};
    if (!password) {
      errors.password = "New password is required";
    } else if (!PASSWORD_RE.test(password)) {
      errors.password = "Use 8+ chars with uppercase, lowercase, number and special character";
    }
    if (!confirm) {
      errors.confirm = "Please confirm your password";
    } else if (confirm !== password) {
      errors.confirm = "Passwords do not match";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push("/login"), 1600);
    } catch (err) {
      setError((err as Error)?.message || "Unable to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Set a new password</h1>
          <p className="text-sm text-white/50 mt-1.5">Choose a strong password for your account</p>
        </div>

        {status === "validating" && (
          <div className="flex flex-col items-center gap-3 py-8 text-white/60" role="status">
            <Loader2 className="w-6 h-6 animate-spin text-[#6C63FF]" />
            <p className="text-sm">Validating your reset link...</p>
          </div>
        )}

        {status === "invalid" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-red-500/15 border border-red-500/25"
            >
              <ShieldQuestion className="w-7 h-7 text-red-400" />
            </motion.div>
            <h2 className="mt-5 font-semibold text-white">Link invalid or expired</h2>
            <p className="mt-2 text-sm text-white/50 leading-relaxed">
              This password reset link is invalid or has already been used. Request a fresh link to continue.
            </p>
            <Link
              href="/forgot-password"
              className="mt-6 inline-flex items-center justify-center w-full h-12 rounded-xl font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #6C63FF, #7C3AED)" }}
            >
              Request new link
            </Link>
          </motion.div>
        )}

        {status === "valid" && (
          <>
            <AnimatePresence>
              {error && (
                <motion.div
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

            <AnimatePresence>
              {done && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm flex items-center gap-2.5"
                  role="status"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Password updated! Taking you to sign in...</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="relative">
                <Input
                  label="New password"
                  type={show ? "text" : "password"}
                  placeholder="Enter a new password"
                  autoComplete="new-password"
                  icon={<Lock className="w-4 h-4" />}
                  className={FIELD_CLASS}
                  aria-invalid={!!fieldErrors.password}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  error={fieldErrors.password}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-3 top-[42px] text-white/40 hover:text-white transition-colors p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/50"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Input
                label="Confirm password"
                type={show ? "text" : "password"}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                icon={<Lock className="w-4 h-4" />}
                className={FIELD_CLASS}
                aria-invalid={!!fieldErrors.confirm}
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (fieldErrors.confirm) setFieldErrors((p) => ({ ...p, confirm: undefined }));
                }}
                error={fieldErrors.confirm}
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
                    Updating...
                  </>
                ) : (
                  <>
                    Update Password
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </>
        )}

        {status !== "validating" && (
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-white/50 hover:text-white mt-7 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        )}
      </div>
    </motion.div>
  );
}

export default function ResetPasswordPage() {
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
      <Suspense
        fallback={
          <div className="text-white/60 text-sm flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-[#6C63FF]" />
            Loading...
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
