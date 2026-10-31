import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CalendarOff, CheckCircle2, Loader2, MessageSquareWarning } from "lucide-react";

/* Admin view of vendor problem reports and vendor availability (holiday mode). */

interface Issue {
  id: string; submissionId: string; vendorId: string; type: string; label: string; note: string | null; reportedBy: string;
  createdAt: string; resolvedAt: string | null; resolvedBy: string | null; resolution: string | null; open: boolean; reference?: string;
}
interface VendorAvailability {
  vendorId: string; vendorName: string; closedFrom: string | null; closedUntil: string | null; closedNote: string | null;
  handlingDays: number | null; defaultCarrier: string | null; closedNow: boolean; updatedAt: string | null; updatedBy: string | null;
}
type Msg = { ok: boolean; text: string } | null;
const card = { background: "var(--t-surface)", border: "1px solid var(--t-border)" };
const btn = "inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed";
async function err(r: Response, f: string) { const b = await r.json().catch(() => null); return `${b && typeof b.error === "string" ? b.error : f} (${r.status})`; }
const when = (v: string | null) => v ? new Date(v).toLocaleString() : "";
const day = (v: string | null) => v ? new Date(v).toLocaleDateString() : "";

export default function VendorPortalIssuesAdmin({ secret }: { secret: string }) {
  const headers = useCallback((json = false): HeadersInit => ({ "x-admin-secret": secret, ...(json ? { "content-type": "application/json" } : {}) }), [secret]);
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [vendors, setVendors] = useState<VendorAvailability[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [showResolved, setShowResolved] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/vendor-portal/issues", { credentials: "include", headers: headers() });
      if (!r.ok) throw new Error(await err(r, "Could not load vendor problems"));
      const b = await r.json();
      setIssues(Array.isArray(b?.issues) ? b.issues : []); setVendors(Array.isArray(b?.settings) ? b.settings : []); setLoadErr(null);
    } catch (e) { setLoadErr(e instanceof Error ? e.message : "Load failed"); }
  }, [headers]);
  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t); }, [load]);

  const resolve = async (issue: Issue) => {
    const resolution = window.prompt(`Resolve the problem on order ${issue.reference ?? issue.submissionId} (${issue.label})? Tell the vendor what to do:`, "");
    if (resolution == null) return;
    setBusy(issue.id); setMsg(null);
    try {
      const r = await fetch(`/api/admin/vendor-portal/issues/${encodeURIComponent(issue.id)}/resolve`, { method: "POST", credentials: "include", headers: headers(true), body: JSON.stringify({ resolution }) });
      if (!r.ok) throw new Error(await err(r, "Could not resolve"));
      setMsg({ ok: true, text: `Resolved ${issue.reference ?? "the problem"}. The vendor sees your note in the portal.` });
      await load();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not resolve" }); } finally { setBusy(null); }
  };
  const setAvailability = async (v: VendorAvailability, close: boolean) => {
    let body: Record<string, unknown> = { handlingDays: v.handlingDays, defaultCarrier: v.defaultCarrier };
    if (close) {
      const until = window.prompt(`Pause automatic routing to ${v.vendorName} until which date? (YYYY-MM-DD)`, "");
      if (until == null) return;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(until.trim())) { setMsg({ ok: false, text: "Enter the date as YYYY-MM-DD." }); return; }
      body = { ...body, closedUntil: new Date(`${until.trim()}T23:59:59`).toISOString(), closedNote: "Set by Peps Anonymous" };
    } else if (!window.confirm(`Reopen ${v.vendorName} now? Held paid orders will be routed to them on the next pass.`)) return;
    setBusy(v.vendorId); setMsg(null);
    try {
      const r = await fetch(`/api/admin/vendor-portal/settings/${encodeURIComponent(v.vendorId)}`, { method: "PUT", credentials: "include", headers: headers(true), body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await err(r, "Could not update availability"));
      setMsg({ ok: true, text: close ? `${v.vendorName} paused.` : `${v.vendorName} reopened.` });
      await load();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not update availability" }); } finally { setBusy(null); }
  };

  const open = (issues ?? []).filter(i => i.open);
  const resolved = (issues ?? []).filter(i => !i.open);
  const closedVendors = vendors.filter(v => v.closedNow || (v.closedUntil && new Date(v.closedUntil).getTime() > Date.now()));

  return (
    <section className="rounded-2xl p-4 space-y-3" style={card} data-testid="section-vendor-issues">
      <h3 className="font-bold flex items-center gap-2" style={{ color: "var(--t-text)" }}>
        <MessageSquareWarning className="w-4 h-4" style={{ color: "var(--t-blue)" }} />Vendor problems and availability
        {open.length > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: "#B91C1C", background: "rgba(239,68,68,0.1)" }} data-testid="text-open-issue-count">{open.length} open</span>}
      </h3>
      {loadErr && <p role="alert" className="text-sm" style={{ color: "#B91C1C" }}>{loadErr}</p>}
      {msg && <div role={msg.ok ? "status" : "alert"} data-testid="text-issue-admin-result" className="rounded-xl p-2.5 text-sm flex gap-2 items-center" style={{ background: msg.ok ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.08)", color: msg.ok ? "#15803D" : "#B91C1C" }}>{msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}{msg.text}</div>}

      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--t-subtle)" }}>Problems reported by vendors</p>
        {issues === null ? <div className="h-12 rounded-xl animate-pulse" style={{ background: "var(--t-surface2)" }} />
          : open.length === 0 ? <p className="text-sm" style={{ color: "var(--t-muted)" }}>No open problems. Vendors report stock, address and shipping issues from the order page in their portal.</p>
          : <ul className="space-y-2">{open.map(i => (
            <li key={i.id} className="rounded-xl p-3 text-sm space-y-1" style={{ border: "1px solid rgba(239,68,68,0.35)" }} data-testid={`row-issue-${i.id}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-bold" style={{ color: "var(--t-text)" }}>{i.reference ?? i.submissionId}</span>
                <span className="font-semibold" style={{ color: "#B91C1C" }}>{i.label}</span>
                <span className="text-xs ml-auto" style={{ color: "var(--t-subtle)" }}>{vendors.find(v => v.vendorId === i.vendorId)?.vendorName ?? i.vendorId} · @{i.reportedBy} · {when(i.createdAt)}</span>
              </div>
              {i.note && <p className="whitespace-pre-line" style={{ color: "var(--t-text)" }}>{i.note}</p>}
              <div className="pt-1"><button disabled={busy === i.id} onClick={() => resolve(i)} className={btn} style={{ background: "#1B3A7A" }} data-testid={`button-resolve-${i.id}`}>{busy === i.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}Resolve with a note</button></div>
            </li>))}</ul>}
        {resolved.length > 0 && (
          <div className="mt-2">
            <button onClick={() => setShowResolved(v => !v)} className="text-xs font-bold underline" style={{ color: "var(--t-muted)" }} data-testid="button-toggle-resolved">{showResolved ? "Hide" : "Show"} {resolved.length} resolved</button>
            {showResolved && <ul className="mt-2 divide-y text-sm" style={{ borderColor: "var(--t-border)" }}>{resolved.map(i => (
              <li key={i.id} className="py-2 flex flex-wrap items-center gap-2">
                <span className="font-mono font-bold">{i.reference ?? i.submissionId}</span><span style={{ color: "var(--t-muted)" }}>{i.label}</span>
                <span className="text-xs ml-auto" style={{ color: "var(--t-subtle)" }}>by {i.resolvedBy} · {when(i.resolvedAt)}{i.resolution ? ` · ${i.resolution}` : ""}</span>
              </li>))}</ul>}
          </div>)}
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5" style={{ color: "var(--t-subtle)" }}><CalendarOff className="w-3.5 h-3.5" />Vendor availability</p>
        {vendors.length === 0 ? <p className="text-sm" style={{ color: "var(--t-muted)" }}>No vendors configured.</p> : (
          <ul className="divide-y text-sm" style={{ borderColor: "var(--t-border)" }}>{vendors.map(v => {
            const paused = closedVendors.includes(v);
            return (
              <li key={v.vendorId} className="py-2 flex flex-wrap items-center gap-2" data-testid={`row-availability-${v.vendorId}`}>
                <span className="font-semibold" style={{ color: "var(--t-text)" }}>{v.vendorName}</span>
                {v.closedNow ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: "#B45309", background: "rgba(233,160,32,0.14)" }}>Closed until {day(v.closedUntil)}</span>
                  : paused ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: "#1D4ED8", background: "rgba(45,107,204,0.12)" }}>Closing {day(v.closedFrom)} to {day(v.closedUntil)}</span>
                  : <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: "#15803D", background: "rgba(22,163,74,0.1)" }}>Accepting orders</span>}
                <span className="text-xs" style={{ color: "var(--t-subtle)" }}>{[v.handlingDays != null ? `${v.handlingDays}d handling` : null, v.defaultCarrier, v.closedNote].filter(Boolean).join(" · ")}</span>
                <button disabled={busy === v.vendorId} onClick={() => setAvailability(v, !paused)} className="ml-auto text-xs font-bold px-2 py-1 rounded-lg disabled:opacity-50" style={{ color: paused ? "#15803D" : "#B45309", border: "1px solid var(--t-border)" }} data-testid={`button-availability-${v.vendorId}`}>{paused ? "Reopen now" : "Pause routing"}</button>
              </li>);
          })}</ul>)}
        <p className="text-xs mt-2" style={{ color: "var(--t-subtle)" }}>Paid orders for a paused vendor stay unrouted and are submitted automatically when the vendor reopens. Manual submission still works.</p>
      </div>
    </section>
  );
}
