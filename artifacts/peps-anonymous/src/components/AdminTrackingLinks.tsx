import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Trash2, RefreshCw, ExternalLink, Copy, Check, Loader2,
  Package, ChevronDown, ChevronUp, Pencil, X, Save, Link2, Box,
  Search, Globe, StickyNote,
} from "lucide-react";
import { CARRIERS_17TRACK } from "@/lib/carriers";

const apiUrl = (path: string) => `/api${path}`;

type TrackingEvent = { date: string; status: string; location: string; };
type TrackingPackage = {
  id: string; label: string; carrier: string; carrierCode: number;
  trackingNumber: string; customTrackingUrl?: string; notes?: string;
  status: string; statusCode: number; items: string[];
  cachedEvents: TrackingEvent[]; lastChecked: string | null;
};
type TrackingLink = {
  id: string; slug: string; title: string; description: string | null;
  packages: TrackingPackage[]; createdAt: string; updatedAt: string;
};
type Product = { id: string; name: string; active: boolean; };

const STATUS_COLORS: Record<string, { label: string; color: string }> = {
  pending:          { label: "Pending",          color: "#94A3B8" },
  in_transit:       { label: "In Transit",       color: "#3B82F6" },
  out_for_delivery: { label: "Out for Delivery", color: "#F59E0B" },
  attempted:        { label: "Attempted",        color: "#F97316" },
  delivered:        { label: "Delivered",        color: "#22C55E" },
  exception:        { label: "Exception",        color: "#EF4444" },
  expired:          { label: "Expired",          color: "#64748B" },
};

function copyText(text: string, setCopied: (v: boolean) => void) {
  navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
}
function getPublicUrl(slug: string): string { return `${window.location.origin}/track/${slug}`; }
function fmtDate(d: string): string {
  try { return new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return d; }
}

// ── Region order for the carrier dropdown ─────────────────────────────────────
const REGION_ORDER = ["General", "United Kingdom", "Europe", "China", "Australia", "Canada", "United States", "Postal Services", "Regional Carriers"];

function groupByRegion(carriers: typeof CARRIERS_17TRACK) {
  const map: Record<string, typeof CARRIERS_17TRACK> = {};
  for (const c of carriers) {
    if (!map[c.region]) map[c.region] = [];
    map[c.region].push(c);
  }
  const ordered: [string, typeof CARRIERS_17TRACK][] = [];
  for (const r of REGION_ORDER) { if (map[r]) ordered.push([r, map[r]]); }
  for (const [r, arr] of Object.entries(map)) {
    if (!REGION_ORDER.includes(r)) ordered.push([r, arr]);
  }
  return ordered;
}

// ── Carrier Select ─────────────────────────────────────────────────────────────
function CarrierSelect({ value, onChange }: {
  value: { label: string; code: number };
  onChange: (v: { label: string; code: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = search.trim()
    ? CARRIERS_17TRACK.filter(c => c.label.toLowerCase().includes(search.toLowerCase()))
    : CARRIERS_17TRACK;

  const grouped = search.trim() ? null : groupByRegion(filtered);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full h-8 px-2.5 text-sm rounded-lg border border-input bg-background flex items-center justify-between gap-1 hover:border-blue-400 transition-colors"
      >
        <span className="truncate">{value.label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-72 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-1.5 h-7 px-2 rounded-lg bg-muted/60">
              <Search className="w-3 h-3 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search carriers..."
                className="flex-1 text-xs bg-transparent outline-none"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto text-sm">
            {grouped ? (
              grouped.map(([region, carriers]) => (
                <div key={region}>
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 sticky top-0">{region}</p>
                  {carriers.map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => { onChange({ label: c.label, code: c.code }); setOpen(false); setSearch(""); }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 hover:bg-muted/60 text-left transition-colors ${value.code === c.code ? "bg-blue-50 text-blue-700 font-medium" : ""}`}
                    >
                      <span className="text-xs">{c.label}</span>
                      {c.code > 0 && <span className="text-[10px] text-muted-foreground ml-2">{c.code}</span>}
                    </button>
                  ))}
                </div>
              ))
            ) : (
              filtered.length === 0 ? (
                <p className="px-3 py-4 text-xs text-muted-foreground text-center">No carriers found</p>
              ) : (
                filtered.map(c => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => { onChange({ label: c.label, code: c.code }); setOpen(false); setSearch(""); }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 hover:bg-muted/60 text-left transition-colors ${value.code === c.code ? "bg-blue-50 text-blue-700 font-medium" : ""}`}
                  >
                    <span className="text-xs">{c.label}</span>
                    {c.code > 0 && <span className="text-[10px] text-muted-foreground ml-2">{c.code}</span>}
                  </button>
                ))
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Package Form (shared between add and edit) ─────────────────────────────────
type PkgFormState = {
  label: string;
  carrier: { label: string; code: number };
  trackingNumber: string;
  customTrackingUrl: string;
  notes: string;
  itemMode: "catalogue" | "custom";
  selectedItems: string[];
  customItemsText: string;
};

const EMPTY_FORM: PkgFormState = {
  label: "",
  carrier: { label: "Auto Detect", code: 0 },
  trackingNumber: "",
  customTrackingUrl: "",
  notes: "",
  itemMode: "catalogue",
  selectedItems: [],
  customItemsText: "",
};

function formToItems(form: PkgFormState): string[] {
  return form.itemMode === "catalogue"
    ? form.selectedItems
    : form.customItemsText.split("\n").map(s => s.trim()).filter(Boolean);
}

function pkgToForm(pkg: TrackingPackage): PkgFormState {
  return {
    label: pkg.label,
    carrier: { label: pkg.carrier, code: pkg.carrierCode ?? 0 },
    trackingNumber: pkg.trackingNumber,
    customTrackingUrl: pkg.customTrackingUrl ?? "",
    notes: pkg.notes ?? "",
    itemMode: "custom",
    selectedItems: pkg.items,
    customItemsText: pkg.items.join("\n"),
  };
}

function PackageFormFields({ form, setForm, products }: {
  form: PkgFormState;
  setForm: (fn: (f: PkgFormState) => PkgFormState) => void;
  products: Product[];
}) {
  const activeProducts = products.filter(p => p.active);
  const [selectedProduct, setSelectedProduct] = useState("");

  const addProduct = () => {
    if (!selectedProduct) return;
    setForm(f => ({ ...f, selectedItems: [...f.selectedItems, selectedProduct] }));
    setSelectedProduct("");
  };
  const removeItem = (idx: number) => setForm(f => ({ ...f, selectedItems: f.selectedItems.filter((_, i) => i !== idx) }));

  return (
    <div className="space-y-2.5">
      {/* Label */}
      <div>
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Label *</label>
        <input
          value={form.label}
          onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
          placeholder="e.g. Batch A — UK members"
          className="mt-1 w-full h-8 px-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:border-blue-400"
        />
      </div>

      {/* Tracking Number + Carrier */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tracking Number *</label>
          <input
            value={form.trackingNumber}
            onChange={e => setForm(f => ({ ...f, trackingNumber: e.target.value }))}
            placeholder="GB12345678UK"
            className="mt-1 w-full h-8 px-2.5 text-sm font-mono rounded-lg border border-input bg-background focus:outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Carrier</label>
          <div className="mt-1">
            <CarrierSelect value={form.carrier} onChange={c => setForm(f => ({ ...f, carrier: c }))} />
          </div>
        </div>
      </div>

      {/* Custom Tracking URL */}
      <div>
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Globe className="w-2.5 h-2.5" /> Custom Tracking URL
          <span className="normal-case text-[9px] font-normal opacity-60 ml-1">(for carriers not on 17track)</span>
        </label>
        <input
          value={form.customTrackingUrl}
          onChange={e => setForm(f => ({ ...f, customTrackingUrl: e.target.value }))}
          placeholder="https://gly-express.com/track?n=..."
          className="mt-1 w-full h-8 px-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:border-blue-400"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <StickyNote className="w-2.5 h-2.5" /> Notes
          <span className="normal-case text-[9px] font-normal opacity-60 ml-1">(internal only)</span>
        </label>
        <input
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Optional internal notes"
          className="mt-1 w-full h-8 px-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:border-blue-400"
        />
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Items in this parcel</label>
          <div className="flex rounded-lg border border-border overflow-hidden text-[11px]">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, itemMode: "catalogue" }))}
              className={`px-2.5 py-1 transition-colors ${form.itemMode === "catalogue" ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted/50"}`}
            >
              From Catalogue
            </button>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, itemMode: "custom" }))}
              className={`px-2.5 py-1 border-l border-border transition-colors ${form.itemMode === "custom" ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted/50"}`}
            >
              Custom
            </button>
          </div>
        </div>

        {form.itemMode === "catalogue" ? (
          <div className="space-y-2">
            <div className="flex gap-1.5">
              <select
                value={selectedProduct}
                onChange={e => setSelectedProduct(e.target.value)}
                className="flex-1 h-8 px-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:border-blue-400"
              >
                <option value="">Select product...</option>
                {activeProducts.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={addProduct}
                disabled={!selectedProduct}
                className="h-8 px-3 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                Add
              </button>
            </div>
            {form.selectedItems.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {form.selectedItems.map((item, i) => (
                  <span key={i} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg font-medium" style={{ background: "rgba(37,99,235,0.08)", color: "#1E40AF" }}>
                    <Box className="w-2.5 h-2.5" />{item}
                    <button type="button" onClick={() => removeItem(i)} className="ml-0.5 hover:text-red-500 transition-colors"><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">No items added yet.</p>
            )}
          </div>
        ) : (
          <textarea
            value={form.customItemsText}
            onChange={e => setForm(f => ({ ...f, customItemsText: e.target.value }))}
            rows={3}
            placeholder={"BPC-157\nTB-500"}
            className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:border-blue-400 resize-none"
          />
        )}
      </div>
    </div>
  );
}

// ── Package Row ────────────────────────────────────────────────────────────────
function PackageRow({ pkg, linkId, secret, products, onUpdate }: {
  pkg: TrackingPackage; linkId: string; secret: string;
  products: Product[]; onUpdate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PkgFormState>(pkgToForm(pkg));
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const sc = STATUS_COLORS[pkg.status] ?? STATUS_COLORS.pending;

  const doRefresh = async () => {
    setRefreshing(true); setRefreshMsg(null);
    try {
      const r = await fetch(apiUrl(`/admin/tracking-links/${linkId}/packages/${pkg.id}/refresh`), {
        method: "POST", headers: { "x-admin-secret": secret },
      });
      const d = await r.json();
      setRefreshMsg(d.ok ? `Updated — ${d.events} event(s)` : (d.reason ?? "No data yet"));
      onUpdate();
    } catch { setRefreshMsg("Error refreshing"); }
    setRefreshing(false);
  };

  const doDelete = async () => {
    if (!confirm(`Delete package "${pkg.label}"?`)) return;
    setDeleting(true);
    await fetch(apiUrl(`/admin/tracking-links/${linkId}/packages/${pkg.id}`), {
      method: "DELETE", headers: { "x-admin-secret": secret },
    });
    onUpdate();
  };

  const doSave = async () => {
    setSaving(true);
    await fetch(apiUrl(`/admin/tracking-links/${linkId}/packages/${pkg.id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({
        label: form.label, carrier: form.carrier.label, carrierCode: form.carrier.code,
        trackingNumber: form.trackingNumber, customTrackingUrl: form.customTrackingUrl,
        notes: form.notes, items: formToItems(form),
      }),
    });
    setSaving(false); setEditing(false); onUpdate();
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => setOpen(o => !o)}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: sc.color }} />
        <p className="flex-1 text-sm font-medium min-w-0 truncate">{pkg.label}</p>
        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full border" style={{ color: sc.color, borderColor: sc.color + "40", background: sc.color + "10" }}>{sc.label}</span>
        <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">{pkg.trackingNumber}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </div>

      {open && (
        <div className="border-t border-border px-3 py-3 space-y-3 bg-muted/10">
          {!editing ? (
            <>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Tracking #</span><p className="font-mono font-medium">{pkg.trackingNumber}</p></div>
                <div><span className="text-muted-foreground">Carrier</span><p className="font-medium">{pkg.carrier}{pkg.carrierCode > 0 ? ` (${pkg.carrierCode})` : ""}</p></div>
              </div>
              {pkg.customTrackingUrl && (
                <div className="text-xs"><span className="text-muted-foreground">Tracking URL</span>
                  <a href={pkg.customTrackingUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline mt-0.5 truncate">
                    <ExternalLink className="w-3 h-3 shrink-0" />{pkg.customTrackingUrl}
                  </a>
                </div>
              )}
              {pkg.notes && <div className="text-xs"><span className="text-muted-foreground">Notes</span><p className="mt-0.5 text-foreground/80">{pkg.notes}</p></div>}
              {pkg.items.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Contents</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pkg.items.map((item, i) => (
                      <span key={i} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg font-medium" style={{ background: "rgba(37,99,235,0.08)", color: "#1E40AF" }}>
                        <Box className="w-2.5 h-2.5" />{item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {pkg.cachedEvents.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Latest events</p>
                  <div className="space-y-1">
                    {[...pkg.cachedEvents].sort((a, b) => (b.date > a.date ? 1 : -1)).slice(0, 3).map((ev, i) => (
                      <div key={i} className="text-xs flex items-start gap-2">
                        <span className="text-muted-foreground shrink-0">{ev.location || "—"}</span>
                        <span className="flex-1">{ev.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {pkg.lastChecked && <p className="text-[10px] text-muted-foreground">Last checked: {fmtDate(pkg.lastChecked)}</p>}
              {refreshMsg && <p className="text-xs text-blue-600">{refreshMsg}</p>}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button onClick={doRefresh} disabled={refreshing} className="flex items-center gap-1 text-xs h-7 px-3 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50">
                  {refreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Refresh
                </button>
                <button onClick={() => { setForm(pkgToForm(pkg)); setEditing(true); }} className="flex items-center gap-1 text-xs h-7 px-3 rounded-lg border border-border hover:bg-muted transition-colors">
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button onClick={doDelete} disabled={deleting} className="flex items-center gap-1 text-xs h-7 px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 ml-auto">
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Delete
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <PackageFormFields form={form} setForm={setForm} products={products} />
              <div className="flex gap-2 pt-1">
                <button onClick={doSave} disabled={saving} className="flex items-center gap-1 text-xs h-7 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                </button>
                <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-xs h-7 px-3 rounded-lg border border-border hover:bg-muted transition-colors">
                  <X className="w-3 h-3" /> Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tracking Link Card ─────────────────────────────────────────────────────────
function TrackingLinkCard({ link, secret, products, onUpdate, onDelete }: {
  link: TrackingLink; secret: string; products: Product[];
  onUpdate: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAddPkg, setShowAddPkg] = useState(false);
  const [pkgForm, setPkgForm] = useState<PkgFormState>(EMPTY_FORM);
  const [addingPkg, setAddingPkg] = useState(false);
  const [pkgErr, setPkgErr] = useState("");
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaForm, setMetaForm] = useState({ title: link.title, description: link.description ?? "" });
  const [savingMeta, setSavingMeta] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const publicUrl = getPublicUrl(link.slug);

  const addPackage = async () => {
    if (!pkgForm.label.trim()) { setPkgErr("Label is required"); return; }
    if (!pkgForm.trackingNumber.trim()) { setPkgErr("Tracking number is required"); return; }
    setAddingPkg(true); setPkgErr("");
    try {
      const r = await fetch(apiUrl(`/admin/tracking-links/${link.id}/packages`), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          label: pkgForm.label, carrier: pkgForm.carrier.label, carrierCode: pkgForm.carrier.code,
          trackingNumber: pkgForm.trackingNumber, customTrackingUrl: pkgForm.customTrackingUrl,
          notes: pkgForm.notes, items: formToItems(pkgForm),
        }),
      });
      if (!r.ok) { const d = await r.json(); setPkgErr(d.error ?? "Failed"); }
      else { setPkgForm(EMPTY_FORM); setShowAddPkg(false); onUpdate(); }
    } catch { setPkgErr("Connection error"); }
    setAddingPkg(false);
  };

  const saveMeta = async () => {
    setSavingMeta(true);
    await fetch(apiUrl(`/admin/tracking-links/${link.id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ title: metaForm.title, description: metaForm.description }),
    });
    setSavingMeta(false); setEditingMeta(false); onUpdate();
  };

  const doDelete = async () => {
    if (!confirm(`Delete tracking page "${link.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(apiUrl(`/admin/tracking-links/${link.id}`), { method: "DELETE", headers: { "x-admin-secret": secret } });
    onDelete();
  };

  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(37,99,235,0.08)" }}>
          <Link2 className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          {!editingMeta ? (
            <>
              <p className="font-semibold text-sm leading-tight">{link.title}</p>
              {link.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{link.description}</p>}
            </>
          ) : (
            <div className="space-y-1.5">
              <input value={metaForm.title} onChange={e => setMetaForm(f => ({ ...f, title: e.target.value }))} className="w-full h-7 px-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:border-blue-400" />
              <input value={metaForm.description} onChange={e => setMetaForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" className="w-full h-7 px-2 text-xs rounded-lg border border-input bg-background focus:outline-none focus:border-blue-400" />
              <div className="flex gap-2">
                <button onClick={saveMeta} disabled={savingMeta} className="flex items-center gap-1 text-xs h-6 px-2 rounded-lg bg-primary text-primary-foreground">
                  {savingMeta ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                </button>
                <button onClick={() => setEditingMeta(false)} className="flex items-center gap-1 text-xs h-6 px-2 rounded-lg border border-border"><X className="w-3 h-3" /> Cancel</button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[180px]">/track/{link.slug}</span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground">{link.packages.length} package{link.packages.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => copyText(publicUrl, setCopied)} title="Copy link" className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" title="Open tracking page" className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </a>
          <button onClick={() => setOpen(o => !o)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
            {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {link.packages.length > 0 && (
            <div className="space-y-2">
              {link.packages.map(pkg => (
                <PackageRow key={pkg.id} pkg={pkg} linkId={link.id} secret={secret} products={products} onUpdate={onUpdate} />
              ))}
            </div>
          )}

          {showAddPkg ? (
            <div className="border border-dashed border-border rounded-xl p-3 space-y-2.5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Add Parcel</p>
              <PackageFormFields form={pkgForm} setForm={setPkgForm} products={products} />
              {pkgErr && <p className="text-xs text-red-500">{pkgErr}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={addPackage} disabled={addingPkg} className="flex items-center gap-1.5 text-xs h-8 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium">
                  {addingPkg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />} Add Parcel
                </button>
                <button onClick={() => { setShowAddPkg(false); setPkgForm(EMPTY_FORM); }} className="flex items-center gap-1 text-xs h-8 px-3 rounded-lg border border-border hover:bg-muted transition-colors">
                  <X className="w-3 h-3" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddPkg(true)} className="w-full flex items-center justify-center gap-1.5 text-xs h-8 rounded-xl border border-dashed border-border text-muted-foreground hover:bg-muted/50 transition-colors">
              <Plus className="w-3 h-3" /> Add Package
            </button>
          )}

          <div className="flex items-center gap-2 pt-1 border-t border-border">
            <button onClick={() => setEditingMeta(true)} className="flex items-center gap-1 text-xs h-7 px-3 rounded-lg border border-border hover:bg-muted transition-colors">
              <Pencil className="w-3 h-3" /> Edit details
            </button>
            <button onClick={doDelete} disabled={deleting} className="flex items-center gap-1 text-xs h-7 px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 ml-auto">
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export function TrackingLinksTab({ secret }: { secret: string }) {
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [linksRes, prodsRes] = await Promise.all([
        fetch(apiUrl("/admin/tracking-links"), { headers: { "x-admin-secret": secret } }),
        fetch(apiUrl("/products")),
      ]);
      if (linksRes.ok) setLinks(await linksRes.json());
      if (prodsRes.ok) setProducts(await prodsRes.json());
    } finally { setLoading(false); }
  }, [secret]);

  useEffect(() => { load(); }, [load]);

  const createLink = async () => {
    if (!createForm.title.trim()) { setCreateErr("Title is required"); return; }
    setCreating(true); setCreateErr("");
    try {
      const r = await fetch(apiUrl("/admin/tracking-links"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ title: createForm.title, description: createForm.description }),
      });
      if (!r.ok) { const d = await r.json(); setCreateErr(d.error ?? "Failed"); }
      else { setCreateForm({ title: "", description: "" }); setShowCreate(false); await load(); }
    } catch { setCreateErr("Connection error"); }
    setCreating(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="font-bold text-base">Tracking Links</h2>
          <p className="text-xs text-muted-foreground">Create shareable tracking pages for individual shipments</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="ml-auto flex items-center gap-1.5 text-xs h-8 px-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Tracking Page
        </button>
      </div>

      {showCreate && (
        <div className="border border-dashed border-blue-300 rounded-2xl p-4 space-y-3" style={{ background: "rgba(37,99,235,0.03)" }}>
          <p className="text-sm font-bold">New Tracking Page</p>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Title</label>
            <input value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. November GB Shipment" className="mt-1 w-full h-9 px-3 text-sm rounded-xl border border-input bg-background focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description (optional)</label>
            <input value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} placeholder="Short note visible on the tracking page" className="mt-1 w-full h-9 px-3 text-sm rounded-xl border border-input bg-background focus:outline-none focus:border-blue-400" />
          </div>
          {createErr && <p className="text-xs text-red-500">{createErr}</p>}
          <div className="flex gap-2">
            <button onClick={createLink} disabled={creating} className="flex items-center gap-1.5 text-xs h-8 px-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create
            </button>
            <button onClick={() => setShowCreate(false)} className="flex items-center gap-1 text-xs h-8 px-3 rounded-xl border border-border hover:bg-muted transition-colors">
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : links.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="w-8 h-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">No tracking pages yet</p>
          <p className="text-xs text-muted-foreground/60">Create one to share shipment progress with customers</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map(link => (
            <TrackingLinkCard
              key={link.id} link={link} secret={secret} products={products}
              onUpdate={load} onDelete={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}
