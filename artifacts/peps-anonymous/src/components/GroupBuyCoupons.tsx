import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, RefreshCw, Tag, X, Save, AlertCircle } from "lucide-react";
import { Button, Input, Label, cn } from "@/components/ui";
import { formatGroupCouponAmount, groupCouponCurrency } from "@/lib/group-buy-coupon-currency";

export type Coupon = {
  id: string; groupBuyId: string; code: string; description: string | null;
  discountType: "percentage" | "fixed"; discountValue: number;
  maxUses: number | null; maxUsesPerAccount: number | null; minSubtotal: number;
  usageCount: number; isActive: boolean; expiresAt: string | null;
};

type Draft = {
  code: string; description: string; discountType: "percentage" | "fixed"; discountValue: string;
  maxUses: string; maxUsesPerAccount: string; minSubtotal: string; expiresAt: string; isActive: boolean;
};

const EMPTY: Draft = { code: "", description: "", discountType: "percentage", discountValue: "", maxUses: "", maxUsesPerAccount: "1", minSubtotal: "0", expiresAt: "", isActive: true };

/** Append a path segment to a URL while preserving its query string. */
export function couponUrl(endpoint: string, id: string): string {
  const q = endpoint.indexOf("?");
  const base = q === -1 ? endpoint : endpoint.slice(0, q);
  const query = q === -1 ? "" : endpoint.slice(q);
  return `${base.replace(/\/+$/, "")}/${encodeURIComponent(id)}${query}`;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fromCoupon(c: Coupon): Draft {
  return {
    code: c.code, description: c.description ?? "", discountType: c.discountType, discountValue: String(c.discountValue),
    maxUses: c.maxUses == null ? "" : String(c.maxUses), maxUsesPerAccount: c.maxUsesPerAccount == null ? "" : String(c.maxUsesPerAccount),
    minSubtotal: String(c.minSubtotal ?? 0), expiresAt: toLocalInput(c.expiresAt), isActive: c.isActive,
  };
}

function optInt(v: string, label: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new Error(`${label} must be a whole number of at least 1, or blank for unlimited.`);
  return n;
}

export function buildBody(d: Draft, isCreate: boolean): Record<string, unknown> {
  const value = Number(d.discountValue);
  if (!Number.isFinite(value) || value <= 0) throw new Error("Discount value must be greater than 0.");
  if (d.discountType === "percentage" && value > 100) throw new Error("Percentage discount cannot exceed 100.");
  const min = d.minSubtotal.trim() === "" ? 0 : Number(d.minSubtotal);
  if (!Number.isFinite(min) || min < 0) throw new Error("Minimum subtotal must be 0 or more.");
  let expiresAt: string | null = null;
  if (d.expiresAt) {
    const dt = new Date(d.expiresAt);
    if (isNaN(dt.getTime())) throw new Error("Expiry date is invalid.");
    expiresAt = dt.toISOString();
  }
  const body: Record<string, unknown> = {
    description: d.description.trim() || null, discountType: d.discountType, discountValue: value,
    maxUses: optInt(d.maxUses, "Total uses"), maxUsesPerAccount: optInt(d.maxUsesPerAccount, "Uses per account"),
    minSubtotal: min, expiresAt, isActive: d.isActive,
  };
  if (isCreate) {
    const code = d.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,40}$/.test(code)) throw new Error("Code must be 2-40 characters: letters, numbers, - or _.");
    body.code = code;
  }
  return body;
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include", headers: { "Content-Type": "application/json", ...(init.headers || {}) } });
  let data: unknown = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) {
    const msg = data && typeof data === "object" && "error" in data ? String((data as { error: unknown }).error) : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

const selectCls = "w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

export function GroupBuyCoupons({ endpoint, currency }: { endpoint: string; currency?: string | null }) {
  const couponCurrency = groupCouponCurrency(currency);
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; msg: string } | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);
  const endpointRef = useRef(endpoint);
  endpointRef.current = endpoint;

  const load = useCallback(async () => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setLoading(true); setLoadError("");
    try {
      const data = await request<Coupon[]>(endpoint, { signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      if (!Array.isArray(data)) throw new Error("Unexpected response from server.");
      setCoupons(data);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setLoadError(e instanceof Error ? e.message : "Failed to load coupons");
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    setCoupons(null); setEditing(null); setRowError(null);
    load();
    return () => ctrlRef.current?.abort();
  }, [load]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft(d => ({ ...d, [k]: v }));
  const openNew = () => { setDraft(EMPTY); setFormError(""); setEditing("new"); };
  const openEdit = (c: Coupon) => { setDraft(fromCoupon(c)); setFormError(""); setEditing(c.id); };

  const submit = async () => {
    const ep = endpoint;
    setFormError("");
    let body: Record<string, unknown>;
    try { body = buildBody(draft, editing === "new"); } catch (e) { setFormError((e as Error).message); return; }
    setSubmitting(true);
    try {
      const saved = editing === "new"
        ? await request<Coupon>(ep, { method: "POST", body: JSON.stringify(body) })
        : await request<Coupon>(couponUrl(ep, editing as string), { method: "PATCH", body: JSON.stringify(body) });
      if (endpointRef.current !== ep) return;
      setCoupons(list => editing === "new" ? [saved, ...(list ?? [])] : (list ?? []).map(c => c.id === saved.id ? saved : c));
      setEditing(null);
      load();
    } catch (e) {
      if (endpointRef.current === ep) setFormError(e instanceof Error ? e.message : "Failed to save coupon");
    } finally {
      if (endpointRef.current === ep) setSubmitting(false);
    }
  };

  const rowAction = async (c: Coupon, kind: "toggle" | "delete") => {
    if (kind === "delete" && !window.confirm(`Delete coupon ${c.code}? This cannot be undone.`)) return;
    const ep = endpoint;
    setBusyId(c.id); setRowError(null);
    try {
      if (kind === "toggle") {
        const saved = await request<Coupon>(couponUrl(ep, c.id), { method: "PATCH", body: JSON.stringify({ isActive: !c.isActive }) });
        if (endpointRef.current === ep) setCoupons(list => (list ?? []).map(x => x.id === saved.id ? saved : x));
      } else {
        await request<{ ok: true }>(couponUrl(ep, c.id), { method: "DELETE" });
        if (endpointRef.current === ep) setCoupons(list => (list ?? []).filter(x => x.id !== c.id));
      }
      if (endpointRef.current === ep) load();
    } catch (e) {
      if (endpointRef.current === ep) setRowError({ id: c.id, msg: e instanceof Error ? e.message : "Action failed" });
    } finally {
      if (endpointRef.current === ep) setBusyId(null);
    }
  };

  const fmtDiscount = (c: Coupon) => c.discountType === "percentage" ? `${c.discountValue}% off` : `${formatGroupCouponAmount(c.discountValue, couponCurrency)} off`;
  const expired = (c: Coupon) => !!c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();

  const form = editing && (
    <div className="rounded-xl border p-4 space-y-3 bg-muted/20" style={{ borderColor: "rgba(45,107,204,0.25)" }} role="group" aria-label={editing === "new" ? "New coupon" : "Edit coupon"}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#1B3A7A" }}>{editing === "new" ? "New coupon" : `Edit ${draft.code}`}</p>
        <button type="button" onClick={() => setEditing(null)} aria-label="Cancel" className="p-1 rounded-lg text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="cpn-code" className="text-xs">Code</Label>
          <Input id="cpn-code" value={draft.code} disabled={editing !== "new"} onChange={e => set("code", e.target.value.toUpperCase())} placeholder="e.g. SPRING10" className="font-mono uppercase" autoComplete="off" />
          <p className="text-[11px] text-muted-foreground">{editing === "new" ? "Must be unique across the whole site. Cannot be changed later." : "Codes cannot be changed after creation."}</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cpn-desc" className="text-xs">Description (optional)</Label>
          <Input id="cpn-desc" value={draft.description} onChange={e => set("description", e.target.value)} placeholder="Internal note or customer-facing label" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cpn-type" className="text-xs">Discount type</Label>
          <select id="cpn-type" value={draft.discountType} onChange={e => set("discountType", e.target.value as Draft["discountType"])} className={selectCls}>
            <option value="percentage">Percentage of product subtotal</option>
            <option value="fixed">Fixed amount ({couponCurrency})</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cpn-value" className="text-xs">Discount value {draft.discountType === "percentage" ? "(%)" : `(${couponCurrency})`}</Label>
          <Input id="cpn-value" type="number" inputMode="decimal" min="0" max={draft.discountType === "percentage" ? 100 : undefined} step="0.01" value={draft.discountValue} onChange={e => set("discountValue", e.target.value)} placeholder={draft.discountType === "percentage" ? "1 - 100" : "0.00"} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cpn-max" className="text-xs">Total uses</Label>
          <Input id="cpn-max" type="number" min="1" step="1" value={draft.maxUses} onChange={e => set("maxUses", e.target.value)} placeholder="Unlimited" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cpn-per" className="text-xs">Uses per account</Label>
          <Input id="cpn-per" type="number" min="1" step="1" value={draft.maxUsesPerAccount} onChange={e => set("maxUsesPerAccount", e.target.value)} placeholder="Unlimited" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cpn-min" className="text-xs">Minimum product subtotal ({couponCurrency})</Label>
          <Input id="cpn-min" type="number" min="0" step="0.01" value={draft.minSubtotal} onChange={e => set("minSubtotal", e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cpn-exp" className="text-xs">Expires (optional)</Label>
          <Input id="cpn-exp" type="datetime-local" value={draft.expiresAt} onChange={e => set("expiresAt", e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input type="checkbox" checked={draft.isActive} onChange={e => set("isActive", e.target.checked)} className="rounded" />
        Active (customers can redeem it)
      </label>
      <p className="text-[11px] text-muted-foreground">Leave limits blank for unlimited. The discount applies to the product subtotal only — never to shipping, tips or fees.</p>
      {formError && <p role="alert" className="text-xs text-destructive font-medium flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{formError}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={submit} disabled={submitting} className="gap-1.5">
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {editing === "new" ? "Create coupon" : "Save changes"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setEditing(null)} disabled={submitting}>Cancel</Button>
      </div>
    </div>
  );

  return (
    <section className="space-y-3" aria-labelledby="gb-coupons-heading" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4" style={{ color: "#2D6BCC" }} />
          <h3 id="gb-coupons-heading" className="text-sm font-bold text-foreground">Coupons</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5" aria-label="Refresh coupons">
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />Refresh
          </Button>
          <Button type="button" size="sm" onClick={openNew} disabled={editing === "new"} className="gap-1.5"><Plus className="w-3.5 h-3.5" />New coupon</Button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">Coupons only work on this group buy. Discounts apply to the product subtotal only, not shipping, tips or fees. Used coupons can be disabled but not deleted.</p>
      <p className="text-[11px] text-muted-foreground">Fixed discounts and minimum spend are in {couponCurrency}, the group buy&apos;s currency.</p>

      {editing === "new" && form}

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <span className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{loadError}</span>
          <button type="button" onClick={load} className="font-semibold underline">Retry</button>
        </div>
      )}

      {loading && coupons === null ? (
        <div className="space-y-2" aria-label="Loading coupons">
          {[0, 1].map(i => <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />)}
        </div>
      ) : coupons && coupons.length === 0 && editing !== "new" ? (
        <div className="rounded-xl border border-dashed p-6 text-center" style={{ borderColor: "#D0DAE4" }}>
          <p className="text-sm font-semibold text-foreground">No coupons yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create a code to give members a discount on this group buy.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {(coupons ?? []).map(c => (
            <li key={c.id} className="rounded-xl border border-border p-3 space-y-2">
              {editing === c.id ? form : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold" style={{ color: "#1B3A7A" }}>{c.code}</span>
                        <span className="text-xs font-semibold" style={{ color: "#2D6BCC" }}>{fmtDiscount(c)}</span>
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md", c.isActive && !expired(c) ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground")}>
                          {expired(c) ? "Expired" : c.isActive ? "Active" : "Disabled"}
                        </span>
                      </div>
                      {c.description && <p className="text-xs text-muted-foreground break-words">{c.description}</p>}
                      <p className="text-[11px] text-muted-foreground">
                        Used {c.usageCount}{c.maxUses != null ? ` / ${c.maxUses}` : " (unlimited)"} · {c.maxUsesPerAccount != null ? `${c.maxUsesPerAccount} per account` : "unlimited per account"}
                        {c.minSubtotal > 0 && ` · min ${formatGroupCouponAmount(c.minSubtotal, couponCurrency)}`}
                        {c.expiresAt && ` · ${expired(c) ? "expired" : "expires"} ${new Date(c.expiresAt).toLocaleString()}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                        <input type="checkbox" checked={c.isActive} disabled={busyId === c.id} onChange={() => rowAction(c, "toggle")} className="rounded" aria-label={`${c.isActive ? "Disable" : "Enable"} ${c.code}`} />
                        Enabled
                      </label>
                      <Button type="button" size="sm" variant="outline" onClick={() => openEdit(c)} disabled={busyId === c.id} className="gap-1" aria-label={`Edit ${c.code}`}><Pencil className="w-3.5 h-3.5" />Edit</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => rowAction(c, "delete")} disabled={busyId === c.id || c.usageCount > 0}
                        title={c.usageCount > 0 ? "Used coupons can only be disabled" : undefined} className="gap-1 text-red-600" aria-label={`Delete ${c.code}`}>
                        {busyId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}Delete
                      </Button>
                    </div>
                  </div>
                  {rowError?.id === c.id && <p role="alert" className="text-xs text-destructive font-medium">{rowError.msg}</p>}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
