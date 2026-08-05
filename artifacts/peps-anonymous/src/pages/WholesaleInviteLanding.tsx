import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { motion } from "framer-motion";
import { Loader2, Users, Package, AlertCircle, CheckCircle2, LogIn, UserPlus } from "lucide-react";
import { COUNTRIES } from "@/data/countries";
import { useAccount } from "@/hooks/use-account";

interface InviteInfo {
  code: string;
  shareId: string;
  organiserUsername: string | null;
  memberCount: number;
  maxMembers: number | null;
  shareStatus: string | null;
  validity: "valid" | "inactive" | "expired" | "max_uses_reached" | "share_not_open";
  maxUses: number | null;
  usageCount: number;
  expiresAt: string | null;
}

const VALIDITY_MESSAGES: Record<string, string> = {
  inactive: "This invite link has been deactivated.",
  expired: "This invite link has expired.",
  max_uses_reached: "This invite link has reached its usage limit.",
  share_not_open: "This shared order is no longer accepting new members.",
  share_not_found: "This shared order no longer exists.",
  not_found: "Invite link not found.",
};

export default function WholesaleInviteLanding() {
  const [, params] = useRoute("/join-wholesale/:code");
  const [, setLocation] = useLocation();
  const code = params?.code?.toUpperCase() ?? "";

  const { account, isLoading: accountLoading } = useAccount();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const [infoError, setInfoError] = useState("");

  // Registration form state (for new users)
  const [showRegForm, setShowRegForm] = useState(false);
  const [form, setForm] = useState({ telegramUsername: "", password: "", email: "", country: "United Kingdom" });
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [targetShareId, setTargetShareId] = useState<string | null>(null);

  // Fetch invite info on load (public, no auth needed)
  useEffect(() => {
    if (!code) { setInfoLoading(false); setInfoError("No invite code provided."); return; }
    setInfoLoading(true);
    fetch(`/api/wholesale-invite/${code}`)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Unknown error");
        return d as InviteInfo;
      })
      .then(d => { setInfo(d); setInfoLoading(false); })
      .catch(e => { setInfoError(e.message || "Failed to load invite details."); setInfoLoading(false); });
  }, [code]);

  // Auto-redirect if already a wholesale member and joining succeeds
  useEffect(() => {
    if (done && targetShareId) {
      setTimeout(() => setLocation(`/wholesale/shared/${targetShareId}`), 1200);
    }
  }, [done, targetShareId, setLocation]);

  // Claim access (logged-in user redeems invite)
  const claimAccess = async () => {
    setBusy(true); setFormError("");
    try {
      const r = await fetch(`/api/wholesale-invite/${code}/redeem`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to redeem invite.");
      setTargetShareId(d.shareId);
      setDone(true);
    } catch (e) { setFormError((e as Error).message); }
    finally { setBusy(false); }
  };

  // Register + redeem (new user)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.telegramUsername.trim() || !form.password || !form.email.trim() || !form.country) {
      setFormError("All fields are required."); return;
    }
    setBusy(true); setFormError("");
    try {
      const r = await fetch(`/api/wholesale-invite/${code}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) {
        if (r.status === 409) {
          // Account exists — switch to login flow
          setFormError(d.error || "Account already exists. Please log in.");
        } else {
          throw new Error(d.error || "Registration failed.");
        }
        return;
      }
      setTargetShareId(d.shareId);
      setDone(true);
    } catch (e) { setFormError((e as Error).message); }
    finally { setBusy(false); }
  };

  const field: React.CSSProperties = {
    background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)",
  };

  if (infoLoading || accountLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--t-bg)" }}>
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: "var(--t-subtle)" }} />
      </div>
    );
  }

  if (infoError || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--t-bg)" }}>
        <div className="max-w-sm w-full text-center space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto" style={{ color: "#ef4444" }} />
          <p className="text-lg font-bold" style={{ color: "var(--t-text)" }}>Invite not found</p>
          <p className="text-sm" style={{ color: "var(--t-muted)" }}>{infoError || "This invite link is invalid."}</p>
        </div>
      </div>
    );
  }

  if (info.validity !== "valid") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--t-bg)" }}>
        <div className="max-w-sm w-full text-center space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto" style={{ color: "#f59e0b" }} />
          <p className="text-lg font-bold" style={{ color: "var(--t-text)" }}>Link unavailable</p>
          <p className="text-sm" style={{ color: "var(--t-muted)" }}>{VALIDITY_MESSAGES[info.validity] ?? "This invite link is no longer active."}</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--t-bg)" }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 mx-auto" style={{ color: "#22c55e" }} />
          <p className="text-xl font-bold" style={{ color: "var(--t-text)" }}>You're in!</p>
          <p className="text-sm" style={{ color: "var(--t-muted)" }}>Wholesale access granted. Taking you to the shared order…</p>
          <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "var(--t-subtle)" }} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--t-bg)" }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-4">

        {/* Share info card */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 shrink-0" style={{ color: "var(--t-blue)" }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Shared Order Invite</span>
            </div>
            <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>
              {info.organiserUsername
                ? <>You've been invited by <span style={{ color: "var(--t-blue)" }}>@{info.organiserUsername.replace(/^@/, "")}</span></>
                : "You've been invited to a shared order"}
            </h1>
            <p className="text-sm" style={{ color: "var(--t-muted)" }}>
              Pool a single parcel with other members — split the vendor shipping and pay only for your own items.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{ background: "var(--t-surface2)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}>
              <Users className="w-3 h-3" />
              {info.memberCount}{info.maxMembers != null ? `/${info.maxMembers}` : ""} member{info.memberCount !== 1 ? "s" : ""}
            </span>
            {info.maxUses != null && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{ background: "var(--t-surface2)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}>
                {info.usageCount}/{info.maxUses} uses
              </span>
            )}
          </div>

          {info.expiresAt && (
            <p className="text-xs" style={{ color: "var(--t-muted)" }}>
              Expires {new Date(info.expiresAt).toLocaleString()}
            </p>
          )}
        </div>

        {/* Action area */}
        {account ? (
          /* Logged-in user */
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>
                Logged in as <span style={{ color: "var(--t-blue)" }}>@{account.telegramUsername.replace(/^@/, "")}</span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>
                Clicking below will grant you wholesale access and add you to this shared order.
              </p>
            </div>
            {formError && <p className="text-xs" style={{ color: "#ef4444" }}>{formError}</p>}
            <button
              onClick={claimAccess}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: "var(--t-blue)" }}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Claim Access &amp; Join
            </button>
          </div>
        ) : showRegForm ? (
          /* Registration form */
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Create your account</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>Your account gets wholesale access automatically when you register with this invite.</p>
            </div>
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Telegram username</label>
                <input
                  type="text" value={form.telegramUsername} placeholder="e.g. johndoe"
                  onChange={e => setForm(f => ({ ...f, telegramUsername: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Email</label>
                <input
                  type="email" value={form.email} placeholder="you@example.com"
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Password</label>
                <input
                  type="password" value={form.password} placeholder="Min. 8 chars with number or symbol"
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Country</label>
                <select
                  value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} required
                >
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {formError && <p className="text-xs" style={{ color: "#ef4444" }}>{formError}</p>}
              <button
                type="submit" disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{ background: "var(--t-blue)" }}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Register &amp; Join
              </button>
              <button
                type="button" onClick={() => setShowRegForm(false)}
                className="w-full text-xs text-center py-1" style={{ color: "var(--t-muted)" }}
              >
                Already have an account? Log in instead
              </button>
            </form>
          </div>
        ) : (
          /* Not logged in, no form showing */
          <div className="rounded-2xl p-5 space-y-3" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
            <p className="text-sm" style={{ color: "var(--t-muted)" }}>
              You need an account to join this shared order. It only takes a minute.
            </p>
            <button
              onClick={() => setShowRegForm(true)}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold text-white"
              style={{ background: "var(--t-blue)" }}
            >
              <UserPlus className="w-4 h-4" />
              Create account &amp; Join
            </button>
            <button
              onClick={() => setLocation(`/login?next=/join-wholesale/${code}`)}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold"
              style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}
            >
              <LogIn className="w-4 h-4" />
              Log in with existing account
            </button>
          </div>
        )}

      </motion.div>
    </div>
  );
}
