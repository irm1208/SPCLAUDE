import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle, Download, RefreshCw, Save, Send, FileCheck2 } from "lucide-react";
import { Button, Card, Input, Label, cn } from "@/components/ui";
import { coaApi, defaultCoaConfig, type CoaAdminView, type CoaConfig, type CoaRail, type CoaRequest } from "@/lib/coa-api";
import { COA_PHASE_TONE, COA_STATUS_LABEL, canConfirm, canRelease, coaAdminQuery, coaPhase, confirmNoteOk, fmtCoaFee, inviteCandidates } from "@/lib/coa-ui";

const STATUSES = Object.keys(COA_STATUS_LABEL) as CoaRequest["status"][];
const railKey = (r: CoaRail) => `${r.currency}|${r.network}|${r.walletAddress}`;
const OrganiserCoaRoot = createContext<string | null>(null);
const COA_WALLET_NETWORKS = [
  ["USDT", "Ethereum"], ["USDC", "Ethereum"], ["USDT", "Arbitrum"], ["USDC", "Arbitrum"],
  ["USDT", "Polygon"], ["USDC", "Polygon"], ["USDT", "BSC"], ["USDT", "TRON"],
  ["USDT", "Solana"], ["USDC", "Solana"],
];

function Settings({ secret, groupBuyId, config, committed, onSaved }: { secret: string; groupBuyId: string; config: CoaConfig | null; committed: number; onSaved: () => void }) {
  const organiserRoot = useContext(OrganiserCoaRoot);
  const [draft, setDraft] = useState<CoaConfig>(config ?? defaultCoaConfig);
  const [rails, setRails] = useState<CoaRail[] | null>(null);
  const [railError, setRailError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { setDraft(config ?? defaultCoaConfig); }, [config]);
  useEffect(() => {
    if (organiserRoot) { setRails([]); return; }
    coaApi<{ rails: CoaRail[] }>("/admin/coa/rails", {}, secret).then(d => setRails(d.rails)).catch(e => setRailError(e.message));
  }, [secret, organiserRoot]);

  const toggleRail = (r: CoaRail) => setDraft(d => {
    const on = d.rails.some(x => railKey(x) === railKey(r));
    return { ...d, rails: on ? d.rails.filter(x => railKey(x) !== railKey(r)) : [...d.rails, r] };
  });
  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      await coaApi(organiserRoot ? `${organiserRoot}/settings` : `/admin/group-buys/${groupBuyId}/coa/settings`, { method: "PUT", body: JSON.stringify(draft) }, secret);
      setMsg({ ok: true, text: "Settings saved." }); onSaved();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Save failed." }); }
    setSaving(false);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold">COA settings</p>
        <span className="text-[11px] text-muted-foreground">{committed} of {draft.cap} places committed (invitations plus active requests)</span>
      </div>
      <div className="flex gap-1 rounded-lg bg-muted/60 p-1 w-fit">
        {(["disabled", "selected", "open"] as const).map(m => (
          <button key={m} onClick={() => setDraft(d => ({ ...d, mode: m }))}
            className={cn("px-3 py-1.5 text-xs font-semibold rounded-md capitalize", draft.mode === m ? "bg-[#1B3A7A] text-white" : "text-muted-foreground")}>
            {m === "selected" ? "Invited only" : m}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1"><Label className="text-xs">Fee per COA</Label>
          <Input type="number" min={0} step="0.01" value={draft.fee} onChange={e => setDraft(d => ({ ...d, fee: Number(e.target.value) }))} /></div>
        <div className="space-y-1"><Label className="text-xs">Fee currency</Label>
          <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={draft.currency}
            onChange={e => setDraft(d => ({ ...d, currency: e.target.value as CoaConfig["currency"] }))}>
            <option>USD</option><option>GBP</option><option>EUR</option>
          </select></div>
        <div className="space-y-1"><Label className="text-xs">Capacity</Label>
          <Input type="number" min={0} step={1} value={draft.cap} onChange={e => setDraft(d => ({ ...d, cap: Math.max(0, Math.floor(Number(e.target.value))) }))} /></div>
      </div>
      <p className="text-[11px] text-muted-foreground">Fee and wallet changes only apply to new invitations and reservations. Existing requests keep their fee and payment destination.</p>
      {organiserRoot ? <div className="space-y-2">
        <Label className="text-xs">Your COA receiving wallets</Label>
        <p className="text-[11px] text-muted-foreground">Enter a public receiving address—not a seed phrase or private key. COA payments are separate from order payments.</p>
        {draft.rails.map((rail, index) => (
          <div key={index} className="flex flex-wrap gap-2">
            <select aria-label={`COA wallet ${index + 1} currency and network`} className="h-9 rounded-md border border-input bg-background px-2 text-xs"
              value={`${rail.currency}|${rail.network === "ERC-20" ? "Ethereum" : rail.network}`}
              onChange={e => { const [currency, network] = e.target.value.split("|"); setDraft(d => ({ ...d, rails: d.rails.map((r, i) => i === index ? { ...r, currency, network } : r) })); }}>
              {COA_WALLET_NETWORKS.map(([currency, network]) => <option key={`${currency}|${network}`} value={`${currency}|${network}`}>{currency} · {network}</option>)}
            </select>
            <Input aria-label={`COA wallet ${index + 1} receiving address`} className="min-w-0 flex-1 text-xs" placeholder="Public receiving wallet address" value={rail.walletAddress}
              onChange={e => setDraft(d => ({ ...d, rails: d.rails.map((r, i) => i === index ? { ...r, walletAddress: e.target.value } : r) }))} />
            <Button variant="outline" size="sm" onClick={() => setDraft(d => ({ ...d, rails: d.rails.filter((_, i) => i !== index) }))}>Remove wallet</Button>
          </div>
        ))}
        <Button variant="outline" size="sm" disabled={draft.rails.length >= 20}
          onClick={() => setDraft(d => ({ ...d, rails: [...d.rails, { currency: "USDT", network: "Ethereum", walletAddress: "" }] }))}>Add receiving wallet</Button>
      </div> : (
      <div className="space-y-1.5">
        <Label className="text-xs">Stablecoin rails</Label>
        {railError && <p className="text-xs text-red-500">{railError}</p>}
        {!rails && !railError && <div className="h-8 rounded bg-muted animate-pulse" />}
        {rails && rails.length === 0 && <p className="text-xs text-muted-foreground">No stablecoin wallets are configured.</p>}
        {rails && [...new Map([...rails, ...draft.rails].map(r => [railKey(r), r])).values()].map(r => {
          const on = draft.rails.some(x => railKey(x) === railKey(r));
          return (
            <label key={railKey(r)} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer", on && "border-[#2D6BCC] bg-[#2D6BCC]/5")}>
              <input type="checkbox" checked={on} onChange={() => toggleRail(r)} />
              <b>{r.currency}</b> on {r.network}<span className="font-mono text-muted-foreground truncate ml-auto">{r.walletAddress}</span>
            </label>
          );
        })}
      </div>
      )}
      <div className="space-y-1"><Label className="text-xs">Manual payment instructions (optional)</Label>
        <textarea className="w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm" value={draft.manualInstructions}
          onChange={e => setDraft(d => ({ ...d, manualInstructions: e.target.value }))} /></div>
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Save settings</Button>
        {msg && <span className={cn("text-xs", msg.ok ? "text-green-600" : "text-red-500")}>{msg.text}</span>}
      </div>
    </Card>
  );
}

function Invite({ secret, groupBuyId, orders, version, onDone }: { secret: string; groupBuyId: string; orders: CoaAdminView["orders"]; version: number; onDone: () => void }) {
  const organiserRoot = useContext(OrganiserCoaRoot);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // Commitments are fetched unfiltered so list filters never re-expose committed orders
  const [all, setAll] = useState<CoaRequest[] | null>(null);
  useEffect(() => {
    const ac = new AbortController();
    setAll(null);
    coaApi<CoaAdminView>(organiserRoot ?? `/admin/coa${coaAdminQuery({ groupBuyId })}`, { signal: ac.signal }, secret)
      .then(d => setAll(d.requests)).catch(() => { if (!ac.signal.aborted) setAll([]); });
    return () => ac.abort();
  }, [groupBuyId, secret, version, organiserRoot]);
  const avail = all ? inviteCandidates(orders, all) : [];
  const send = async () => {
    setBusy(true); setMsg(null);
    try {
      await coaApi(organiserRoot ? `${organiserRoot}/invite` : `/admin/group-buys/${groupBuyId}/coa/invite`, { method: "POST", body: JSON.stringify({ orderIds: [...sel] }) }, secret);
      setMsg({ ok: true, text: `Invited ${sel.size} order${sel.size === 1 ? "" : "s"}.` }); setSel(new Set()); onDone();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Invite failed." }); }
    setBusy(false);
  };
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between"><p className="text-sm font-bold">Invite orders</p>
        <span className="text-[11px] text-muted-foreground">{sel.size} selected</span></div>
      {!all ? <div className="h-16 rounded-lg bg-muted animate-pulse" /> : avail.length === 0 ? <p className="text-xs text-muted-foreground">Every order already has a COA invitation or request.</p> : (
        <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
          {avail.map(o => (
            <label key={o.id} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-muted/40">
              <input type="checkbox" checked={sel.has(o.id)} onChange={() => setSel(s => { const n = new Set(s); n.has(o.id) ? n.delete(o.id) : n.add(o.id); return n; })} />
              <span className="font-mono">{o.code}</span><span className="text-muted-foreground">@{o.member}</span>
            </label>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3">
        <Button size="sm" disabled={!sel.size || busy} onClick={send} className="gap-1.5">{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}Send invitations</Button>
        {msg && <span className={cn("text-xs", msg.ok ? "text-green-600" : "text-red-500")}>{msg.text}</span>}
      </div>
    </Card>
  );
}

function RequestRow({ r, secret, onDone }: { r: CoaRequest; secret: string; onDone: () => void }) {
  const organiserRoot = useContext(OrganiserCoaRoot);
  const requestPath = organiserRoot ? `${organiserRoot}/requests/${encodeURIComponent(r.id)}` : `/admin/coa/${r.id}`;
  const [notes, setNotes] = useState(r.internalNotes ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const operation = useRef(0);
  const uploadAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    ++operation.current;
    setBusy(null); setErr(null);
    return () => { ++operation.current; uploadAbort.current?.abort(); };
  }, [r.id, secret]);
  useEffect(() => { setNotes(r.internalNotes ?? ""); }, [r.internalNotes]);
  const phase = coaPhase(r.status);
  const tone = COA_PHASE_TONE[phase];
  const upload = async (file: File) => {
    if (!/\.pdf$/i.test(file.name) || file.type !== "application/pdf" || !file.size || file.size > 10 * 1024 * 1024) {
      setErr("Choose a PDF certificate of 10 MB or smaller."); return;
    }
    if (r.certificate && !confirm("Replace the current certificate? Members will only be able to download the new PDF.")) return;
    setBusy("certificate"); setErr(null);
    const seq = ++operation.current;
    const ac = new AbortController(); uploadAbort.current = ac;
    try {
      const body = new FormData(); body.append("certificate", file);
      const res = await fetch(`/api${requestPath}/certificate`, {
        method: "POST", credentials: "include", headers: secret ? { "x-admin-secret": secret } : {}, body, signal: ac.signal,
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Certificate upload failed.");
      if (seq === operation.current) onDone();
    } catch (e) { if (seq === operation.current) setErr(e instanceof Error ? e.message : "Certificate upload failed."); }
    finally { if (seq === operation.current) setBusy(null); }
  };
  const act = async (action: "notes" | "confirm" | "processing" | "completed" | "release") => {
    if (action === "confirm" && !confirmNoteOk(note)) { setErr("Add a note (at least 5 characters) explaining how the payment was verified."); return; }
    if (action === "release" && !confirm("Release this unpaid COA place?")) return;
    setBusy(action); setErr(null);
    const seq = ++operation.current;
    try {
      await coaApi(requestPath, { method: "PATCH", body: JSON.stringify({ action, ...(!organiserRoot ? { internalNotes: notes } : {}), ...(note.trim() ? { note: note.trim() } : {}) }) }, secret);
      if (seq === operation.current) { setNote(""); onDone(); }
    } catch (e) { if (seq === operation.current) setErr(e instanceof Error ? e.message : "Action failed."); }
    if (seq === operation.current) setBusy(null);
  };
  const btn = (a: Parameters<typeof act>[0], label: string, show: boolean) => show && (
    <Button key={a} size="sm" variant={a === "release" ? "outline" : "primary"} disabled={!!busy} onClick={() => act(a)} className="h-8 text-xs gap-1">
      {busy === a && <Loader2 className="w-3 h-3 animate-spin" />}{label}
    </Button>
  );
  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-bold">{r.orderCode}</span>
        <span className="text-xs text-muted-foreground">@{r.member}</span>
        <span className="text-[11px] text-muted-foreground">{r.groupName}</span>
        <span className="text-[10px] uppercase font-bold text-muted-foreground">{r.source}</span>
        <span className="ml-auto text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ color: tone.fg, background: tone.bg }}>{COA_STATUS_LABEL[r.status]}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {([["Client", r.client], ["Sample", r.sample], ["Manufacturer", r.manufacturer], ["Batch", r.batch]] as const).map(([k, v]) => (
          <div key={k}><p className="text-[10px] uppercase font-bold text-muted-foreground">{k}</p><p className="font-medium break-words">{v || "-"}</p></div>
        ))}
      </div>
      <div className="rounded-lg bg-muted/40 p-2.5 text-xs space-y-0.5">
        <p><b>COA fee:</b> {fmtCoaFee(r.fee, r.currency)}{r.expiresAt && phase === "unpaid" && <> &middot; expires {new Date(r.expiresAt).toLocaleString("en-GB")}</>}</p>
        {r.payment && <p><b>Rail:</b> {r.payment.amount} {r.payment.currency} on {r.payment.network} <span className="font-mono break-all">{r.payment.walletAddress}</span></p>}
        {r.txHash && <p className="break-all"><b>Tx:</b> <span className="font-mono">{r.txHash}</span></p>}
        {r.reference && <p><b>Manual reference:</b> {r.reference}</p>}
        {r.verificationMessage && <p className="text-amber-700">{r.verificationMessage}</p>}
        <p className="text-muted-foreground">Updated {new Date(r.updatedAt).toLocaleString("en-GB")}</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {!organiserRoot && <textarea className="min-h-[56px] rounded-md border border-input bg-background px-2.5 py-1.5 text-xs" placeholder="Internal notes (Admin only)" value={notes} onChange={e => setNotes(e.target.value)} />}
        <textarea className="min-h-[56px] rounded-md border border-input bg-background px-2.5 py-1.5 text-xs" placeholder="Action note, required to confirm payment" value={note} onChange={e => setNote(e.target.value)} />
      </div>
      {r.status === "completed" && <div className="rounded-lg border p-3 space-y-2 text-xs">
        <p className="font-semibold">{r.certificate ? "Private certificate attached" : "No certificate attached"}</p>
        {r.certificate && <p className="text-muted-foreground">Attached {new Date(r.certificate.attachedAt).toLocaleString("en-GB")}</p>}
        <label className="block space-y-1">
          <span>{busy === "certificate" ? "Uploading…" : r.certificate ? "Replace COA PDF" : "Attach COA PDF"}</span>
          <input type="file" accept=".pdf,application/pdf" disabled={!!busy} className="block w-full"
            onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void upload(file); }} />
        </label>
        <p className="text-muted-foreground">PDF only, up to 10 MB. Only the current order owner can download it. This does not publish a lab report.</p>
      </div>}
      {err && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{err}</p>}
      <div className="flex flex-wrap gap-2">
        {btn("notes", "Save notes", !organiserRoot)}
        {btn("confirm", "Confirm payment", canConfirm(r))}
        {btn("processing", "Mark processing", r.status === "paid")}
        {btn("completed", "Mark completed", r.status === "processing")}
        {btn("release", "Release place", canRelease(r))}
      </div>
    </Card>
  );
}

/** Admin COA requests. With groupBuyId: per-group view with settings and invites. Without: central list. */
export function CoaRequests({ secret = "", groupBuyId, organiser = false }: { secret?: string; groupBuyId?: string; organiser?: boolean }) {
  const organiserRoot = organiser && groupBuyId ? `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/coa` : null;
  const listPath = organiserRoot ?? "/admin/coa";
  const [data, setData] = useState<CoaAdminView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gb, setGb] = useState(groupBuyId ?? "");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [batch, setBatch] = useState("");
  const [exporting, setExporting] = useState<"csv" | "txt" | null>(null);
  const exportAbort = useRef<AbortController | null>(null);
  const q = coaAdminQuery({ groupBuyId: groupBuyId ?? gb, search, status, batch });

  const scope = groupBuyId ?? gb;
  const seq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [version, setVersion] = useState(0);
  const load = useCallback(async () => {
    const id = ++seq.current;
    abortRef.current?.abort();
    const ac = new AbortController(); abortRef.current = ac;
    setLoading(true); setError(null);
    try {
      const d = await coaApi<CoaAdminView>(`${listPath}${q}`, { signal: ac.signal }, secret);
      if (id === seq.current) { setData(d); setVersion(v => v + 1); }
    } catch (e) {
      if (id === seq.current && !ac.signal.aborted) setError(e instanceof Error ? e.message : "Unable to load COA requests.");
    }
    if (id === seq.current) setLoading(false);
  }, [q, secret, listPath]);
  // Clear previous group data before loading another group
  useEffect(() => {
    ++seq.current;
    abortRef.current?.abort();
    setData(null); setError(null);
  }, [scope, secret, listPath]);
  useEffect(() => { const t = setTimeout(() => void load(), 250); return () => { clearTimeout(t); }; }, [load]);
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    setExporting(null);
    return () => exportAbort.current?.abort();
  }, [q, secret, listPath]);

  const exportFile = async (format: "csv" | "txt") => {
    exportAbort.current?.abort();
    const ac = new AbortController(); exportAbort.current = ac;
    setExporting(format); setError(null);
    try {
      const query = format === "txt" ? coaAdminQuery({ groupBuyId: scope, search, batch }) : q;
      const res = await fetch(`/api${listPath}/export.${format}${query}`, { signal: ac.signal, credentials: "include", headers: secret ? { "x-admin-secret": secret } : {} });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Export failed.");
      const blob = await res.blob();
      if (ac.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = format === "txt" ? "coa-paid.txt" : "coa-requests.csv";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { if (!ac.signal.aborted) setError(e instanceof Error ? e.message : "Export failed."); }
    finally { if (exportAbort.current === ac) setExporting(null); }
  };

  return (
    <OrganiserCoaRoot.Provider value={organiserRoot}>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FileCheck2 className="w-5 h-5 text-[#1B3A7A]" />
        <div className="flex-1"><h2 className="font-bold text-base">COA requests</h2>
          <p className="text-xs text-muted-foreground">Lab certificate requests. Fees are separate from order totals.</p></div>
        <Button variant="outline" size="sm" onClick={() => void load()} className="gap-1.5"><RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />Refresh</Button>
        <Button variant="outline" size="sm" onClick={() => void exportFile("csv")} disabled={!!exporting} className="gap-1.5">{exporting === "csv" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}CSV</Button>
        <Button variant="outline" size="sm" onClick={() => void exportFile("txt")} disabled={!!exporting} className="gap-1.5"
          title="Paid, processing and completed COAs. Uses group, search and batch filters, regardless of the status dropdown.">
          {exporting === "txt" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}Export paid COAs as TXT
        </Button>
      </div>

      {groupBuyId && data && (
        <>
          <Settings key={groupBuyId} secret={secret} groupBuyId={groupBuyId} config={data.config} committed={data.committed} onSaved={() => void load()} />
          {data.config && data.config.mode !== "disabled" && <Invite key={groupBuyId} secret={secret} groupBuyId={groupBuyId} orders={data.orders} version={version} onDone={() => void load()} />}
        </>
      )}

      <div className="flex flex-wrap gap-2">
        {!groupBuyId && (
          <select className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={gb} onChange={e => setGb(e.target.value)}>
            <option value="">All group buys</option>
            {data?.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <Input className="h-9 w-48 text-xs" placeholder="Search order, member, sample" value={search} onChange={e => setSearch(e.target.value)} />
        <Input className="h-9 w-32 text-xs" placeholder="Batch" value={batch} onChange={e => setBatch(e.target.value)} />
        <select className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{COA_STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      {error && (
        <Card className="p-3 flex items-center gap-2 text-sm text-red-600"><AlertCircle className="w-4 h-4" />{error}
          <button className="ml-auto text-xs font-bold underline" onClick={() => void load()}>Retry</button></Card>
      )}
      {loading && !data && [0, 1, 2].map(i => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
      {data && data.requests.length === 0 && !loading && (
        <Card className="p-8 text-center"><FileCheck2 className="w-7 h-7 mx-auto text-muted-foreground" />
          <p className="text-sm font-semibold mt-2">No COA requests match</p>
          <p className="text-xs text-muted-foreground">Adjust filters{groupBuyId ? " or invite orders above" : ""}.</p></Card>
      )}
      <div className="space-y-3">
        {data?.requests.map(r => <RequestRow key={r.id} r={r} secret={secret} onDone={() => void load()} />)}
      </div>
    </div>
    </OrganiserCoaRoot.Provider>
  );
}

export default CoaRequests;
