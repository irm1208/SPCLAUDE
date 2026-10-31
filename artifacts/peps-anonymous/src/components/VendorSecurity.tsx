import { vendorTranslate as vt, useVendorLanguage, getVendorLanguage } from "@/lib/vendor-language";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { Check, Copy, Fingerprint, KeyRound, Loader2, Pencil, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { vendorFetch } from "@/lib/vendor-auth-client";
import { createPasskey, passkeyErrorMessage, passkeysSupported } from "@/lib/vendor-webauthn";
import { Badge, Banner, Btn, Card, Field, field, fieldCls, muted, subtle } from "@/components/vendor-ui";

/* Security card for the vendor Settings page: authenticator app (TOTP) and passkeys. */
interface Overview {
  available: boolean;
  totp: { enabled: boolean; pending: boolean; recoveryCodesRemaining: number; enabledAt: string | null };
  passkeys: Array<{ id: string; name: string; transports: string[]; createdAt: string; lastUsedAt: string | null }>;
}
async function errorOf(r: Response, fallback: string) {
  const b = await r.json().catch(() => null);
  return (b && typeof b.error === "string" ? b.error : fallback) + ` (${r.status})`;
}
const when = (v: string | null) => { if (!v) return vt("never"); const d = new Date(v); return isNaN(d.getTime()) ? "" : d.toLocaleDateString(getVendorLanguage() === "zh" ? "zh-CN" : "en-GB", { dateStyle: "medium" }); };
const json = (body: unknown): RequestInit => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export function SecurityCard() {
  useVendorLanguage();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [enrol, setEnrol] = useState<{ manualKey: string; otpauthUri: string } | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [passwordFor, setPasswordFor] = useState<{ action: "disable" | "codes" | "remove"; id?: string } | null>(null);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await vendorFetch("/api/vendor/security");
      if (!r.ok) throw new Error(await errorOf(r, vt("Could not load security settings")));
      setData(await r.json()); setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : vt("Could not load security settings")); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setError(null); setNotice(null);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : vt("Something went wrong")); }
    finally { setBusy(null); }
  };
  const beginTotp = () => run("begin", async () => {
    const r = await vendorFetch("/api/vendor/security/totp/begin", { method: "POST" });
    if (!r.ok) throw new Error(await errorOf(r, vt("Could not start setup")));
    setEnrol(await r.json()); setCode("");
  });
  const confirmTotp = (e: FormEvent) => { e.preventDefault(); return run("confirm", async () => {
    const r = await vendorFetch("/api/vendor/security/totp/confirm", json({ code }));
    if (!r.ok) throw new Error(await errorOf(r, vt("Code not accepted")));
    const b = await r.json(); setRecoveryCodes(b.recoveryCodes); setEnrol(null); setCode(""); await refresh();
  }); };
  const withPassword = (e: FormEvent) => { e.preventDefault(); if (!passwordFor) return; const action = passwordFor; return run("password", async () => {
    if (action.action === "disable") {
      const r = await vendorFetch("/api/vendor/security/totp/disable", json({ password }));
      if (!r.ok) throw new Error(await errorOf(r, vt("Could not disable")));
      setNotice(vt("Authenticator app disabled."));
    } else if (action.action === "codes") {
      const r = await vendorFetch("/api/vendor/security/totp/recovery-codes", json({ password }));
      if (!r.ok) throw new Error(await errorOf(r, vt("Could not create recovery codes")));
      setRecoveryCodes((await r.json()).recoveryCodes);
    } else if (action.id) {
      const r = await vendorFetch(`/api/vendor/security/passkeys/${encodeURIComponent(action.id)}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
      if (!r.ok) throw new Error(await errorOf(r, vt("Could not remove the passkey")));
      setNotice(vt("Passkey removed."));
    }
    setPasswordFor(null); setPassword(""); await refresh();
  }); };
  const addPasskey = () => run("passkey", async () => {
    const r = await vendorFetch("/api/vendor/security/passkeys/options", { method: "POST" });
    if (!r.ok) throw new Error(await errorOf(r, vt("Could not start passkey setup")));
    let credential;
    try { credential = await createPasskey((await r.json()).options); }
    catch (e) { throw new Error(passkeyErrorMessage(e, vt("Could not create a passkey."))); }
    const name = window.prompt(vt("Name this passkey so you recognise it later (e.g. Work laptop, Pat's phone):"), "") ?? "";
    const v = await vendorFetch("/api/vendor/security/passkeys/verify", json({ credential, name }));
    if (!v.ok) throw new Error(await errorOf(v, vt("Could not save the passkey")));
    setNotice(vt("Passkey added. You can use it to sign in without a password.")); await refresh();
  });
  const rename = (e: FormEvent) => { e.preventDefault(); if (!renaming) return; const r0 = renaming; return run("rename", async () => {
    const r = await vendorFetch(`/api/vendor/security/passkeys/${encodeURIComponent(r0.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: r0.name }) });
    if (!r.ok) throw new Error(await errorOf(r, vt("Could not rename")));
    setRenaming(null); await refresh();
  }); };
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* manual */ } };

  const totpOn = !!data?.totp.enabled;
  const status = !data ? null : totpOn || data.passkeys.length ? <Badge tone="success" progress="complete">{vt("Protected")}</Badge> : <Badge tone="attention" progress="incomplete">{vt("Password only")}</Badge>;

  return (
    <Card title={<><ShieldCheck className="w-4 h-4" style={subtle} />{vt("Security")}</>} actions={status} testId="card-security">
      {error && <div className="mb-3"><Banner tone="critical" role="alert" onDismiss={() => setError(null)}>{vt(error)}</Banner></div>}
      {notice && <div className="mb-3"><Banner tone="success" onDismiss={() => setNotice(null)}>{vt(notice)}</Banner></div>}
      {data && !data.available && <div className="mb-3"><Banner tone="info">{vt("Two-step verification is not switched on for this site yet. Ask Peps Anonymous.")}</Banner></div>}

      {recoveryCodes && (
        <div className="rounded-lg p-4 mb-4" style={{ background: "#FFEB78", color: "#4F4700" }} data-testid="panel-recovery-codes">
          <p className="text-[13px] font-semibold">{vt("Save these recovery codes now")}</p>
          <p className="text-xs mt-0.5">{vt("Each works once if you lose your phone. They are shown only this once.")}</p>
          <pre className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3 text-sm font-mono">{recoveryCodes.map(c => <span key={c}>{c}</span>)}</pre>
          <div className="flex gap-2 mt-3">
            <Btn onClick={() => copy(recoveryCodes.join("\n"))}>{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copied ? vt("Copied") : vt("Copy codes")}</Btn>
            <Btn variant="primary" onClick={() => setRecoveryCodes(null)} data-testid="button-codes-saved">{vt("I have saved them")}</Btn>
          </div>
        </div>)}

      {/* Authenticator app */}
      <section className="pb-4 mb-4" style={{ borderBottom: "1px solid var(--t-border)" }} data-testid="section-totp">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: "var(--t-surface2)" }}><Smartphone className="w-4 h-4" style={{ color: "var(--t-text)" }} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><p className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{vt("Authenticator app")}</p>{totpOn && <Badge tone="success">{vt("On")}</Badge>}</div>
            <p className="text-[13px]" style={muted}>{totpOn ? (getVendorLanguage() === "zh" ? `输入密码后还需输入应用中的验证码。剩余 ${data!.totp.recoveryCodesRemaining} 个恢复码。` : `Codes from your app are required after your password. ${data!.totp.recoveryCodesRemaining} recovery code${data!.totp.recoveryCodesRemaining === 1 ? "" : "s"} left.`) : vt("Use Google Authenticator, 1Password, Authy or any TOTP app to add a six-digit code at sign-in.")}</p>
          </div>
          {data?.available && !totpOn && !enrol && <Btn variant="primary" onClick={beginTotp} disabled={busy === "begin"} data-testid="button-totp-begin">{busy === "begin" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{vt("Set up")}</Btn>}
        </div>
        {enrol && (
          <form onSubmit={confirmTotp} className="mt-4 grid sm:grid-cols-[auto_minmax(0,1fr)] gap-4 items-start" data-testid="form-totp-confirm">
            <div className="rounded-lg p-3 bg-white" style={{ border: "1px solid var(--t-border)" }}><QRCode value={enrol.otpauthUri} size={148} /></div>
            <div className="space-y-3">
              <p className="text-[13px]" style={muted}>{vt("Scan the code with your authenticator app, or type the key manually:")}</p>
              <div className="flex items-center gap-2"><code className="text-[13px] font-mono tracking-wider px-2 py-1 rounded-md" style={{ background: "var(--t-surface2)", color: "var(--t-text)" }} data-testid="text-manual-key">{enrol.manualKey}</code><Btn variant="plain" onClick={() => copy(enrol.manualKey.replace(/\s/g, ""))} aria-label={vt("Copy key")}>{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</Btn></div>
              <Field label={vt("Enter the six-digit code from the app")}><input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} className={`${fieldCls} font-mono tracking-[0.3em] max-w-[180px]`} style={field} data-testid="input-totp-code" /></Field>
              <div className="flex gap-2"><Btn type="submit" variant="primary" disabled={busy === "confirm" || code.length !== 6} data-testid="button-totp-confirm">{busy === "confirm" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}{vt("Turn on")}</Btn><Btn onClick={() => setEnrol(null)}>{vt("Cancel")}</Btn></div>
            </div>
          </form>)}
        {totpOn && !passwordFor && (
          <div className="flex flex-wrap gap-2 mt-3 pl-12">
            <Btn onClick={() => setPasswordFor({ action: "codes" })} data-testid="button-new-codes"><KeyRound className="w-4 h-4" />{vt("New recovery codes")}</Btn>
            <Btn onClick={() => setPasswordFor({ action: "disable" })} data-testid="button-totp-disable">{vt("Turn off")}</Btn>
          </div>)}
      </section>

      {/* Passkeys */}
      <section data-testid="section-passkeys">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: "var(--t-surface2)" }}><Fingerprint className="w-4 h-4" style={{ color: "var(--t-text)" }} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><p className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{vt("Passkeys")}</p>{!!data?.passkeys.length && <Badge tone="success">{data.passkeys.length}</Badge>}</div>
            <p className="text-[13px]" style={muted}>{vt("Sign in with Face ID, Touch ID, Windows Hello or a security key. No password or code to type, and nothing to phish.")}</p>
          </div>
          {data?.available && <Btn variant={data.passkeys.length ? "secondary" : "primary"} onClick={addPasskey} disabled={busy === "passkey" || !passkeysSupported()} title={passkeysSupported() ? undefined : vt("This browser does not support passkeys")} data-testid="button-add-passkey">{busy === "passkey" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}{vt("Add passkey")}</Btn>}
        </div>
        {!!data?.passkeys.length && (
          <ul className="mt-3 pl-12 divide-y" style={{ borderColor: "var(--t-border)" }}>{data.passkeys.map(p => (
            <li key={p.id} className="py-2 flex flex-wrap items-center gap-2 text-[13px]" data-testid={`row-passkey-${p.id}`}>
              {renaming?.id === p.id ? (
                <form onSubmit={rename} className="flex items-center gap-2 flex-1"><input value={renaming.name} onChange={e => setRenaming({ id: p.id, name: e.target.value })} maxLength={60} className={`${fieldCls} max-w-[240px]`} style={field} autoFocus /><Btn type="submit" variant="primary" disabled={busy === "rename"}>{vt("Save")}</Btn><Btn onClick={() => setRenaming(null)}>{vt("Cancel")}</Btn></form>
              ) : (<>
                <span className="font-medium" style={{ color: "var(--t-text)" }}>{p.name}</span>
                <span className="text-xs" style={subtle}>{vt("added")} {when(p.createdAt)} {vt("· last used")} {vt(when(p.lastUsedAt))}{p.transports.includes("internal") ? vt(" · this device type") : ""}</span>
                <span className="ml-auto flex items-center gap-1">
                  <Btn variant="plain" onClick={() => setRenaming({ id: p.id, name: p.name })} aria-label={(getVendorLanguage() === "zh" ? `重命名 ${p.name}` : `Rename ${p.name}`)}><Pencil className="w-4 h-4" /></Btn>
                  <Btn variant="plain" onClick={() => setPasswordFor({ action: "remove", id: p.id })} aria-label={(getVendorLanguage() === "zh" ? `移除 ${p.name}` : `Remove ${p.name}`)} data-testid={`button-remove-passkey-${p.id}`}><Trash2 className="w-4 h-4" /></Btn>
                </span>
              </>)}
            </li>))}</ul>)}
      </section>

      {passwordFor && (
        <form onSubmit={withPassword} className="mt-4 rounded-lg p-3 space-y-3" style={{ background: "var(--t-surface2)" }} data-testid="form-confirm-password">
          <p className="text-[13px] font-medium" style={{ color: "var(--t-text)" }}>{passwordFor.action === "disable" ? vt("Turn off the authenticator app?") : passwordFor.action === "codes" ? vt("Create new recovery codes? The old ones stop working.") : vt("Remove this passkey?")} {vt("Confirm with your password.")}</p>
          <div className="flex flex-wrap items-end gap-2">
            <Field label={vt("Current password")} className="flex-1 min-w-[200px]"><input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className={fieldCls} style={field} data-testid="input-confirm-password" /></Field>
            <Btn type="submit" variant={passwordFor.action === "codes" ? "primary" : "critical"} disabled={busy === "password" || !password} data-testid="button-confirm-password">{busy === "password" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{passwordFor.action === "disable" ? vt("Turn off") : passwordFor.action === "codes" ? vt("Create codes") : vt("Remove")}</Btn>
            <Btn onClick={() => { setPasswordFor(null); setPassword(""); }}>{vt("Cancel")}</Btn>
          </div>
        </form>)}
    </Card>
  );
}
