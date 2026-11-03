import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowLeft, Loader2, AlertCircle, CheckCircle2, Mail, MessageCircle, Bell, RotateCcw, Users, ChevronDown } from "lucide-react";
import { SaltPepsMark } from "@/components/SaltPepsMark";
import { useSmartLogin, useSignup, useAccount, useSetPassword } from "@/hooks/use-account";
import { PageLayout } from "@/components/PageLayout";
import { COUNTRIES } from "@/data/countries";
import { T } from "@/lib/theme";
import { accountRequiresVerification, resolveTurnstileSiteKey } from "@/lib/account-verification-flow";
import { useQuery } from "@tanstack/react-query";

type Tab = "login" | "signup";
type Step = "form" | "set-password" | "telegram-prompt" | "join-group-buy" | "forgot-step1" | "forgot-step2" | "forgot-done";

// ── Discord OAuth button ────────────────────────────────────────────────────
function DiscordLoginButton({ inviteRequired, inviteCode, onInviteCodeChange, showInviteInput = true }: {
  inviteRequired: boolean; inviteCode: string; onInviteCodeChange: (code: string) => void; showInviteInput?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset loading when the browser restores this page from the back-forward cache
  // (e.g. user clicked the button → navigated to Discord → pressed Back).
  // Without this, `loading` stays true and the spinner never stops.
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLoading(false);
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const handleDiscordLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (inviteCode.trim()) params.set("inviteCode", inviteCode.trim());
      const res = await fetch(`/api/account/discord/login-url${params.size ? `?${params}` : ""}`);
      if (!res.ok) {
        setLoading(false);
        setError("Discord login isn't available right now — contact support if this persists.");
        return;
      }
      const { url } = await res.json() as { url: string };
      window.location.href = url;
      // Loading stays true intentionally while the browser navigates away.
      // The pageshow handler above resets it if the user comes back via Back.
    } catch {
      setLoading(false);
      setError("Couldn't reach the server — check your connection and try again.");
    }
  };

  return (
    <div className="space-y-2">
      {inviteRequired && showInviteInput && <label className="block text-xs" style={{ color: "var(--t-muted)" }}>
        Invite code for a new Discord account (not needed for existing accounts)
        <input value={inviteCode} onChange={event => onInviteCodeChange(event.target.value.toUpperCase())}
          maxLength={64} autoComplete="off" className="mt-1 h-11 w-full rounded-lg px-3 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#2D6BCC]/40"
          style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)" }} />
      </label>}
      <button type="button" onClick={handleDiscordLogin} disabled={loading}
        className="w-full h-11 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
        style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)", boxShadow: "0 1px 0 rgba(26,26,26,0.07)" }}>
        {loading ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 127.14 96.36" fill="#5865F2" xmlns="http://www.w3.org/2000/svg">
            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
          </svg>
        )}
        Continue with Discord
      </button>
      {error && (
        <p className="text-xs text-center" style={{ color: "#DC2626" }}>{error}</p>
      )}
    </div>
  );
}

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
  const [rememberMe, setRememberMe] = useState(false);
  const [showCredential, setShowCredential] = useState(false);
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileLoadError, setTurnstileLoadError] = useState("");
  const [turnstileLoadAttempt, setTurnstileLoadAttempt] = useState(0);
  const turnstileSiteKey = resolveTurnstileSiteKey(
    import.meta.env.VITE_TURNSTILE_SITE_KEY,
    import.meta.env.PROD,
  );
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const [error, setError] = useState("");

  // Handle discord_error param from OAuth callback
  useEffect(() => {
    const discordError = new URLSearchParams(window.location.search).get("discord_error");
    if (discordError) {
      setError(decodeURIComponent(discordError));
      const url = new URL(window.location.href);
      url.searchParams.delete("discord_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    if (tab !== "signup") return;
    if (!turnstileSiteKey) return;

    setTurnstileLoadError("");
    let script = document.querySelector<HTMLScriptElement>('script[src*="turnstile/v0/api.js"]');
    if (!script) {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    let checks = 0;
    const failLoad = () => {
      setTurnstileToken("");
      setTurnstileLoadError("The security check could not load. Check your connection and try again.");
    };
    script.addEventListener("error", failLoad, { once: true });

    const checkInterval = window.setInterval(() => {
      checks += 1;
      if ((window as any).turnstile && turnstileContainerRef.current) {
        clearInterval(checkInterval);
        try {
          if (turnstileWidgetIdRef.current) {
             (window as any).turnstile.remove(turnstileWidgetIdRef.current);
          }
          const id = (window as any).turnstile.render(turnstileContainerRef.current, {
            sitekey: turnstileSiteKey,
            callback: (token: string) => setTurnstileToken(token),
            "error-callback": () => setTurnstileToken(""),
            "expired-callback": () => setTurnstileToken(""),
            appearance: "interaction-only"
          });
          turnstileWidgetIdRef.current = id;
        } catch {
          failLoad();
        }
      } else if (checks >= 150) {
        clearInterval(checkInterval);
        failLoad();
      }
    }, 100);

    return () => {
      clearInterval(checkInterval);
      script?.removeEventListener("error", failLoad);
      if (turnstileWidgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(turnstileWidgetIdRef.current);
          turnstileWidgetIdRef.current = null;
        } catch (e) {}
      }
      setTurnstileToken("");
    };
  }, [tab, turnstileSiteKey, turnstileLoadAttempt]);

  const { data: siteConfig } = useQuery({
    queryKey: ["site-config"],
    queryFn: async () => {
      const res = await fetch("/api/config");
      return res.json() as Promise<{ signupRequiresInvite?: boolean; telegramWidgetEnabled?: boolean }>;
    },
    staleTime: 60_000,
  });
  const inviteRequired = siteConfig?.signupRequiresInvite ?? false;
  // Widget is opt-in via admin flag (default off until BotFather /setdomain is configured).
  const telegramWidgetEnabled = siteConfig?.telegramWidgetEnabled ?? false;

  useEffect(() => {
    // Only redirect if user was already logged in when they arrived at /login.
    // Do NOT redirect during the post-signup steps (telegram-prompt, join-group-buy)
    // because those steps appear right after the account data is set by the signup mutation.
    if (!accountLoading && account && step === "form") {
      if (accountRequiresVerification(account)) {
        setLocation("/verify-account");
      } else {
        setLocation(nextParam || "/account");
      }
    }
  }, [accountLoading, account, step, setLocation, nextParam]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  // Forgot password state
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotMethod, setForgotMethod] = useState<"telegram" | "email">("telegram");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotPw, setShowForgotPw] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // ── Post-signup Telegram linking state ────────────────────────────────────
  const [tgLinkData, setTgLinkData] = useState<{ deepLink: string | null; botUsername: string | null } | null>(null);
  const [tgLinked, setTgLinked] = useState(false);
  const [tgLinking, setTgLinking] = useState(false);
  const [tgWidgetFailed, setTgWidgetFailed] = useState(false);
  const tgWidgetContainerRef = useRef<HTMLDivElement>(null);

  // Fetch a fresh link token + deep link as soon as the Telegram prompt appears
  useEffect(() => {
    if (tab !== "signup" || step !== "telegram-prompt") return;
    let cancelled = false;
    fetch("/api/account/telegram/link-init", { method: "POST" })
      .then(r => r.ok ? r.json() : null)
      .then((data: { deepLink: string | null; botUrl: string | null } | null) => {
        if (cancelled || !data) return;
        const botUsername = data.botUrl ? data.botUrl.split("/").pop()! : null;
        setTgLinkData({ deepLink: data.deepLink, botUsername });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [tab, step]);

  // Inject the Telegram Login Widget script once we know the bot username.
  // Only runs when the admin flag is on; adds a 3-second watchdog that promotes
  // the deep-link fallback if the widget fails to render (e.g. /setdomain not set).
  useEffect(() => {
    const container = tgWidgetContainerRef.current;
    if (!telegramWidgetEnabled || !tgLinkData?.botUsername || !container || tgLinked) return;

    (window as any).onTelegramWidgetAuth = async (user: Record<string, unknown>) => {
      setTgLinking(true);
      try {
        const r = await fetch("/api/account/telegram/widget-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });
        if (r.ok) {
          setTgLinked(true);
        }
      } catch { /* ignore */ }
      setTgLinking(false);
    };

    container.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", tgLinkData.botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramWidgetAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.async = true;
    container.appendChild(script);

    // Watchdog: if the widget hasn't rendered an iframe after 3 s, fall back to
    // the deep link. This catches the common case where /setdomain wasn't called.
    const watchdog = setTimeout(() => {
      if (container && !container.querySelector("iframe")) {
        setTgWidgetFailed(true);
      }
    }, 3000);

    return () => {
      clearTimeout(watchdog);
      container.innerHTML = "";
      delete (window as any).onTelegramWidgetAuth;
    };
  }, [telegramWidgetEnabled, tgLinkData?.botUsername, tgLinked]);

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
        rememberMe,
      });
      if ((result as any).needsSetup) {
        setTab("signup");
        setError("An account has been created for you — please set a password to complete your registration.");
      } else if (result.verificationRequired) {
        setLocation("/verify-account");
      } else if (result.needsPassword) {
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
    if (!turnstileSiteKey) { setError("The security check is unavailable. Please try again later."); return; }
    if (!turnstileToken) { setError("Please complete the security check"); return; }
    try {
      const res = await signup.mutateAsync({ telegramUsername: username.trim(), password, email: email.trim(), country, inviteCode: inviteCode.trim() || undefined, turnstileToken });
      if (res.verificationRequired) {
        setLocation("/verify-account");
      } else {
        setStep("telegram-prompt");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
      if (turnstileWidgetIdRef.current && (window as any).turnstile) {
        (window as any).turnstile.reset(turnstileWidgetIdRef.current);
      }
      setTurnstileToken("");
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
        body: JSON.stringify({ telegramUsername: forgotUsername.trim(), method: forgotMethod }),
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
    setForgotMethod("telegram");
    setForgotCode("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setError("");
  };

  // ── Shopify-style shell ────────────────────────────────────────────────────
  const inForgot = step.startsWith("forgot");
  const heading =
    step === "set-password" ? { title: "Create a password", sub: "You're signed in. Add a password so next time you can log in with just your username." }
    : step === "forgot-step1" ? { title: "Reset your password", sub: "We'll send you a 6-digit code to choose a new one." }
    : step === "forgot-step2" ? { title: "Enter your code", sub: forgotMethod === "email" ? "Check your email inbox for the 6-digit code." : "Check your Telegram messages from @SaltPepsBot for the 6-digit code." }
    : step === "forgot-done" ? { title: "Password updated", sub: "Log in with your new password." }
    : step === "telegram-prompt" ? { title: "Account created", sub: `Welcome to Salt & Peps, @${username}.` }
    : step === "join-group-buy" ? { title: "You're all set", sub: "Browse open group buys or head to your account." }
    : tab === "signup" ? { title: fromGbOrganiser ? "Create your organiser account" : "Create a Salt & Peps account", sub: fromGbOrganiser ? "Set up your organiser access." : "One account for group buys, orders and support." }
    : { title: "Log in", sub: "Continue to Salt & Peps" };
  const wide = tab === "signup" && step === "form";

  return (
    <PageLayout>
    <div className="flex flex-col" style={{ background: T.bg, minHeight: "100%" }}>
      <div className="flex-1 flex flex-col items-center px-4 pt-8 md:pt-16 pb-28">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`w-full ${wide ? "max-w-[520px]" : "max-w-[400px]"}`}>
          <div className="rounded-2xl p-6 sm:p-8" style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 1px 0 rgba(26,26,26,0.06)" }}>
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: "var(--t-blue-deep)" }} aria-label="Salt & Peps"><SaltPepsMark size={30} /></span>
                {(inForgot || step === "set-password") && (
                  <button type="button" onClick={() => { if (inForgot) resetForgotFlow(); else setLocation("/account"); }}
                    className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: T.muted }}>
                    <ArrowLeft className="w-4 h-4" />{inForgot ? "Back to log in" : "Skip"}
                  </button>)}
              </div>
              <h1 className="text-xl font-semibold tracking-tight mt-5" style={{ color: T.text }}>{heading.title}</h1>
              <p className="text-sm mt-1" style={{ color: T.muted }}>{heading.sub}</p>
            </div>

            <AnimatePresence mode="wait">

              {/* ── Log in ── */}
              {tab === "login" && step === "form" && (
                <motion.form key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                  onSubmit={handleLogin} className="space-y-4" autoComplete="off">
                  <Field label="Username or email">
                    <input type="text" value={username}
                      onChange={e => { const v = e.target.value; const isEmail = v.includes("@") && !v.startsWith("@"); setUsername(isEmail ? v : v.replace(/^@/, "")); }}
                      autoComplete="username" disabled={isLoading} className={inputCls} style={inputStyle} />
                  </Field>
                  <Field label="Password or PIN" trailing={
                    <button type="button" onClick={() => { setStep("forgot-step1"); setForgotUsername(username); setError(""); }} className="text-[13px] font-medium" style={{ color: "var(--t-blue-deep)" }}>Forgot password?</button>}>
                    <div className="relative">
                      <input type={showCredential ? "text" : "password"} value={credential} onChange={e => setCredential(e.target.value)}
                        autoComplete="current-password" disabled={isLoading} className={`${inputCls} pr-11`} style={inputStyle} />
                      <EyeToggle shown={showCredential} onToggle={() => setShowCredential(s => !s)} label="password or PIN" />
                    </div>
                  </Field>
                  <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: T.text }}>
                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} aria-label="Remember me for 7 days" disabled={isLoading} className="w-4 h-4 accent-[#1A1A1A]" />
                    Keep me logged in for 7 days
                  </label>
                  {error && <ErrorBanner message={error} />}
                  <PrimaryButton disabled={isLoading || !username.trim() || !credential.trim()} loading={isLoading}>Log in</PrimaryButton>
                  <Divider />
                  <DiscordLoginButton inviteRequired={inviteRequired} inviteCode={inviteCode} onInviteCodeChange={setInviteCode} />
                </motion.form>
              )}

              {/* ── Set password (after order-code login) ── */}
              {tab === "login" && step === "set-password" && (
                <motion.div key="set-password" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                  {passwordSaved ? (
                    <SuccessNote title="Password saved" body="Taking you to your group buys…" />
                  ) : (
                    <form onSubmit={handleSetPassword} className="space-y-4" autoComplete="off">
                      <Field label="New password" hint="At least 8 characters.">
                        <div className="relative">
                          <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                            autoComplete="new-password" disabled={setPasswordMutation.isPending} className={`${inputCls} pr-11`} style={inputStyle} />
                          <EyeToggle shown={showNewPassword} onToggle={() => setShowNewPassword(s => !s)} label="new password" />
                        </div>
                      </Field>
                      <Field label="Confirm password">
                        <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)}
                          autoComplete="new-password" disabled={setPasswordMutation.isPending} className={inputCls} style={inputStyle} />
                      </Field>
                      {error && <ErrorBanner message={error} />}
                      <PrimaryButton disabled={setPasswordMutation.isPending || newPassword.length < 8 || newPassword !== confirmNewPassword} loading={setPasswordMutation.isPending}>Save password</PrimaryButton>
                    </form>
                  )}
                </motion.div>
              )}

              {/* ── Forgot password: step 1 ── */}
              {step === "forgot-step1" && (
                <motion.form key="forgot-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                  onSubmit={handleForgotStep1} className="space-y-4" autoComplete="off">
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-lg" style={{ background: T.surface2 }} role="tablist">
                    {(["telegram", "email"] as const).map(m => (
                      <button key={m} type="button" role="tab" aria-selected={forgotMethod === m} onClick={() => { setForgotMethod(m); setError(""); }}
                        className="h-9 rounded-md text-sm font-medium flex items-center justify-center gap-2"
                        style={forgotMethod === m ? { background: T.surface, color: T.text, boxShadow: "0 1px 0 rgba(26,26,26,0.07)" } : { color: T.muted }}>
                        {m === "telegram" ? <MessageCircle className="w-4 h-4" /> : <Mail className="w-4 h-4" />}{m === "telegram" ? "Telegram" : "Email"}
                      </button>))}
                  </div>
                  <Field label={forgotMethod === "email" ? "Username or email" : "Telegram username"}>
                    <input type="text" value={forgotUsername}
                      onChange={e => { const v = e.target.value; const isEmail = forgotMethod === "email" && v.includes("@") && !v.startsWith("@"); setForgotUsername(isEmail ? v : v.replace(/^@/, "")); }}
                      autoComplete="username" disabled={forgotLoading} className={inputCls} style={inputStyle} />
                  </Field>
                  {error && <ErrorBanner message={error} />}
                  <PrimaryButton disabled={forgotLoading || !forgotUsername.trim()} loading={forgotLoading}>{forgotMethod === "telegram" ? "Send code via Telegram" : "Send code via email"}</PrimaryButton>
                </motion.form>
              )}

              {/* ── Forgot password: step 2 ── */}
              {step === "forgot-step2" && (
                <motion.form key="forgot-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                  onSubmit={handleForgotStep2} className="space-y-4" autoComplete="off">
                  <Field label="6-digit code">
                    <input type="text" inputMode="numeric" value={forgotCode} onChange={e => setForgotCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      autoComplete="one-time-code" disabled={forgotLoading} maxLength={6} className={`${inputCls} text-center font-semibold tracking-[0.3em]`} style={inputStyle} />
                  </Field>
                  <Field label="New password" hint="At least 8 characters.">
                    <div className="relative">
                      <input type={showForgotPw ? "text" : "password"} value={forgotNewPassword} onChange={e => setForgotNewPassword(e.target.value)}
                        autoComplete="new-password" disabled={forgotLoading} className={`${inputCls} pr-11`} style={inputStyle} />
                      <EyeToggle shown={showForgotPw} onToggle={() => setShowForgotPw(s => !s)} label="new password" />
                    </div>
                  </Field>
                  <Field label="Confirm password">
                    <input type="password" value={forgotConfirmPassword} onChange={e => setForgotConfirmPassword(e.target.value)}
                      autoComplete="new-password" disabled={forgotLoading} className={inputCls} style={inputStyle} />
                  </Field>
                  {error && <ErrorBanner message={error} />}
                  <PrimaryButton disabled={forgotLoading || forgotCode.length !== 6 || forgotNewPassword.length < 8 || forgotNewPassword !== forgotConfirmPassword} loading={forgotLoading}>Reset password</PrimaryButton>
                  <button type="button" onClick={() => { setStep("forgot-step1"); setError(""); }} className="w-full text-sm font-medium inline-flex items-center justify-center gap-1" style={{ color: T.muted }}>
                    <RotateCcw className="w-3.5 h-3.5" /> Didn't get it? Send a new code
                  </button>
                </motion.form>
              )}

              {/* ── Forgot password: done ── */}
              {step === "forgot-done" && (
                <motion.div key="forgot-done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-4">
                  <SuccessNote title="Your password has been reset" body="Use it the next time you log in." />
                  <PrimaryButton type="button" onClick={() => { setStep("form"); setTab("login"); setUsername(forgotUsername); setError(""); }}>Log in</PrimaryButton>
                </motion.div>
              )}

              {/* ── Create account ── */}
              {tab === "signup" && step === "form" && (
                <motion.form key="signup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                  onSubmit={handleSignup} className="space-y-4" autoComplete="off">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Telegram username" hint="Without the @.">
                      <input type="text" value={username} onChange={e => setUsername(e.target.value.replace(/^@/, ""))} autoComplete="username" disabled={isLoading} className={inputCls} style={inputStyle} />
                    </Field>
                    <Field label="Email">
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" disabled={isLoading} className={inputCls} style={inputStyle} />
                    </Field>
                  </div>
                  <Field label="Country">
                    <div className="relative">
                      <button type="button" onClick={() => { setCountryOpen(o => !o); setCountrySearch(""); }} disabled={isLoading}
                        className={`${inputCls} text-left flex items-center gap-2`} style={{ ...inputStyle, color: country ? T.text : T.muted, borderColor: countryOpen ? "var(--t-blue)" : undefined }}>
                        <span className="flex-1 truncate">{country || "Select your country"}</span>
                        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${countryOpen ? "rotate-180" : ""}`} style={{ color: T.muted }} />
                      </button>
                      {countryOpen && (
                        <div className="absolute z-30 left-0 right-0 mt-1 rounded-lg overflow-hidden shadow-lg" style={{ background: T.surface, border: `1px solid ${T.border}`, maxHeight: 240 }}>
                          <div className="p-2" style={{ borderBottom: `1px solid ${T.border}` }}>
                            <input autoFocus type="text" value={countrySearch} onChange={e => setCountrySearch(e.target.value)} placeholder="Search countries…"
                              className="w-full h-9 px-3 rounded-md text-sm focus:outline-none" style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.text }} />
                          </div>
                          <div className="overflow-y-auto" style={{ maxHeight: 190 }}>
                            {COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase())).map(c => (
                              <button key={c} type="button" onClick={() => { setCountry(c); setCountryOpen(false); setCountrySearch(""); }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--t-surface2)]" style={{ color: T.text, fontWeight: c === country ? 600 : 400 }}>{c}</button>))}
                          </div>
                        </div>)}
                    </div>
                  </Field>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Password" hint="At least 8 characters.">
                      <div className="relative">
                        <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" disabled={isLoading} className={`${inputCls} pr-11`} style={inputStyle} />
                        <EyeToggle shown={showPassword} onToggle={() => setShowPassword(s => !s)} label="password" />
                      </div>
                    </Field>
                    <Field label="Confirm password">
                      <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" disabled={isLoading} className={inputCls} style={inputStyle} />
                    </Field>
                  </div>
                  <Field label={inviteRequired ? "Invite code" : "Invite code (optional)"}>
                    <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} autoComplete="off" disabled={isLoading}
                      className={`${inputCls} font-mono tracking-widest`} style={inputStyle} />
                  </Field>
                  {error && <ErrorBanner message={error} />}
                  {turnstileSiteKey && <div className="flex justify-center min-h-[1px]" ref={turnstileContainerRef}></div>}
                  {turnstileLoadError && (
                    <div className="space-y-2">
                      <ErrorBanner message={turnstileLoadError} />
                      <SecondaryButton onClick={() => { if (!(window as any).turnstile) document.querySelector('script[src*="turnstile/v0/api.js"]')?.remove(); setTurnstileLoadAttempt(a => a + 1); }}>Try security check again</SecondaryButton>
                    </div>)}
                  {!turnstileSiteKey && <ErrorBanner message="The security check is unavailable. Please try again later." />}
                  <PrimaryButton disabled={isLoading || !username.trim() || !email.trim() || !country || !password || !confirmPassword || (inviteRequired && !inviteCode.trim()) || !turnstileSiteKey || !turnstileToken} loading={isLoading}>Create account</PrimaryButton>
                  <p className="text-xs text-center" style={{ color: T.subtle }}>By creating an account you agree to receive order and account emails. A verification code is emailed to you first.</p>
                  <Divider />
                  <DiscordLoginButton inviteRequired={inviteRequired} inviteCode={inviteCode} onInviteCodeChange={setInviteCode} showInviteInput={false} />
                </motion.form>
              )}

              {/* ── Post-signup: Telegram ── */}
              {tab === "signup" && step === "telegram-prompt" && (
                <motion.div key="telegram-prompt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
                  <div className="rounded-lg p-4" style={{ background: T.surface2 }}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: T.surface, border: `1px solid ${T.border}` }}><MessageCircle className="w-4 h-4" style={{ color: "var(--t-blue-deep)" }} /></span>
                      <div className="min-w-0"><p className="text-sm font-semibold" style={{ color: T.text }}>Get order updates on Telegram</p><p className="text-xs" style={{ color: T.muted }}>Recommended · direct messages from @SaltPepsBot</p></div>
                    </div>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]" style={{ color: T.muted }}>
                      {["Order placed", "Order shipped", "Payment confirmed", "Login codes"].map(l => <li key={l} className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#0C5132" }} />{l}</li>)}
                    </ul>
                    <p className="text-xs mt-3" style={{ color: T.muted }}>Without Telegram you will rely on email only for order updates and verification codes.</p>
                  </div>
                  {tgLinked ? (
                    <div className="space-y-3">
                      <SuccessNote title="Telegram linked" body="You'll now receive order notifications in Telegram." />
                      <PrimaryButton type="button" onClick={() => setStep("join-group-buy")}>Continue</PrimaryButton>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {telegramWidgetEnabled && !tgWidgetFailed && (
                        <div className="flex flex-col items-center gap-1">
                          <div ref={tgWidgetContainerRef} className="flex justify-center min-h-[44px]">
                            {!tgLinkData?.botUsername && <div className="h-10 w-40 rounded-lg animate-pulse" style={{ background: T.surface2 }} />}
                          </div>
                          {tgLinking && <p className="text-xs" style={{ color: T.muted }}>Linking…</p>}
                        </div>)}
                      {tgLinkData?.deepLink
                        ? <a href={tgLinkData.deepLink} target="_blank" rel="noopener noreferrer" className={primaryCls} style={primaryStyle}><MessageCircle className="w-4 h-4" />{tgWidgetFailed ? "Open the Telegram app" : "Open Telegram to link"}</a>
                        : <PrimaryButton type="button" onClick={() => setLocation("/account?s=telegram&next=groups")}><Bell className="w-4 h-4" />Set up Telegram notifications</PrimaryButton>}
                      <button type="button" onClick={() => setStep("join-group-buy")} className="w-full text-sm font-medium" style={{ color: T.muted }}>I'll connect later from my account</button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Post-signup: group buys ── */}
              {tab === "signup" && step === "join-group-buy" && (
                <motion.div key="join-group-buy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
                  <div className="rounded-lg p-4" style={{ background: T.surface2 }}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: T.surface, border: `1px solid ${T.border}` }}><Users className="w-4 h-4" style={{ color: "var(--t-blue-deep)" }} /></span>
                      <div><p className="text-sm font-semibold" style={{ color: T.text }}>Group buys</p><p className="text-xs" style={{ color: T.muted }}>Pool together for batch pricing</p></div>
                    </div>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]" style={{ color: T.muted }}>
                      {["Lower per-unit cost", "Lab-tested batches", "Full order tracking", "Community orders"].map(l => <li key={l} className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#0C5132" }} />{l}</li>)}
                    </ul>
                  </div>
                  <PrimaryButton type="button" onClick={() => setLocation("/groups")}><Users className="w-4 h-4" />Browse group buys</PrimaryButton>
                  <button type="button" onClick={() => setLocation("/account")} className="w-full text-sm font-medium" style={{ color: T.muted }}>Go to my account</button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {step === "form" && (
            <p className="text-center text-sm mt-5" style={{ color: T.muted }}>
              {tab === "login" ? <>New to Salt &amp; Peps? <button type="button" onClick={() => handleTabChange("signup")} className="font-semibold" style={{ color: "var(--t-blue-deep)" }}>Get started</button></>
                : <>Already have an account? <button type="button" onClick={() => handleTabChange("login")} className="font-semibold" style={{ color: "var(--t-blue-deep)" }}>Log in</button></>}
            </p>)}
          <div className="flex items-center justify-center gap-5 mt-6 text-xs" style={{ color: T.subtle }}>
            <button type="button" onClick={() => setLocation("/")} className="hover:underline">Salt &amp; Peps home</button>
            <button type="button" onClick={() => setLocation("/feedback")} className="hover:underline">Help</button>
          </div>
        </motion.div>
      </div>
    </div>
    </PageLayout>
  );
}

/* ── Shopify-style primitives ──────────────────────────────────────────────── */
const inputCls = "w-full h-11 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6BCC]/40 focus:border-[var(--t-blue)] disabled:opacity-60";
const inputStyle: React.CSSProperties = { background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)", boxShadow: "inset 0 1px 0 rgba(26,26,26,0.04)" };
const primaryCls = "w-full h-11 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed";
const primaryStyle: React.CSSProperties = { background: "var(--t-text)", color: "var(--t-surface)", boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.25)" };

function Field({ label, hint, trailing, children }: { label: string; hint?: string; trailing?: React.ReactNode; children: React.ReactNode }) {
  // The label is associated by id so that links such as "Forgot password?" can sit beside it without nesting interactive content in a <label>.
  const id = React.useId();
  const control = React.isValidElement(children) && children.type === "input" ? React.cloneElement(children as React.ReactElement<any>, { id }) : children;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className="text-[13px] font-medium" style={{ color: "var(--t-text)" }}>{label}</label>{trailing}
      </div>
      {control}
      {hint && <p className="mt-1 text-xs" style={{ color: "var(--t-subtle)" }}>{hint}</p>}
    </div>
  );
}
function EyeToggle({ shown, onToggle, label }: { shown: boolean; onToggle: () => void; label: string }) {
  return (
    <button type="button" onClick={onToggle} aria-label={shown ? `Hide ${label}` : `Show ${label}`} aria-pressed={shown}
      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--t-muted)" }}>
      {shown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
}
function PrimaryButton({ children, loading, type = "submit", ...rest }: { children: React.ReactNode; loading?: boolean; type?: "submit" | "button"; onClick?: () => void; disabled?: boolean }) {
  return <button type={type} className={primaryCls} style={primaryStyle} {...rest}>{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : children}</button>;
}
function SecondaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="w-full h-11 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
      style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)", boxShadow: "0 1px 0 rgba(26,26,26,0.07)" }}>{children}</button>
  );
}
function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px" style={{ background: "var(--t-border)" }} />
      <span className="text-xs" style={{ color: "var(--t-subtle)" }}>or</span>
      <div className="flex-1 h-px" style={{ background: "var(--t-border)" }} />
    </div>
  );
}
function SuccessNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg p-3" style={{ background: "#CDFEE1", color: "#0C5132" }}>
      <CheckCircle2 className="w-5 h-5 shrink-0" />
      <div><p className="text-sm font-semibold">{title}</p><p className="text-sm">{body}</p></div>
    </div>
  );
}
function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" aria-live="polite" className="flex items-start gap-2 px-3 py-2.5 rounded-lg" style={{ background: "#FEDAD9", color: "#8E1F0B" }}>
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
