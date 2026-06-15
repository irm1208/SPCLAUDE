import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Save, X, Globe, Check, Download, Sparkles, Info, ChevronDown, ChevronUp, Eye, AlertCircle } from "lucide-react";
import { COUNTRY_LIST } from "@/data/countries";

interface ParcelSize {
  id: string;
  groupBuyId: string | null;
  name: string;
  weightKg: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  qtyLabel: string | null;
  notes: string | null;
  maxKitsPerPackage: number | null;
  sortOrder: number;
  active: boolean;
}

interface ShippingRate {
  id: string;
  groupBuyId: string | null;
  parcelSizeId: string;
  country: string;
  region: string | null;
  carrier: string;
  priceGbp: string;
  priceUsd: string;
  priceEur: string;
  sortOrder: number;
  active: boolean;
}

interface GroupBuy {
  id: string;
  name: string;
  status: string;
}

interface AiTier {
  name: string;
  qtyLabel: string;
  notes: string;
  countries: { country: string; carrier: string; priceGbp: string; priceUsd: string; priceEur: string }[];
}

const CELL = "px-3 py-2 text-xs";
const TH = `${CELL} font-semibold text-left text-[11px] uppercase tracking-wide opacity-60 border-b border-gray-100`;
const INPUT_CLS = "w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400";
const SELECT_CLS = `${INPUT_CLS} appearance-none cursor-pointer`;

const COUNTRY_OPTIONS = [...COUNTRY_LIST].sort((a, b) => a.name.localeCompare(b.name));

function CountrySelect({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  const known = COUNTRY_OPTIONS.some(c => c.name === value);
  return (
    <select className={SELECT_CLS} value={value} onChange={e => onChange(e.target.value)} autoFocus={autoFocus}>
      <option value="">Select country…</option>
      {value && !known && <option value={value}>{value} (legacy)</option>}
      {COUNTRY_OPTIONS.map(c => (
        <option key={c.code} value={c.name}>{c.code} — {c.name}</option>
      ))}
    </select>
  );
}

const emptySize = (): Omit<ParcelSize, "id" | "groupBuyId"> => ({
  name: "", weightKg: "0", lengthCm: 0, widthCm: 0, heightCm: 0,
  qtyLabel: "", notes: "", maxKitsPerPackage: null, sortOrder: 0, active: true,
});

const emptyRate = (parcelSizeId: string): Omit<ShippingRate, "id" | "groupBuyId"> => ({
  parcelSizeId, country: "", region: "", carrier: "UPS",
  priceGbp: "", priceUsd: "", priceEur: "", sortOrder: 0, active: true,
});

interface Props {
  secret: string;
  readonly?: boolean;
  groupBuyId?: string;
  useCredentials?: boolean;
}

export function IntlShippingTab({ secret, readonly = false, groupBuyId: gbIdProp, useCredentials = false }: Props) {
  const isAdminSelector = !gbIdProp && !readonly;
  const [allGbs, setAllGbs] = useState<GroupBuy[]>([]);
  const [selectedGbId, setSelectedGbId] = useState<string>("");
  const effectiveGbId = gbIdProp ?? selectedGbId;
  const headers = { "x-admin-secret": secret };

  useEffect(() => {
    if (isAdminSelector) {
      fetch("/api/admin/group-buys", { headers })
        .then(r => r.json())
        .then(data => setAllGbs(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [isAdminSelector]);

  if (isAdminSelector) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3">
          <Globe className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Group Buy</label>
            <select
              value={selectedGbId}
              onChange={e => setSelectedGbId(e.target.value)}
              className="w-full max-w-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">— choose a group buy —</option>
              {allGbs.map(gb => (
                <option key={gb.id} value={gb.id}>{gb.name} ({gb.status})</option>
              ))}
            </select>
          </div>
        </div>
        {selectedGbId && (
          <GbRatesPanel
            secret={secret}
            groupBuyId={selectedGbId}
            readonly={false}
            useCredentials={useCredentials}
            gbName={allGbs.find(g => g.id === selectedGbId)?.name}
          />
        )}
      </div>
    );
  }

  return <GbRatesPanel secret={secret} groupBuyId={effectiveGbId} readonly={readonly} useCredentials={useCredentials} />;
}

// ─── Info/Notes modal ─────────────────────────────────────────────────────────

function InfoModal({
  size,
  rates,
  onClose,
  onSave,
  readonly,
}: {
  size: ParcelSize;
  rates: ShippingRate[];
  onClose: () => void;
  onSave: (notes: string) => Promise<void>;
  readonly: boolean;
}) {
  const [notes, setNotes] = useState(size.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(notes);
    setSaving(false);
  }

  const tierRates = rates.filter(r => r.parcelSizeId === size.id && r.active);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-gray-900">{size.name}</h3>
            {size.qtyLabel && <p className="text-xs text-gray-500 mt-0.5">{size.qtyLabel}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Delivery info notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Customer Delivery Info
              <span className="ml-2 font-normal text-gray-400">— shown to customers who ask about their delivery</span>
            </label>
            {readonly ? (
              <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap min-h-[80px]">
                {size.notes || <span className="text-gray-400 italic">No delivery info set for this tier.</span>}
              </div>
            ) : (
              <>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={5}
                  placeholder="Describe delivery expectations for customers, e.g.:&#10;&#10;Shipped via UPS Express. Estimated delivery 3–5 working days. Full tracking provided. Your parcel will be discreetly packaged with no product description on the outer label."
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "Saving…" : "Save Info"}
                </button>
              </>
            )}
          </div>

          {/* Country rates summary */}
          {tierRates.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Countries in this tier ({tierRates.length})</p>
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left font-semibold text-gray-500">Country</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500">Carrier</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-500">GBP</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-500">USD</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-500">EUR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tierRates.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-1.5 font-medium text-gray-800">
                          {r.country}{r.region ? ` — ${r.region}` : ""}
                        </td>
                        <td className="px-3 py-1.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.carrier === "UPS" ? "bg-amber-50 text-amber-700" : "bg-purple-50 text-purple-700"}`}>
                            {r.carrier}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-right text-gray-700">£{r.priceGbp}</td>
                        <td className="px-3 py-1.5 text-right font-semibold text-gray-800">${r.priceUsd}</td>
                        <td className="px-3 py-1.5 text-right text-gray-700">€{r.priceEur}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AI Setup Panel ───────────────────────────────────────────────────────────

function AiSetupPanel({
  groupBuyId,
  headers,
  credentialOpts,
  onApplied,
}: {
  groupBuyId: string;
  headers: Record<string, string>;
  credentialOpts: { credentials?: "include" };
  onApplied: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<AiTier[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true); setErr(null); setPreview(null); setSaved(false);
    try {
      const res = await fetch("/api/intl-shipping/ai-generate", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ groupBuyId, description: prompt }),
        ...credentialOpts,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setPreview(data.tiers ?? []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function applyPreview() {
    if (!preview) return;
    setSaving(true); setErr(null);
    try {
      for (let i = 0; i < preview.length; i++) {
        const tier = preview[i];
        const sizeRes = await fetch("/api/intl-shipping/parcel-sizes", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            groupBuyId,
            name: tier.name,
            qtyLabel: tier.qtyLabel,
            notes: tier.notes,
            sortOrder: i,
          }),
          ...credentialOpts,
        });
        if (!sizeRes.ok) throw new Error(await sizeRes.text());
        const size = await sizeRes.json();

        for (let j = 0; j < tier.countries.length; j++) {
          const c = tier.countries[j];
          await fetch("/api/intl-shipping/rates", {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              groupBuyId,
              parcelSizeId: size.id,
              country: c.country,
              region: null,
              carrier: c.carrier,
              priceGbp: c.priceGbp,
              priceUsd: c.priceUsd,
              priceEur: c.priceEur,
              sortOrder: j,
            }),
            ...credentialOpts,
          });
        }
      }
      setSaved(true);
      setPreview(null);
      setPrompt("");
      onApplied();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-purple-50/50 transition-colors">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
          <div>
            <span className="text-sm font-bold text-purple-800">AI Shipping Setup</span>
            <span className="ml-2 text-xs text-purple-500 font-normal">Describe your shipment and let AI do the rest</span>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Describe your shipping setup</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={3}
              placeholder="e.g. Ship peptides to all EU countries via UPS. Two tiers: small for 1–8 kits, large for 9+ kits. Standard pricing around £16–23 per country depending on zone."
              className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
          </div>

          <button
            onClick={generate}
            disabled={loading || !prompt.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors">
            <Sparkles className="w-3.5 h-3.5" />
            {loading ? "Generating…" : "Generate Shipping Config"}
          </button>

          {err && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {err}
            </div>
          )}

          {saved && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2.5 text-xs text-green-700">
              <Check className="w-3.5 h-3.5 shrink-0" />
              Shipping config saved successfully.
            </div>
          )}

          {preview && preview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-purple-500" />
                  Preview — {preview.length} tier{preview.length !== 1 ? "s" : ""} generated
                </p>
                <button
                  onClick={applyPreview}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 transition-colors">
                  <Save className="w-3 h-3" />
                  {saving ? "Saving…" : "Save All Tiers"}
                </button>
              </div>

              {preview.map((tier, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-800">{tier.name}</span>
                    {tier.qtyLabel && <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{tier.qtyLabel}</span>}
                    <span className="ml-auto text-[10px] text-gray-400">{tier.countries.length} countries</span>
                  </div>
                  {tier.notes && (
                    <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700 italic">
                      {tier.notes}
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-1.5 text-left font-semibold text-gray-500">Country</th>
                          <th className="px-3 py-1.5 text-left font-semibold text-gray-500">Carrier</th>
                          <th className="px-3 py-1.5 text-right font-semibold text-gray-500">£ GBP</th>
                          <th className="px-3 py-1.5 text-right font-semibold text-gray-500">$ USD</th>
                          <th className="px-3 py-1.5 text-right font-semibold text-gray-500">€ EUR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {tier.countries.slice(0, 8).map((c, j) => (
                          <tr key={j}>
                            <td className="px-3 py-1.5 font-medium text-gray-800">{c.country}</td>
                            <td className="px-3 py-1.5">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.carrier === "UPS" ? "bg-amber-50 text-amber-700" : "bg-purple-50 text-purple-700"}`}>
                                {c.carrier}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-right text-gray-700">£{c.priceGbp}</td>
                            <td className="px-3 py-1.5 text-right font-semibold text-gray-800">${c.priceUsd}</td>
                            <td className="px-3 py-1.5 text-right text-gray-700">€{c.priceEur}</td>
                          </tr>
                        ))}
                        {tier.countries.length > 8 && (
                          <tr>
                            <td colSpan={5} className="px-3 py-2 text-center text-gray-400">
                              + {tier.countries.length - 8} more countries
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Inner panel ──────────────────────────────────────────────────────────────

function GbRatesPanel({ secret, groupBuyId, readonly, useCredentials = false, gbName }: {
  secret: string;
  groupBuyId: string;
  readonly: boolean;
  useCredentials?: boolean;
  gbName?: string;
}) {
  const [sizes, setSizes] = useState<ParcelSize[]>([]);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [activeSizeId, setActiveSizeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [addingSize, setAddingSize] = useState(false);
  const [sizeDraft, setSizeDraft] = useState(emptySize());
  const [editingSizeId, setEditingSizeId] = useState<string | null>(null);
  const [editSizeDraft, setEditSizeDraft] = useState<Partial<ParcelSize>>({});

  const [addingRate, setAddingRate] = useState(false);
  const [rateDraft, setRateDraft] = useState<Omit<ShippingRate, "id" | "groupBuyId">>(emptyRate(""));
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [editRateDraft, setEditRateDraft] = useState<Partial<ShippingRate>>({});

  const [infoModalSizeId, setInfoModalSizeId] = useState<string | null>(null);

  const headers = useCredentials ? {} : { "x-admin-secret": secret };
  const credentialOpts = useCredentials ? { credentials: "include" as const } : {};

  async function load() {
    setLoading(true); setErr(null);
    try {
      const fetchJson = async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      };
      const qs = `?groupBuyId=${encodeURIComponent(groupBuyId)}`;
      const [s, r] = await Promise.all([
        fetchJson(`/api/intl-shipping/parcel-sizes${qs}`),
        fetchJson(`/api/intl-shipping/rates${qs}`),
      ]);
      const sizes = Array.isArray(s) ? s : [];
      const rates = Array.isArray(r) ? r : [];
      setSizes(sizes);
      setRates(rates);
      setActiveSizeId(prev => {
        if (prev && sizes.some((sz: ParcelSize) => sz.id === prev)) return prev;
        return sizes.length ? sizes[0].id : null;
      });
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load shipping data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [groupBuyId]);

  const visibleRates = rates.filter(r => r.parcelSizeId === activeSizeId);
  const infoModalSize = sizes.find(s => s.id === infoModalSizeId) ?? null;

  async function loadEuTemplate() {
    if (!confirm("Pre-fill this group buy with 37 EU countries × 2 tiers (Small 1–8 kits / Large 9+ kits) at default UPS/ParcelForce rates. Continue?")) return;
    setSeeding(true); setErr(null);
    try {
      const res = await fetch("/api/intl-shipping/seed-template", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ groupBuyId }),
        ...credentialOpts,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? res.statusText);
      }
      await load();
    } catch (e: any) { setErr(e.message); }
    finally { setSeeding(false); }
  }

  async function saveNewSize() {
    setSaving(true); setErr(null);
    try {
      const res = await fetch("/api/intl-shipping/parcel-sizes", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ ...sizeDraft, groupBuyId }),
        ...credentialOpts,
      });
      if (!res.ok) throw new Error(await res.text());
      await load(); setAddingSize(false); setSizeDraft(emptySize());
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function saveEditSize(id: string) {
    setSaving(true); setErr(null);
    try {
      const res = await fetch(`/api/intl-shipping/parcel-sizes/${id}`, {
        method: "PATCH", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(editSizeDraft),
        ...credentialOpts,
      });
      if (!res.ok) throw new Error(await res.text());
      await load(); setEditingSizeId(null);
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function saveNotes(id: string, notes: string) {
    await fetch(`/api/intl-shipping/parcel-sizes/${id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
      ...credentialOpts,
    });
    await load();
  }

  async function deleteSize(id: string) {
    if (!confirm("Delete this shipping tier and all its country rates?")) return;
    try {
      await fetch(`/api/intl-shipping/parcel-sizes/${id}`, { method: "DELETE", headers, ...credentialOpts });
      await load();
      if (activeSizeId === id) setActiveSizeId(null);
    } catch { setErr("Delete failed"); }
  }

  async function saveNewRate() {
    setSaving(true); setErr(null);
    try {
      const payload = { ...rateDraft, parcelSizeId: activeSizeId, groupBuyId };
      const res = await fetch("/api/intl-shipping/rates", {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(payload),
        ...credentialOpts,
      });
      if (!res.ok) throw new Error(await res.text());
      await load(); setAddingRate(false); setRateDraft(emptyRate(activeSizeId!));
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function saveEditRate(id: string) {
    setSaving(true); setErr(null);
    try {
      const res = await fetch(`/api/intl-shipping/rates/${id}`, {
        method: "PATCH", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(editRateDraft),
        ...credentialOpts,
      });
      if (!res.ok) throw new Error(await res.text());
      await load(); setEditingRateId(null);
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function deleteRate(id: string) {
    if (!confirm("Delete this rate?")) return;
    try {
      await fetch(`/api/intl-shipping/rates/${id}`, { method: "DELETE", headers, ...credentialOpts });
      await load();
    } catch { setErr("Delete failed"); }
  }

  async function toggleRate(rate: ShippingRate) {
    await fetch(`/api/intl-shipping/rates/${rate.id}`, {
      method: "PATCH", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ...rate, active: !rate.active }),
      ...credentialOpts,
    });
    await load();
  }

  if (loading) return (
    <div className="p-12 flex flex-col items-center gap-3 text-gray-400">
      <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      <span className="text-sm">Loading shipping tiers…</span>
    </div>
  );

  if (err && sizes.length === 0) return (
    <div className="p-12 flex flex-col items-center gap-4">
      <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700 text-center max-w-sm">
        <p className="font-semibold mb-1">Could not load shipping data</p>
        <p className="text-xs opacity-80">{err}</p>
      </div>
      <button onClick={load} className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors">Retry</button>
    </div>
  );

  return (
    <div className="space-y-5">
      {gbName && (
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Globe className="w-4 h-4 text-blue-600" /> {gbName}
        </div>
      )}

      {err && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-xs text-red-700 flex items-center gap-2">
          <X className="w-3.5 h-3.5 shrink-0" /> {err}
          <button onClick={() => setErr(null)} className="ml-auto"><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* ─── AI Setup (only when no tiers yet or always visible) ─── */}
      {!readonly && (
        <AiSetupPanel
          groupBuyId={groupBuyId}
          headers={headers}
          credentialOpts={credentialOpts}
          onApplied={load}
        />
      )}

      {/* ─── Shipping Tiers ─── */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-gray-800">Shipping Tiers</h3>
            <span className="text-[10px] text-gray-400 font-medium">— one tier per order-size band</span>
          </div>
          {!readonly && (
            <div className="flex items-center gap-2">
              {sizes.length === 0 && (
                <button onClick={loadEuTemplate} disabled={seeding}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors">
                  <Download className="w-3.5 h-3.5" />
                  {seeding ? "Loading…" : "Load EU Template"}
                </button>
              )}
              {!addingSize && (
                <button onClick={() => setAddingSize(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Tier
                </button>
              )}
            </div>
          )}
        </div>

        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className={TH}>Tier Name</th>
              <th className={TH}>Qty Range</th>
              <th className={TH}>Max Kits/Pkg</th>
              <th className={TH}>Countries</th>
              <th className={TH}>Delivery Info</th>
              {!readonly && <th className={TH}>Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sizes.map(sz => {
              const tierRateCount = rates.filter(r => r.parcelSizeId === sz.id && r.active).length;
              return (
                <tr key={sz.id} className={`hover:bg-gray-50/50 ${!sz.active ? "opacity-50" : ""}`}>
                  {editingSizeId === sz.id ? (
                    <>
                      <td className={CELL}>
                        <input className={INPUT_CLS} value={editSizeDraft.name ?? ""} onChange={e => setEditSizeDraft(p => ({ ...p, name: e.target.value }))} autoFocus />
                      </td>
                      <td className={CELL}>
                        <input className={INPUT_CLS} value={editSizeDraft.qtyLabel ?? ""} onChange={e => setEditSizeDraft(p => ({ ...p, qtyLabel: e.target.value }))} placeholder="e.g. 1–8 kits" />
                      </td>
                      <td className={CELL}>
                        <input className={INPUT_CLS} type="number" min={1} value={editSizeDraft.maxKitsPerPackage ?? ""} onChange={e => setEditSizeDraft(p => ({ ...p, maxKitsPerPackage: e.target.value ? Number(e.target.value) : null }))} placeholder="25" style={{ width: 64 }} />
                      </td>
                      <td className={CELL}>—</td>
                      <td className={CELL}>—</td>
                      <td className={`${CELL} flex items-center gap-1`}>
                        <button onClick={() => saveEditSize(sz.id)} disabled={saving} className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"><Save className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingSizeId(null)} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"><X className="w-3.5 h-3.5" /></button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={`${CELL} font-semibold text-gray-800`}>{sz.name}</td>
                      <td className={CELL}>
                        {sz.qtyLabel
                          ? <span className="inline-flex px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold">{sz.qtyLabel}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className={CELL}>
                        {sz.maxKitsPerPackage != null
                          ? <span className="inline-flex px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[10px] font-semibold">{sz.maxKitsPerPackage}</span>
                          : <span className="text-gray-300 text-[10px]">25 (default)</span>}
                      </td>
                      <td className={CELL}>
                        <button
                          onClick={() => { setActiveSizeId(sz.id); setAddingRate(false); setEditingRateId(null); }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-semibold hover:bg-blue-50 hover:text-blue-700 transition-colors">
                          {tierRateCount} {tierRateCount === 1 ? "country" : "countries"}
                        </button>
                      </td>
                      <td className={CELL}>
                        <button
                          onClick={() => setInfoModalSizeId(sz.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${sz.notes ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-400 hover:bg-blue-50 hover:text-blue-600"}`}>
                          <Info className="w-3 h-3" />
                          {sz.notes ? "View / Edit" : "Add Info"}
                        </button>
                      </td>
                      {!readonly && (
                        <td className={`${CELL} flex items-center gap-1`}>
                          <button onClick={() => { setEditingSizeId(sz.id); setEditSizeDraft({ ...sz }); }} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteSize(sz.id)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              );
            })}

            {addingSize && (
              <tr className="bg-blue-50/40">
                <td className={CELL}>
                  <input className={INPUT_CLS} value={sizeDraft.name} onChange={e => setSizeDraft(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Standard or Small (1–8 kits)" autoFocus />
                </td>
                <td className={CELL}>
                  <input className={INPUT_CLS} value={sizeDraft.qtyLabel ?? ""} onChange={e => setSizeDraft(p => ({ ...p, qtyLabel: e.target.value }))} placeholder="e.g. 1–8 kits" />
                </td>
                <td className={CELL}>
                  <input className={INPUT_CLS} type="number" min={1} value={sizeDraft.maxKitsPerPackage ?? ""} onChange={e => setSizeDraft(p => ({ ...p, maxKitsPerPackage: e.target.value ? Number(e.target.value) : null }))} placeholder="25" style={{ width: 64 }} />
                </td>
                <td className={CELL}>—</td>
                <td className={CELL}>—</td>
                <td className={`${CELL} flex items-center gap-1`}>
                  <button onClick={saveNewSize} disabled={saving} className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"><Save className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { setAddingSize(false); setSizeDraft(emptySize()); }} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"><X className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            )}

            {sizes.length === 0 && !addingSize && (
              <tr>
                <td colSpan={readonly ? 5 : 6} className="px-4 py-8 text-center text-xs text-gray-400">
                  {readonly
                    ? "No shipping tiers configured yet."
                    : "No tiers yet — use AI Setup above, click \"Add Tier\", or load the EU Template."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Country Rates ─── */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-green-600" />
            <h3 className="text-sm font-bold text-gray-800">Country Rates</h3>
            {activeSizeId && sizes.find(s => s.id === activeSizeId) && (
              <span className="text-[10px] text-gray-500 font-normal">
                — {sizes.find(s => s.id === activeSizeId)!.name}
              </span>
            )}
          </div>
          {!readonly && activeSizeId && !addingRate && (
            <button
              onClick={() => { setAddingRate(true); setRateDraft(emptyRate(activeSizeId)); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Country
            </button>
          )}
        </div>

        {sizes.length > 0 && (
          <div className="flex border-b border-gray-100 bg-white px-4 gap-1 pt-2 overflow-x-auto">
            {sizes.map(sz => (
              <button key={sz.id}
                onClick={() => { setActiveSizeId(sz.id); setAddingRate(false); setEditingRateId(null); }}
                className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${activeSizeId === sz.id ? "border-blue-500 text-blue-600 bg-blue-50" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                {sz.name}
                {sz.qtyLabel && <span className="ml-1 text-[10px] opacity-60">({sz.qtyLabel})</span>}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className={TH}>Country</th>
                <th className={TH}>Region</th>
                <th className={TH}>Carrier</th>
                <th className={TH}>£ GBP</th>
                <th className={TH}>$ USD</th>
                <th className={TH}>€ EUR</th>
                {!readonly && <th className={TH}>Active</th>}
                {!readonly && <th className={TH}>Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {addingRate && (
                <tr className="bg-green-50/40">
                  <td className={CELL}><CountrySelect value={rateDraft.country} onChange={v => setRateDraft(p => ({ ...p, country: v }))} autoFocus /></td>
                  <td className={CELL}><input className={INPUT_CLS} value={rateDraft.region ?? ""} onChange={e => setRateDraft(p => ({ ...p, region: e.target.value }))} placeholder="e.g. Ibiza (optional)" /></td>
                  <td className={CELL}><input className={INPUT_CLS} value={rateDraft.carrier} onChange={e => setRateDraft(p => ({ ...p, carrier: e.target.value }))} placeholder="UPS" /></td>
                  <td className={CELL}><input className={INPUT_CLS} value={rateDraft.priceGbp} onChange={e => setRateDraft(p => ({ ...p, priceGbp: e.target.value }))} placeholder="0.00" /></td>
                  <td className={CELL}><input className={INPUT_CLS} value={rateDraft.priceUsd} onChange={e => setRateDraft(p => ({ ...p, priceUsd: e.target.value }))} placeholder="0.00" /></td>
                  <td className={CELL}><input className={INPUT_CLS} value={rateDraft.priceEur} onChange={e => setRateDraft(p => ({ ...p, priceEur: e.target.value }))} placeholder="0.00" /></td>
                  <td className={CELL} />
                  <td className={`${CELL} flex items-center gap-1`}>
                    <button onClick={saveNewRate} disabled={saving} className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"><Save className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setAddingRate(false)} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"><X className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              )}

              {visibleRates.map(rate => (
                <tr key={rate.id} className={`hover:bg-gray-50/50 ${!rate.active ? "opacity-50 bg-gray-50" : ""}`}>
                  {editingRateId === rate.id ? (
                    <>
                      <td className={CELL}><CountrySelect value={editRateDraft.country ?? ""} onChange={v => setEditRateDraft(p => ({ ...p, country: v }))} /></td>
                      <td className={CELL}><input className={INPUT_CLS} value={editRateDraft.region ?? ""} onChange={e => setEditRateDraft(p => ({ ...p, region: e.target.value }))} placeholder="optional" /></td>
                      <td className={CELL}><input className={INPUT_CLS} value={editRateDraft.carrier ?? ""} onChange={e => setEditRateDraft(p => ({ ...p, carrier: e.target.value }))} /></td>
                      <td className={CELL}><input className={INPUT_CLS} value={editRateDraft.priceGbp ?? ""} onChange={e => setEditRateDraft(p => ({ ...p, priceGbp: e.target.value }))} /></td>
                      <td className={CELL}><input className={INPUT_CLS} value={editRateDraft.priceUsd ?? ""} onChange={e => setEditRateDraft(p => ({ ...p, priceUsd: e.target.value }))} /></td>
                      <td className={CELL}><input className={INPUT_CLS} value={editRateDraft.priceEur ?? ""} onChange={e => setEditRateDraft(p => ({ ...p, priceEur: e.target.value }))} /></td>
                      <td className={CELL} />
                      <td className={`${CELL} flex items-center gap-1`}>
                        <button onClick={() => saveEditRate(rate.id)} disabled={saving} className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"><Save className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingRateId(null)} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"><X className="w-3.5 h-3.5" /></button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={`${CELL} font-medium text-gray-800`}>{rate.country}</td>
                      <td className={CELL}>{rate.region ?? <span className="text-gray-300">—</span>}</td>
                      <td className={CELL}>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${rate.carrier === "UPS" ? "bg-amber-50 text-amber-700" : "bg-purple-50 text-purple-700"}`}>
                          {rate.carrier}
                        </span>
                      </td>
                      <td className={CELL}>£{rate.priceGbp}</td>
                      <td className={`${CELL} font-semibold text-gray-800`}>${rate.priceUsd}</td>
                      <td className={CELL}>€{rate.priceEur}</td>
                      {!readonly && (
                        <td className={CELL}>
                          <button onClick={() => toggleRate(rate)}
                            className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${rate.active ? "bg-green-500 border-green-500 text-white" : "bg-white border-gray-300 text-transparent"}`}>
                            <Check className="w-3 h-3" />
                          </button>
                        </td>
                      )}
                      {!readonly && (
                        <td className={`${CELL} flex items-center gap-1`}>
                          <button onClick={() => { setEditingRateId(rate.id); setEditRateDraft({ ...rate }); }} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteRate(rate.id)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}

              {visibleRates.length === 0 && !addingRate && (
                <tr>
                  <td colSpan={readonly ? 6 : 8} className="px-4 py-8 text-center text-xs text-gray-400">
                    {activeSizeId ? "No rates for this tier yet — click \"Add Country\" to start." : "Select a shipping tier above to view rates."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Info modal ─── */}
      {infoModalSize && (
        <InfoModal
          size={infoModalSize}
          rates={rates}
          onClose={() => setInfoModalSizeId(null)}
          onSave={async (notes) => {
            await saveNotes(infoModalSize.id, notes);
            setInfoModalSizeId(null);
          }}
          readonly={readonly}
        />
      )}
    </div>
  );
}
