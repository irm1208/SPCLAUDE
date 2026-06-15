import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { User, Lock, Eye, EyeOff, ArrowLeft, Loader2, AlertCircle, LogIn, UserPlus, CheckCircle2, ShieldCheck, Mail, MessageCircle, Bell, KeyRound, RotateCcw, Users, Globe, ChevronDown, Ticket } from "lucide-react";
import { useSmartLogin, useSignup, useAccount, useSetPassword } from "@/hooks/use-account";
import { PageLayout } from "@/components/PageLayout";
import { COUNTRIES } from "@/data/countries";
import { T } from "@/lib/theme";
import { useQuery } from "@tanstack/react-query";

type Tab = "login" | "signup";
type Step = "form" | "set-password" | "telegram-prompt" | "join-group-buy" | "forgot-step1" | "forgot-step2" | "forgot-done";

export default function Login() {
  const [, setLocation] = useLocation();
  const { account, isLoading: accountLoading } = useAccount();

  const rawNext = new URLSearchParams(window.location.search).get("next") ?? "";
  // Only allow relative same-site redirects to prevent open-redirect attacks.
  const nextParam = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "";
  const fromGbOrganiser = rawNext === "/gborganiser";
  const tabParam = new URLSearchParams(window.location.search).get("tab") as Tab | null;

  const [tab, setTab] = useState<Tab>(tabParam === "signup" || fromGbOrganiser ? "signup" : "login");
  const [step, setStep] = useState<Step>("form");
  const [username, setUsername] = useState("");
  const [credential, setCredential] = useState("");
  const [showCredential, setShowCredential] = useState(false);
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");

  const { data: siteConfig } = useQuery({
    queryKey: ["site-config"],
    queryFn: async () => {
      const res = await fetch("/api/config");
      return res.json() as Promise<{ signupRequiresInvite?: boolean }>;
    },
    staleTime: 60_000,
  });
  const inviteRequired = siteConfig?.signupRequiresInvite ?? false;

  useEffect(() => {
    // Only redirect if user was already logged in when they arrived at /login.
    // Do NOT redirect during the post-signup steps (telegram-prompt, join-group-buy)
    // because those steps appear right after the account data is set by the signup mutation.
    if (!accountLoading && account && step === "form") {
      setLocation(nextParam || "/account");
    }
  }, [accountLoading, account, step, setLocation, nextParam]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  // Forgot password state
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotPw, setShowForgotPw] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const smartLogin = useSmartLogin();
  const signup = useSignup();
  const setPasswordMutation = useSetPassword();

  const isLoading = smartLogin.isPending || signup.isPending;

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setError("");
    setStep("form");
    setPasswordSaved(false);
    setCredential("");
    setEmail("");
    setCountry("");
    setCountrySearch("");
    setCountryOpen(false);
    setPassword("");
    setConfirmPassword("");
    setInviteCode("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !credential.trim()) return;
    try {
      const result = await smartLogin.mutateAsync({
        telegramUsername: username.trim(),
        credential: credential.trim(),
      });
      if (result.needsPassword) {
        setStep("set-password");
      } else {
        setLocation(nextParam || "/account");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) return;
    if (!email.trim() || !email.includes("@")) { setError("Please enter a valid email address"); return; }
    if (!country) { setError("Please select your country"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (inviteRequired && !inviteCode.trim()) { setError("An invite code is required to sign up"); return; }
    try {
      await signup.mutateAsync({ telegramUsername: username.trim(), password, email: email.trim(), country, inviteCode: inviteCode.trim() || undefined });
      setStep("telegram-prompt");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmNewPassword) { setError("Passwords do not match"); return; }
    try {
      await setPasswordMutation.mutateAsync({ password: newPassword });
      setPasswordSaved(true);
      setTimeout(() => setLocation(nextParam || "/account"), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to set password");
    }
  };

  const handleForgotStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!forgotUsername.trim()) { setError("Please enter your Telegram username"); return; }
    setForgotLoading(true);
    try {
      const res = await fetch("/api/account/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUsername: forgotUsername.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to send reset code"); return; }
      setStep("forgot-step2");
    } catch {
      setError("Connection error — please try again");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!forgotCode.trim() || forgotCode.trim().length !== 6) { setError("Please enter the 6-digit code from Telegram"); return; }
    if (forgotNewPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (forgotNewPassword !== forgotConfirmPassword) { setError("Passwords do not match"); return; }
    setForgotLoading(true);
    try {
      const res = await fetch("/api/account/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUsername: forgotUsername.trim(),
          code: forgotCode.trim(),
          newPassword: forgotNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to reset password"); return; }
      setStep("forgot-done");
    } catch {
      setError("Connection error — please try again");
    } finally {
      setForgotLoading(false);
    }
  };

  const resetForgotFlow = () => {
    setStep("form");
    setForgotUsername("");
    setForgotCode("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setError("");
  };

  const tabs = [
    { id: "login" as Tab, label: "Sign In", icon: LogIn },
    { id: "signup" as Tab, label: "New Account", icon: UserPlus },
  ] as const;

  return (
    <PageLayout>
    <div className="flex flex-col" style={{ background: T.bg, minHeight: "100%" }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-30" style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => {
              if (step.startsWith("forgot")) { resetForgotFlow(); return; }
              setLocation("/");
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: T.surface2 }}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: T.muted }} />
          </button>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: T.surface2, border: `1px solid ${T.border}` }}>
            <User className="w-4 h-4" style={{ color: "var(--t-blue-deep)" }} />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight" style={{ color: T.text }}>
              {step.startsWith("forgot") ? "Reset Password" : tab === "signup" && fromGbOrganiser ? "New GB Organiser Account" : "My Account"}
            </h1>
            <p className="text-xs" style={{ color: T.muted }}>
              {step.startsWith("forgot") ? "Via Telegram verification" : tab === "signup" && fromGbOrganiser ? "Set up your organiser access" : "Sign in to access your profile"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          {/* Centre avatar */}
          <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6"
            style={{ background: step.startsWith("forgot") ? "rgba(27,58,122,0.08)" : T.surface2, border: `1px solid ${T.border}` }}>
            {step.startsWith("forgot")
              ? <KeyRound className="w-8 h-8" style={{ color: "var(--t-blue-deep)" }} />
              : <User className="w-8 h-8" style={{ color: "var(--t-blue-deep)" }} />
            }
          </div>

          {/* Tab switcher — hidden on forgot-password flow */}
          {!step.startsWith("forgot") && (
            <div className="flex gap-1 rounded-xl p-1 mb-6"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTabChange(t.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-semibold transition-all"
                  style={tab === t.id
                    ? { background: "var(--t-blue-deep)", color: "white" }
                    : { color: T.muted }}
                >
                  <t.icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">

            {/* ── Sign In ── */}
            {tab === "login" && step === "form" && (
              <motion.form key="login" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }} onSubmit={handleLogin} className="space-y-4" autoComplete="off">

                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: T.muted }}>Telegram Username</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: T.muted }}>@</span>
                    <input type="text" value={username} onChange={e => setUsername(e.target.value.replace(/^@/, ""))}
                      placeholder="yourusername" autoComplete="username" disabled={isLoading}
                      className="w-full h-12 pl-8 pr-4 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                      style={{ background: T.surface, border: `1.5px solid ${T.border}`, color: T.text }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>Password or PIN</label>
                    <button type="button" onClick={() => { setStep("forgot-step1"); setForgotUsername(username); setError(""); }}
                      className="text-xs font-semibold transition-colors"
                      style={{ color: "var(--t-blue-deep)" }}>
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showCredential ? "text" : "password"}
                      value={credential}
                      onChange={e => setCredential(e.target.value)}
                      placeholder="Password or PIN"
                      autoComplete="current-password"
                      disabled={isLoading}
                      className="w-full h-12 px-4 pr-12 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                      style={{ background: T.surface, border: `1.5px solid ${T.border}`, color: T.text }}
                    />
                    <button type="button" onClick={() => setShowCredential(s => !s)} tabIndex={-1}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: T.muted }}>
                      {showCredential ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && <ErrorBanner message={error} />}

                <button type="submit" disabled={isLoading || !username.trim() || !credential.trim()}
                  className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                  style={{ background: "var(--t-blue-deep)" }}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><LogIn className="w-4 h-4" /> Sign In</>}
                </button>
              </motion.form>
            )}

            {/* ── Set Password (after order-code login) ── */}
            {tab === "login" && step === "set-password" && (
              <motion.div key="set-password" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                {passwordSaved ? (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <p className="text-sm font-semibold text-center" style={{ color: T.text }}>Password saved! Taking you to your group buys…</p>
                  </div>
                ) : (
                  <form onSubmit={handleSetPassword} className="space-y-4" autoComplete="off">
                    <div className="rounded-xl px-4 py-3.5" style={{ background: "rgba(27,58,122,0.06)", border: "1px solid rgba(27,58,122,0.15)" }}>
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: "var(--t-blue-deep)" }} />
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-blue-deep)" }}>Set Your Password</p>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--t-blue-deep)" }}>
                        You're signed in. Create a password so you can log in with just your username next time.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: T.muted }}>New Password</label>
                      <div className="relative">
                        <input type={showNewPassword ? "text" : "password"} value={newPassword}
                          onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters"
                          autoComplete="new-password" disabled={setPasswordMutation.isPending}
                          className="w-full h-12 px-4 pr-12 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                          style={{ background: T.surface, border: `1.5px solid ${T.border}`, color: T.text }} />
                        <button type="button" onClick={() => setShowNewPassword(s => !s)} tabIndex={-1}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                          style={{ color: T.muted }}>
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: T.muted }}>Confirm Password</label>
                      <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)}
                        placeholder="Re-enter password" autoComplete="new-password" disabled={setPasswordMutation.isPending}
                        className="w-full h-12 px-4 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        style={{ background: T.surface, border: `1.5px solid ${T.border}`, color: T.text }} />
                    </div>

                    {error && <ErrorBanner message={error} />}

                    <button type="submit"
                      disabled={setPasswordMutation.isPending || newPassword.length < 8 || newPassword !== confirmNewPassword}
                      className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                      style={{ background: "var(--t-blue-deep)" }}>
                      {setPasswordMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Lock className="w-4 h-4" /> Save Password</>}
                    </button>

                    <button type="button" onClick={() => setLocation("/account")}
                      className="w-full h-10 rounded-xl text-xs font-semibold transition-colors"
                      style={{ color: T.muted }}>
                      Skip for now
                    </button>
                  </form>
                )}
              </motion.div>
            )}

            {/* ── Forgot Password Step 1: enter username ── */}
            {step === "forgot-step1" && (
              <motion.form key="forgot-1" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}
                onSubmit={handleForgotStep1} className="space-y-4" autoComplete="off">

                <div className="rounded-xl px-4 py-3.5" style={{ background: "rgba(27,58,122,0.06)", border: "1px solid rgba(27,58,122,0.15)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <MessageCircle className="w-4 h-4 shrink-0" style={{ color: "var(--t-blue-deep)" }} />
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-blue-deep)" }}>Telegram Reset</p>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--t-blue-deep)" }}>
                    We'll send a 6-digit code to your linked Telegram account. Your account must have Telegram linked to use this.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: T.muted }}>Telegram Username</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: T.muted }}>@</span>
                    <input type="text" value={forgotUsername} onChange={e => setForgotUsername(e.target.value.replace(/^@/, ""))}
                      placeholder="yourusername" autoComplete="username" disabled={forgotLoading}
                      className="w-full h-12 pl-8 pr-4 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                      style={{ background: T.surface, border: `1.5px solid ${T.border}`, color: T.text }} />
                  </div>
                </div>

                {error && <ErrorBanner message={error} />}

                <button type="submit" disabled={forgotLoading || !forgotUsername.trim()}
                  className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                  style={{ background: "var(--t-blue-deep)" }}>
                  {forgotLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><MessageCircle className="w-4 h-4" /> Send Code via Telegram</>}
                </button>

                <button type="button" onClick={resetForgotFlow}
                  className="w-full h-10 rounded-xl text-xs font-semibold transition-colors"
                  style={{ color: T.muted }}>
                  Back to sign in
                </button>
              </motion.form>
            )}

            {/* ── Forgot Password Step 2: enter code + new password ── */}
            {step === "forgot-step2" && (
              <motion.form key="forgot-2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}
                onSubmit={handleForgotStep2} className="space-y-4" autoComplete="off">

                <div className="rounded-xl px-4 py-3.5" style={{ background: "rgba(22,163,74,0.07)", border: "1px solid rgba(22,163,74,0.18)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <MessageCircle className="w-4 h-4 shrink-0 text-green-600" />
                    <p className="text-xs font-bold uppercase tracking-wider text-green-700">Code Sent</p>
                  </div>
                  <p className="text-xs leading-relaxed text-green-700">
                    Check your Telegram DMs from @SaltPepsBot. Enter the 6-digit code below along with your new password.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: T.muted }}>6-Digit Code</label>
                  <input type="text" value={forgotCode} onChange={e => setForgotCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456" autoComplete="one-time-code" disabled={forgotLoading} maxLength={6}
                    className="w-full h-12 px-4 rounded-xl text-sm text-center font-bold tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                    style={{ background: T.surface, border: `1.5px solid ${T.border}`, color: T.text }} />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: T.muted }}>New Password</label>
                  <div className="relative">
                    <input type={showForgotPw ? "text" : "password"} value={forgotNewPassword}
                      onChange={e => setForgotNewPassword(e.target.value)} placeholder="Min. 8 characters"
                      autoComplete="new-password" disabled={forgotLoading}
                      className="w-full h-12 px-4 pr-12 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                      style={{ background: T.surface, border: `1.5px solid ${T.border}`, color: T.text }} />
                    <button type="button" onClick={() => setShowForgotPw(s => !s)} tabIndex={-1}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: T.muted }}>
                      {showForgotPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: T.muted }}>Confirm Password</label>
                  <input type="password" value={forgotConfirmPassword} onChange={e => setForgotConfirmPassword(e.target.value)}
                    placeholder="Re-enter password" autoComplete="new-password" disabled={forgotLoading}
                    className="w-full h-12 px-4 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                    style={{ background: T.surface, border: `1.5px solid ${T.border}`, color: T.text }} />
                </div>

                {error && <ErrorBanner message={error} />}

                <button type="submit"
                  disabled={forgotLoading || forgotCode.length !== 6 || forgotNewPassword.length < 8 || forgotNewPassword !== forgotConfirmPassword}
                  className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                  style={{ background: "var(--t-blue-deep)" }}>
                  {forgotLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Lock className="w-4 h-4" /> Reset Password</>}
                </button>

                <button type="button" onClick={() => { setStep("forgot-step1"); setError(""); }}
                  className="w-full h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  style={{ color: T.muted }}>
                  <RotateCcw className="w-3 h-3" /> Resend code
                </button>
              </motion.form>
            )}

            {/* ── Forgot Password Done ── */}
            {step === "forgot-done" && (
              <motion.div key="forgot-done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-5 py-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <div className="text-center">
                  <h2 className="text-base font-bold mb-1" style={{ color: T.text }}>Password Updated</h2>
                  <p className="text-xs leading-relaxed" style={{ color: T.muted }}>
                    Your password has been reset. Sign in below with your new password.
                  </p>
                </div>
                <button onClick={() => { setStep("form"); setTab("login"); setUsername(forgotUsername); setError(""); }}
                  className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                  style={{ background: "var(--t-blue-deep)" }}>
                  <LogIn className="w-4 h-4" /> Sign In
                </button>
              </motion.div>
            )}

            {/* ── Create Account ── */}
            {tab === "signup" && step === "form" && (
              <motion.form key="signup" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }} onSubmit={handleSignup} className="space-y-4" autoComplete="off">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: T.muted }}>Telegram Username</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: T.muted }}>@</span>
                    <input type="text" value={username} onChange={e => setUsername(e.target.value.replace(/^@/, ""))}
                      placeholder="yourusername" autoComplete="username" disabled={isLoading}
                      className="w-full h-12 pl-8 pr-4 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                      style={{ background: T.surface, border: `1.5px solid ${T.border}`, color: T.text }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: T.muted }}>Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.muted }} />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com" autoComplete="email" disabled={isLoading}
                      className="w-full h-12 pl-10 pr-4 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                      style={{ background: T.surface, border: `1.5px solid ${T.border}`, color: T.text }} />
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: T.muted }}>Country</label>
                  <button type="button"
                    onClick={() => { setCountryOpen(o => !o); setCountrySearch(""); }}
                    disabled={isLoading}
                    className="w-full h-12 px-4 rounded-xl text-sm text-left flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                    style={{ background: T.surface, border: `1.5px solid ${countryOpen ? "var(--t-blue)" : T.border}`, color: country ? T.text : T.muted }}>
                    <Globe className="w-4 h-4 shrink-0" style={{ color: T.muted }} />
                    <span className="flex-1 truncate">{country || "Select your country"}</span>
                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${countryOpen ? "rotate-180" : ""}`} style={{ color: T.muted }} />
                  </button>
                  {countryOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-lg"
                      style={{ background: T.surface, border: `1.5px solid ${T.border}`, maxHeight: 220 }}>
                      <div className="p-2" style={{ borderBottom: `1px solid ${T.border}` }}>
                        <input
                          autoFocus
                          type="text"
                          value={countrySearch}
                          onChange={e => setCountrySearch(e.target.value)}
                          placeholder="Search countries…"
                          className="w-full h-9 px-3 rounded-lg text-sm focus:outline-none"
                          style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.text }}
                        />
                      </div>
                      <div className="overflow-y-auto" style={{ maxHeight: 170 }}>
                        {COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase())).map(c => (
                          <button key={c} type="button"
                            onClick={() => { setCountry(c); setCountryOpen(false); setCountrySearch(""); }}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors"
                            style={{ color: c === country ? "var(--t-blue-deep)" : T.text, fontWeight: c === country ? 600 : 400 }}>
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: T.muted }}>
                    Invite Code {inviteRequired ? <span style={{ color: "var(--t-blue-deep)" }}>*</span> : <span className="normal-case font-normal ml-1" style={{ color: T.muted }}>(optional)</span>}
                  </label>
                  <div className="relative">
                    <Ticket className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.muted }} />
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={e => setInviteCode(e.target.value.toUpperCase())}
                      placeholder={inviteRequired ? "Required to sign up" : "Enter code if you have one"}
                      autoComplete="off"
                      disabled={isLoading}
                      className="w-full h-12 pl-10 pr-4 rounded-xl text-sm tracking-widest font-semibold focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                      style={{ background: T.surface, border: `1.5px solid ${inviteRequired && !inviteCode ? "var(--t-blue-deep)" : T.border}`, color: T.text }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: T.muted }}>Password</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters" autoComplete="new-password" disabled={isLoading}
                      className="w-full h-12 px-4 pr-12 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                      style={{ background: T.surface, border: `1.5px solid ${T.border}`, color: T.text }} />
                    <button type="button" onClick={() => setShowPassword(s => !s)} tabIndex={-1}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: T.muted }}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: T.muted }}>Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password" autoComplete="new-password" disabled={isLoading}
                    className="w-full h-12 px-4 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                    style={{ background: T.surface, border: `1.5px solid ${T.border}`, color: T.text }} />
                </div>
                {error && <ErrorBanner message={error} />}
                <button type="submit" disabled={isLoading || !username.trim() || !email.trim() || !country || !password || !confirmPassword || (inviteRequired && !inviteCode.trim())}
                  className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                  style={{ background: "var(--t-blue-deep)" }}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><UserPlus className="w-4 h-4" /> Create Account</>}
                </button>
              </motion.form>
            )}

            {/* ── Post-signup Telegram opt-in ── */}
            {tab === "signup" && step === "telegram-prompt" && (
              <motion.div key="telegram-prompt" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-4">

                {/* Success header */}
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(34,197,94,0.12)" }}>
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-base font-bold" style={{ color: T.text }}>Account created!</h2>
                    <p className="text-xs mt-0.5" style={{ color: T.muted }}>Welcome to Salt & Peps, @{username}</p>
                  </div>
                </div>

                {/* Telegram prompt card */}
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(27,58,122,0.2)" }}>
                  <div className="px-4 py-3 flex items-center gap-3" style={{ background: "rgba(27,58,122,0.06)", borderBottom: "1px solid rgba(27,58,122,0.12)" }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(27,58,122,0.1)" }}>
                      <MessageCircle className="w-4 h-4" style={{ color: "var(--t-blue-deep)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: T.text }}>Get order notifications</p>
                      <p className="text-[11px]" style={{ color: T.muted }}>Telegram DMs via @SaltPepsBot</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: "rgba(27,58,122,0.08)", color: "var(--t-blue-deep)" }}>
                      Optional
                    </span>
                  </div>
                  <div className="p-4 space-y-3" style={{ background: T.surface }}>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: "📦", label: "Order placed" },
                        { icon: "🚚", label: "Order shipped" },
                        { icon: "💳", label: "Payment confirmed" },
                        { icon: "🔄", label: "Status changes" },
                      ].map(({ icon, label }) => (
                        <div key={label} className="flex items-center gap-2 px-2.5 py-2 rounded-xl"
                          style={{ background: T.surface2 }}>
                          <span className="text-sm leading-none">{icon}</span>
                          <span className="text-[11px] font-medium" style={{ color: T.muted }}>{label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: T.muted }}>
                      Link your Telegram to get instant updates on all your orders. Takes about 30 seconds — you can also do it later from your account settings.
                    </p>
                  </div>
                </div>

                {/* CTAs */}
                <button
                  onClick={() => setLocation("/account?s=telegram&next=groups")}
                  className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                  style={{ background: "var(--t-blue-deep)" }}>
                  <Bell className="w-4 h-4" />
                  Set up Telegram notifications
                </button>

                <button
                  onClick={() => setStep("join-group-buy")}
                  className="w-full h-10 rounded-xl text-xs font-semibold transition-colors"
                  style={{ color: T.muted }}>
                  Skip for now
                </button>
              </motion.div>
            )}

            {/* ── Post-signup Join a Group Buy ── */}
            {tab === "signup" && step === "join-group-buy" && (
              <motion.div key="join-group-buy" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-4">

                {/* Header */}
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(27,58,122,0.1)" }}>
                    <Users className="w-7 h-7" style={{ color: "var(--t-blue-deep)" }} />
                  </div>
                  <div className="text-center">
                    <h2 className="text-base font-bold" style={{ color: T.text }}>You're almost set!</h2>
                    <p className="text-xs mt-0.5" style={{ color: T.muted }}>Join the community — browse open group buys</p>
                  </div>
                </div>

                {/* Group Buy info card */}
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(27,58,122,0.2)" }}>
                  <div className="px-4 py-3 flex items-center gap-3" style={{ background: "rgba(27,58,122,0.06)", borderBottom: "1px solid rgba(27,58,122,0.12)" }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(27,58,122,0.1)" }}>
                      <Users className="w-4 h-4" style={{ color: "var(--t-blue-deep)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: T.text }}>Group Buys</p>
                      <p className="text-[11px]" style={{ color: T.muted }}>Pool together for batch pricing</p>
                    </div>
                  </div>
                  <div className="p-4 space-y-3" style={{ background: T.surface }}>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: "💰", label: "Lower per-unit cost" },
                        { icon: "🔬", label: "Lab-tested batches" },
                        { icon: "📦", label: "Full order tracking" },
                        { icon: "🤝", label: "Community orders" },
                      ].map(({ icon, label }) => (
                        <div key={label} className="flex items-center gap-2 px-2.5 py-2 rounded-xl"
                          style={{ background: T.surface2 }}>
                          <span className="text-sm leading-none">{icon}</span>
                          <span className="text-[11px] font-medium" style={{ color: T.muted }}>{label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: T.muted }}>
                      Browse open group buys, see what's available, and join one with an invite from the admin.
                    </p>
                  </div>
                </div>

                {/* CTAs */}
                <button
                  onClick={() => setLocation("/groups")}
                  className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                  style={{ background: "var(--t-blue-deep)" }}>
                  <Users className="w-4 h-4" />
                  Browse Group Buys
                </button>

                <button
                  onClick={() => setLocation("/account")}
                  className="w-full h-10 rounded-xl text-xs font-semibold transition-colors"
                  style={{ color: T.muted }}>
                  Go to my account
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>
    </div>
    </PageLayout>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
      style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)" }}>
      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
      <p className="text-sm text-red-600">{message}</p>
    </div>
  );
}
