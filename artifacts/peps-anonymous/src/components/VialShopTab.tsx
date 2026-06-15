import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Pencil, Trash2, X, Check, Loader2, ChevronDown,
  FlaskConical, Tag, Package, ExternalLink,
  RefreshCw, Factory, Globe, Users, Activity,
  ShoppingCart, ToggleLeft, ToggleRight, ChevronRight,
} from "lucide-react";
import { Button, Card, cn } from "@/components/ui";

// ─── Types ────────────────────────────────────────────────────
interface VialManufacturer {
  id: string; name: string; country: string | null; website: string | null;
  notes: string | null; active: boolean; createdAt: string;
}

interface VialProduct {
  id: string; name: string; description: string | null; category: string | null;
  mgSize: string | null; price: number; stock: number; manufacturer: string | null; batchNumber: string | null;
  labReportUrl: string | null; active: boolean; sortOrder: number | null;
  vendorId: string | null; vendorName: string | null; createdAt: string;
}

const VIAL_CATEGORIES = ["Peptides", "Supplies", "Filters", "Other"];

interface VialOrder {
  id: string; code: string; telegramUsername: string; shippingName: string;
  shippingAddress: string; email: string | null; notes: string | null;
  status: string; subtotal: number; discountAmount: number; total: number;
  discountCodeUsed: string | null; paymentStatus: string;
  paymentTxHash: string | null; adminNotes: string | null;
  createdAt: string;
  items: { productName: string; quantity: number; unitPrice: number; lineTotal: number }[];
}

interface DiscountCode {
  id: string; code: string; discountType: string; discountValue: number;
  minOrderAmount: number | null; maxUses: number | null; usesCount: number;
  expiresAt: string | null; active: boolean; notes: string | null; createdAt: string;
}

function apiUrl(path: string) { return `/api${path}`; }
function fmt(n: number) { return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  processing: "bg-amber-100 text-amber-700",
  shipped: "bg-violet-100 text-orange-500",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

const PAY_STATUS_COLORS: Record<string, string> = {
  unpaid: "bg-slate-100 text-slate-500",
  pending_confirmation: "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-600",
};

// ─── Shared input/select styles ───────────────────────────────
const inputCls = "w-full h-8 rounded-md px-3 text-sm border border-input bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30";
const selectCls = "w-full h-8 rounded-md px-2 text-sm border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30";
const labelCls = "block text-[11px] font-semibold mb-1 text-muted-foreground";

// ─── Products sub-tab ─────────────────────────────────────────
function ProductsSubTab({ secret }: { secret: string }) {
  const [products, setProducts] = useState<VialProduct[]>([]);
  const [manufacturers, setManufacturers] = useState<VialManufacturer[]>([]);
  const [mainProducts, setMainProducts] = useState<{ name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [nameMode, setNameMode] = useState<"list" | "custom">("list");
  const [form, setForm] = useState({
    name: "", description: "", category: "", mgSize: "", price: "", stock: "",
    manufacturer: "", batchNumber: "", labReportUrl: "", imageUrl: "", active: true, sortOrder: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [pd, mfrs, mp] = await Promise.all([
      fetch(apiUrl("/admin/vial/products"), { headers: { "x-admin-secret": secret } }).then(r => r.json()),
      fetch(apiUrl("/admin/vial/manufacturers"), { headers: { "x-admin-secret": secret } }).then(r => r.json()).catch(() => []),
      fetch(apiUrl("/admin/products"), { headers: { "x-admin-secret": secret } }).then(r => r.json()).catch(() => []),
    ]);
    setProducts(Array.isArray(pd) ? pd : []);
    setManufacturers(Array.isArray(mfrs) ? mfrs : []);
    setMainProducts(Array.isArray(mp) ? mp.map((p: any) => ({ name: p.name })) : []);
    setLoading(false);
  }, [secret]);

  useEffect(() => { load(); }, [load]);

  const startEdit = (p: VialProduct | null) => {
    if (!p) {
      setForm({ name: "", description: "", category: "", mgSize: "", price: "", stock: "0", manufacturer: "", batchNumber: "", labReportUrl: "", imageUrl: "", active: true, sortOrder: "" });
      setNameMode("list");
      setEditingId("new");
    } else {
      const isInList = mainProducts.some(mp => mp.name === p.name);
      setNameMode(isInList ? "list" : "custom");
      setForm({
        name: p.name, description: p.description || "", category: p.category || "",
        mgSize: p.mgSize || "", price: p.price.toFixed(2), stock: String(p.stock),
        manufacturer: p.manufacturer || "",
        batchNumber: p.batchNumber || "", labReportUrl: p.labReportUrl || "",
        imageUrl: (p as any).imageUrl || "",
        active: p.active, sortOrder: p.sortOrder !== null ? String(p.sortOrder) : "",
      });
      setEditingId(p.id);
    }
    setError("");
  };

  const save = async () => {
    if (!form.name.trim() || !form.price) { setError("Name and price are required"); return; }
    setSaving(true); setError("");
    try {
      const isNew = editingId === "new";
      const body = {
        name: form.name.trim(), description: form.description.trim() || null,
        category: form.category.trim() || null, mgSize: form.mgSize.trim() || null,
        price: parseFloat(form.price),
        stock: parseInt(form.stock) || 0,
        manufacturer: form.manufacturer.trim() || null,
        batchNumber: form.batchNumber.trim() || null,
        labReportUrl: form.labReportUrl.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        active: form.active,
        sortOrder: form.sortOrder ? parseInt(form.sortOrder) : null,
      };
      const res = await fetch(
        isNew ? apiUrl("/admin/vial/products") : apiUrl(`/admin/vial/products/${editingId}`),
        { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json", "x-admin-secret": secret }, body: JSON.stringify(body) }
      );
      if (!res.ok) { const d = await res.json(); setError(d.error || "Save failed"); return; }
      setEditingId(null);
      load();
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await fetch(apiUrl(`/admin/vial/products/${id}`), { method: "DELETE", headers: { "x-admin-secret": secret } });
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">{products.length} Products</h3>
        <button onClick={() => startEdit(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Product
        </button>
      </div>

      {editingId !== null && (
        <Card className="p-4 space-y-3 border-violet-200 bg-violet-50">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground">{editingId === "new" ? "New Product" : "Edit Product"}</h4>
            <button onClick={() => setEditingId(null)}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <label className={labelCls}>Name *</label>
              <select
                value={nameMode === "custom" ? "__custom__" : form.name}
                onChange={e => {
                  if (e.target.value === "__custom__") {
                    setNameMode("custom");
                    setForm(f => ({ ...f, name: "" }));
                  } else {
                    setNameMode("list");
                    setForm(f => ({ ...f, name: e.target.value }));
                  }
                }}
                className={selectCls}
              >
                <option value="">— Select product name —</option>
                {mainProducts.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                <option value="__custom__">✏ Custom name…</option>
              </select>
              {nameMode === "custom" && (
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Enter custom product name"
                  className={cn(inputCls, "mt-1.5")}
                />
              )}
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description…" rows={2} className="w-full rounded-md px-3 py-2 text-xs resize-none border border-input bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={selectCls}>
                <option value="">— Select —</option>
                {VIAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Mg Size</label>
              <input value={form.mgSize} onChange={e => setForm(f => ({ ...f, mgSize: e.target.value }))} placeholder="e.g. 5mg" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Price ($) *</label>
              <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Stock (vials)</label>
              <input type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Manufacturer</label>
              <input
                list="manufacturer-list"
                value={form.manufacturer}
                onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))}
                placeholder="e.g. Peptide Sciences"
                className={inputCls}
              />
              <datalist id="manufacturer-list">
                {manufacturers.filter(m => m.active).map(m => (
                  <option key={m.id} value={m.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={labelCls}>Batch Number</label>
              <input value={form.batchNumber} onChange={e => setForm(f => ({ ...f, batchNumber: e.target.value }))} placeholder="Batch #" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Sort Order</label>
              <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} placeholder="1" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Lab Report URL (COA)</label>
              <input value={form.labReportUrl} onChange={e => setForm(f => ({ ...f, labReportUrl: e.target.value }))} placeholder="https://…" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Product Image URL</label>
              <div className="flex gap-2 items-start">
                <input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://… (small product photo or logo)" className={`${inputCls} flex-1`} />
                {form.imageUrl && (
                  <img src={form.imageUrl} alt="Preview" className="w-8 h-8 rounded object-cover shrink-0 border border-input" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
              </div>
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                  className="w-10 h-5 rounded-full transition-colors relative"
                  style={{ background: form.active ? "#F24908" : "#CBD5E1" }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: form.active ? "translateX(21px)" : "translateX(2px)" }} />
                </div>
                <span className="text-xs text-muted-foreground">Active</span>
              </label>
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
            </button>
            <button onClick={() => setEditingId(null)} className="px-4 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 transition-colors">Cancel</button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {products.map(p => (
          <div key={p.id} className="rounded-xl p-3 flex items-start gap-3 bg-white border border-border">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">{p.name}</span>
                {p.mgSize && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{p.mgSize}</span>}
                {!p.active && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600">Hidden</span>}
                {p.category && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 text-orange-500">{p.category}</span>}
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-xs font-bold text-orange-500">{fmt(p.price)}</span>
                <span className={cn("text-xs font-semibold", p.stock <= 0 ? "text-red-600" : p.stock <= 5 ? "text-amber-600" : "text-emerald-600")}>
                  {p.stock <= 0 ? "Out of stock" : `${p.stock} in stock`}
                </span>
                {p.manufacturer && <span className="text-[10px] font-mono text-muted-foreground">Mfr: {p.manufacturer}</span>}
                {p.batchNumber && <span className="text-[10px] font-mono text-muted-foreground">Batch {p.batchNumber}</span>}
                {p.labReportUrl && (
                  <a href={p.labReportUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-orange-500 hover:underline">
                    <FlaskConical className="w-3 h-3" /> Lab report
                  </a>
                )}
              </div>
              {p.description && <p className="text-xs mt-1 text-muted-foreground">{p.description}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => startEdit(p)} className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted hover:bg-muted/80 transition-colors">
                <Pencil className="w-3 h-3 text-muted-foreground" />
              </button>
              <button onClick={() => remove(p.id)} className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50 hover:bg-red-100 transition-colors">
                <Trash2 className="w-3 h-3 text-red-500" />
              </button>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <div className="text-center py-10 text-sm text-muted-foreground">No products yet — add your first one above</div>
        )}
      </div>
    </div>
  );
}

// ─── Orders sub-tab ───────────────────────────────────────────
function OrdersSubTab({ secret }: { secret: string }) {
  const [orders, setOrders] = useState<VialOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesVal, setNotesVal] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(apiUrl("/admin/vial/orders"), { headers: { "x-admin-secret": secret } });
    const data = await res.json();
    setOrders(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [secret]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(apiUrl(`/admin/vial/orders/${id}/status`), {
      method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const updatePayStatus = async (id: string, paymentStatus: string) => {
    await fetch(apiUrl(`/admin/vial/orders/${id}/payment-status`), {
      method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ paymentStatus }),
    });
    load();
  };

  const saveNotes = async (id: string) => {
    setSaving(true);
    await fetch(apiUrl(`/admin/vial/orders/${id}/notes`), {
      method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ adminNotes: notesVal }),
    });
    setSaving(false); setEditingNotes(null); load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">{orders.length} Orders</h3>
        <button onClick={load} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {orders.length === 0 && <div className="text-center py-10 text-sm text-muted-foreground">No orders yet</div>}

      {orders.map(order => (
        <div key={order.id} className="rounded-xl overflow-hidden bg-white border border-border">
          <button
            onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
            className="w-full px-4 py-3 flex items-start gap-3 text-left"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-foreground font-mono">#{order.code}</span>
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded capitalize", ORDER_STATUS_COLORS[order.status] || "bg-muted text-muted-foreground")}>
                  {order.status}
                </span>
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", PAY_STATUS_COLORS[order.paymentStatus] || "bg-muted text-muted-foreground")}>
                  {order.paymentStatus === "confirmed" ? "Paid" : order.paymentStatus}
                </span>
              </div>
              <p className="text-xs mt-0.5 text-muted-foreground">
                @{order.telegramUsername} · {fmt(order.total)} · {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform mt-0.5", expandedId === order.id && "rotate-180")} />
          </button>

          {expandedId === order.id && (
            <div className="px-4 pb-4 space-y-3 border-t border-border">
              <div className="mt-3 rounded-lg overflow-hidden border border-border">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between px-3 py-2 text-xs border-b last:border-0 border-border">
                    <span className="text-muted-foreground">{item.productName} × {item.quantity}</span>
                    <span className="text-foreground font-semibold">{fmt(item.lineTotal)}</span>
                  </div>
                ))}
                {order.discountAmount > 0 && (
                  <div className="flex justify-between px-3 py-2 text-xs text-emerald-700">
                    <span>Discount ({order.discountCodeUsed})</span>
                    <span>−{fmt(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between px-3 py-2 text-xs font-bold border-t border-border">
                  <span className="text-foreground">Total</span>
                  <span className="text-orange-500">{fmt(order.total)}</span>
                </div>
              </div>

              <div className="text-xs space-y-1 text-muted-foreground">
                <p><span className="text-foreground/50 font-medium">Name:</span> {order.shippingName}</p>
                <p><span className="text-foreground/50 font-medium">Address:</span> {order.shippingAddress}</p>
                {order.email && <p><span className="text-foreground/50 font-medium">Email:</span> {order.email}</p>}
                {order.notes && <p><span className="text-foreground/50 font-medium">Notes:</span> {order.notes}</p>}
                {order.paymentTxHash && (
                  <p className="break-all">
                    <span className="text-foreground/50 font-medium">TX:</span>{" "}
                    {order.paymentTxHash.startsWith("anonpay:") ? (
                      <a href={`https://trocador.app/anonpay/${encodeURIComponent(order.paymentTxHash.slice("anonpay:".length))}`} target="_blank" rel="noopener noreferrer" className="text-orange-500 underline">
                        {order.paymentTxHash.slice("anonpay:".length, "anonpay:".length + 20)}…
                      </a>
                    ) : (
                      <a href={`https://etherscan.io/tx/${order.paymentTxHash}`} target="_blank" rel="noopener noreferrer" className="text-orange-500 underline">
                        {order.paymentTxHash.slice(0, 20)}…
                      </a>
                    )}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] font-semibold mb-1 text-muted-foreground">Order Status</p>
                  <select
                    value={order.status}
                    onChange={e => updateStatus(order.id, e.target.value)}
                    className={selectCls}
                  >
                    {["pending", "processing", "shipped", "delivered", "cancelled"].map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-semibold mb-1 text-muted-foreground">Payment Status</p>
                  <select
                    value={order.paymentStatus}
                    onChange={e => updatePayStatus(order.id, e.target.value)}
                    className={selectCls}
                  >
                    {["unpaid", "pending_confirmation", "confirmed", "failed"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {editingNotes === order.id ? (
                <div className="space-y-2">
                  <textarea
                    value={notesVal}
                    onChange={e => setNotesVal(e.target.value)}
                    placeholder="Admin notes…"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-xs resize-none border border-input bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => saveNotes(order.id)} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                    </button>
                    <button onClick={() => setEditingNotes(null)} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground bg-muted hover:bg-muted/80 transition-colors">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingNotes(order.id); setNotesVal(order.adminNotes || ""); }}
                  className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-muted-foreground bg-muted hover:text-foreground transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  {order.adminNotes ? "Edit admin notes" : "Add admin notes"}
                </button>
              )}
              {order.adminNotes && editingNotes !== order.id && (
                <p className="text-xs px-3 py-2 rounded-lg bg-muted text-muted-foreground">
                  {order.adminNotes}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Discount Codes sub-tab ───────────────────────────────────
function DiscountCodesSubTab({ secret }: { secret: string }) {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    code: "", discountType: "percent", discountValue: "",
    minOrderAmount: "", maxUses: "", expiresAt: "", notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(apiUrl("/admin/vial/discount-codes"), { headers: { "x-admin-secret": secret } });
    const data = await res.json();
    setCodes(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [secret]);

  useEffect(() => { load(); }, [load]);

  function dmyToYmd(dmy: string): string {
    if (!dmy) return "";
    const m = dmy.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return dmy;
    return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }

  const saveCode = async () => {
    if (!form.code.trim() || !form.discountValue) { setError("Code and value required"); return; }
    setSaving(true); setError("");
    const expiresAtYmd = form.expiresAt ? dmyToYmd(form.expiresAt) : undefined;
    const res = await fetch(apiUrl("/admin/vial/discount-codes"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({
        code: form.code.trim(), discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : undefined,
        maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
        expiresAt: expiresAtYmd || undefined,
        notes: form.notes.trim() || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Failed"); return; }
    setAdding(false);
    setForm({ code: "", discountType: "percent", discountValue: "", minOrderAmount: "", maxUses: "", expiresAt: "", notes: "" });
    load();
  };

  const toggleActive = async (code: DiscountCode) => {
    await fetch(apiUrl(`/admin/vial/discount-codes/${code.id}`), {
      method: "PUT", headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ active: !code.active }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this discount code?")) return;
    await fetch(apiUrl(`/admin/vial/discount-codes/${id}`), { method: "DELETE", headers: { "x-admin-secret": secret } });
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">{codes.length} Discount Codes</h3>
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Code
        </button>
      </div>

      {adding && (
        <Card className="p-4 space-y-3 border-violet-200 bg-violet-50">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground">New Discount Code</h4>
            <button onClick={() => setAdding(false)}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={labelCls}>Code *</label>
              <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SUMMER20" className={cn(inputCls, "font-mono uppercase")} />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))} className={selectCls}>
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed ($)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Value *</label>
              <input type="number" min="0" step="0.01" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} placeholder={form.discountType === "percent" ? "10" : "5.00"} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Min Order ($)</label>
              <input type="number" min="0" step="0.01" value={form.minOrderAmount} onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))} placeholder="Optional" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Max Uses</label>
              <input type="number" min="1" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} placeholder="Unlimited" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Expires At</label>
              <input type="text" inputMode="numeric" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} placeholder="DD/MM/YYYY" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes…" className={inputCls} />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={saveCode} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Create
            </button>
            <button onClick={() => setAdding(false)} className="px-4 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground bg-muted hover:bg-muted/80 transition-colors">Cancel</button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {codes.map(code => (
          <div key={code.id} className={cn("rounded-xl p-3 flex items-center gap-3 bg-white border border-border transition-opacity", !code.active && "opacity-50")}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold font-mono text-orange-500">{code.code}</span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {code.discountType === "percent" ? `${code.discountValue}% off` : `$${code.discountValue.toFixed(2)} off`}
                </span>
                {!code.active && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600">Disabled</span>}
              </div>
              <div className="flex items-center gap-3 mt-1 text-[10px] flex-wrap text-muted-foreground">
                <span>Used {code.usesCount}{code.maxUses ? `/${code.maxUses}` : ""} times</span>
                {code.minOrderAmount && <span>Min ${code.minOrderAmount.toFixed(2)}</span>}
                {code.expiresAt && <span>Expires {new Date(code.expiresAt).toLocaleDateString()}</span>}
                {code.notes && <span>{code.notes}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => toggleActive(code)}
                className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-colors", code.active ? "bg-emerald-100 hover:bg-emerald-200" : "bg-muted hover:bg-muted/80")}
              >
                {code.active ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-muted-foreground" />}
              </button>
              <button onClick={() => remove(code.id)} className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50 hover:bg-red-100 transition-colors">
                <Trash2 className="w-3 h-3 text-red-500" />
              </button>
            </div>
          </div>
        ))}
        {codes.length === 0 && <div className="text-center py-10 text-sm text-muted-foreground">No discount codes yet</div>}
      </div>
    </div>
  );
}

// ─── Manufacturers sub-tab ────────────────────────────────────
function ManufacturersSubTab({ secret }: { secret: string }) {
  const [manufacturers, setManufacturers] = useState<VialManufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", country: "", website: "", notes: "", active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch(apiUrl("/admin/vial/manufacturers"), { headers: { "x-admin-secret": secret } }).then(r => r.json());
    setManufacturers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [secret]);

  useEffect(() => { load(); }, [load]);

  const startEdit = (m: VialManufacturer | null) => {
    if (!m) {
      setForm({ name: "", country: "", website: "", notes: "", active: true });
      setEditingId("new");
    } else {
      setForm({
        name: m.name, country: m.country || "", website: m.website || "",
        notes: m.notes || "", active: m.active,
      });
      setEditingId(m.id);
    }
    setError("");
  };

  const save = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true); setError("");
    try {
      const isNew = editingId === "new";
      const body = {
        name: form.name.trim(),
        country: form.country.trim() || null,
        website: form.website.trim() || null,
        notes: form.notes.trim() || null,
        active: form.active,
      };
      const res = await fetch(
        isNew ? apiUrl("/admin/vial/manufacturers") : apiUrl(`/admin/vial/manufacturers/${editingId}`),
        { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json", "x-admin-secret": secret }, body: JSON.stringify(body) }
      );
      if (!res.ok) { const d = await res.json(); setError(d.error || "Save failed"); return; }
      setEditingId(null);
      load();
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this manufacturer?")) return;
    await fetch(apiUrl(`/admin/vial/manufacturers/${id}`), { method: "DELETE", headers: { "x-admin-secret": secret } });
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">{manufacturers.length} Manufacturers</h3>
        <button onClick={() => startEdit(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Manufacturer
        </button>
      </div>

      {editingId !== null && (
        <Card className="p-4 space-y-3 border-violet-200 bg-violet-50">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground">{editingId === "new" ? "New Manufacturer" : "Edit Manufacturer"}</h4>
            <button onClick={() => setEditingId(null)}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <label className={labelCls}>Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Peptide Sciences" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Country</label>
              <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="e.g. USA" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Website</label>
              <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://…" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes about this manufacturer…" rows={2} className="w-full rounded-md px-3 py-2 text-xs resize-none border border-input bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                  className="w-10 h-5 rounded-full transition-colors relative"
                  style={{ background: form.active ? "#F24908" : "#CBD5E1" }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: form.active ? "translateX(21px)" : "translateX(2px)" }} />
                </div>
                <span className="text-xs text-muted-foreground">Active</span>
              </label>
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
            </button>
            <button onClick={() => setEditingId(null)} className="px-4 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground bg-muted hover:bg-muted/80 transition-colors">Cancel</button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {manufacturers.map(m => (
          <div key={m.id} className="rounded-xl p-3 flex items-start gap-3 bg-white border border-border">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">{m.name}</span>
                {!m.active && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600">Hidden</span>}
                {m.country && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-50 text-orange-500">{m.country}</span>}
              </div>
              {m.website && (
                <a href={m.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mt-0.5 text-[11px] text-orange-500 hover:underline truncate">
                  <Globe className="w-3 h-3 shrink-0" />{m.website}
                </a>
              )}
              {m.notes && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{m.notes}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => startEdit(m)} className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted hover:bg-muted/80 transition-colors">
                <Pencil className="w-3 h-3 text-muted-foreground" />
              </button>
              <button onClick={() => remove(m.id)} className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50 hover:bg-red-100 transition-colors">
                <Trash2 className="w-3 h-3 text-red-500" />
              </button>
            </div>
          </div>
        ))}
        {manufacturers.length === 0 && <div className="text-center py-10 text-sm text-muted-foreground">No manufacturers yet</div>}
      </div>
    </div>
  );
}

// ─── Sellers sub-tab ──────────────────────────────────────────
interface SellerSummary {
  id: string; name: string; tagline: string | null; description: string | null;
  country: string | null; shipsTo: string | null;
  contactTelegram: string | null; active: boolean; createdAt: string;
  productCount: number; activeProductCount: number;
  totalRevenue: number; totalOrders: number;
  lastLogin: string | null;
  walletAddress: string | null; revolutLink: string | null; paypalLink: string | null;
  rating: number | null; logoUrl: string | null; hasDashboard: boolean;
}

interface AuditLog {
  id: number; type: string; level: string; action: string;
  message: string; metadata: Record<string, unknown> | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  seller_login: "Logged in",
  seller_product_create: "Created product",
  seller_product_update: "Updated product",
  seller_product_delete: "Removed product",
  seller_order_accept: "Accepted order",
  seller_order_reject: "Rejected order",
};

const ACTION_COLORS: Record<string, string> = {
  seller_login: "bg-orange-50 text-orange-500",
  seller_product_create: "bg-green-100 text-green-700",
  seller_product_update: "bg-amber-100 text-amber-700",
  seller_product_delete: "bg-red-100 text-red-600",
  seller_order_accept: "bg-emerald-100 text-emerald-700",
  seller_order_reject: "bg-orange-100 text-orange-700",
};

function fmtRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function SellerDetailPanel({ seller, secret, onClose, onActiveChange }: {
  seller: SellerSummary; secret: string; onClose: () => void;
  onActiveChange?: (id: string, active: boolean) => void;
}) {
  const [tab, setTab] = useState<"profile" | "products" | "sales" | "activity">("profile");
  const [products, setProducts] = useState<VialProduct[]>([]);
  const [sales, setSales] = useState<VialOrder[]>([]);
  const [activity, setActivity] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [isActive, setIsActive] = useState(seller.active);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [logoEdit, setLogoEdit] = useState(seller.logoUrl ?? "");
  const [logoSaving, setLogoSaving] = useState(false);
  const [logoSaved, setLogoSaved] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const saveLogo = async () => {
    setLogoSaving(true); setLogoError(null); setLogoSaved(false);
    try {
      const res = await fetch(apiUrl(`/admin/vial/vendors/${seller.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ logoUrl: logoEdit.trim() || null }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setLogoSaved(true);
      setTimeout(() => setLogoSaved(false), 2000);
    } catch {
      setLogoError("Failed to save — please try again.");
    } finally {
      setLogoSaving(false);
    }
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const data = await fetch(apiUrl(`/admin/vial/sellers/${seller.id}/products`), { headers: { "x-admin-secret": secret } }).then(r => r.json());
    setProducts(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [seller.id, secret]);

  const loadSales = useCallback(async () => {
    setLoading(true);
    const data = await fetch(apiUrl(`/admin/vial/sellers/${seller.id}/sales`), { headers: { "x-admin-secret": secret } }).then(r => r.json());
    setSales(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [seller.id, secret]);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    const data = await fetch(apiUrl(`/admin/vial/sellers/${seller.id}/activity`), { headers: { "x-admin-secret": secret } }).then(r => r.json());
    setActivity(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [seller.id, secret]);

  useEffect(() => {
    if (tab === "products") loadProducts();
    else if (tab === "sales") loadSales();
    else if (tab === "activity") loadActivity();
  }, [tab, loadProducts, loadSales, loadActivity]);

  const toggleActive = async () => {
    const next = !isActive;
    setToggling(true);
    setToggleError(null);
    try {
      const res = await fetch(apiUrl(`/admin/vial/vendors/${seller.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ active: next }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setIsActive(next);
      onActiveChange?.(seller.id, next);
    } catch {
      setToggleError("Failed to update — please try again.");
    } finally {
      setToggling(false);
    }
  };

  return (
    <Card className="border-violet-200 bg-violet-50/40 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground">{seller.name}</span>
            {seller.country && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-50 text-orange-500">{seller.country}</span>}
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600")}>
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
          {seller.tagline && <p className="text-xs text-muted-foreground mt-0.5">{seller.tagline}</p>}
          {seller.contactTelegram && (
            <p className="text-[11px] text-orange-500 mt-0.5">@{seller.contactTelegram}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleActive}
            disabled={toggling}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              isActive ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200",
              toggling && "opacity-50 cursor-not-allowed"
            )}
          >
            {toggling ? <Loader2 className="w-3 h-3 animate-spin" /> : isActive ? <ToggleLeft className="w-3 h-3" /> : <ToggleRight className="w-3 h-3" />}
            {isActive ? "Deactivate" : "Activate"}
          </button>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
        </div>
      </div>

      {toggleError && (
        <p className="text-xs font-semibold text-red-600 bg-red-50 rounded-lg px-3 py-2">{toggleError}</p>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-white border border-border p-2 text-center">
          <p className="text-lg font-bold text-foreground">{seller.productCount}</p>
          <p className="text-[10px] text-muted-foreground">Products</p>
        </div>
        <div className="rounded-lg bg-white border border-border p-2 text-center">
          <p className="text-lg font-bold text-foreground">{seller.totalOrders}</p>
          <p className="text-[10px] text-muted-foreground">Orders</p>
        </div>
        <div className="rounded-lg bg-white border border-border p-2 text-center">
          <p className="text-lg font-bold text-orange-500">{fmt(seller.totalRevenue)}</p>
          <p className="text-[10px] text-muted-foreground">Revenue</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border pb-1">
        {([
          { id: "profile", label: "Profile", icon: Users },
          { id: "products", label: "Products", icon: Package },
          { id: "sales", label: "Sales", icon: ShoppingCart },
          { id: "activity", label: "Activity", icon: Activity },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              tab === t.id ? "bg-violet-100 text-orange-500" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <t.icon className="w-3 h-3" />{t.label}
          </button>
        ))}
      </div>

      {tab === "profile" ? (
        <div className="space-y-3">
          {seller.description && (
            <p className="text-xs text-muted-foreground leading-relaxed">{seller.description}</p>
          )}

          {/* Logo URL editor */}
          <div className="rounded-lg bg-white border border-border p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Profile Logo URL</p>
            <div className="flex gap-2">
              <input
                type="url"
                value={logoEdit}
                onChange={e => setLogoEdit(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="flex-1 h-8 px-3 rounded-lg text-xs bg-muted border border-border text-foreground outline-none"
              />
              <button
                onClick={saveLogo}
                disabled={logoSaving}
                className="h-8 px-3 rounded-lg text-xs font-semibold bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors disabled:opacity-50 shrink-0"
              >
                {logoSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : logoSaved ? "Saved ✓" : "Save"}
              </button>
            </div>
            {logoError && <p className="text-[10px] text-red-500">{logoError}</p>}
            {logoEdit && (
              <img src={logoEdit} alt="Logo preview" className="w-8 h-8 rounded-full object-cover border border-border" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {seller.country && (
              <div className="rounded-lg bg-white border border-border p-2.5">
                <p className="text-[10px] text-muted-foreground mb-0.5">Country</p>
                <p className="text-xs font-semibold text-foreground">{seller.country}</p>
              </div>
            )}
            {seller.shipsTo && (
              <div className="rounded-lg bg-white border border-border p-2.5">
                <p className="text-[10px] text-muted-foreground mb-0.5">Ships To</p>
                <p className="text-xs font-semibold text-foreground">{seller.shipsTo}</p>
              </div>
            )}
            {seller.rating !== null && (
              <div className="rounded-lg bg-white border border-border p-2.5">
                <p className="text-[10px] text-muted-foreground mb-0.5">Rating</p>
                <p className="text-xs font-semibold text-foreground">{seller.rating.toFixed(1)} / 5.0</p>
              </div>
            )}
            <div className="rounded-lg bg-white border border-border p-2.5">
              <p className="text-[10px] text-muted-foreground mb-0.5">Seller Dashboard</p>
              <p className="text-xs font-semibold text-foreground">{seller.hasDashboard ? "Enabled" : "Not set up"}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {seller.contactTelegram && (
              <div className="flex items-center gap-2 rounded-lg bg-white border border-border p-2.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide w-16 shrink-0">Telegram</span>
                <span className="text-xs text-orange-500 font-semibold">@{seller.contactTelegram}</span>
              </div>
            )}
            {seller.walletAddress && (
              <div className="flex items-center gap-2 rounded-lg bg-white border border-border p-2.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide w-16 shrink-0">Wallet</span>
                <span className="text-xs font-mono text-foreground truncate">{seller.walletAddress}</span>
              </div>
            )}
            {seller.revolutLink && (
              <div className="flex items-center gap-2 rounded-lg bg-white border border-border p-2.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide w-16 shrink-0">Revolut</span>
                <a href={seller.revolutLink} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-500 hover:underline flex items-center gap-1">
                  {seller.revolutLink} <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}
            {seller.paypalLink && (
              <div className="flex items-center gap-2 rounded-lg bg-white border border-border p-2.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide w-16 shrink-0">PayPal</span>
                <a href={seller.paypalLink} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-500 hover:underline flex items-center gap-1">
                  {seller.paypalLink} <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
            <span>Joined {new Date(seller.createdAt).toLocaleDateString()}</span>
            {seller.lastLogin && <span>· Last login {fmtRelativeTime(seller.lastLogin)}</span>}
          </div>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {tab === "products" && (
            <div className="space-y-2">
              {products.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">No products yet</p>}
              {products.map(p => (
                <div key={p.id} className={cn("rounded-lg bg-white border border-border p-2.5 flex items-center gap-3", !p.active && "opacity-50")}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-foreground truncate">{p.name}</span>
                      {!p.active && <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-red-100 text-red-600">Hidden</span>}
                      {p.category && <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground">{p.category}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                      <span className="font-semibold text-orange-500">{fmt(p.price)}</span>
                      <span>Stock: {p.stock}</span>
                      {p.mgSize && <span>{p.mgSize}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === "sales" && (
            <div className="space-y-2">
              {sales.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">No sales yet</p>}
              {sales.map(o => (
                <div key={o.id} className="rounded-lg bg-white border border-border p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold font-mono text-orange-500">{o.code}</span>
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", ORDER_STATUS_COLORS[o.status] ?? "bg-muted text-muted-foreground")}>{o.status}</span>
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", PAY_STATUS_COLORS[o.paymentStatus] ?? "bg-muted text-muted-foreground")}>{o.paymentStatus}</span>
                    </div>
                    <span className="text-xs font-bold text-foreground shrink-0">{fmt(o.total)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span>@{o.telegramUsername}</span>
                    <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-1.5 space-y-0.5">
                    {o.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{item.productName} ×{item.quantity}</span>
                        <span>{fmt(item.lineTotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === "activity" && (
            <div className="space-y-1.5">
              {activity.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">No activity logged yet</p>}
              {activity.map(log => (
                <div key={log.id} className="flex items-start gap-2.5 rounded-lg bg-white border border-border p-2.5">
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5", ACTION_COLORS[log.action] ?? "bg-muted text-muted-foreground")}>
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-snug">{log.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{fmtRelativeTime(log.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function SellersSubTab({ secret }: { secret: string }) {
  const [sellers, setSellers] = useState<SellerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch(apiUrl("/admin/vial/sellers"), { headers: { "x-admin-secret": secret } }).then(r => r.json());
    setSellers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [secret]);

  useEffect(() => { load(); }, [load]);

  const selected = sellers.find(s => s.id === selectedId) ?? null;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">{sellers.length} Seller{sellers.length !== 1 ? "s" : ""}</h3>
        <button onClick={load} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground bg-muted hover:bg-muted/80 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {selected && (
        <SellerDetailPanel
          seller={selected}
          secret={secret}
          onClose={() => setSelectedId(null)}
          onActiveChange={(id, active) =>
            setSellers(prev => prev.map(s => s.id === id ? { ...s, active } : s))
          }
        />
      )}

      <div className="space-y-2">
        {sellers.map(s => (
          <div
            key={s.id}
            className={cn(
              "rounded-xl p-3 flex items-center gap-3 bg-white border transition-all cursor-pointer hover:border-violet-300",
              selectedId === s.id ? "border-violet-400 ring-1 ring-violet-300" : "border-border",
              !s.active && "opacity-60"
            )}
            onClick={() => setSelectedId(prev => prev === s.id ? null : s.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">{s.name}</span>
                {!s.active && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600">Inactive</span>}
                {s.country && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-50 text-orange-500">{s.country}</span>}
              </div>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground flex-wrap">
                <span><span className="font-semibold text-foreground">{s.productCount}</span> products</span>
                <span><span className="font-semibold text-foreground">{s.totalOrders}</span> orders</span>
                {s.totalRevenue > 0 && <span className="font-semibold text-orange-500">{fmt(s.totalRevenue)} revenue</span>}
                {s.lastLogin ? <span>Last login {fmtRelativeTime(s.lastLogin)}</span> : <span className="italic">Never logged in</span>}
              </div>
            </div>
            <ChevronRight className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", selectedId === s.id && "rotate-90")} />
          </div>
        ))}
        {sellers.length === 0 && <div className="text-center py-10 text-sm text-muted-foreground">No sellers registered yet</div>}
      </div>
    </div>
  );
}

// ─── Main VialShopTab ─────────────────────────────────────────
const SUBTABS = [
  { id: "products", label: "Products", icon: Package },
  { id: "orders", label: "Orders", icon: FlaskConical },
  { id: "codes", label: "Discount Codes", icon: Tag },
  { id: "manufacturers", label: "Manufacturers", icon: Factory },
  { id: "sellers", label: "Sellers", icon: Users },
];

export function VialShopTab({ secret }: { secret: string }) {
  const [subTab, setSubTab] = useState("products");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-1 flex-wrap border-b border-border">
        {SUBTABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors",
              subTab === t.id
                ? "bg-violet-100 text-orange-500"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>
      {subTab === "products" && <ProductsSubTab secret={secret} />}
      {subTab === "orders" && <OrdersSubTab secret={secret} />}
      {subTab === "codes" && <DiscountCodesSubTab secret={secret} />}
      {subTab === "manufacturers" && <ManufacturersSubTab secret={secret} />}
      {subTab === "sellers" && <SellersSubTab secret={secret} />}
    </div>
  );
}
