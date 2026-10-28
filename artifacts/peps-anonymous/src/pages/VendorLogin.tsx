import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, Loader2, Lock, LogIn, RefreshCw, ShieldAlert, Truck } from "lucide-react";
import { useLogin } from "@/hooks/use-account";
import { useQueryClient } from "@tanstack/react-query";

type Phase = "checking" | "form" | "forbidden" | "error";

const card = { background: "var(--t-surface)", border: "1px solid var(--t-border)" };
const btnPrimary = "inline-flex w-full items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90";
const input = "mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2D6BCC]/40";

async function checkVendor(): Promise<"ok" | "401" | "403" | "error"> {
  try {
    const r = await fetch("/api/vendor/me", { credentials: "include" });
    if (r.status === 200) return "ok";
    if (r.status === 401) return "401";
    if (r.status === 403) return "403";
    return "error";
  } catch { return "error"; }
}

export default function VendorLogin() {
  const [, navigate] = useLocation();
  const login = useLogin();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("checking");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [afterLogin, setAfterLogin] = useState(false);
  const [busy, setBusy] = useState(false);

  const runCheck = useCallback(async () => {
    setPhase("checking");
    const s = await checkVendor();
    if (s === "ok") return navigate("/vendor");
    setPhase(s === "401" ? "form" : s === "403" ? "forbidden" : "error");
  }, [navigate]);

  useEffect(() => { void runCheck(); }, [runCheck]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    if (!username.trim() || !password) { setFormError("Enter your username and password."); return; }
    setBusy(true);
    try {
      await login.mutateAsync({ telegramUsername: username.trim().replace(/^@/, ""), password, rememberMe: remember });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign in failed. Try again.");
      setBusy(false); return;
    }
    const s = await checkVendor();
    setBusy(false);
    if (s === "ok") { navigate("/vendor"); return; }
    setPassword("");
    if (s === "403") { setAfterLogin(true); setPhase("forbidden"); return; }
    if (s === "401") { setFormError("Your session could not be confirmed. Try signing in again."); return; }
    setPhase("error");
  };

  const switchAccount = async () => {
    setBusy(true);
    setSwitchError(null);
    try {
      const response = await fetch("/api/account/logout", { method: "POST", credentials: "include" });
      if (!response.ok) throw new Error("Could not sign out. Try again.");
      queryClient.clear();
      setAfterLogin(false); setUsername(""); setPassword(""); setFormError(null); setPhase("form");
    } catch (error) {
      setSwitchError(error instanceof Error ? error.message : "Could not sign out. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "var(--t-bg)" }}>
      <header className="text-white" style={{ background: "linear-gradient(135deg, #2D6BCC 0%, #1B3A7A 100%)" }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Truck className="w-5 h-5" style={{ color: "#E9A020" }} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#E9A020" }}>Peps Anonymous · Vendor</p>
            <p className="font-bold">Wholesale portal</p>
          </div>
        </div>
      </header>
      <main className="flex-1 px-4 py-8 md:py-14">
        <div className="max-w-md mx-auto rounded-3xl p-6 sm:p-8 shadow-sm" style={card}>
          {phase === "checking" && (
            <div className="space-y-3" aria-busy="true" data-testid="state-checking">
              <div className="h-6 w-1/2 rounded-lg animate-pulse" style={{ background: "var(--t-surface2)" }} />
              <div className="h-11 rounded-xl animate-pulse" style={{ background: "var(--t-surface2)" }} />
              <div className="h-11 rounded-xl animate-pulse" style={{ background: "var(--t-surface2)" }} />
              <div className="h-11 rounded-xl animate-pulse" style={{ background: "var(--t-surface2)" }} />
            </div>
          )}

          {phase === "form" && (
            <form onSubmit={submit} noValidate className="space-y-4" data-testid="form-vendor-login">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Fulfilment partners</p>
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--t-text)" }}>Vendor sign in</h1>
                <p className="text-sm mt-1" style={{ color: "var(--t-muted)" }}>Use the account Peps Anonymous linked to your vendor profile.</p>
              </div>
              {formError && <div role="alert" className="rounded-xl p-3 text-sm flex gap-2" style={{ background: "rgba(239,68,68,0.08)", color: "#B91C1C" }} data-testid="text-login-error"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{formError}</div>}
              <label className="block text-xs font-semibold" style={{ color: "var(--t-muted)" }}>Username
                <input name="telegramUsername" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} disabled={busy} className={input} style={{ ...card, color: "var(--t-text)" }} data-testid="input-username" />
              </label>
              <label className="block text-xs font-semibold" style={{ color: "var(--t-muted)" }}>Password
                <input name="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} disabled={busy} className={input} style={{ ...card, color: "var(--t-text)" }} data-testid="input-password" />
              </label>
              <label className="flex items-center gap-2 text-sm" style={{ color: "var(--t-muted)" }}>
                <input type="checkbox" name="rememberMe" checked={remember} onChange={e => setRemember(e.target.checked)} disabled={busy} className="w-4 h-4 accent-[#2D6BCC]" data-testid="checkbox-remember" />
                Keep me signed in on this device
              </label>
              <button type="submit" disabled={busy} aria-label="Sign in to vendor portal" className={btnPrimary} style={{ background: "#1B3A7A" }} data-testid="button-submit">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}{busy ? "Signing in" : "Sign in"}
              </button>
              <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--t-subtle)" }}><Lock className="w-3 h-3" />Access is granted by Peps Anonymous only.</p>
            </form>
          )}

          {phase === "forbidden" && (
            <div className="text-center" role="alert" data-testid="state-forbidden">
              <ShieldAlert className="w-9 h-9 mx-auto mb-3" style={{ color: "#E9A020" }} />
              <h1 className="text-xl font-bold mb-2" style={{ color: "var(--t-text)" }}>No vendor access</h1>
              <p className="text-sm mb-5" style={{ color: "var(--t-muted)" }}>
                {afterLogin ? "You signed in, but this account does not have vendor access." : "The account you are signed in with does not have vendor access."} Switch to the account linked to your vendor profile, or contact Peps Anonymous.
              </p>
              {switchError && <p role="alert" className="text-sm mb-4" style={{ color: "#ef4444" }}>{switchError}</p>}
              <button type="button" onClick={switchAccount} disabled={busy} aria-label="Switch account" className={btnPrimary} style={{ background: "#1B3A7A" }} data-testid="button-switch-account">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}Switch account
              </button>
            </div>
          )}

          {phase === "error" && (
            <div className="text-center" role="alert" data-testid="state-error">
              <AlertTriangle className="w-9 h-9 mx-auto mb-3" style={{ color: "#ef4444" }} />
              <h1 className="text-xl font-bold mb-2" style={{ color: "var(--t-text)" }}>Portal unavailable</h1>
              <p className="text-sm mb-5" style={{ color: "var(--t-muted)" }}>We could not reach the server to confirm vendor access.</p>
              <button type="button" onClick={() => void runCheck()} aria-label="Retry" className={btnPrimary} style={{ background: "#1B3A7A" }} data-testid="button-retry">
                <RefreshCw className="w-4 h-4" />Retry
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
