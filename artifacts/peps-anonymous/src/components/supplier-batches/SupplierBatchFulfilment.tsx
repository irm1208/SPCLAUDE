import React, { useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Download, ChevronDown, ChevronRight, Package, Truck, Search, ClipboardCheck, Ban, Pencil } from "lucide-react";
import {
  fulfilmentKey, fulfilmentRequest, downloadPackingManifest,
  type FulfilmentScope, type FulfilmentOverview, type FulfilmentDetail, type FulfilmentBatchSummary,
  type FulfilmentOrder, type SupplierShipment,
} from "@/lib/supplier-fulfilment";

const V = {
  text: "var(--t-text, #0F1F38)", muted: "var(--t-muted, #6B7280)", border: "var(--t-border, #D0DAE4)",
  surface: "var(--t-surface, #FFFFFF)", surface2: "var(--t-surface2, #F1F5F9)", tint: "var(--t-blue-08, rgba(45,107,204,0.08))",
};
const NAVY = "#1B3A7A";
const BLUE = "#2D6BCC";
const inputCls = "w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-[#2D6BCC]/40 disabled:opacity-60";
const inputStyle = { background: V.surface2, borderColor: V.border, color: V.text };
const btn = "min-h-9 px-4 py-1.5 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-50";
const ghost = "min-h-9 px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50";
const label = "text-[10px] font-bold uppercase tracking-widest";
const PAGE = 25;

const fmt = (s: string | null | undefined) => (s ? new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");
const kits = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const halfStep = (n: number) => Number.isFinite(n) && n >= 0 && Math.round(n * 2) === n * 2;
const errText = (e: unknown, f = "Request failed.") => (e instanceof Error ? e.message : f);
const lineKey = (orderId: string, productId: string) => `${orderId}::${productId}`;

type Msg = { err: boolean; text: string } | null;
function MsgLine({ m, id }: { m: Msg; id: string }) {
  if (!m) return null;
  return <p role={m.err ? "alert" : "status"} data-testid={id} className={`text-xs ${m.err ? "text-red-600" : "text-green-700"}`}>{m.text}</p>;
}
function Chip({ tone, children }: { tone: "ok" | "warn" | "bad" | "info" | "idle"; children: React.ReactNode }) {
  const c = { ok: "bg-green-100 text-green-700", warn: "bg-amber-100 text-amber-800", bad: "bg-red-100 text-red-700", info: "bg-blue-100 text-blue-800", idle: "bg-slate-100 text-slate-600" }[tone];
  return <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded whitespace-nowrap ${c}`}>{children}</span>;
}
function Skeleton({ rows = 3, label: l }: { rows?: number; label: string }) {
  return <div className="space-y-2" aria-label={l} aria-busy="true">{Array.from({ length: rows }, (_, i) => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: V.surface2 }} />)}</div>;
}
function ErrorBox({ text, onRetry, id }: { text: string; onRetry: () => void; id: string }) {
  return (
    <div role="alert" data-testid={id} className="flex flex-wrap items-center gap-2 text-xs text-red-600">
      <span className="flex-1">{text}</span>
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 font-semibold"><RefreshCw className="w-3 h-3" /> Retry</button>
    </div>
  );
}
const isDispatched = (s: string) => /^(shipped|completed)$/i.test(s.trim());

function Stats({ b }: { b: FulfilmentBatchSummary }) {
  const items: [string, string, string?][] = [
    ["Kits / orders", `${kits(b.kits)} / ${b.orderCount}`],
    ["Packages", `${b.shipmentCount}${b.untracked ? ` · ${b.untracked} untracked` : ""}`, b.untracked ? "#B45309" : undefined],
    ["Allocated", `${kits(b.allocatedKits)} / ${kits(b.kits)}`],
    ["Checked good", kits(b.receivedKits)],
    ["Damaged", kits(b.damagedKits), b.damagedKits ? "#b91c1c" : undefined],
    ["Missing", kits(b.missingKits), b.missingKits ? "#b91c1c" : undefined],
    ["Outstanding orders", String(b.outstandingOrders)],
    ["Exceptions", String(b.exceptionCount), b.exceptionCount ? "#b91c1c" : undefined],
  ];
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
      {items.map(([k, v, c]) => (
        <div key={k}><dt className="text-[10px]" style={{ color: V.muted }}>{k}</dt><dd className="font-semibold tabular-nums" style={{ color: c ?? V.text }}>{v}</dd></div>
      ))}
    </dl>
  );
}

/* ---------- mutation plumbing ---------- */
function useActions(scope: FulfilmentScope, groupBuyId: string, batchId: string, headers?: Record<string, string>) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const run = async (suffix: string, body: unknown): Promise<FulfilmentDetail> => {
    if (busyRef.current) throw new Error("Another fulfilment action is still running.");
    busyRef.current = true; setBusy(true);
    const key = fulfilmentKey(scope, groupBuyId, batchId);
    try {
      await qc.cancelQueries({ queryKey: key });
      const res = await fulfilmentRequest<FulfilmentDetail>(scope, groupBuyId, `/${encodeURIComponent(batchId)}${suffix}`, body, headers);
      qc.setQueryData(key, res);
      qc.invalidateQueries({ queryKey: [...fulfilmentKey(scope, groupBuyId), "pages"] });
      return res;
    } catch (error) {
      // A timeout/provider failure can follow a committed version claim.
      await qc.invalidateQueries({ queryKey: key });
      throw error;
    } finally { busyRef.current = false; setBusy(false); }
  };
  return { busy, run };
}
type Run = (suffix: string, body: unknown) => Promise<FulfilmentDetail>;

/* ---------- create package ---------- */
function CreateShipment({ d, busy, run, onDone }: { d: FulfilmentDetail; busy: boolean; run: Run; onDone: (m: string) => void }) {
  const [mode, setMode] = useState<"reshipper" | "direct">("reshipper");
  const [recipient, setRecipient] = useState("");
  const [directOrderId, setDirectOrderId] = useState("");
  const [labelText, setLabelText] = useState("");
  const [carrier, setCarrier] = useState("0");
  const [tracking, setTracking] = useState("");
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<Msg>(null);
  const requestKey = useRef<string>(crypto.randomUUID());

  const directOrders = d.orders.filter(o => o.direct);
  const unresolved = d.orders.filter(o => !o.direct && !o.reshipperUsername);
  const eligible: FulfilmentOrder[] = mode === "reshipper"
    ? d.orders.filter(o => !o.direct && o.reshipperUsername && o.reshipperUsername === recipient)
    : d.orders.filter(o => o.direct && o.id === directOrderId);
  const lines = eligible.flatMap(o => o.items.map(i => ({ o, i, left: Math.max(0, i.quantity - i.allocated) }))).filter(l => l.left > 0);

  const setQ = (k: string, v: string) => { setQty(q => ({ ...q, [k]: v })); setMsg(null); };
  const fillAll = () => setQty(Object.fromEntries(lines.map(l => [lineKey(l.o.id, l.i.productId), String(l.left)])));
  const reset = () => { setQty({}); setMsg(null); };

  const submit = async () => {
    const contents: { orderId: string; productId: string; quantity: number }[] = [];
    for (const l of lines) {
      const raw = qty[lineKey(l.o.id, l.i.productId)];
      if (raw === undefined || raw.trim() === "") continue;
      const n = Number(raw);
      if (!halfStep(n)) return setMsg({ err: true, text: `${l.o.code} ${l.i.productName}: use 0.5 steps.` });
      if (n > l.left) return setMsg({ err: true, text: `${l.o.code} ${l.i.productName}: only ${kits(l.left)} left to allocate.` });
      if (n > 0) contents.push({ orderId: l.o.id, productId: l.i.productId, quantity: n });
    }
    if (!labelText.trim()) return setMsg({ err: true, text: "Give the package a label (e.g. Box 1)." });
    if (!contents.length) return setMsg({ err: true, text: "Enter at least one quantity to pack." });
    const c = Number(carrier);
    if (!Number.isInteger(c) || c < 0) return setMsg({ err: true, text: "Carrier code must be a whole number (0 = auto-detect)." });
    try {
      await run("/shipments", {
        requestKey: requestKey.current, label: labelText.trim(),
        recipientUsername: mode === "reshipper" ? recipient : null, directOrderId: mode === "direct" ? directOrderId : null,
        carrier: c, ...(tracking.trim() ? { trackingNumber: tracking.trim() } : {}), ...(notes.trim() ? { notes: notes.trim() } : {}), contents,
      });
      requestKey.current = crypto.randomUUID();
      setQty({}); setLabelText(""); setTracking(""); setNotes(""); setMsg(null);
      onDone("Supplier package recorded. Member order statuses are unchanged.");
    } catch (e) { setMsg({ err: true, text: errText(e) }); }
  };

  const target = mode === "reshipper" ? recipient : directOrderId;
  return (
    <fieldset disabled={busy} data-testid="form-create-shipment" className="rounded-xl border p-3 space-y-3" style={{ borderColor: V.border }}>
      <legend className={`${label} px-1`} style={{ color: NAVY }}>New supplier package</legend>
      <ol className="text-[11px] list-decimal pl-4 space-y-0.5" style={{ color: V.muted }}>
        <li>Choose who the supplier is sending this box to.</li>
        <li>Enter exactly how many of each product are in the box.</li>
        <li>Add tracking now or later. Nothing changes for members until they are dispatched separately.</li>
      </ol>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Package destination">
        {(["reshipper", "direct"] as const).map(m => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} data-testid={`button-dest-${m}`}
            onClick={() => { setMode(m); reset(); }} className={ghost}
            style={mode === m ? { background: NAVY, color: "#fff", borderColor: NAVY } : { borderColor: V.border, color: V.text }}>
            {m === "reshipper" ? "Supplier → Reshipper" : "Supplier → Direct member"}
          </button>
        ))}
      </div>
      {mode === "reshipper" ? (
        <label className="block"><span className="block text-[11px] font-semibold mb-1" style={{ color: V.muted }}>Reshipper</span>
          <select data-testid="select-recipient" value={recipient} onChange={e => { setRecipient(e.target.value); reset(); }} className={inputCls} style={inputStyle}>
            <option value="">Choose reshipper…</option>
            {d.recipients.map(r => <option key={r} value={r}>{r}</option>)}
          </select></label>
      ) : (
        <label className="block"><span className="block text-[11px] font-semibold mb-1" style={{ color: V.muted }}>Direct-ship order</span>
          <select data-testid="select-direct-order" value={directOrderId} onChange={e => { setDirectOrderId(e.target.value); reset(); }} className={inputCls} style={inputStyle}>
            <option value="">Choose order…</option>
            {directOrders.map(o => <option key={o.id} value={o.id}>{o.code} · {o.username} · {o.country}</option>)}
          </select></label>
      )}
      {unresolved.length > 0 && (
        <p role="alert" className="text-[11px] text-amber-700">{unresolved.length} order{unresolved.length === 1 ? " has" : "s have"} no resolved route ({unresolved.slice(0, 5).map(o => o.code).join(", ")}{unresolved.length > 5 ? "…" : ""}) and cannot be packed until a reshipper or direct shipping is set.</p>
      )}
      {target && (lines.length === 0 ? (
        <p className="text-xs" style={{ color: V.muted }}>Everything for this destination is already allocated to packages.</p>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold" style={{ color: V.text }}>{lines.length} line{lines.length === 1 ? "" : "s"} still to allocate</span>
            <div className="flex gap-2">
              <button type="button" data-testid="button-fill-remaining" onClick={fillAll} className={ghost} style={{ borderColor: V.border, color: V.text }}>Fill all remaining</button>
              <button type="button" onClick={reset} className={ghost} style={{ borderColor: V.border, color: V.muted }}>Clear</button>
            </div>
          </div>
          <ul className="divide-y rounded-xl border max-h-80 overflow-y-auto" style={{ borderColor: V.border }}>
            {lines.map(l => {
              const k = lineKey(l.o.id, l.i.productId);
              return (
                <li key={k} className="flex flex-wrap items-center gap-2 p-2 text-xs" style={{ borderColor: V.border, color: V.text }}>
                  <span className="flex-1 min-w-[10rem]"><span className="font-mono">{l.o.code}</span> · {l.o.username}<span className="block" style={{ color: V.muted }}>{l.i.productName} · {kits(l.left)} unallocated of {kits(l.i.quantity)}</span></span>
                  <input aria-label={`Quantity of ${l.i.productName} for ${l.o.code}`} data-testid={`input-pack-${k}`} type="number" inputMode="decimal" min={0} max={l.left} step={0.5}
                    value={qty[k] ?? ""} placeholder="0" onChange={e => setQ(k, e.target.value)} className={`${inputCls} w-24`} style={inputStyle} />
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="grid gap-2 sm:grid-cols-2">
        <label><span className="block text-[11px] font-semibold mb-1" style={{ color: V.muted }}>Package label</span>
          <input data-testid="input-package-label" value={labelText} onChange={e => setLabelText(e.target.value)} placeholder="Box 1" className={inputCls} style={inputStyle} /></label>
        <label><span className="block text-[11px] font-semibold mb-1" style={{ color: V.muted }}>Carrier code (17TRACK, 0 = auto)</span>
          <input data-testid="input-package-carrier" type="number" min={0} step={1} value={carrier} onChange={e => setCarrier(e.target.value)} className={inputCls} style={inputStyle} /></label>
        <label className="sm:col-span-2"><span className="block text-[11px] font-semibold mb-1" style={{ color: V.muted }}>Tracking number (optional)</span>
          <input data-testid="input-package-tracking" value={tracking} onChange={e => setTracking(e.target.value)} className={`${inputCls} font-mono`} style={inputStyle} /></label>
        <label className="sm:col-span-2"><span className="block text-[11px] font-semibold mb-1" style={{ color: V.muted }}>Notes (optional)</span>
          <textarea data-testid="input-package-notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} style={inputStyle} /></label>
      </div>
      <MsgLine m={msg} id="text-create-shipment-msg" />
      <button type="button" data-testid="button-create-shipment" onClick={submit} disabled={busy || !target} className={btn} style={{ background: NAVY }}>
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Record package
      </button>
    </fieldset>
  );
}

/* ---------- shipment card ---------- */
function EditShipment({ s, busy, run, close, say }: { s: SupplierShipment; busy: boolean; run: Run; close: () => void; say: (m: Msg) => void }) {
  const [l, setL] = useState(s.label);
  const [carrier, setCarrier] = useState(String(s.carrier));
  const [tn, setTn] = useState(s.trackingNumber ?? "");
  const [params, setParams] = useState(Object.entries(s.trackingParams).map(([k, v]) => `${k}=${v}`).join("\n"));
  const [notes, setNotes] = useState(s.notes ?? "");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const identityChanged = Number(carrier) !== s.carrier || tn.trim().replace(/\s/g, "").toUpperCase() !== (s.trackingNumber ?? "")
    || params !== Object.entries(s.trackingParams).map(([k, v]) => `${k}=${v}`).join("\n");
  const save = async () => {
    const c = Number(carrier);
    if (!l.trim()) return setMsg({ err: true, text: "Label is required." });
    if (!Number.isInteger(c) || c < 0) return setMsg({ err: true, text: "Carrier code must be a whole number." });
    const trackingParams: Record<string, string> = {};
    for (const line of params.split("\n").map(x => x.trim()).filter(Boolean)) {
      const i = line.indexOf("=");
      if (i < 1) return setMsg({ err: true, text: `Tracking parameter "${line}" must look like key=value.` });
      trackingParams[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    if (identityChanged && s.trackingNumber && !reason.trim()) return setMsg({ err: true, text: "Changing the carrier or tracking number needs a reason." });
    try {
      await run(`/shipments/${encodeURIComponent(s.id)}/update`, { expectedVersion: s.version, label: l.trim(), carrier: c, trackingNumber: tn.trim() || null, trackingParams, notes: notes.trim() || null, reason: reason.trim() || null });
      say({ err: false, text: `${l.trim()} updated.` }); close();
    } catch (e) { setMsg({ err: true, text: errText(e) }); }
  };
  return (
    <fieldset disabled={busy} className="min-w-0 rounded-lg p-3 space-y-2 text-xs" style={{ background: V.tint, color: V.text }}>
      <div className="grid gap-2 sm:grid-cols-2">
        <label><span className="block font-semibold mb-1">Label</span><input value={l} onChange={e => setL(e.target.value)} className={inputCls} style={inputStyle} /></label>
        <label><span className="block font-semibold mb-1">Carrier code</span><input type="number" min={0} step={1} value={carrier} onChange={e => setCarrier(e.target.value)} className={inputCls} style={inputStyle} /></label>
        <label className="sm:col-span-2"><span className="block font-semibold mb-1">Tracking number</span><input data-testid={`input-edit-tracking-${s.id}`} value={tn} onChange={e => setTn(e.target.value)} className={`${inputCls} font-mono`} style={inputStyle} /></label>
        <label className="sm:col-span-2"><span className="block font-semibold mb-1">Tracking parameters (one key=value per line, optional)</span><textarea rows={2} value={params} onChange={e => setParams(e.target.value)} className={`${inputCls} font-mono`} style={inputStyle} /></label>
        <label className="sm:col-span-2"><span className="block font-semibold mb-1">Notes</span><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} style={inputStyle} /></label>
        <label className="sm:col-span-2"><span className="block font-semibold mb-1">Reason {identityChanged && s.trackingNumber ? "(required — tracking identity changed)" : "(optional)"}</span>
          <input data-testid={`input-edit-reason-${s.id}`} value={reason} onChange={e => setReason(e.target.value)} className={inputCls} style={inputStyle} /></label>
      </div>
      <MsgLine m={msg} id={`text-edit-msg-${s.id}`} />
      <div className="flex gap-2">
        <button type="button" data-testid={`button-save-shipment-${s.id}`} onClick={save} className={btn} style={{ background: NAVY }}>{busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save</button>
        <button type="button" onClick={close} className="px-3 font-semibold" style={{ color: V.muted }}>Cancel</button>
      </div>
    </fieldset>
  );
}

function ReceiveShipment({ s, busy, run, close, say }: { s: SupplierShipment; busy: boolean; run: Run; close: () => void; say: (m: Msg) => void }) {
  const existing = new Map(s.receipt.map(r => [lineKey(r.orderId, r.productId), r]));
  const [vals, setVals] = useState<Record<string, { good: string; damaged: string }>>(() =>
    Object.fromEntries(s.contents.map(c => { const r = existing.get(lineKey(c.orderId, c.productId)); return [lineKey(c.orderId, c.productId), { good: r ? String(r.good) : "", damaged: r ? String(r.damaged) : "" }]; })));
  const [notes, setNotes] = useState(s.receiptNotes ?? "");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const set = (k: string, f: "good" | "damaged", v: string) => { setVals(x => ({ ...x, [k]: { ...x[k], [f]: v } })); setConfirmed(false); setMsg(null); };
  const save = async () => {
    const receipt = [];
    for (const c of s.contents) {
      const k = lineKey(c.orderId, c.productId);
      const v = vals[k];
      if (v.good.trim() === "" || v.damaged.trim() === "") return setMsg({ err: true, text: `${c.code} ${c.productName}: enter good and damaged counts (use 0 if none).` });
      const good = Number(v.good), damaged = Number(v.damaged);
      if (!halfStep(good) || !halfStep(damaged)) return setMsg({ err: true, text: `${c.code} ${c.productName}: use 0.5 steps.` });
      if (good + damaged > c.quantity) return setMsg({ err: true, text: `${c.code} ${c.productName}: good + damaged cannot exceed ${kits(c.quantity)} expected.` });
      receipt.push({ orderId: c.orderId, productId: c.productId, good, damaged });
    }
    if (!confirmed) return setMsg({ err: true, text: "Tick the confirmation that you physically inspected every line." });
    if (s.receiptChecked && !reason.trim()) return setMsg({ err: true, text: "A reason is required to correct an existing receipt." });
    try {
      await run(`/shipments/${encodeURIComponent(s.id)}/receive`, { expectedVersion: s.version, receipt, notes: notes.trim() || null, ...(reason.trim() ? { reason: reason.trim() } : {}) });
      say({ err: false, text: `Receipt saved for ${s.label}. Member orders are not marked shipped.` }); close();
    } catch (e) { setMsg({ err: true, text: errText(e) }); }
  };
  return (
    <fieldset disabled={busy} data-testid={`form-receive-${s.id}`} className="min-w-0 rounded-lg p-3 space-y-2 text-xs" style={{ background: V.tint, color: V.text }}>
      <p>Open the box and count what arrived. Enter <b>total</b> good and damaged per line — not changes since last time. Enter 0 for anything missing.</p>
      {!s.receiptChecked && <div className="flex flex-wrap gap-2">
        <button type="button" className={ghost} style={{ borderColor: V.border, color: V.text }} onClick={() => {
          setVals(Object.fromEntries(s.contents.map(c => [lineKey(c.orderId, c.productId), { good: String(c.quantity), damaged: "0" }])));
          setConfirmed(false);
        }}>Fill expected quantities — all arrived usable</button>
        <button type="button" className={ghost} style={{ borderColor: V.border, color: V.text }} onClick={() => {
          setVals(Object.fromEntries(s.contents.map(c => [lineKey(c.orderId, c.productId), { good: "0", damaged: "0" }])));
          setConfirmed(false);
        }}>Start with zero received</button>
      </div>}
      <ul className="space-y-2">
        {s.contents.map(c => {
          const k = lineKey(c.orderId, c.productId);
          return (
            <li key={k} className="flex flex-wrap items-end gap-2">
              <span className="flex-1 min-w-[9rem]"><span className="font-mono">{c.code}</span> · {c.username}<span className="block" style={{ color: V.muted }}>{c.productName} · expected {kits(c.quantity)}</span></span>
              <label><span className="block text-[10px] font-semibold">Good</span><input data-testid={`input-good-${k}`} type="number" inputMode="decimal" min={0} max={c.quantity} step={0.5} value={vals[k].good} onChange={e => set(k, "good", e.target.value)} className={`${inputCls} w-20`} style={inputStyle} /></label>
              <label><span className="block text-[10px] font-semibold">Damaged</span><input data-testid={`input-damaged-${k}`} type="number" inputMode="decimal" min={0} max={c.quantity} step={0.5} value={vals[k].damaged} onChange={e => set(k, "damaged", e.target.value)} className={`${inputCls} w-20`} style={inputStyle} /></label>
            </li>
          );
        })}
      </ul>
      <label className="block"><span className="block font-semibold mb-1">Inspection notes</span><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} style={inputStyle} /></label>
      {s.receiptChecked && <label className="block"><span className="block font-semibold mb-1 text-amber-800">Correction reason (required)</span><input data-testid={`input-receive-reason-${s.id}`} value={reason} onChange={e => setReason(e.target.value)} className={inputCls} style={inputStyle} /></label>}
      <label className="flex items-start gap-2 font-semibold"><input type="checkbox" data-testid={`checkbox-inspected-${s.id}`} checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5" />
        I physically inspected this package and these counts are what arrived, including zeros.</label>
      <MsgLine m={msg} id={`text-receive-msg-${s.id}`} />
      <div className="flex gap-2">
        <button type="button" data-testid={`button-confirm-receive-${s.id}`} onClick={save} disabled={!confirmed} className={btn} style={{ background: NAVY }}>{busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save receipt</button>
        <button type="button" onClick={close} className="px-3 font-semibold" style={{ color: V.muted }}>Cancel</button>
      </div>
    </fieldset>
  );
}

function ShipmentCard({ s, canManage, busy, run }: { s: SupplierShipment; canManage: boolean; busy: boolean; run: Run }) {
  const [mode, setMode] = useState<"edit" | "receive" | "cancel" | null>(null);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const cancelled = !!s.cancelledAt;
  const rec = new Map(s.receipt.map(r => [lineKey(r.orderId, r.productId), r]));
  const expected = s.contents.reduce((a, c) => a + c.quantity, 0);
  const good = s.receipt.reduce((a, r) => a + r.good, 0), damaged = s.receipt.reduce((a, r) => a + r.damaged, 0);
  const missing = s.receiptChecked ? Math.max(0, expected - good - damaged) : 0;
  const refresh = async () => {
    setMsg(null);
    try { await run(`/shipments/${encodeURIComponent(s.id)}/refresh`, { expectedVersion: s.version }); setMsg({ err: false, text: "Tracking refreshed." }); }
    catch (e) { setMsg({ err: true, text: errText(e, "Tracking refresh failed.") }); }
  };
  const cancel = async () => {
    try { await run(`/shipments/${encodeURIComponent(s.id)}/cancel`, { expectedVersion: s.version, reason: reason.trim() }); setMode(null); setReason(""); setMsg({ err: false, text: "Package cancelled; contents returned to unallocated." }); }
    catch (e) { setMsg({ err: true, text: errText(e) }); }
  };
  return (
    <article data-testid={`card-shipment-${s.id}`} className={`rounded-xl border p-3 space-y-2 ${cancelled ? "opacity-70" : ""}`} style={{ borderColor: V.border, background: V.surface }}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold flex items-center gap-1.5" style={{ color: V.text }}><Package className="w-4 h-4" style={{ color: BLUE }} />{s.label}</span>
        <span className="flex flex-wrap gap-1">
          {cancelled ? <Chip tone="idle">Cancelled</Chip> : <>
            <Chip tone={s.trackingNumber ? "info" : "warn"}>{s.trackingNumber ? `Carrier: ${s.trackingStatus || "pending"}` : "No tracking"}</Chip>
            <Chip tone={!s.receiptChecked ? "idle" : missing || damaged ? "bad" : "ok"}>{!s.receiptChecked ? "Contents not checked" : missing || damaged ? "Checked · issues" : "Checked · complete"}</Chip>
          </>}
        </span>
      </header>
      <p className="text-[11px]" style={{ color: V.muted }}>
        Supplier → {s.recipientUsername ? `Reshipper ${s.recipientUsername}` : `Direct member${s.contents[0] ? ` ${s.contents[0].username}` : ""}`} · {kits(expected)} kits · created {fmt(s.createdAt)}
        {s.trackingNumber && <> · <span className="font-mono">{s.trackingNumber}</span> (carrier {s.carrier || "auto"}) · checked {fmt(s.lastChecked)}</>}
      </p>
      {!cancelled && s.trackingNumber && /deliver/i.test(s.trackingStatus) && !s.receiptChecked && (
        <p className="text-[11px] text-amber-700">Carrier says delivered, but nobody has confirmed the contents yet.</p>
      )}
      {cancelled && <p className="text-xs" style={{ color: V.text }}>Cancelled {fmt(s.cancelledAt)}{s.cancelReason ? ` — ${s.cancelReason}` : ""}</p>}
      {s.receiptChecked && (missing > 0 || damaged > 0) && (
        <p role="alert" className="text-xs text-red-600">{missing > 0 && `${kits(missing)} missing`}{missing > 0 && damaged > 0 && " · "}{damaged > 0 && `${kits(damaged)} damaged`}</p>
      )}
      <details className="text-xs">
        <summary className="cursor-pointer font-semibold" style={{ color: V.text }}>Contents ({s.contents.length} lines)</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead><tr style={{ color: V.muted }}><th className="py-1 pr-2">Order</th><th className="pr-2">Member</th><th className="pr-2">Product</th><th className="pr-2">Sent</th><th className="pr-2">Good</th><th>Damaged</th></tr></thead>
            <tbody>
              {s.contents.map(c => { const r = rec.get(lineKey(c.orderId, c.productId)); return (
                <tr key={lineKey(c.orderId, c.productId)} className="border-t" style={{ borderColor: V.border, color: V.text }}>
                  <td className="py-1 pr-2 font-mono">{c.code}</td><td className="pr-2">{c.username}</td><td className="pr-2">{c.productName}</td><td className="pr-2 tabular-nums">{kits(c.quantity)}</td>
                  <td className="pr-2 tabular-nums">{s.receiptChecked && r ? kits(r.good) : "—"}</td><td className={`tabular-nums ${r?.damaged ? "text-red-600" : ""}`}>{s.receiptChecked && r ? kits(r.damaged) : "—"}</td>
                </tr>); })}
            </tbody>
          </table>
        </div>
      </details>
      {s.trackingEvents.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer font-semibold" style={{ color: V.text }}>Carrier events ({s.trackingEvents.length})</summary>
          <ol className="mt-1 space-y-0.5 text-[11px]" style={{ color: V.text }}>
            {s.trackingEvents.map((e, i) => <li key={i}><span style={{ color: V.muted }}>{fmt(e.date)}</span> · {e.status}{e.location ? ` · ${e.location}` : ""}</li>)}
          </ol>
        </details>
      )}
      {(s.notes || s.receiptNotes) && (
        <div className="text-[11px] space-y-0.5" style={{ color: V.text }}>
          {s.notes && <p><span className="font-semibold">Notes:</span> {s.notes}</p>}
          {s.receiptNotes && <p><span className="font-semibold">Inspection:</span> {s.receiptNotes}</p>}
        </div>
      )}
      <MsgLine m={msg} id={`text-shipment-msg-${s.id}`} />
      {!cancelled && !mode && (
        <div className="flex flex-wrap gap-2">
          {s.canReceive && <button type="button" data-testid={`button-receive-${s.id}`} disabled={busy} onClick={() => setMode("receive")} className={btn} style={{ background: NAVY }}><ClipboardCheck className="w-3.5 h-3.5" /> {s.receiptChecked ? "Correct receipt" : "Check contents"}</button>}
          {s.trackingNumber && <button type="button" data-testid={`button-refresh-${s.id}`} disabled={busy} onClick={refresh} className={ghost} style={{ borderColor: V.border, color: V.text }}><RefreshCw className="w-3.5 h-3.5" /> Refresh tracking</button>}
          {canManage && <button type="button" data-testid={`button-edit-${s.id}`} disabled={busy} onClick={() => setMode("edit")} className={ghost} style={{ borderColor: V.border, color: V.text }}><Pencil className="w-3.5 h-3.5" /> Tracking & notes</button>}
          {canManage && !s.receiptChecked && <button type="button" data-testid={`button-cancel-${s.id}`} disabled={busy} onClick={() => setMode("cancel")} className={ghost} style={{ borderColor: V.border, color: "#b91c1c" }}><Ban className="w-3.5 h-3.5" /> Cancel package</button>}
        </div>
      )}
      {mode === "edit" && <EditShipment s={s} busy={busy} run={run} close={() => setMode(null)} say={setMsg} />}
      {mode === "receive" && <ReceiveShipment s={s} busy={busy} run={run} close={() => setMode(null)} say={setMsg} />}
      {mode === "cancel" && (
        <div className="rounded-lg p-3 text-xs space-y-2 bg-red-50">
          <p className="text-red-700">Cancelling is an audited correction. The contents become unallocated again. Use only if this package was recorded in error.</p>
          <label className="block"><span className="block font-semibold mb-1 text-red-700">Reason (required)</span>
            <input data-testid={`input-cancel-reason-${s.id}`} value={reason} onChange={e => setReason(e.target.value)} className={inputCls} style={inputStyle} /></label>
          <div className="flex gap-2">
            <button type="button" data-testid={`button-confirm-cancel-${s.id}`} disabled={busy || !reason.trim()} onClick={cancel} className={btn} style={{ background: "#ef4444" }}>Cancel package</button>
            <button type="button" onClick={() => setMode(null)} className="px-3 font-semibold" style={{ color: V.muted }}>Back</button>
          </div>
        </div>
      )}
    </article>
  );
}

/* ---------- orders ---------- */
function OrdersPanel({ orders, onViewOrder }: { orders: FulfilmentOrder[]; onViewOrder?: (orderId: string) => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "attention" | "ready" | "dispatched">("all");
  const [page, setPage] = useState(0);
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return orders.filter(o => {
      if (t && ![o.code, o.username, o.country, o.reshipperUsername ?? "", o.route].some(x => x.toLowerCase().includes(t))) return false;
      if (filter === "attention") return o.exceptions.length > 0;
      if (filter === "ready") return o.ready && o.exceptions.length === 0 && !isDispatched(o.status);
      if (filter === "dispatched") return isDispatched(o.status);
      return true;
    });
  }, [orders, q, filter]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const p = Math.min(page, pages - 1);
  return (
    <section className="space-y-2">
      <p className={label} style={{ color: "#8A9AAA" }}>Member orders in this batch</p>
      <div className="flex flex-wrap gap-2">
        <label className="relative flex-1 min-w-[12rem]"><Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: V.muted }} />
          <input aria-label="Search orders" data-testid="input-search-fulfilment-orders" value={q} onChange={e => { setQ(e.target.value); setPage(0); }} placeholder="Code, member, country, reshipper" className={`${inputCls} pl-8`} style={inputStyle} /></label>
        <select aria-label="Filter orders" value={filter} onChange={e => { setFilter(e.target.value as typeof filter); setPage(0); }} className={`${inputCls} w-auto`} style={inputStyle}>
          <option value="all">All</option><option value="attention">Has exceptions</option><option value="ready">Ready to dispatch</option><option value="dispatched">Dispatched</option>
        </select>
      </div>
      {rows.length === 0 ? <p className="text-xs py-3 text-center rounded-xl" style={{ color: V.muted, background: V.surface2 }}>No orders match.</p> : (
        <ul className="space-y-1.5">
          {rows.slice(p * PAGE, p * PAGE + PAGE).map(o => {
            const dispatched = isDispatched(o.status);
            const ready = o.ready && o.exceptions.length === 0;
            return (
              <li key={o.id} data-testid={`row-fulfilment-order-${o.id}`} className="rounded-xl border p-2 text-xs space-y-1" style={{ borderColor: V.border, color: V.text }}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {onViewOrder ? <button type="button" onClick={() => onViewOrder(o.id)} className="font-mono font-semibold underline" style={{ color: BLUE }} aria-label={`View order ${o.code}`}>{o.code}</button> : <span className="font-mono font-semibold">{o.code}</span>}<span>{o.username}</span><span style={{ color: V.muted }}>{o.country}</span>
                  <span className="flex-1" />
                  <Chip tone="idle">{o.status}</Chip>
                  {dispatched ? <Chip tone="ok">Dispatched</Chip> : ready ? <Chip tone="info">Ready</Chip> : <Chip tone="warn">Not ready</Chip>}
                </div>
                <p className="text-[11px]" style={{ color: V.muted }}>Route: {o.direct ? "Direct from supplier" : o.reshipperUsername ? `Via ${o.reshipperUsername}` : <span className="text-amber-700">Unresolved</span>}{o.route ? ` · ${o.route}` : ""}</p>
                <ul className="text-[11px] space-y-0.5">
                  {o.items.map(i => (
                    <li key={i.productId} className="flex flex-wrap gap-x-2 tabular-nums">
                      <span className="font-semibold">{i.productName} ×{kits(i.quantity)}</span>
                      <span style={{ color: V.muted }}>packed {kits(i.allocated)} · good {kits(i.received)}</span>
                      {i.damaged > 0 && <span className="text-red-600">damaged {kits(i.damaged)}</span>}
                    </li>
                  ))}
                </ul>
                {o.exceptions.length > 0 && <ul role="alert" className="text-[11px] text-red-600 list-disc pl-4">{o.exceptions.map((x, i) => <li key={i}>{x}</li>)}</ul>}
              </li>
            );
          })}
        </ul>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-between text-xs" style={{ color: V.muted }}>
          <button type="button" disabled={p === 0} onClick={() => setPage(p - 1)} className={ghost} style={{ borderColor: V.border, color: V.text }}>Previous</button>
          <span>Page {p + 1} of {pages} · {rows.length} orders</span>
          <button type="button" disabled={p >= pages - 1} onClick={() => setPage(p + 1)} className={ghost} style={{ borderColor: V.border, color: V.text }}>Next</button>
        </div>
      )}
    </section>
  );
}

const KIND_LABEL: Record<string, string> = {
  shipment_created: "Package recorded", shipment_updated: "Package updated", shipment_cancelled: "Package cancelled",
  shipment_received: "Contents checked", receipt_corrected: "Receipt corrected", tracking_refreshed: "Tracking refreshed",
};
function History({ items }: { items: FulfilmentDetail["history"] }) {
  if (!items.length) return null;
  return (
    <details className="text-xs">
      <summary className="cursor-pointer font-semibold" style={{ color: V.text }}>Audit history ({items.length})</summary>
      <ol className="mt-2 space-y-1.5">
        {items.map(h => {
          const { actor, label: l, reason, shipmentId: _s, ...rest } = h.detail;
          void _s;
          const extra = Object.entries(rest).filter(([, v]) => v !== null && v !== undefined && (typeof v === "string" || typeof v === "number" || typeof v === "boolean"));
          return (
            <li key={h.id} className="border-l-2 pl-2" style={{ borderColor: BLUE, color: V.text }}>
              <span className="font-semibold">{KIND_LABEL[h.kind] ?? h.kind.replace(/_/g, " ")}</span>
              {typeof l === "string" && <> · {l}</>}
              <span className="block text-[11px]" style={{ color: V.muted }}>{fmt(h.createdAt)}{typeof actor === "string" ? ` · ${actor}` : ""}</span>
              {typeof reason === "string" && reason && <span className="block text-[11px]">Reason: {reason}</span>}
              {extra.length > 0 && <span className="block text-[11px]" style={{ color: V.muted }}>{extra.map(([k, v]) => `${k.replace(/([A-Z])/g, " $1").toLowerCase()}: ${String(v)}`).join(" · ")}</span>}
            </li>
          );
        })}
      </ol>
    </details>
  );
}

/* ---------- detail ---------- */
function BatchDetail({ groupBuyId, scope, headers, batchId, onViewOrders, onDispatch }: Props & { batchId: string }) {
  const q = useQuery({
    queryKey: fulfilmentKey(scope, groupBuyId, batchId),
    queryFn: () => fulfilmentRequest<FulfilmentDetail>(scope, groupBuyId, `/${encodeURIComponent(batchId)}`, undefined, headers),
    retry: 1,
  });
  const { busy, run } = useActions(scope, groupBuyId, batchId, headers);
  const [msg, setMsg] = useState<Msg>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [creating, setCreating] = useState(false);
  if (q.isLoading) return <Skeleton label="Loading batch fulfilment" />;
  const d = q.data;
  if (!d) return <ErrorBox id="text-fulfilment-detail-error" text={`Could not load batch fulfilment: ${errText(q.error, "error")}`} onRetry={() => q.refetch()} />;
  const active = d.shipments.filter(s => !s.cancelledAt);
  const cancelled = d.shipments.filter(s => s.cancelledAt);
  const manifest = async () => { setMsg(null); try { await downloadPackingManifest(scope, groupBuyId, batchId, headers); } catch (e) { setMsg({ err: true, text: errText(e, "Manifest unavailable.") }); } };
  return (
    <div data-testid={`fulfilment-detail-${batchId}`} className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-mono text-sm font-bold" style={{ color: V.text }}>{d.batch.reference}</h4>
        <span className="text-xs" style={{ color: V.muted }}>{d.batch.region} · {d.batch.state}</span>
      </div>
      {q.isError && <p role="alert" className="text-xs text-red-600">Refresh failed; showing last loaded data.</p>}
      <Stats b={d.batch} />
      <div className="flex flex-wrap gap-2">
        <button type="button" data-testid={`button-manifest-${batchId}`} onClick={manifest} className={ghost} style={{ borderColor: V.border, color: V.text }}><Download className="w-3.5 h-3.5" /> Packing manifest</button>
        {onViewOrders && <button type="button" data-testid={`button-view-orders-${batchId}`} onClick={() => onViewOrders(batchId)} className={ghost} style={{ borderColor: V.border, color: V.text }}>View orders</button>}
        {onDispatch && d.orders.some(o => !o.direct) && <button type="button" data-testid={`button-go-dispatch-${batchId}`} onClick={onDispatch} className={ghost} style={{ borderColor: V.border, color: V.text }}><Truck className="w-3.5 h-3.5" /> Member dispatch</button>}
        <button type="button" onClick={() => q.refetch()} disabled={q.isFetching} className={ghost} style={{ borderColor: V.border, color: V.muted }}><RefreshCw className={`w-3.5 h-3.5 ${q.isFetching ? "animate-spin" : ""}`} /> Reload</button>
      </div>
      {d.orders.some(o => o.direct) && <p className="text-xs" style={{ color: V.muted }}>
        Direct supplier packages go to the member, not a reshipper. Use the linked member order to manage its delivery status and tracking; do not create another onward dispatch for it.
      </p>}
      <MsgLine m={msg} id={`text-fulfilment-msg-${batchId}`} />
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={label} style={{ color: "#8A9AAA" }}>Supplier packages ({active.length})</p>
          {d.canManage && <button type="button" data-testid={`button-new-package-${batchId}`} onClick={() => setCreating(c => !c)} className={creating ? ghost : btn} style={creating ? { borderColor: V.border, color: V.muted } : { background: NAVY }}>{creating ? "Close form" : "New package"}</button>}
        </div>
        <p className="text-[11px]" style={{ color: V.muted }}>Boxes the supplier sends to a reshipper or straight to a member. These are not the final parcels to members — member dispatch is handled separately and is never triggered from here.</p>
        {creating && d.canManage && <CreateShipment d={d} busy={busy} run={run} onDone={t => { setMsg({ err: false, text: t }); }} />}
        {active.length === 0 && (
          <div className="rounded-xl border border-dashed p-4 text-center text-xs" style={{ borderColor: V.border, color: V.muted }}>
            <Package className="w-5 h-5 mx-auto mb-1" style={{ color: BLUE }} />No supplier packages recorded yet.{d.canManage ? " Use New package once the supplier tells you how they are splitting the order." : ""}
          </div>
        )}
        {active.map(s => <ShipmentCard key={s.id} s={s} canManage={d.canManage} busy={busy} run={run} />)}
        {cancelled.length > 0 && (
          <button type="button" onClick={() => setShowCancelled(v => !v)} className="text-xs font-semibold" style={{ color: V.muted }}>{showCancelled ? "Hide" : "Show"} {cancelled.length} cancelled</button>
        )}
        {showCancelled && cancelled.map(s => <ShipmentCard key={s.id} s={s} canManage={false} busy={busy} run={run} />)}
      </section>
      <OrdersPanel orders={d.orders} onViewOrder={onViewOrders ? orderId => onViewOrders(batchId, orderId) : undefined} />
      <History items={d.history} />
    </div>
  );
}

/* ---------- overview ---------- */
interface Props {
  groupBuyId: string; scope: FulfilmentScope; headers?: Record<string, string>; initialBatchId?: string;
  onViewOrders?: (batchId: string, orderId?: string) => void; onDispatch?: () => void;
}
function Overview(props: Props) {
  const { groupBuyId, scope, headers } = props;
  const [open, setOpen] = useState<string | null>(null);
  const q = useInfiniteQuery({
    queryKey: [...fulfilmentKey(scope, groupBuyId), "pages"],
    queryFn: ({ pageParam }) => fulfilmentRequest<FulfilmentOverview>(scope, groupBuyId, `?cursor=${pageParam}`, undefined, headers),
    initialPageParam: 0,
    getNextPageParam: last => last.nextCursor ?? undefined,
    retry: 1,
  });
  if (q.isLoading) return <Skeleton label="Loading supplier fulfilment" />;
  if (!q.data) return <ErrorBox id="text-fulfilment-load-error" text={`Could not load supplier fulfilment: ${errText(q.error, "error")}`} onRetry={() => q.refetch()} />;
  const batches = q.data.pages.flatMap(p => p.batches);
  if (!batches.length) return (
    <div className="rounded-xl border border-dashed p-5 text-center text-xs" style={{ borderColor: V.border, color: V.muted }}>
      <Truck className="w-5 h-5 mx-auto mb-1" style={{ color: BLUE }} />No ordered supplier batches yet. Once a batch is marked ordered, its packages appear here.
    </div>
  );
  return (
    <div className="space-y-2">
      {q.isError && <p role="alert" className="text-xs text-red-600">Could not load more: {errText(q.error)}</p>}
      {batches.map(b => {
        const isOpen = open === b.id;
        return (
          <div key={b.id} data-testid={`card-fulfilment-${b.id}`} className="rounded-xl border overflow-hidden" style={{ borderColor: V.border }}>
            <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : b.id)} className="w-full text-left p-3 space-y-2" style={{ background: isOpen ? V.tint : "transparent" }}>
              <div className="flex flex-wrap items-center gap-2">
                {isOpen ? <ChevronDown className="w-4 h-4" style={{ color: NAVY }} /> : <ChevronRight className="w-4 h-4" style={{ color: NAVY }} />}
                <span className="text-sm font-bold font-mono" style={{ color: V.text }}>{b.reference}</span>
                <span className="text-[11px]" style={{ color: V.muted }}>{b.region}</span>
                <span className="flex-1" />
                <Chip tone="idle">{b.state}</Chip>
                {b.exceptionCount > 0 && <Chip tone="bad">{b.exceptionCount} exceptions</Chip>}
                {b.untracked > 0 && <Chip tone="warn">{b.untracked} untracked</Chip>}
              </div>
              <Stats b={b} />
            </button>
            {isOpen && <div className="p-3 border-t" style={{ borderColor: V.border }}><BatchDetail {...props} batchId={b.id} /></div>}
          </div>
        );
      })}
      {q.hasNextPage && (
        <button type="button" data-testid="button-load-more-fulfilment" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()} className={ghost} style={{ borderColor: V.border, color: V.text }}>
          {q.isFetchingNextPage && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Load more batches
        </button>
      )}
    </div>
  );
}

export function SupplierBatchFulfilment(props: Props) {
  const body = props.initialBatchId
    ? <BatchDetail key={`${props.scope}:${props.groupBuyId}:${props.initialBatchId}`} {...props} batchId={props.initialBatchId} />
    : <Overview key={`${props.scope}:${props.groupBuyId}`} {...props} />;
  return (
    <section data-testid="supplier-batch-fulfilment" aria-labelledby={`sbf-h-${props.groupBuyId}`} className="rounded-2xl border overflow-hidden" style={{ borderColor: V.border, background: V.surface, color: V.text }}>
      <header className="px-4 py-3 text-white" style={{ background: `linear-gradient(135deg, ${BLUE} 0%, ${NAVY} 100%)` }}>
        <h3 id={`sbf-h-${props.groupBuyId}`} className="text-sm font-bold">Supplier fulfilment</h3>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.8)" }}>Track supplier boxes to reshippers and direct members, then check what arrived. Checking contents never marks members shipped.</p>
      </header>
      <div className="p-4">{body}</div>
    </section>
  );
}
export default SupplierBatchFulfilment;
