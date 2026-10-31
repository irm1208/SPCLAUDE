import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { adminAuth } from "@/lib/admin-auth";

type Status = "pending" | "active" | "disabled";
interface VendorAccount { username: string; status: Status; vendorId: string | null; companyName: string; contactName: string; email: string | null; createdAt: string }
interface AccountData { accounts: VendorAccount[]; vendors: { id: string; name: string }[] }
type Message = { ok: boolean; text: string } | null;
const card = { background: "var(--t-surface)", border: "1px solid var(--t-border)" };
const field = "w-full rounded-xl px-3 py-2 text-sm";
const button = "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed";
const primary = { background: "#1B3A7A", color: "#fff" };
const passwordValid = (password: string) => password.length >= 12 && password.length <= 128 && new TextEncoder().encode(password).length <= 72;
async function failure(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : fallback;
}
export default function VendorAccountsAdmin() {
  const [data, setData] = useState<AccountData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [links, setLinks] = useState<Record<string, string>>({});
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    try {
      const response = await adminAuth.request("/api/admin/vendor-accounts");
      if (!response.ok) throw new Error(await failure(response, "Could not load vendor accounts."));
      setData(await response.json()); setLoadError(""); return true;
    } catch (error) { setLoadError(error instanceof Error ? error.message : "Could not load vendor accounts."); return false; }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function create() {
    if (!/^[a-z0-9][a-z0-9_.-]{2,49}$/i.test(username.trim())) return setMessage({ ok: false, text: "Use a username of 3–50 letters, numbers, dots, underscores or hyphens, starting with a letter or number." });
    if (!passwordValid(password)) return setMessage({ ok: false, text: "Use 12–72 characters; shorten passwords containing special Unicode characters." });
    if (!vendorId) return setMessage({ ok: false, text: "Select a vendor profile first." });
    setBusy("create"); setMessage(null);
    try {
      const response = await adminAuth.request("/api/admin/vendor-accounts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: username.trim(), password, vendorId, companyName: companyName.trim(), contactName: contactName.trim(), ...(email.trim() ? { email: email.trim() } : {}) }) });
      if (!response.ok) throw new Error(await failure(response, "Could not create vendor account."));
      setUsername(""); setPassword(""); setVendorId(""); setCompanyName(""); setContactName(""); setEmail("");
      setMessage({ ok: true, text: "Vendor account created and activated." }); await load();
    } catch (error) { setMessage({ ok: false, text: error instanceof Error ? error.message : "Could not create vendor account." }); }
    finally { setBusy(null); }
  }
  async function update(account: VendorAccount, status: Status, reset = false) {
    const selected = links[account.username] ?? account.vendorId ?? "";
    const nextPassword = passwords[account.username] ?? "";
    if (status === "active" && !selected) return setMessage({ ok: false, text: "Select a vendor profile before activating this account." });
    if (reset && !passwordValid(nextPassword)) return setMessage({ ok: false, text: "Use 12–72 characters; shorten passwords containing special Unicode characters." });
    setBusy(account.username); setMessage(null);
    try {
      const response = await adminAuth.request(`/api/admin/vendor-accounts/${encodeURIComponent(account.username)}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ vendorId: selected || null, status, ...(reset ? { password: nextPassword } : {}) }) });
      if (!response.ok) throw new Error(await failure(response, "Could not update vendor account."));
      if (reset) setPasswords(previous => ({ ...previous, [account.username]: "" }));
      setMessage({ ok: true, text: reset ? `Password reset for ${account.username}. Existing sessions have been revoked.` : `Account updated for ${account.username}. Existing sessions have been revoked.` });
      await load();
    } catch (error) { setMessage({ ok: false, text: error instanceof Error ? error.message : "Could not update vendor account." }); }
    finally { setBusy(null); }
  }
  return <section className="rounded-2xl p-4 space-y-4" style={card} data-testid="vendor-accounts-admin">
    <div className="flex items-center justify-between gap-2"><h3 className="font-bold flex items-center gap-2" style={{ color: "var(--t-text)" }}><ShieldCheck className="w-4 h-4" style={{ color: "#2D6BCC" }} />Vendor accounts</h3><button type="button" aria-label="Refresh vendor accounts" disabled={!!busy} onClick={() => void load()} className="p-2 rounded-xl"><RefreshCw className="w-4 h-4" /></button></div>
    <p className="text-sm" style={{ color: "var(--t-muted)" }}>Dedicated supplier logins are separate from member accounts. An active account can access orders for its linked vendor profile. Create missing profiles in Wholesale setup.</p>
    {loadError && <div role="alert" className="text-sm text-red-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{loadError}<button type="button" onClick={() => void load()} className="underline">Retry</button></div>}
    {message && <p role={message.ok ? "status" : "alert"} className="rounded-xl p-3 text-sm flex items-center gap-2" style={{ color: message.ok ? "#15803D" : "#B91C1C", background: message.ok ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.08)" }}>{message.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}{message.text}</p>}
    {!data ? !loadError && <p role="status" className="text-sm flex gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading vendor accounts…</p> : <>
      <form data-testid="form-create-vendor" className="space-y-3 rounded-xl p-3" style={{ border: "1px solid var(--t-border)" }} onSubmit={event => { event.preventDefault(); void create(); }}>
        <h4 className="text-sm font-bold">Create vendor account</h4>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs space-y-1"><span>Username</span><input required minLength={3} maxLength={50} pattern="[a-zA-Z0-9][a-zA-Z0-9_.\-]{2,49}" autoComplete="off" value={username} onChange={event => setUsername(event.target.value)} className={field} style={card} data-testid="input-vendor-username" /></label>
          <label className="text-xs space-y-1"><span>Password (12–72 characters)</span><input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className={field} style={card} data-testid="input-vendor-password" /></label>
          <label className="text-xs space-y-1"><span>Vendor profile</span><select required value={vendorId} onChange={event => setVendorId(event.target.value)} className={field} style={card} data-testid="select-new-vendor"><option value="">Select vendor profile</option>{data.vendors.map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
          <label className="text-xs space-y-1"><span>Company name (optional)</span><input value={companyName} onChange={event => setCompanyName(event.target.value)} className={field} style={card} /></label>
          <label className="text-xs space-y-1"><span>Contact name (optional)</span><input value={contactName} onChange={event => setContactName(event.target.value)} className={field} style={card} /></label>
          <label className="text-xs space-y-1"><span>Email (optional)</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} className={field} style={card} /></label>
        </div>
        <button disabled={!!busy || !data.vendors.length} className={button} style={primary}>{busy === "create" && <Loader2 className="w-4 h-4 animate-spin" />}Create active account</button>
      </form>
      <div className="space-y-3"><h4 className="text-sm font-bold">Accounts & approvals · {data.accounts.filter(account => account.status === "pending").length} pending</h4>
        {!data.accounts.length && <p className="text-sm" style={{ color: "var(--t-muted)" }}>No vendor accounts yet.</p>}
        {data.accounts.map(account => {
          const selected = links[account.username] ?? account.vendorId ?? "";
          return <article key={account.username} className="rounded-xl p-3 space-y-3" style={{ border: "1px solid var(--t-border)" }} data-testid={`row-vendor-account-${account.username}`}>
            <div className="flex flex-wrap gap-2 items-center"><strong className="text-sm">{account.companyName || account.username}</strong><span className="text-sm" style={{ color: "var(--t-muted)" }}>@{account.username}</span><span className="rounded-full px-2 py-1 text-xs font-semibold capitalize" style={{ background: "var(--t-surface2)", color: account.status === "active" ? "#15803D" : account.status === "pending" ? "#B45309" : "#B91C1C" }}>{account.status}</span><span className="text-xs sm:ml-auto" style={{ color: "var(--t-muted)" }}>Created {new Date(account.createdAt).toLocaleDateString()}</span></div>
            {(account.contactName || account.email) && <p className="text-sm break-words" style={{ color: "var(--t-muted)" }}>{account.contactName}{account.contactName && account.email ? " · " : ""}{account.email}</p>}
            <div className="flex flex-wrap gap-2 items-end"><label className="text-xs space-y-1 flex-1 min-w-48"><span>Linked vendor profile</span><select value={selected} disabled={!!busy} onChange={event => setLinks(previous => ({ ...previous, [account.username]: event.target.value }))} className={field} style={card} data-testid={`select-vendor-${account.username}`}><option value="">No linked vendor</option>{data.vendors.map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
              <button type="button" disabled={!!busy || !selected} onClick={() => void update(account, "active")} className={button} style={primary} data-testid={`button-activate-${account.username}`}>{busy === account.username && <Loader2 className="w-4 h-4 animate-spin" />}{account.status === "pending" ? "Approve & activate" : account.status === "disabled" ? "Reactivate" : "Save vendor link"}</button>
              {account.status !== "disabled" && <button type="button" disabled={!!busy} onClick={() => void update(account, "disabled")} className={button} style={{ color: "#B91C1C", border: "1px solid var(--t-border)" }} data-testid={`button-suspend-${account.username}`}>{account.status === "pending" ? "Decline" : "Suspend"}</button>}
            </div>
            <div className="flex flex-wrap gap-2 items-end"><label className="text-xs space-y-1 flex-1 min-w-48"><span>New password (12–72 characters)</span><input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={passwords[account.username] ?? ""} onChange={event => setPasswords(previous => ({ ...previous, [account.username]: event.target.value }))} className={field} style={card} data-testid={`input-reset-${account.username}`} /></label><button type="button" disabled={!!busy || !passwordValid(passwords[account.username] ?? "")} onClick={() => void update(account, account.status, true)} className={button} style={card} data-testid={`button-reset-${account.username}`}>Reset password</button></div>
          </article>;
        })}
      </div>
    </>}
  </section>;
}
