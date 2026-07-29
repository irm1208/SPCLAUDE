import { useState, useEffect } from "react";
import { V2_CARD_BORDER } from "./theme";
import {
  Users, Plus, Loader2, Trash2, Save, Copy, Check, AlertCircle,
  RefreshCw, Package, ArrowRight, X, Search, User, MapPin, Info,
  HelpCircle, Lightbulb
} from "lucide-react";

// ─── Workspace: Reshippers Tab (Redesigned) ──────────────────────────────────
// Manage reshipper assignments and reassign orders

interface OrgReshipper {
  id: string;
  gbId: string;
  reshipperUsername: string;
  country: string;
  enabledPaymentMethods: {
    usdtEnabled?: boolean;
    revolutEnabled?: boolean;
    paypalEnabled?: boolean;
    cryptoEnabled?: boolean;
    anonPayEnabled?: boolean;
  } | null;
  enabled: boolean;
  paymentTarget: string;
  createdAt: string;
  orderCount: number;
}

interface Order {
  id: string;
  orderId: string;
  memberName: string;
  memberUsername: string;
  country: string;
  currentReshipper: string | null;
  status: string;
  total: number;
}

const PAYMENT_METHOD_KEYS = [
  { key: "usdtEnabled", label: "USDT" },
  { key: "revolutEnabled", label: "Revolut" },
  { key: "paypalEnabled", label: "PayPal" },
  { key: "cryptoEnabled", label: "Crypto" },
  { key: "anonPayEnabled", label: "AnonPay" },
] as const;

// Sample data
const SAMPLE_RESHIPPERS: OrgReshipper[] = [
  {
    id: "1",
    gbId: "gb_001",
    reshipperUsername: "uk_reshipper",
    country: "United Kingdom",
    enabledPaymentMethods: {
      usdtEnabled: true,
      revolutEnabled: true,
      paypalEnabled: true,
    },
    enabled: true,
    paymentTarget: "reshipper",
    createdAt: "2024-07-01T10:00:00Z",
    orderCount: 12,
  },
  {
    id: "2",
    gbId: "gb_001",
    reshipperUsername: "us_reshipper",
    country: "United States",
    enabledPaymentMethods: {
      usdtEnabled: true,
      paypalEnabled: true,
      cryptoEnabled: true,
    },
    enabled: true,
    paymentTarget: "admin",
    createdAt: "2024-07-02T11:00:00Z",
    orderCount: 8,
  },
];

const SAMPLE_ORDERS: Order[] = [
  {
    id: "1",
    orderId: "ORD-001",
    memberName: "Alice Morgan",
    memberUsername: "@alice_m",
    country: "United Kingdom",
    currentReshipper: "uk_reshipper",
    status: "paid",
    total: 155,
  },
  {
    id: "2",
    orderId: "ORD-002",
    memberName: "Bob Kumar",
    memberUsername: "@bob_k",
    country: "United Kingdom",
    currentReshipper: null,
    status: "paid",
    total: 50,
  },
  {
    id: "3",
    orderId: "ORD-003",
    memberName: "Charlie Davis",
    memberUsername: "@charlie_d",
    country: "United States",
    currentReshipper: "us_reshipper",
    status: "paid",
    total: 120,
  },
];

interface ReshippersTabProps {
  selectedGbId?: string;
}

export default function ReshippersTab({ selectedGbId }: ReshippersTabProps = {}) {
  const [reshippers, setReshippers] = useState<OrgReshipper[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState("GB_DEMO_CODE_12345");
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingReshipper, setEditingReshipper] = useState<string | null>(null);
  const [showExplainer, setShowExplainer] = useState(true);

  useEffect(() => {
    if (!selectedGbId) return;
    setReshippers(SAMPLE_RESHIPPERS);
    setOrders(SAMPLE_ORDERS);
  }, [selectedGbId]);

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleReassignOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowReassignModal(true);
  };

  const handleAssignToReshipper = (reshipperUsername: string) => {
    if (!selectedOrder) return;
    setOrders(prev =>
      prev.map(o => (o.id === selectedOrder.id ? { ...o, currentReshipper: reshipperUsername } : o))
    );
    setShowReassignModal(false);
    setSelectedOrder(null);
  };

  const handleRemoveReshipper = (username: string) => {
    if (confirm(`Remove @${username} from this group buy?`)) {
      setReshippers(prev => prev.filter(r => r.reshipperUsername !== username));
    }
  };

  const handleToggleEnabled = (username: string) => {
    setReshippers(prev =>
      prev.map(r => (r.reshipperUsername === username ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const filteredOrders = orders.filter(
    o =>
      searchQuery === "" ||
      o.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.memberUsername.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!selectedGbId) {
    return (
      <div className="rounded-xl p-8 sm:p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <Users className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
        <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>
          No Group Buy Selected
        </h3>
        <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>
          Select a group buy to manage reshippers
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <h2 className="text-lg sm:text-xl font-bold" style={{ color: "var(--t-text)" }}>Reshippers</h2>
        <p className="text-[13px] sm:text-[14px] mt-1" style={{ color: "var(--t-subtle)" }}>
          Manage reshipper assignments and route orders by country
        </p>
      </div>

      {/* Explainer Card */}
      {showExplainer && (
        <div className="rounded-xl p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-indigo-50" style={{ border: `1px solid var(--t-blue-20)` }}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--t-blue)", color: "#fff" }}>
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>How Reshippers Work</h3>
                <p className="text-[14px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                  Reshippers help you fulfill orders in different countries. They receive bulk shipments from you, then forward individual orders to customers in their region.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowExplainer(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 shrink-0"
              style={{ color: "var(--t-subtle)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div className="p-3 rounded-lg bg-white/80" style={{ border: `1px solid var(--t-blue-10)` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[13px] font-bold" style={{ background: "var(--t-blue)", color: "#fff" }}>1</div>
                <p className="text-[13px] font-bold" style={{ color: "var(--t-text)" }}>Add Reshippers</p>
              </div>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                Share your invite code with trusted reshippers. They'll join your group buy and specify which country they cover.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-white/80" style={{ border: `1px solid var(--t-blue-10)` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[13px] font-bold" style={{ background: "var(--t-blue)", color: "#fff" }}>2</div>
                <p className="text-[13px] font-bold" style={{ color: "var(--t-text)" }}>Route Orders</p>
              </div>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                Orders are automatically assigned to reshippers based on the customer's country. You can manually reassign orders anytime.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-white/80" style={{ border: `1px solid var(--t-blue-10)` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[13px] font-bold" style={{ background: "var(--t-blue)", color: "#fff" }}>3</div>
                <p className="text-[13px] font-bold" style={{ color: "var(--t-text)" }}>Payment Options</p>
              </div>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                Choose if customers pay the reshipper directly, or pay you (admin) who then pays the reshipper.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Invite Code */}
      <div className="rounded-xl p-4 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--t-text)" }}>Reshipper Invite Code</div>
            <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>
              Share this with approved reshippers to join this group buy
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="px-3 py-2 rounded-lg text-[14px] font-mono font-bold" style={{ background: "var(--t-surface2)", color: "var(--t-text)" }}>
              {inviteCode}
            </code>
            <button
              onClick={handleCopyInvite}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors"
              style={{ border: `1px solid ${V2_CARD_BORDER}`, color: copiedInvite ? "#12B76A" : "var(--t-text)" }}
              title="Copy code"
            >
              {copiedInvite ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Reshippers Grid */}
      {reshippers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reshippers.map(reshipper => (
            <div key={reshipper.id} className="rounded-xl p-4 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>@{reshipper.reshipperUsername}</p>
                    <span
                      className="text-[12px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: reshipper.enabled ? "#D1FADF" : "#F2F4F7",
                        color: reshipper.enabled ? "#12B76A" : "#667085",
                      }}
                    >
                      {reshipper.enabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-[12px] mt-0.5" style={{ color: "var(--t-subtle)" }}>
                    <MapPin className="w-3 h-3 inline mr-1" />
                    {reshipper.country}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveReshipper(reshipper.reshipperUsername)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                  style={{ color: "#DC2626" }}
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 mb-3 pb-3" style={{ borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
                <div>
                  <div className="text-[20px] font-bold" style={{ color: "var(--t-text)" }}>{reshipper.orderCount}</div>
                  <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>Orders assigned</div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>
                      {reshipper.paymentTarget === "reshipper" ? "Direct Payment" : "Via Admin"}
                    </div>
                    <div className="group relative">
                      <HelpCircle className="w-3.5 h-3.5 cursor-help" style={{ color: "var(--t-subtle)" }} />
                      <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-64 p-2 rounded-lg text-[12px] leading-relaxed z-10 shadow-lg" style={{ background: "var(--t-text)", color: "#fff" }}>
                        {reshipper.paymentTarget === "reshipper"
                          ? "Customers pay this reshipper directly using their payment methods."
                          : "Customers pay you (admin), then you pay the reshipper for their services."}
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
                  {PAYMENT_METHOD_KEYS.map(({ key, label }) => {
                    const enabled = (reshipper.enabledPaymentMethods as Record<string, boolean> | null)?.[key] ?? false;
                    if (!enabled) return null;
                    return (
                      <span
                        key={key}
                        className="text-[12px] font-bold px-2 py-1 rounded-md"
                        style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleEnabled(reshipper.reshipperUsername)}
                  className="flex-1 px-3 py-2 rounded-lg text-[13px] font-semibold hover:bg-black/5 transition-colors"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                >
                  {reshipper.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => setEditingReshipper(reshipper.reshipperUsername)}
                  className="flex-1 px-3 py-2 rounded-lg text-[13px] font-semibold text-white"
                  style={{ background: "var(--t-blue)" }}
                >
                  Edit Settings
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl p-8 sm:p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <Users className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
          <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>No Reshippers</h3>
          <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>
            Add your first reshipper to start routing orders by country
          </p>
        </div>
      )}

      {/* Orders Section */}
      <div className="rounded-xl bg-white overflow-hidden" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
          <div>
            <h3 className="text-[15px] font-bold" style={{ color: "var(--t-text)" }}>Reassign Orders</h3>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--t-subtle)" }}>Move orders between reshippers</p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-subtle)" }} />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg text-[13px] outline-none"
              style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
            />
          </div>
        </div>

        {filteredOrders.length > 0 ? (
          <div className="divide-y" style={{ borderColor: V2_CARD_BORDER }}>
            {filteredOrders.map(order => (
              <div key={order.id} className="p-4 hover:bg-black/[0.02] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 grid grid-cols-[120px_1fr_140px] gap-4 items-center">
                    <div>
                      <div className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>{order.orderId}</div>
                      <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>{order.country}</div>
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold" style={{ color: "var(--t-text)" }}>{order.memberName}</div>
                      <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>{order.memberUsername}</div>
                    </div>
                    <div>
                      {order.currentReshipper ? (
                        <div className="text-[13px] font-semibold px-2 py-1 rounded-md" style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}>
                          @{order.currentReshipper}
                        </div>
                      ) : (
                        <div className="text-[13px] font-semibold" style={{ color: "var(--t-subtle)" }}>No reshipper</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleReassignOrder(order)}
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

      {/* Reassign Modal */}
      {showReassignModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowReassignModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
              <div>
                <h3 className="text-[16px] font-bold" style={{ color: "var(--t-text)" }}>Reassign Order</h3>
                <p className="text-[13px] mt-0.5" style={{ color: "var(--t-subtle)" }}>{selectedOrder.orderId}</p>
              </div>
              <button
                onClick={() => setShowReassignModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5"
                style={{ color: "var(--t-subtle)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="p-3 rounded-lg" style={{ background: "var(--t-surface2)" }}>
                <div className="text-[12px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--t-subtle)" }}>Current Assignment</div>
                <div className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>
                  {selectedOrder.currentReshipper ? `@${selectedOrder.currentReshipper}` : "No reshipper"}
                </div>
              </div>

              <div>
                <div className="text-[13px] font-semibold mb-2" style={{ color: "var(--t-text)" }}>Assign to:</div>
                <div className="space-y-2">
                  {reshippers.filter(r => r.enabled).map(reshipper => (
                    <button
                      key={reshipper.id}
                      onClick={() => handleAssignToReshipper(reshipper.reshipperUsername)}
                      disabled={selectedOrder.currentReshipper === reshipper.reshipperUsername}
                      className="w-full p-3 rounded-lg text-left hover:bg-black/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ border: `1px solid ${V2_CARD_BORDER}` }}
                    >
                      <div className="text-[14px] font-semibold" style={{ color: "var(--t-text)" }}>@{reshipper.reshipperUsername}</div>
                      <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>{reshipper.country}</div>
                    </button>
                  ))}
                  <button
                    onClick={() => handleAssignToReshipper("")}
                    className="w-full p-3 rounded-lg text-left hover:bg-black/5 transition-colors"
                    style={{ border: `1px solid ${V2_CARD_BORDER}` }}
                  >
                    <div className="text-[14px] font-semibold" style={{ color: "var(--t-text)" }}>Remove reshipper</div>
                    <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>Clear assignment</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
