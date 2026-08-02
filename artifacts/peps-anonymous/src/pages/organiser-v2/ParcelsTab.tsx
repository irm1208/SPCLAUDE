import { useState, useEffect } from "react";
import {
  Package, Search, Filter, ExternalLink, Clock,
  ChevronDown, ChevronRight,
  X, Plus, Trash2, Loader2, RefreshCw,
} from "lucide-react";
import { V2_CARD_BORDER } from "./theme";
import { organiserApi, type ApiParcel } from "./api/organiser-api";

// ─── Workspace: Parcels Tab ──────────────────────────────────────────────────
// Manages GB parcels via /organiser/group-buys/:id/parcels (GET + POST + DELETE).

interface ParcelsTabProps {
  selectedGbId?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:           { label: "Pending",          color: "#6B7280", bg: "#F2F4F7" },
  in_transit:        { label: "In Transit",        color: "#4A6CF7", bg: "#E8ECFE" },
  out_for_delivery:  { label: "Out for Delivery",  color: "#F79009", bg: "#FEF0C7" },
  delivered:         { label: "Delivered",         color: "#12B76A", bg: "#D1FADF" },
  exception:         { label: "Exception",         color: "#F04438", bg: "#FEE4E2" },
};

const CARRIERS = [
  "Auto", "Royal Mail", "DHL Express", "UPS", "FedEx", "USPS",
  "Parcelforce", "Evri", "DPD", "Yodel", "TNT", "GLS", "Other",
];

export default function ParcelsTab({ selectedGbId }: ParcelsTabProps = {}) {
  const [parcels, setParcels] = useState<ApiParcel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedParcel, setExpandedParcel] = useState<string | null>(null);
  const [showAddParcel, setShowAddParcel] = useState(false);

  // Add parcel form
  const [label, setLabel] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("Auto");
  const [customTrackingUrl, setCustomTrackingUrl] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [itemInput, setItemInput] = useState("");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const load = () => {
    if (!selectedGbId) return;
    setLoading(true); setError("");
    organiserApi.parcels(selectedGbId)
      .then(setParcels)
      .catch(() => setError("Failed to load parcels"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [selectedGbId]);

  const addItem = (item: string) => {
    if (item.trim() && !items.includes(item.trim())) {
      setItems([...items, item.trim()]);
      setItemInput("");
    }
  };

  const handleItemPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const parsed = e.clipboardData.getData("text")
      .split(/[\n,;|]+/).map(s => s.trim()).filter(Boolean);
    if (parsed.length > 1) {
      const next = [...items];
      parsed.forEach(it => { if (!next.includes(it)) next.push(it); });
      setItems(next); setItemInput("");
    } else if (parsed.length === 1) {
      setItemInput(parsed[0]);
    }
  };

  const resetForm = () => {
    setLabel(""); setTrackingNumber(""); setCarrier("Auto");
    setCustomTrackingUrl(""); setItems([]); setNotes(""); setItemInput(""); setAddError("");
  };

  const handleSubmit = async () => {
    if (!selectedGbId || !label.trim() || !trackingNumber.trim()) {
      setAddError("Label and tracking number are required");
      return;
    }
    setAdding(true); setAddError("");
    try {
      const parcel = await organiserApi.createParcel(selectedGbId, {
        label: label.trim(),
        trackingNumber: trackingNumber.trim(),
        carrier: carrier || "Auto",
        trackingUrl: customTrackingUrl.trim() || undefined,
        items,
        notes: notes.trim() || undefined,
      });
      setParcels(prev => [parcel, ...prev]);
      resetForm();
      setShowAddParcel(false);
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to add parcel");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (parcelId: string) => {
    if (!selectedGbId || !confirm("Delete this parcel?")) return;
    try {
      await organiserApi.deleteParcel(selectedGbId, parcelId);
      setParcels(prev => prev.filter(p => p.id !== parcelId));
    } catch {
      setError("Failed to delete parcel");
    }
  };

  const filteredParcels = parcels.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || p.label.toLowerCase().includes(q) || p.trackingNumber.toLowerCase().includes(q) ||
      (p.carrier ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const allStatuses = ["all", ...Array.from(new Set(parcels.map(p => p.status)))];

  if (!selectedGbId) {
    return (
      <div className="rounded-xl p-8 sm:p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <Package className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
        <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>No Group Buy Selected</h3>
        <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>Select a group buy to manage parcels</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="rounded-xl p-4 sm:p-5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div>
          <h2 className="text-lg sm:text-xl font-bold" style={{ color: "var(--t-text)" }}>Parcels</h2>
          <p className="text-[13px] sm:text-[14px] mt-1" style={{ color: "var(--t-subtle)" }}>Track parcels shipped to reshippers</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-black/5"
            style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-muted)" }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => { resetForm(); setShowAddParcel(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold text-white"
            style={{ background: "var(--t-blue)" }}
          >
            <Package className="w-3.5 h-3.5" /> Add Parcel
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
          <p className="text-[13px] font-semibold" style={{ color: "#DC2626" }}>{error}</p>
          <button onClick={() => setError("")} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-100">
            <X className="w-3.5 h-3.5" style={{ color: "#DC2626" }} />
          </button>
        </div>
      )}

      {/* Search + filter */}
      <div className="rounded-xl p-4 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-subtle)" }} />
            <input
              type="text"
              placeholder="Search by label, tracking number, carrier…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-lg text-[14px] outline-none"
              style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter className="w-4 h-4 shrink-0" style={{ color: "var(--t-subtle)" }} />
            {allStatuses.map(status => {
              const cfg = status === "all" ? null : STATUS_CONFIG[status];
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className="px-3 py-1.5 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-colors"
                  style={{
                    background: statusFilter === status ? "var(--t-blue-10)" : "transparent",
                    color: statusFilter === status ? "var(--t-blue)" : "var(--t-muted)",
                    border: `1px solid ${statusFilter === status ? "var(--t-blue)" : V2_CARD_BORDER}`,
                  }}
                >
                  {status === "all" ? `All (${parcels.length})` : (cfg?.label ?? status)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Parcels list */}
      {loading ? (
        <div className="rounded-xl p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: "var(--t-blue)" }} />
          <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>Loading parcels…</p>
        </div>
      ) : filteredParcels.length > 0 ? (
        <div className="space-y-3">
          {filteredParcels.map(parcel => {
            const isExpanded = expandedParcel === parcel.id;
            const cfg = STATUS_CONFIG[parcel.status] ?? STATUS_CONFIG.pending;
            return (
              <div key={parcel.id} className="rounded-lg bg-white overflow-hidden" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
                <button
                  onClick={() => setExpandedParcel(isExpanded ? null : parcel.id)}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-black/[0.02] transition-colors"
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--t-subtle)" }} /> : <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--t-subtle)" }} />}
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_140px_120px_100px] gap-2 sm:gap-4">
                    <div className="min-w-0">
                      <div className="text-[14px] font-bold truncate" style={{ color: "var(--t-text)" }}>{parcel.label}</div>
                      <div className="text-[12px] font-mono truncate" style={{ color: "var(--t-subtle)" }}>{parcel.trackingNumber}</div>
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--t-subtle)" }}>Carrier</div>
                      <div className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{parcel.carrier}</div>
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--t-subtle)" }}>Added</div>
                      <div className="text-[12px]" style={{ color: "var(--t-muted)" }}>
                        {parcel.createdAt ? new Date(parcel.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                      </div>
                    </div>
                    <div>
                      <span className="inline-block text-[12px] font-bold px-2 py-1 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-3 space-y-3" style={{ background: "var(--t-surface2)", borderTop: `1px solid ${V2_CARD_BORDER}` }}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <div className="text-[12px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--t-subtle)" }}>Tracking Number</div>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-mono font-semibold" style={{ color: "var(--t-text)" }}>{parcel.trackingNumber}</span>
                          {parcel.trackingUrl && (
                            <a
                              href={parcel.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[12px] font-semibold flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/50"
                              style={{ color: "var(--t-blue)" }}
                            >
                              Track <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(parcel.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50"
                        style={{ color: "#DC2626" }}
                        title="Delete parcel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {parcel.items.length > 0 && (
                      <div>
                        <div className="text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--t-subtle)" }}>Items</div>
                        <div className="flex flex-wrap gap-1.5">
                          {parcel.items.map((item, i) => (
                            <span key={i} className="text-[12px] px-2 py-1 rounded-md" style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}>
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {parcel.notes && (
                      <div>
                        <div className="text-[12px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--t-subtle)" }}>Notes</div>
                        <p className="text-[13px]" style={{ color: "var(--t-muted)" }}>{parcel.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl p-8 sm:p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <Package className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
          <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>
            {searchQuery || statusFilter !== "all" ? "No parcels found" : "No parcels yet"}
          </h3>
          <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>
            {searchQuery || statusFilter !== "all" ? "Try adjusting your filters" : "Add your first parcel above"}
          </p>
        </div>
      )}

      {/* Add Parcel Modal */}
      {showAddParcel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddParcel(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
              <div>
                <h3 className="text-[16px] font-bold" style={{ color: "var(--t-text)" }}>Add Parcel</h3>
                <p className="text-[13px] mt-0.5" style={{ color: "var(--t-subtle)" }}>Create a new tracked parcel shipment</p>
              </div>
              <button onClick={() => setShowAddParcel(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5" style={{ color: "var(--t-subtle)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {addError && (
                <div className="p-3 rounded-lg text-[13px] font-semibold" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
                  {addError}
                </div>
              )}

              <div>
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>Label <span style={{ color: "#EF4444" }}>*</span></label>
                <input type="text" placeholder="e.g. UK Batch 5 — Reshipper London" value={label} onChange={e => setLabel(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg text-[14px] outline-none" style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }} />
              </div>

              <div>
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>Tracking Number <span style={{ color: "#EF4444" }}>*</span></label>
                <input type="text" placeholder="e.g. RM123456789GB" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg text-[14px] font-mono outline-none" style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }} />
              </div>

              <div>
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>Carrier</label>
                <select value={carrier} onChange={e => setCarrier(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg text-[14px] outline-none" style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}>
                  {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>Custom Tracking URL (optional)</label>
                <input type="url" placeholder="https://track.carrier.com/..." value={customTrackingUrl} onChange={e => setCustomTrackingUrl(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg text-[14px] outline-none" style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }} />
              </div>

              <div>
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>Items in Parcel</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="Type item name, press Enter or paste a list…"
                    value={itemInput} onChange={e => setItemInput(e.target.value)}
                    onPaste={handleItemPaste} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addItem(itemInput))}
                    className="flex-1 h-10 px-3 rounded-lg text-[14px] outline-none" style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }} />
                  <button type="button" onClick={() => addItem(itemInput)}
                    className="px-3 h-10 rounded-lg text-[13px] font-semibold" style={{ background: "var(--t-blue)", color: "#fff" }}>
                    Add
                  </button>
                </div>
                {items.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "var(--t-surface2)" }}>
                        <span className="text-[13px]" style={{ color: "var(--t-text)" }}>{item}</span>
                        <button type="button" onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-50" style={{ color: "#EF4444" }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>Notes (optional)</label>
                <textarea placeholder="Add any internal notes…" value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 rounded-lg text-[14px] resize-none outline-none" style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }} />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white px-5 py-4 flex items-center justify-end gap-2" style={{ borderTop: `1px solid ${V2_CARD_BORDER}` }}>
              <button onClick={() => setShowAddParcel(false)}
                className="px-4 py-2 rounded-lg text-[14px] font-semibold hover:bg-black/5"
                style={{ color: "var(--t-text)", border: `1px solid ${V2_CARD_BORDER}` }}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={adding}
                className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white flex items-center gap-2 disabled:opacity-50"
                style={{ background: "var(--t-blue)" }}>
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {adding ? "Adding…" : "Add Parcel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
