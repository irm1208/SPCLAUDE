import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, Loader2, RefreshCw, Send, ShieldCheck, X } from "lucide-react";
import { CostBreakdown, ShippingBlock, StatusPill, type VendorOrder } from "@/pages/VendorPortal";

interface AdminData {
  vendors: { id: string; name: string }[];
  access: { username: string; vendorId: string }[];
  submissions: { id: string; reference: string; vendorId: string; status: string; stale: boolean; submittedAt: string }[];
}
type Msg = { ok: boolean; text: string } | null;

const card = { background: "var(--t-surface)", border: "1px solid var(--t-border)" };
const input = "w-full rounded-xl px-3 py-2 text-sm";
const btn = "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed";

export function parseOrderCodes(raw: string): string[] {
  return Array.from(new Set(raw.split(/[\s,]+/).map(s => s.trim()).filter(Boolean)));
}

async function err(r: Response, f: string) { const b = await r.json().catch(() => null); return `${b && typeof b.error === "string" ? b.error : f} (${r.status})`; }

function Note({ msg, id }: { msg: Msg; id: string }) {
  if (!msg) return null;
  return <div role={msg.ok ? "status" : "alert"} data-testid={id} className="rounded-xl p-2.5 text-sm flex gap-2 items-center" style={{ background: msg.ok ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.08)", color: msg.ok ? "#15803D" : "#B91C1C" }}>{msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}{msg.text}</div>;
}

export default function VendorPortalAdmin({ secret }: { secret: string }) {
  const headers = useCallback((json = false): HeadersInit => ({ "x-admin-secret": secret, ...(json ? { "content-type": "application/json" } : {}) }), [secret]);
  const [data, setData] = useState<AdminData | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/vendor-portal", { credentials: "include", headers: headers() });
      if (!r.ok) throw new Error(await err(r, "Could not load vendor portal"));
      setData(await r.json()); setLoadErr(null);
    } catch (e) { setLoadErr(e instanceof Error ? e.message : "Load failed"); }
  }, [headers]);
  useEffect(() => { load(); }, [load]);

  // access
  const [user, setUser] = useState(""); const [accVendor, setAccVendor] = useState("");
  const [accBusy, setAccBusy] = useState(false); const [accMsg, setAccMsg] = useState<Msg>(null);
  const putAccess = async (username: string, vendorId: string | null) => {
    if (!username.trim()) { setAccMsg({ ok: false, text: "Enter a username." }); return; }
    setAccBusy(true); setAccMsg(null);
    try {
      const r = await fetch("/api/admin/vendor-portal/access", { method: "PUT", credentials: "include", headers: headers(true), body: JSON.stringify({ username: username.trim(), vendorId }) });
      if (!r.ok) throw new Error(await err(r, "Access update failed"));
      setAccMsg({ ok: true, text: vendorId ? `Access saved for ${username.trim()}.` : `Access revoked for ${username.trim()}.` });
      if (vendorId) setUser("");
      await load();
    } catch (e) { setAccMsg({ ok: false, text: e instanceof Error ? e.message : "Failed" }); } finally { setAccBusy(false); }
  };

  // submit
  const [vendorId, setVendorId] = useState(""); const [codes, setCodes] = useState("");
  const [preview, setPreview] = useState<{ shipments: VendorOrder[]; previewToken: string; vendorId: string; orderCodes: string[] } | null>(null);
  const [subBusy, setSubBusy] = useState<"preview" | "submit" | null>(null); const [subMsg, setSubMsg] = useState<Msg>(null);
  const [confirmed, setConfirmed] = useState(false);

  const doPreview = async () => {
    const orderCodes = parseOrderCodes(codes);
    if (!vendorId) return setSubMsg({ ok: false, text: "Select a vendor." });
    if (!orderCodes.length) return setSubMsg({ ok: false, text: "Enter at least one order code." });
    setSubBusy("preview"); setSubMsg(null); setPreview(null); setConfirmed(false);
    try {
      const r = await fetch("/api/admin/vendor-portal/preview", { method: "POST", credentials: "include", headers: headers(true), body: JSON.stringify({ vendorId, orderCodes }) });
      if (!r.ok) throw new Error(await err(r, "Preview failed"));
      const b = await r.json(); setPreview({ ...b, vendorId, orderCodes });
    } catch (e) { setSubMsg({ ok: false, text: e instanceof Error ? e.message : "Preview failed" }); } finally { setSubBusy(null); }
  };
  const doSubmit = async () => {
    if (!preview || !confirmed) return;
    setSubBusy("submit"); setSubMsg(null);
    try {
      const r = await fetch("/api/admin/vendor-portal/submit", { method: "POST", credentials: "include", headers: headers(true), body: JSON.stringify({ vendorId: preview.vendorId, orderCodes: preview.orderCodes, previewToken: preview.previewToken }) });
      if (!r.ok) throw new Error(await err(r, "Submit failed"));
      setSubMsg({ ok: true, text: `Submitted ${preview.shipments.length} shipment(s) to vendor.` });
      setPreview(null); setCodes(""); setConfirmed(false); await load();
    } catch (e) { setSubMsg({ ok: false, text: e instanceof Error ? e.message : "Submit failed" }); } finally { setSubBusy(null); }
  };

  // submission detail
  const [detail, setDetail] = useState<VendorOrder | null>(null); const [detailErr, setDetailErr] = useState<string | null>(null);
  const [imgUrls, setImgUrls] = useState<Record<string, string>>({});
  const [recalling, setRecalling] = useState(false);
  const recall = async () => {
    if (!detail || !window.confirm("Recall this unstarted shipment? It will disappear from the vendor portal. Existing member orders will not be deleted.")) return;
    setRecalling(true); setDetailErr(null);
    try {
      const response = await fetch(`/api/admin/vendor-portal/orders/${encodeURIComponent(detail.id)}`, { method: "DELETE", credentials: "include", headers: headers() });
      if (!response.ok) throw new Error(await err(response, "Could not recall submission"));
      setDetail(null); await load();
    } catch (error) { setDetailErr(error instanceof Error ? error.message : "Could not recall submission"); }
    finally { setRecalling(false); }
  };
  const openDetail = async (id: string) => {
    setDetailErr(null); setDetail(null);
    try {
      const r = await fetch(`/api/admin/vendor-portal/orders/${encodeURIComponent(id)}`, { credentials: "include", headers: headers() });
      if (!r.ok) throw new Error(await err(r, "Could not load submission"));
      const o: VendorOrder = await r.json(); setDetail(o);
      const urls: Record<string, string> = {};
      await Promise.all(o.images.map(async i => {
        const ir = await fetch(i.url, { credentials: "include", headers: headers() }).catch(() => null);
        if (ir?.ok) urls[i.id] = URL.createObjectURL(await ir.blob());
      }));
      setImgUrls(urls);
    } catch (e) { setDetailErr(e instanceof Error ? e.message : "Failed"); }
  };
  useEffect(() => () => { Object.values(imgUrls).forEach(u => URL.revokeObjectURL(u)); }, [imgUrls]);

  const vendorName = (id: string) => data?.vendors.find(v => v.id === id)?.name ?? id;
  const label = "text-[10px] font-bold uppercase tracking-widest";

  if (!data && !loadErr) return <div className="space-y-3" data-testid="vendor-admin-loading">{[0, 1].map(i => <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: "var(--t-surface2)" }} />)}</div>;
  if (!data) return <div role="alert" className="rounded-2xl p-6 text-center" style={card}><AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-500" /><p className="text-sm mb-3">{loadErr}</p><button onClick={load} className={btn} style={{ background: "#1B3A7A" }} data-testid="button-retry-load">Retry</button></div>;

  return (
    <div className="space-y-6" data-testid="vendor-portal-admin">
      <div className="flex items-center justify-between">
        <div><p className={label} style={{ color: "var(--t-subtle)" }}>Wholesale</p><h2 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>Vendor portal</h2></div>
        <button onClick={load} aria-label="Refresh" className="p-2 rounded-xl" style={card} data-testid="button-refresh-admin"><RefreshCw className="w-4 h-4" /></button>
      </div>
      {loadErr && <Note msg={{ ok: false, text: loadErr }} id="text-load-error" />}

      <section className="rounded-2xl p-4 space-y-3" style={card}>
        <h3 className="font-bold flex items-center gap-2" style={{ color: "var(--t-text)" }}><ShieldCheck className="w-4 h-4" style={{ color: "var(--t-blue)" }} />Access</h3>
        <form className="grid sm:grid-cols-[1fr_1fr_auto] gap-2" onSubmit={e => { e.preventDefault(); if (!accVendor) { setAccMsg({ ok: false, text: "Select a vendor." }); return; } putAccess(user, accVendor); }}>
          <input aria-label="Username" placeholder="Account username" value={user} onChange={e => setUser(e.target.value)} className={input} style={card} data-testid="input-access-username" />
          <select aria-label="Vendor" value={accVendor} onChange={e => setAccVendor(e.target.value)} className={input} style={card} data-testid="select-access-vendor">
            <option value="">Select vendor</option>{data.vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <button type="submit" disabled={accBusy} className={btn} style={{ background: "#1B3A7A" }} data-testid="button-grant-access">{accBusy && <Loader2 className="w-4 h-4 animate-spin" />}Grant / change</button>
        </form>
        <Note msg={accMsg} id="text-access-result" />
        {data.access.length === 0 ? <p className="text-sm" style={{ color: "var(--t-muted)" }}>No vendor accounts yet.</p> : (
          <ul className="divide-y" style={{ borderColor: "var(--t-border)" }}>{data.access.map(a => (
            <li key={a.username} className="py-2 flex flex-wrap items-center gap-2 text-sm" data-testid={`row-access-${a.username}`}>
              <span className="font-semibold" style={{ color: "var(--t-text)" }}>{a.username}</span>
              <select aria-label={`Vendor for ${a.username}`} value={a.vendorId} disabled={accBusy} onChange={e => putAccess(a.username, e.target.value)} className="rounded-lg px-2 py-1 text-xs ml-auto" style={card} data-testid={`select-change-${a.username}`}>
                {data.vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <button disabled={accBusy} onClick={() => { if (window.confirm(`Revoke vendor access for ${a.username}?`)) putAccess(a.username, null); }} className="text-xs font-bold px-2 py-1 rounded-lg disabled:opacity-50" style={{ color: "#DC2626" }} data-testid={`button-revoke-${a.username}`}>Revoke</button>
            </li>))}</ul>)}
      </section>

      <section className="rounded-2xl p-4 space-y-3" style={card}>
        <h3 className="font-bold flex items-center gap-2" style={{ color: "var(--t-text)" }}><Send className="w-4 h-4" style={{ color: "var(--t-blue)" }} />Submit orders to vendor</h3>
        <select aria-label="Target vendor" value={vendorId} onChange={e => { setVendorId(e.target.value); setPreview(null); }} className={input} style={card} data-testid="select-submit-vendor">
          <option value="">Select vendor</option>{data.vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <textarea aria-label="Order codes" rows={3} placeholder="Order codes, separated by spaces, commas or new lines" value={codes} onChange={e => { setCodes(e.target.value); setPreview(null); }} className={`${input} font-mono`} style={card} data-testid="input-order-codes" />
        <div className="flex items-center gap-3"><button onClick={doPreview} disabled={!!subBusy} className={btn} style={{ background: "#2D6BCC" }} data-testid="button-preview">{subBusy === "preview" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}Preview</button>
          <span className="text-xs" style={{ color: "var(--t-subtle)" }}>{parseOrderCodes(codes).length} code(s)</span></div>
        <Note msg={subMsg} id="text-submit-result" />
        {preview && (
          <div className="space-y-4 pt-2" data-testid="preview-result">
            <p className={label} style={{ color: "var(--t-subtle)" }}>Preview for {vendorName(preview.vendorId)} · {preview.shipments.length} shipment(s)</p>
            {preview.shipments.map(s => (
              <div key={s.id} className="rounded-xl p-3 space-y-2" style={{ border: "1px solid var(--t-border)" }} data-testid={`preview-shipment-${s.id}`}>
                <div className="flex items-center gap-2"><span className="font-mono font-bold text-sm">{s.reference}</span>{s.stale && <StatusPill status={s.status} stale />}</div>
                <div className="grid md:grid-cols-[1.4fr_1fr] gap-3"><CostBreakdown order={s} /><ShippingBlock order={s} /></div>
              </div>))}
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--t-text)" }}>
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} data-testid="checkbox-confirm-submit" />I have reviewed costs and addresses and want to send these to the vendor.
            </label>
            <button onClick={doSubmit} disabled={!confirmed || !!subBusy || preview.shipments.length === 0} className={btn} style={{ background: "#1B3A7A" }} data-testid="button-submit-vendor">{subBusy === "submit" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Submit to vendor</button>
          </div>)}
      </section>

      <section className="rounded-2xl p-4 space-y-3" style={card}>
        <h3 className="font-bold" style={{ color: "var(--t-text)" }}>Submissions</h3>
        {data.submissions.length === 0 ? <p className="text-sm" style={{ color: "var(--t-muted)" }}>No orders submitted yet.</p> : (
          <ul className="space-y-1">{data.submissions.map(s => (
            <li key={s.id}><button onClick={() => openDetail(s.id)} className="w-full flex flex-wrap items-center gap-2 text-sm text-left rounded-lg px-2 py-2 hover:bg-[var(--t-blue-05)]" data-testid={`row-submission-${s.id}`}>
              <span className="font-mono font-bold">{s.reference}</span><StatusPill status={s.status} stale={s.stale} />
              <span className="ml-auto text-xs" style={{ color: "var(--t-muted)" }}>{vendorName(s.vendorId)} · {new Date(s.submittedAt).toLocaleDateString()}</span>
            </button></li>))}</ul>)}
        {detailErr && <Note msg={{ ok: false, text: detailErr }} id="text-detail-error" />}
        {detail && (
          <div className="rounded-xl p-3 space-y-3" style={{ border: "1px solid var(--t-blue-25)" }} data-testid="submission-detail">
            <div className="flex items-center gap-2"><span className="font-mono font-bold">{detail.reference}</span><StatusPill status={detail.status} stale={detail.stale} />
              <button onClick={() => setDetail(null)} aria-label="Close detail" className="ml-auto p-1"><X className="w-4 h-4" /></button></div>
            {detail.trackingNumber && <p className="text-sm">Tracking: <span className="font-mono">{detail.carrier} {detail.trackingNumber}</span></p>}
            {detail.status === "Submitted" && <button type="button" className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50" disabled={recalling} onClick={recall}>Recall unstarted submission</button>}
            <div className="grid md:grid-cols-[1.4fr_1fr] gap-3"><CostBreakdown order={detail} /><ShippingBlock order={detail} /></div>
            {detail.images.length > 0 && <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">{detail.images.map(i => imgUrls[i.id]
              ? <img key={i.id} src={imgUrls[i.id]} alt={i.filename} className="aspect-square object-cover rounded-lg" />
              : <div key={i.id} className="aspect-square rounded-lg text-[10px] p-1 flex items-center justify-center text-center" style={{ background: "var(--t-surface2)" }}>{i.filename}</div>)}</div>}
          </div>)}
      </section>
    </div>
  );
}
