import { useState } from "react";
import {
  Send, Users, User, CheckSquare, Square, Clock, Check,
  Copy, Trash2, MessageSquare, AlertCircle, Sparkles,
} from "lucide-react";
import { V2_CARD_BORDER, TILE } from "./theme";

// ─── Workspace: Broadcast Tab ────────────────────────────────────────────────
// Compose and send messages to members: all, filtered by status, or individual
// selection. Includes templates, message history, and send confirmation.

interface BroadcastMessage {
  id: string;
  subject: string;
  body: string;
  recipients: string[];
  sentAt: string;
  sentBy: string;
}

interface Order {
  id: string;
  memberName: string;
  memberUsername: string;
  status: string;
  total: number;
  paymentMethod: string;
  country: string;
  shippingOption: string;
  products: { name: string; quantity: number; price: number }[];
  createdAt: string;
}

const MESSAGE_TEMPLATES = [
  {
    id: "payment-reminder",
    label: "Payment reminder",
    subject: "Payment pending for your order",
    body: "Hi {{name}},\n\nYour order is confirmed but we haven't received payment yet. Please submit payment within 48 hours to avoid cancellation.\n\nOrder: {{orderId}}\nAmount: {{amount}}\n\nPayment instructions: [link]\n\nThanks!",
  },
  {
    id: "shipping-update",
    label: "Shipping update",
    subject: "Your order has shipped",
    body: "Hi {{name}},\n\nGreat news! Your order has been shipped.\n\nTracking: {{tracking}}\nCarrier: {{carrier}}\nEstimated delivery: {{eta}}\n\nTrack your parcel: [link]\n\nThanks!",
  },
  {
    id: "gb-closing",
    label: "GB closing soon",
    subject: "Group buy closes in 48 hours",
    body: "Hi everyone,\n\nJust a reminder that this group buy closes in 48 hours.\n\nIf you're planning to order, now's the time!\n\nPlace your order: [link]\n\nThanks!",
  },
  {
    id: "lab-results",
    label: "Lab results available",
    subject: "Lab test results are in",
    body: "Hi everyone,\n\nLab results for batch {{batch}} are now available.\n\nAll tests passed. Full report: [link]\n\nThanks!",
  },
];

const SAMPLE_HISTORY: BroadcastMessage[] = [
  {
    id: "1",
    subject: "Payment reminder - 48h deadline",
    body: "Hi, your order is confirmed but we haven't received payment yet...",
    recipients: ["@alice_m", "@bob_k"],
    sentAt: "2024-07-11T14:30:00",
    sentBy: "organiser",
  },
  {
    id: "2",
    subject: "Shipping update - orders dispatched",
    body: "Great news! Your order has been shipped...",
    recipients: ["All members"],
    sentAt: "2024-07-10T09:15:00",
    sentBy: "organiser",
  },
];

export default function BroadcastTab() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientMode, setRecipientMode] = useState<"all" | "status" | "product" | "custom">("all");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [productFilter, setProductFilter] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const orders: Order[] = JSON.parse(localStorage.getItem("orders") || "[]");
  const allMembers = [...new Set(orders.map((o: any) => o.memberUsername))];
  const pendingMembers = orders.filter((o: any) => o.status === "pending").map((o: any) => o.memberUsername);
  const paidMembers = orders.filter((o: any) => o.status === "paid" || o.status === "processing").map((o: any) => o.memberUsername);

  // Get unique products from all orders
  const allProducts = [...new Set(orders.flatMap((o: Order) => o.products.map(p => p.name)))];

  // Get members who ordered a specific product
  const productMembers = productFilter
    ? [...new Set(orders
        .filter((o: Order) => o.products.some(p => p.name === productFilter))
        .map((o: Order) => o.memberUsername))]
    : [];

  const recipientCount =
    recipientMode === "all"
      ? allMembers.length
      : recipientMode === "status"
      ? statusFilter === "pending"
        ? pendingMembers.length
        : paidMembers.length
      : recipientMode === "product"
      ? productMembers.length
      : selectedMembers.length;

  const applyTemplate = (template: typeof MESSAGE_TEMPLATES[0]) => {
    setSubject(template.subject);
    setBody(template.body);
    setShowTemplates(false);
  };

  const toggleMember = (username: string) => {
    setSelectedMembers((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    );
  };

  const handleSend = () => {
    if (!subject.trim() || !body.trim()) {
      alert("Please enter a subject and message");
      return;
    }
    if (recipientCount === 0) {
      alert("Please select at least one recipient");
      return;
    }
    const confirm = window.confirm(
      `Send this message to ${recipientCount} member${recipientCount !== 1 ? "s" : ""}?`
    );
    if (confirm) {
      // In a real app, this would call an API
      alert(`Message sent to ${recipientCount} member${recipientCount !== 1 ? "s" : ""}!`);
      setSubject("");
      setBody("");
      setSelectedMembers([]);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="rounded-xl p-4 sm:p-5 bg-white flex items-center justify-between gap-3" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div>
          <h2 className="text-lg sm:text-xl font-bold" style={{ color: "var(--t-text)" }}>Broadcast</h2>
          <p className="text-[13px] sm:text-[14px] mt-1" style={{ color: "var(--t-subtle)" }}>
            Send messages to your members
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold hover:bg-black/5"
            style={{ color: "var(--t-blue)", border: `1px solid ${V2_CARD_BORDER}` }}
          >
            <Sparkles className="w-3.5 h-3.5" /> Templates
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold hover:bg-black/5"
            style={{ color: "var(--t-text)", border: `1px solid ${V2_CARD_BORDER}` }}
          >
            <Clock className="w-3.5 h-3.5" /> History
          </button>
        </div>
      </div>

      {/* Templates panel */}
      {showTemplates && (
        <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <h3 className="text-[14px] font-bold mb-3" style={{ color: "var(--t-text)" }}>Message templates</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MESSAGE_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t)}
                className="p-3 rounded-lg text-left hover:bg-black/[0.02] transition-colors"
                style={{ border: `1px solid ${V2_CARD_BORDER}` }}
              >
                <div className="text-[14px] font-semibold mb-1" style={{ color: "var(--t-text)" }}>{t.label}</div>
                <div className="text-[12px] line-clamp-2" style={{ color: "var(--t-subtle)" }}>{t.body}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* History panel */}
      {showHistory && (
        <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <h3 className="text-[14px] font-bold mb-3" style={{ color: "var(--t-text)" }}>Message history</h3>
          <div className="space-y-2">
            {SAMPLE_HISTORY.map((msg) => (
              <div key={msg.id} className="p-3 rounded-lg" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold truncate" style={{ color: "var(--t-text)" }}>{msg.subject}</div>
                    <div className="text-[12px] mt-0.5" style={{ color: "var(--t-subtle)" }}>
                      {new Date(msg.sentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <span className="text-[12px] px-2 py-0.5 rounded-full shrink-0" style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}>
                    {Array.isArray(msg.recipients) && msg.recipients[0] === "All members" ? "All" : `${msg.recipients.length} members`}
                  </span>
                </div>
                <div className="text-[13px] line-clamp-2" style={{ color: "var(--t-muted)" }}>{msg.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compose area */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 sm:gap-5">
        {/* Message */}
        <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <h3 className="text-[14px] font-bold mb-3" style={{ color: "var(--t-text)" }}>Message</h3>
          <div className="space-y-3">
            <div>
              <label className="text-[13px] font-semibold mb-1.5 block" style={{ color: "var(--t-text)" }}>Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter message subject"
                className="w-full px-3 py-2 rounded-lg text-[14px] outline-none"
                style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold mb-1.5 block" style={{ color: "var(--t-text)" }}>Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type your message here..."
                rows={12}
                className="w-full px-3 py-2 rounded-lg text-[14px] outline-none resize-none"
                style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
              />
              <div className="text-[12px] mt-1.5" style={{ color: "var(--t-subtle)" }}>
                Use variables: {"{"}{"{"} name {"}"}{"}"}, {"{"}{"{"} orderId {"}"}{"}"}, {"{"}{"{"} amount {"}"}{"}"}, {"{"}{"{"} tracking {"}"}{"}"}, {"{"}{"{"} carrier {"}"}{"}"}, {"{"}{"{"} eta {"}"}{"}"}, {"{"}{"{"} batch {"}"}{"}"}
              </div>
            </div>
          </div>
        </div>

        {/* Recipients */}
        <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <h3 className="text-[14px] font-bold mb-3" style={{ color: "var(--t-text)" }}>Recipients</h3>
          <div className="space-y-3">
            {/* Mode selector */}
            <div className="space-y-2">
              <button
                onClick={() => setRecipientMode("all")}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-colors"
                style={{ background: recipientMode === "all" ? "var(--t-blue-10)" : "transparent", border: `1px solid ${recipientMode === "all" ? "var(--t-blue)" : V2_CARD_BORDER}` }}
              >
                {recipientMode === "all" ? <CheckSquare className="w-4 h-4 shrink-0" style={{ color: "var(--t-blue)" }} /> : <Square className="w-4 h-4 shrink-0" style={{ color: "var(--t-subtle)" }} />}
                <div className="flex-1">
                  <div className="text-[13.5px] font-semibold" style={{ color: recipientMode === "all" ? "var(--t-blue)" : "var(--t-text)" }}>All members</div>
                  <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>{allMembers.length} member{allMembers.length !== 1 ? "s" : ""}</div>
                </div>
              </button>

              <button
                onClick={() => setRecipientMode("status")}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-colors"
                style={{ background: recipientMode === "status" ? "var(--t-blue-10)" : "transparent", border: `1px solid ${recipientMode === "status" ? "var(--t-blue)" : V2_CARD_BORDER}` }}
              >
                {recipientMode === "status" ? <CheckSquare className="w-4 h-4 shrink-0" style={{ color: "var(--t-blue)" }} /> : <Square className="w-4 h-4 shrink-0" style={{ color: "var(--t-subtle)" }} />}
                <div className="flex-1">
                  <div className="text-[13.5px] font-semibold" style={{ color: recipientMode === "status" ? "var(--t-blue)" : "var(--t-text)" }}>By payment status</div>
                </div>
              </button>

              {recipientMode === "status" && (
                <div className="pl-9 space-y-1.5">
                  <button
                    onClick={() => setStatusFilter("pending")}
                    className="w-full flex items-center justify-between p-2 rounded-md text-left hover:bg-black/[0.02]"
                    style={{ background: statusFilter === "pending" ? "var(--t-surface2)" : "transparent" }}
                  >
                    <span className="text-[13px] font-semibold" style={{ color: statusFilter === "pending" ? "var(--t-text)" : "var(--t-muted)" }}>Unpaid</span>
                    <span className="text-[12px]" style={{ color: "var(--t-subtle)" }}>{pendingMembers.length}</span>
                  </button>
                  <button
                    onClick={() => setStatusFilter("paid")}
                    className="w-full flex items-center justify-between p-2 rounded-md text-left hover:bg-black/[0.02]"
                    style={{ background: statusFilter === "paid" ? "var(--t-surface2)" : "transparent" }}
                  >
                    <span className="text-[13px] font-semibold" style={{ color: statusFilter === "paid" ? "var(--t-text)" : "var(--t-muted)" }}>Paid</span>
                    <span className="text-[12px]" style={{ color: "var(--t-subtle)" }}>{paidMembers.length}</span>
                  </button>
                </div>
              )}

              <button
                onClick={() => setRecipientMode("product")}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-colors"
                style={{ background: recipientMode === "product" ? "var(--t-blue-10)" : "transparent", border: `1px solid ${recipientMode === "product" ? "var(--t-blue)" : V2_CARD_BORDER}` }}
              >
                {recipientMode === "product" ? <CheckSquare className="w-4 h-4 shrink-0" style={{ color: "var(--t-blue)" }} /> : <Square className="w-4 h-4 shrink-0" style={{ color: "var(--t-subtle)" }} />}
                <div className="flex-1">
                  <div className="text-[13.5px] font-semibold" style={{ color: recipientMode === "product" ? "var(--t-blue)" : "var(--t-text)" }}>By product ordered</div>
                  <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>{productFilter ? `${productMembers.length} member${productMembers.length !== 1 ? 's' : ''}` : 'Select a product'}</div>
                </div>
              </button>

              {recipientMode === "product" && (
                <div className="pl-9 space-y-1.5">
                  {allProducts.length > 0 ? (
                    allProducts.map((product: string) => {
                      const count = orders.filter((o: Order) => o.products.some(p => p.name === product)).length;
                      return (
                        <button
                          key={product}
                          onClick={() => setProductFilter(product)}
                          className="w-full flex items-center justify-between p-2 rounded-md text-left hover:bg-black/[0.02]"
                          style={{ background: productFilter === product ? "var(--t-surface2)" : "transparent" }}
                        >
                          <span className="text-[13px] font-semibold truncate" style={{ color: productFilter === product ? "var(--t-text)" : "var(--t-muted)" }}>{product}</span>
                          <span className="text-[12px] shrink-0 ml-2" style={{ color: "var(--t-subtle)" }}>{count}</span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-2 text-[12px]" style={{ color: "var(--t-subtle)" }}>No products available</div>
                  )}
                </div>
              )}

              <button
                onClick={() => setRecipientMode("custom")}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-colors"
                style={{ background: recipientMode === "custom" ? "var(--t-blue-10)" : "transparent", border: `1px solid ${recipientMode === "custom" ? "var(--t-blue)" : V2_CARD_BORDER}` }}
              >
                {recipientMode === "custom" ? <CheckSquare className="w-4 h-4 shrink-0" style={{ color: "var(--t-blue)" }} /> : <Square className="w-4 h-4 shrink-0" style={{ color: "var(--t-subtle)" }} />}
                <div className="flex-1">
                  <div className="text-[13.5px] font-semibold" style={{ color: recipientMode === "custom" ? "var(--t-blue)" : "var(--t-text)" }}>Select members</div>
                  <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>{selectedMembers.length} selected</div>
                </div>
              </button>
            </div>

            {/* Member list for custom selection */}
            {recipientMode === "custom" && (
              <div className="max-h-[240px] overflow-y-auto rounded-lg" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
                {allMembers.map((username: string) => (
                  <button
                    key={username}
                    onClick={() => toggleMember(username)}
                    className="w-full flex items-center gap-2.5 p-2.5 text-left hover:bg-black/[0.02] transition-colors"
                    style={{ borderBottom: `1px solid ${V2_CARD_BORDER}` }}
                  >
                    {selectedMembers.includes(username) ? <CheckSquare className="w-4 h-4 shrink-0" style={{ color: "var(--t-blue)" }} /> : <Square className="w-4 h-4 shrink-0" style={{ color: "var(--t-subtle)" }} />}
                    <span className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{username}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={recipientCount === 0 || !subject.trim() || !body.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[14px] font-bold text-white transition-opacity disabled:opacity-40"
              style={{ background: "var(--t-blue)" }}
            >
              <Send className="w-4 h-4" />
              Send to {recipientCount} member{recipientCount !== 1 ? "s" : ""}
            </button>

            {recipientCount === 0 && recipientMode !== "all" && (
              <div className="flex gap-2 p-2.5 rounded-lg" style={{ background: "#FFFAEB", border: "1px solid #FEF0C7" }}>
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#F79009" }} />
                <div className="text-[12px]" style={{ color: "#B54708" }}>No members match your selection</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
