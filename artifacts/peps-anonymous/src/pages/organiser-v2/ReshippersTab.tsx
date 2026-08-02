import { useState, useEffect, useCallback } from "react";
import { V2_CARD_BORDER } from "./theme";
import { organiserApi, type ApiGbReshipper } from "./api/organiser-api";
import type { OrganiserOrder } from "./domain/order";
import {
  Users, Plus, Loader2, Trash2, Copy, Check, AlertCircle,
  RefreshCw, Package, ArrowRight, X, Search, MapPin,
  HelpCircle, Lightbulb,
} from "lucide-react";

// ─── Workspace: Reshippers Tab ────────────────────────────────────────────────
// Manages GB reshipper assignments via the organiser-reshippers API.

const PAYMENT_METHOD_KEYS = [
  { key: "usdtEnabled", label: "USDT" },
  { key: "revolutEnabled", label: "Revolut" },
  { key: "paypalEnabled", label: "PayPal" },
  { key: "cryptoEnabled", label: "Crypto" },
  { key: "anonPayEnabled", label: "AnonPay" },
] as const;

interface ReshippersTabProps {
  selectedGbId?: string;
}

export default function ReshippersTab({ selectedGbId }: ReshippersTabProps = {}) {
  const [reshippers, setReshippers] = useState<ApiGbReshipper[]>([]);
  const [orders, setOrders] = useState<OrganiserOrder[]>([]);
  const [approvedList, setApprovedList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showExplainer, setShowExplainer] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Invite code
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  // Add reshipper form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [addCountry, setAddCountry] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  // Reassign modal
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrganiserOrder | null>(null);
  const [reassigning, setReassigning] = useState(false);

  const load = useCallback(() => {
    if (!selectedGbId) return;
    setLoading(true); setError("");
    Promise.all([
      organiserApi.gbReshippers(selectedGbId),
      organiserApi.orders(selectedGbId),
      organiserApi.approvedReshippers(),
    ])
      .then(([r, o, approved]) => {
        setReshippers(r);
        setOrders(o);
        setApprovedList(approved.map(a => a.telegramUsername));
      })
      .catch(() => setError("Failed to load reshippers"))
      .finally(() => setLoading(false));
  }, [selectedGbId]);

  useEffect(() => { load(); }, [load]);

  const handleCopyInvite = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleGenerateCode = async () => {
    if (!selectedGbId) return;
    setGeneratingCode(true);
    try {
      const res = await organiserApi.generateReshippperInviteCode(selectedGbId);
      setInviteCode(res.inviteCode);
    } catch {
      setError("Failed to generate invite code");
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleRemove = async (username: string) => {
    if (!selectedGbId || !confirm(`Remove @${username} from this group buy?`)) return;
    try {
      await organiserApi.deleteReshipper(selectedGbId, username);
      setReshippers(prev => prev.filter(r => r.reshipperUsername !== username));
    } catch {
      setError("Failed to remove reshipper");
    }
  };

  const handleToggleEnabled = async (r: ApiGbReshipper) => {
    if (!selectedGbId) return;
    try {
      const updated = await organiserApi.updateReshipper(selectedGbId, r.reshipperUsername, { enabled: !r.enabled });
      setReshippers(prev => prev.map(x => x.id === updated.id ? updated : x));
    } catch {
      setError("Failed to update reshipper");
    }
  };

  const handleAddReshipper = async () => {
    if (!selectedGbId || !addUsername.trim() || !addCountry.trim()) {
      setAddError("Username and country are required");
      return;
    }
    setAdding(true); setAddError("");
    try {
      const newR = await organiserApi.addReshipper(selectedGbId, {
        reshipperUsername: addUsername.trim().replace(/^@/, ""),
        country: addCountry.trim(),
      });
      setReshippers(prev => [...prev, newR]);
      setAddUsername(""); setAddCountry("");
      setShowAddForm(false);
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to add reshipper");
    } finally {
      setAdding(false);
    }
  };

  const handleReassign = async (reshipperUsername: string | null) => {
    if (!selectedGbId || !selectedOrder) return;
    setReassigning(true);
    try {
      await organiserApi.reassignReshipper(selectedGbId, selectedOrder.id, reshipperUsername);
      setShowReassignModal(false);
      setSelectedOrder(null);
    } catch {
      setError("Failed to reassign order");
    } finally {
      setReassigning(false);
    }
  };

  const filteredOrders = orders.filter(o =>
    !searchQuery ||
    o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.memberUsername ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.memberName ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!selectedGbId) {
    return (
      <div className="rounded-xl p-8 sm:p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <Users className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
        <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>No Group Buy Selected</h3>
        <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>Select a group buy to manage reshippers</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: "var(--t-blue)" }} />
        <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>Loading reshippers…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="rounded-xl p-4 sm:p-5 bg-white flex items-center justify-between" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div>
          <h2 className="text-lg sm:text-xl font-bold" style={{ color: "var(--t-text)" }}>Reshippers</h2>
          <p className="text-[13px] sm:text-[14px] mt-1" style={{ color: "var(--t-subtle)" }}>
            Manage reshipper assignments and route orders by country
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-black/5" style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-muted)" }}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => { setAddUsername(""); setAddCountry(""); setAddError(""); setShowAddForm(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold text-white"
            style={{ background: "var(--t-blue)" }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Reshipper
          </button>
        </div>
      </div>

      {/* Explainer */}
      {showExplainer && (
        <div className="rounded-xl p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-indigo-50" style={{ border: "1px solid var(--t-blue-20)" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--t-blue)", color: "#fff" }}>
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>How Reshippers Work</h3>
                <p className="text-[14px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                  Reshippers receive bulk shipments from you, then forward individual orders to customers in their region.
                </p>
              </div>
            </div>
            <button onClick={() => setShowExplainer(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 shrink-0" style={{ color: "var(--t-subtle)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
          <p className="text-[13px] font-semibold" style={{ color: "#DC2626" }}>{error}</p>
          <button onClick={() => setError("")} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-100">
            <X className="w-3.5 h-3.5" style={{ color: "#DC2626" }} />
          </button>
        </div>
      )}

      {/* Invite Code */}
      <div className="rounded-xl p-4 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--t-text)" }}>Reshipper Invite Code</div>
            <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>Share with approved reshippers to let them join this group buy</div>
          </div>
          <div className="flex items-center gap-2">
            {inviteCode ? (
              <>
                <code className="px-3 py-2 rounded-lg text-[14px] font-mono font-bold" style={{ background: "var(--t-surface2)", color: "var(--t-text)" }}>
                  {inviteCode}
                </code>
                <button onClick={handleCopyInvite} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors" style={{ border: `1px solid ${V2_CARD_BORDER}`, color: copiedInvite ? "#12B76A" : "var(--t-text)" }} title="Copy code">
                  {copiedInvite ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </>
            ) : (
              <button onClick={handleGenerateCode} disabled={generatingCode} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold hover:bg-black/5 disabled:opacity-50" style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-blue)" }}>
                {generatingCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Generate Code
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reshippers Grid */}
      {reshippers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reshippers.map(reshipper => (
            <div key={reshipper.id} className="rounded-xl p-4 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>@{reshipper.reshipperUsername}</p>
                    <span className="text-[12px] font-bold px-2 py-0.5 rounded-full" style={{ background: reshipper.enabled ? "#D1FADF" : "#F2F4F7", color: reshipper.enabled ? "#12B76A" : "#667085" }}>
                      {reshipper.enabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-[12px] mt-0.5" style={{ color: "var(--t-subtle)" }}>
                    <MapPin className="w-3 h-3 inline mr-1" />{reshipper.country}
                  </p>
                </div>
                <button onClick={() => handleRemove(reshipper.reshipperUsername)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors" style={{ color: "#DC2626" }} title="Remove">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-3 pb-3" style={{ borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>
                      {reshipper.paymentTarget === "reshipper" ? "Direct Payment" : "Via Admin"}
                    </div>
                    <div className="group relative">
                      <HelpCircle className="w-3.5 h-3.5 cursor-help" style={{ color: "var(--t-subtle)" }} />
                      <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-64 p-2 rounded-lg text-[12px] leading-relaxed z-10 shadow-lg" style={{ background: "var(--t-text)", color: "#fff" }}>
                        {reshipper.paymentTarget === "reshipper"
                          ? "Customers pay this reshipper directly."
                          : "Customers pay you, then you pay the reshipper."}
                      </div>
                    </div>
                  </div>
                  <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>Payment routing</div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="mb-3">
                <div className="text-[12px] font-semibold mb-2" style={{ color: "var(--t-subtle)" }}>Payment Methods</div>
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_METHOD_KEYS.filter(({ key }) => (reshipper.enabledPaymentMethods as Record<string, boolean> | null)?.[key]).map(({ label }) => (
                    <span key={label} className="text-[12px] font-bold px-2 py-1 rounded-md" style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}>{label}</span>
                  ))}
                  {!Object.values(reshipper.enabledPaymentMethods ?? {}).some(Boolean) && (
                    <span className="text-[12px]" style={{ color: "var(--t-subtle)" }}>None configured</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleEnabled(reshipper)}
                  className="flex-1 px-3 py-2 rounded-lg text-[13px] font-semibold hover:bg-black/5 transition-colors"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                >
                  {reshipper.enabled ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl p-8 sm:p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <Users className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
          <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>No Reshippers</h3>
          <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>Add your first reshipper to start routing orders by country</p>
        </div>
      )}

      {/* Orders Reassign */}
      <div className="rounded-xl bg-white overflow-hidden" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
          <div>
            <h3 className="text-[15px] font-bold" style={{ color: "var(--t-text)" }}>Reassign Orders</h3>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--t-subtle)" }}>Move orders between reshippers</p>
          </div>
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-subtle)" }} />
            <input
              type="text"
              placeholder="Search orders…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg text-[13px] outline-none"
              style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
            />
          </div>
        </div>
        {filteredOrders.length > 0 ? (
          <div className="divide-y" style={{ borderColor: V2_CARD_BORDER }}>
            {filteredOrders.slice(0, 50).map(order => (
              <div key={order.id} className="p-4 hover:bg-black/[0.02] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 grid grid-cols-[120px_1fr_140px] gap-4 items-center">
                    <div>
                      <div className="text-[14px] font-bold truncate" style={{ color: "var(--t-text)" }}>{order.code ?? order.id.slice(0, 8)}</div>
                      <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>{order.country}</div>
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold truncate" style={{ color: "var(--t-text)" }}>{order.memberName}</div>
                      <div className="text-[12px] truncate" style={{ color: "var(--t-subtle)" }}>@{order.memberUsername}</div>
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold px-2 py-1 rounded-md inline-block" style={{ background: "var(--t-surface2)", color: "var(--t-muted)" }}>
                        {(order as any).reshipperUsername ? `@${(order as any).reshipperUsername}` : "No reshipper"}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedOrder(order); setShowReassignModal(true); }}
                    className="ml-4 px-3 py-2 rounded-lg text-[13px] font-semibold hover:bg-black/5"
                    style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-blue)" }}
                  >
                    <ArrowRight className="w-3.5 h-3.5 inline mr-1" /> Reassign
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Package className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--t-subtle)" }} />
            <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>No orders found</p>
          </div>
        )}
      </div>

      {/* Add Reshipper Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddForm(false)}>
          <div className="bg-white rounded-xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
              <h3 className="text-[16px] font-bold" style={{ color: "var(--t-text)" }}>Add Reshipper</h3>
              <button onClick={() => setShowAddForm(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5" style={{ color: "var(--t-subtle)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {addError && (
                <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#DC2626" }} />
                  <p className="text-[13px]" style={{ color: "#DC2626" }}>{addError}</p>
                </div>
              )}
              <div>
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>Username</label>
                {approvedList.length > 0 ? (
                  <select value={addUsername} onChange={e => setAddUsername(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg text-[14px] outline-none" style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}>
                    <option value="">Select approved reshipper…</option>
                    {approvedList.map(u => <option key={u} value={u}>@{u}</option>)}
                  </select>
                ) : (
                  <input type="text" placeholder="@reshipper_username" value={addUsername} onChange={e => setAddUsername(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg text-[14px] outline-none" style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }} />
                )}
              </div>
              <div>
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>Country</label>
                <input type="text" placeholder="e.g. United Kingdom" value={addCountry} onChange={e => setAddCountry(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg text-[14px] outline-none" style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }} />
              </div>
            </div>
            <div className="px-5 py-4 flex items-center justify-end gap-2" style={{ borderTop: `1px solid ${V2_CARD_BORDER}` }}>
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg text-[14px] font-semibold hover:bg-black/5" style={{ color: "var(--t-text)", border: `1px solid ${V2_CARD_BORDER}` }}>Cancel</button>
              <button onClick={handleAddReshipper} disabled={adding} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white flex items-center gap-2 disabled:opacity-50" style={{ background: "var(--t-blue)" }}>
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {adding ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {showReassignModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowReassignModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
              <div>
                <h3 className="text-[16px] font-bold" style={{ color: "var(--t-text)" }}>Reassign Order</h3>
                <p className="text-[13px] mt-0.5" style={{ color: "var(--t-subtle)" }}>{selectedOrder.code ?? selectedOrder.id.slice(0, 8)}</p>
              </div>
              <button onClick={() => setShowReassignModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5" style={{ color: "var(--t-subtle)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="text-[13px] font-semibold mb-2" style={{ color: "var(--t-text)" }}>Assign to:</div>
              <div className="space-y-2">
                {reshippers.filter(r => r.enabled).map(r => (
                  <button key={r.id} onClick={() => handleReassign(r.reshipperUsername)} disabled={reassigning}
                    className="w-full p-3 rounded-lg text-left hover:bg-black/5 transition-colors disabled:opacity-50"
                    style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
                    <div className="text-[14px] font-semibold" style={{ color: "var(--t-text)" }}>@{r.reshipperUsername}</div>
                    <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>{r.country}</div>
                  </button>
                ))}
                <button onClick={() => handleReassign(null)} disabled={reassigning}
                  className="w-full p-3 rounded-lg text-left hover:bg-black/5 transition-colors disabled:opacity-50"
                  style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
                  <div className="text-[14px] font-semibold" style={{ color: "var(--t-text)" }}>Remove reshipper</div>
                  <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>Clear assignment</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
