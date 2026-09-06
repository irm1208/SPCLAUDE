import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, Mail, MessageCircle, ArrowRight, Loader2, 
  CheckCircle2, AlertCircle, LogOut
} from "lucide-react";
import { 
  useAccount, 
  useLogout, 
  useVerificationStatus, 
  useResendVerificationEmail, 
  useConfirmVerificationEmail, 
  useUpgradeSession,
  useTelegramLinkInit,
  useTelegramStatus
} from "@/hooks/use-account";
import { PageLayout } from "@/components/PageLayout";
import { T } from "@/lib/theme";
import { accountRequiresVerification, parseResendRetrySeconds } from "@/lib/account-verification-flow";



function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" aria-live="polite" className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
      style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)" }}>
      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
      <p className="text-sm text-red-600">{message}</p>
    </div>
  );
}

export default function VerifyAccount() {
  const [, setLocation] = useLocation();
  const { account, isLoading: accountLoading } = useAccount();
  const {
    data: status,
    isLoading: statusLoading,
    isError: statusError,
    isFetching: statusFetching,
    refetch: refetchStatus,
  } = useVerificationStatus();
  const logout = useLogout();
  
  const resendEmail = useResendVerificationEmail();
  const confirmEmail = useConfirmVerificationEmail();
  const upgradeSession = useUpgradeSession();
  
  const [activeMethod, setActiveMethod] = useState<"email" | "telegram" | null>(null);
  
  // Email verification state
  const [code, setCode] = useState("");
  const [emailError, setEmailError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  
  // Telegram verification state
  const tgLinkInit = useTelegramLinkInit();
  const [tgLinkData, setTgLinkData] = useState<{ deepLink: string | null; botUsername: string | null } | null>(null);
  const [tgLinkError, setTgLinkError] = useState("");
  const [tgLinked, setTgLinked] = useState(false);
  const {
    data: tgStatus,
    dataUpdatedAt: tgStatusUpdatedAt,
  } = useTelegramStatus(activeMethod === "telegram" && !tgLinked, { refetchInterval: 3000 });

  // Redirect if already verified or not logged in
  useEffect(() => {
    if (!accountLoading) {
      if (!account) {
        setLocation("/login");
      } else if (!accountRequiresVerification(account)) {
        setLocation("/account");
      }
    }
  }, [accountLoading, account, setLocation]);

  // Set default active method based on availability
  useEffect(() => {
    if (status && !activeMethod) {
      if (status.availableMethods.includes("email")) {
        setActiveMethod("email");
      } else {
        setActiveMethod("telegram");
      }
    }
  }, [status, activeMethod]);

  // Timer for email resend
  useEffect(() => {
    if (status?.resendAvailableAt) {
      const availableAt = new Date(status.resendAvailableAt).getTime();
      const updateTimer = () => {
        const now = Date.now();
        if (availableAt > now) {
          setResendCooldown(Math.ceil((availableAt - now) / 1000));
        } else {
          setResendCooldown(0);
        }
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [status?.resendAvailableAt]);

  // Initialize Telegram link when selected
  useEffect(() => {
    if (activeMethod === "telegram" && !tgLinkData && !tgLinkError && !tgLinkInit.isPending) {
      let cancelled = false;
      tgLinkInit.mutateAsync().then(data => {
        if (!cancelled && data?.deepLink) {
          const botUsername = data.botUrl ? data.botUrl.split("/").pop()! : null;
          setTgLinkData({ deepLink: data.deepLink, botUsername });
        } else if (!cancelled) {
          setTgLinkError("Telegram verification is unavailable right now. Please try again.");
        }
      }).catch((error: unknown) => {
        if (!cancelled) {
          setTgLinkError(error instanceof Error ? error.message : "Unable to prepare Telegram verification.");
        }
      });
      return () => { cancelled = true; };
    }
    return undefined;
  }, [activeMethod, tgLinkData, tgLinkError, tgLinkInit]);

  // Poll for Telegram link status
  useEffect(() => {
    if (activeMethod === "telegram" && tgStatus?.linked && !tgLinked && !upgradeSession.isPending) {
      upgradeSession.mutateAsync()
        .then(() => setTgLinked(true))
        .catch(() => {
          // Keep polling: the authoritative verification transaction may still be completing.
        });
    }
  }, [activeMethod, tgStatus?.linked, tgStatusUpdatedAt, tgLinked]);

  const handleResendEmail = async () => {
    setEmailError("");
    try {
      await resendEmail.mutateAsync();
      setResendCooldown(60);
    } catch (err: any) {
      setEmailError(err.message || "Failed to resend email");
      const retryAfter = parseResendRetrySeconds(err.message ?? "");
      if (retryAfter !== null) setResendCooldown(retryAfter);
    }
  };

  const handleConfirmEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) return;
    setEmailError("");
    try {
      await confirmEmail.mutateAsync({ code });
      // On success, redirect to account (handled by query invalidation)
    } catch (err: any) {
      setEmailError(err.message || "Invalid code");
    }
  };

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => setLocation("/login")
    });
  };

  if (accountLoading || statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: T.bg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--t-blue-deep)" }} />
      </div>
    );
  }

  if (statusError || !status) {
    return (
      <PageLayout>
        <div className="min-h-[100dvh] flex items-center justify-center px-4" style={{ background: T.bg }}>
          <div className="w-full max-w-sm space-y-4">
            <ErrorBanner message="We could not load your verification options. Your session is still secure." />
            <button
              type="button"
              disabled={statusFetching}
              onClick={() => refetchStatus()}
              className="w-full h-11 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ color: "var(--t-blue-deep)", border: `1px solid ${T.border}` }}
            >
              {statusFetching ? "Trying again..." : "Try Again"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full h-10 text-sm font-semibold"
              style={{ color: T.muted }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!status.required) {
    return null; // Will redirect via useEffect
  }

  return (
    <PageLayout>
      <div className="flex flex-col min-h-[100dvh]" style={{ background: T.bg }}>
        {/* Sticky header */}
        <div className="sticky top-0 z-30" style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
          <div className="max-w-md mx-auto px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: T.surface2, border: `1px solid ${T.border}` }}>
                <ShieldCheck className="w-4 h-4" style={{ color: "var(--t-blue-deep)" }} />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-tight" style={{ color: T.text }}>
                  Verify Account
                </h1>
                <p className="text-xs" style={{ color: T.muted }}>
                  Unlock your access
                </p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              disabled={logout.isPending}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              style={{ color: T.muted, background: T.surface2 }}
            >
              {logout.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
              Sign Out
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 pt-8 pb-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
            
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold mb-2" style={{ color: T.text }}>Just one more step</h2>
              <p className="text-sm" style={{ color: T.muted }}>
                To keep our community secure, please verify your account before accessing the portal.
              </p>
            </div>

            {/* Method picker */}
            <div className="flex gap-1 rounded-xl p-1 mb-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              {status.availableMethods.includes("telegram") && (
                <button
                  onClick={() => { setActiveMethod("telegram"); setEmailError(""); }}
                  className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-semibold transition-all"
                  style={activeMethod === "telegram"
                    ? { background: "var(--t-blue-deep)", color: "white" }
                    : { color: T.muted }}
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  Telegram
                </button>
              )}
              {status.availableMethods.includes("email") && (
                <button
                  onClick={() => { setActiveMethod("email"); setEmailError(""); }}
                  className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-semibold transition-all"
                  style={activeMethod === "email"
                    ? { background: "var(--t-blue-deep)", color: "white" }
                    : { color: T.muted }}
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  Email
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {activeMethod === "telegram" && (
                <motion.div key="telegram" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                  <div className="rounded-2xl p-5 text-center" style={{ background: T.surface, border: `1.5px solid ${T.border}` }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(45,107,204,0.1)" }}>
                      <MessageCircle className="w-6 h-6" style={{ color: "var(--t-blue)" }} />
                    </div>
                    
                    {upgradeSession.isPending ? (
                      <div className="space-y-3">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "var(--t-blue)" }} />
                        <p className="text-sm font-semibold" style={{ color: T.text }}>Verifying...</p>
                      </div>
                    ) : tgLinked ? (
                      <div className="space-y-3">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-green-500" />
                        <p className="text-sm font-semibold text-green-600">Telegram linked successfully!</p>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-sm font-bold mb-2" style={{ color: T.text }}>Connect your Telegram</h3>
                        <p className="text-xs mb-6" style={{ color: T.muted }}>
                          Click below to open Telegram and start a chat with our bot to instantly verify your account.
                        </p>
                        
                        {tgLinkData?.deepLink ? (
                          <a href={tgLinkData.deepLink} target="_blank" rel="noreferrer"
                            className="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-opacity"
                            style={{ background: "#229ED9", color: "#fff" }}>
                            Open Telegram
                            <ArrowRight className="w-4 h-4" />
                          </a>
                        ) : tgLinkError ? (
                          <div className="space-y-3">
                            <ErrorBanner message={tgLinkError} />
                            <button
                              type="button"
                              onClick={() => {
                                tgLinkInit.reset();
                                setTgLinkError("");
                              }}
                              className="w-full h-11 rounded-xl text-sm font-bold"
                              style={{ color: "var(--t-blue-deep)", border: `1px solid ${T.border}` }}
                            >
                              Try Telegram Again
                            </button>
                          </div>
                        ) : (
                          <button disabled className="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 opacity-50" style={{ background: "#229ED9", color: "#fff" }}>
                            <Loader2 className="w-4 h-4 animate-spin" /> Preparing link...
                          </button>
                        )}
                        
                        <div className="mt-6 flex flex-col items-center gap-2">
                          <p className="text-xs font-semibold" style={{ color: T.subtle }}>Waiting for connection...</p>
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {upgradeSession.isError && (
                    <ErrorBanner message={upgradeSession.error?.message || "Verification failed. Please try again."} />
                  )}
                </motion.div>
              )}

              {activeMethod === "email" && (
                <motion.div key="email" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                  <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1.5px solid ${T.border}` }}>
                    <h3 className="text-sm font-bold mb-1" style={{ color: T.text }}>Check your inbox</h3>
                    <p className="text-xs mb-5" style={{ color: T.muted }}>
                      We sent a 6-digit code to <span className="font-semibold" style={{ color: T.text }}>{status.emailMasked || "your email"}</span>.
                    </p>
                    
                    <form onSubmit={handleConfirmEmail} className="space-y-4">
                      <div>
                        <input
                          type="text"
                          aria-label="Six-digit email verification code"
                          autoComplete="one-time-code"
                          inputMode="numeric"
                          pattern="[0-9]{6}"
                          maxLength={6}
                          value={code}
                          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="000000"
                          className="w-full h-14 text-center text-2xl font-bold tracking-[0.25em] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                          style={{ background: T.bg, border: `1.5px solid ${T.border}`, color: T.text }}
                          disabled={confirmEmail.isPending}
                        />
                      </div>
                      
                      {emailError && <ErrorBanner message={emailError} />}
                      
                      <button type="submit"
                        disabled={code.length !== 6 || confirmEmail.isPending}
                        className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                        style={{ background: "var(--t-blue-deep)" }}>
                        {confirmEmail.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Verify Email</>}
                      </button>
                    </form>
                    
                    <div className="mt-5 pt-4 border-t flex flex-col items-center" style={{ borderColor: T.border }}>
                      <p className="text-xs mb-2" style={{ color: T.subtle }}>Didn't receive the code?</p>
                      <button
                        type="button"
                        onClick={handleResendEmail}
                        disabled={resendCooldown > 0 || resendEmail.isPending}
                        className="text-xs font-semibold transition-colors disabled:opacity-50"
                        style={{ color: "var(--t-blue)" }}
                      >
                        {resendEmail.isPending ? "Sending..." : resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : "Resend Code"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </PageLayout>
  );
}
