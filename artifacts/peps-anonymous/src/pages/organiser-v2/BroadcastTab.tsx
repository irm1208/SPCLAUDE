import { useState, useEffect } from "react";
import {
  Send, Users, User, CheckSquare, Square, Clock, Check,
  Sparkles, AlertCircle, Loader2, X, CheckCircle2,
} from "lucide-react";
import { V2_CARD_BORDER } from "./theme";
import { organiserApi } from "./api/organiser-api";
import type { OrganiserOrder } from "./domain/order";

// ─── Workspace: Broadcast Tab ────────────────────────────────────────────────
// Sends Telegram broadcasts to GB members via POST /organiser/group-buys/:id/broadcast.

interface BroadcastTabProps {
  selectedGbId?: string;
}

interface SentRecord {
  body: string;
  audience: string;
  sentAt: string;
  sentCount: number;
}

const MESSAGE_TEMPLATES = [
  {
    id: "payment-reminder",
    label: "Payment reminder",
    body: "Hi,\n\nYour order is confirmed but we haven't received payment yet. Please submit payment within 48 hours to avoid cancellation.\n\nThanks!",
  },
  {
    id: "shipping-update",
    label: "Shipping update",
    body: "Hi,\n\nGreat news! Your order has been shipped. You'll receive a tracking number shortly.\n\nThanks!",
  },
  {
    id: "gb-closing",
    label: "GB closing soon",
    body: "Hi everyone,\n\nJust a reminder that this group buy closes in 48 hours. If you're planning to order, now's the time!\n\nThanks!",
  },
  {
    id: "lab-results",
    label: "Lab results available",
    body: "Hi everyone,\n\nLab results are now available. All tests passed. You can view the full report in the group buy page.\n\nThanks!",
  },
];

export default function BroadcastTab({ selectedGbId }: BroadcastTabProps = {}) {
  const [body, setBody] = useState("");
  const [recipientMode, setRecipientMode] = useState<"all" | "status" | "custom">("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("unpaid");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");
  const [history, setHistory] = useState<SentRecord[]>([]);

  // Email blast state
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailTestAddr, setEmailTestAddr] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [orders, setOrders] = useState<OrganiserOrder[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (!selectedGbId) return;
    setLoadingMembers(true);
    organiserApi.orders(selectedGbId)
      .then(setOrders)
      .catch(() => {}) // non-critical, degrade gracefully
      .finally(() => setLoadingMembers(false));
  }, [selectedGbId]);

  const allMembers = Array.from(new Set(orders.map(o => o.memberUsername)));
  const unpaidMembers = orders.filter(o => o.paymentStatus !== "confirmed" && o.paymentStatus !== "test_confirmed").map(o => o.memberUsername);
  const paidMembers = orders.filter(o => o.paymentStatus === "confirmed" || o.paymentStatus === "test_confirmed").map(o => o.memberUsername);

  const recipientCount =
    recipientMode === "all" ? allMembers.length
    : recipientMode === "status" ? (paymentStatusFilter === "paid" ? paidMembers.length : unpaidMembers.length)
    : selectedMembers.length;

  const applyTemplate = (t: typeof MESSAGE_TEMPLATES[0]) => {
    setBody(t.body);
    setShowTemplates(false);
  };

  const toggleMember = (username: string) => {
    setSelectedMembers(prev => prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]);
  };

  const handleSend = async () => {
    if (!selectedGbId || !body.trim() || sending) return;
    setSending(true); setSendError("");
    try {
      const payload: Record<string, unknown> = { message: body.trim() };
      if (recipientMode === "status") payload.paymentStatusFilter = paymentStatusFilter;
      if (recipientMode === "custom") payload.targetUsernames = selectedMembers;
      // "all" sends no filter = all members
      const res = await organiserApi.broadcast(selectedGbId, payload);
      const sentCount = res.sentCount ?? recipientCount;
      setHistory(prev => [{
        body: body.trim(),
        audience: recipientMode === "all" ? "All members" : recipientMode === "status" ? `By payment status: ${paymentStatusFilter}` : `${selectedMembers.length} selected`,
        sentAt: new Date().toISOString(),
        sentCount,
      }, ...prev]);
      setBody("");
      setSelectedMembers([]);
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Failed to send broadcast");
    } finally {
      setSending(false);
    }
  };

  if (!selectedGbId) {
    return (
      <div className="rounded-xl p-8 sm:p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <Send className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
        <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>No Group Buy Selected</h3>
        <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>Select a group buy to broadcast messages</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="rounded-xl p-4 sm:p-5 bg-white flex items-center justify-between gap-3" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div>
          <h2 className="text-lg sm:text-xl font-bold" style={{ color: "var(--t-text)" }}>Broadcast</h2>
          <p className="text-[13px] sm:text-[14px] mt-1" style={{ color: "var(--t-subtle)" }}>
            Send Telegram messages to your members
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

      {sent && (
        <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: "#F0FDF4", border: "1px solid #A7F3D0" }}>
          <CheckCircle2 className="w-4 h-4" style={{ color: "#16A34A" }} />
          <p className="text-[13px] font-semibold" style={{ color: "#16A34A" }}>Message sent successfully!</p>
        </div>
      )}

      {sendError && (
        <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
          <p className="text-[13px] font-semibold" style={{ color: "#DC2626" }}>{sendError}</p>
          <button onClick={() => setSendError("")} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-100">
            <X className="w-3.5 h-3.5" style={{ color: "#DC2626" }} />
          </button>
        </div>
      )}

      {/* Templates panel */}
      {showTemplates && (
        <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <h3 className="text-[14px] font-bold mb-3" style={{ color: "var(--t-text)" }}>Message templates</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MESSAGE_TEMPLATES.map(t => (
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
          <h3 className="text-[14px] font-bold mb-3" style={{ color: "var(--t-text)" }}>Message history (this session)</h3>
          {history.length === 0 ? (
            <p className="text-[13px] py-4 text-center" style={{ color: "var(--t-subtle)" }}>No messages sent yet this session</p>
          ) : (
            <div className="space-y-2">
              {history.map((msg, i) => (
                <div key={i} className="p-3 rounded-lg" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] mt-0.5" style={{ color: "var(--t-subtle)" }}>
                        {new Date(msg.sentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {" · "}{msg.audience}
                      </div>
                    </div>
                    <span className="text-[12px] px-2 py-0.5 rounded-full shrink-0" style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}>
                      {msg.sentCount} sent
                    </span>
                  </div>
                  <div className="text-[13px] line-clamp-2" style={{ color: "var(--t-muted)" }}>{msg.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Compose area */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 sm:gap-5">
        {/* Message */}
        <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <h3 className="text-[14px] font-bold mb-3" style={{ color: "var(--t-text)" }}>Message</h3>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Type your message here…"
            rows={12}
            className="w-full px-3 py-2 rounded-lg text-[14px] outline-none resize-none"
            style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
          />
          <div className="text-[12px] mt-1.5" style={{ color: "var(--t-subtle)" }}>
            {body.length}/4000 characters
          </div>
        </div>

        {/* Recipients */}
        <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <h3 className="text-[14px] font-bold mb-3" style={{ color: "var(--t-text)" }}>Recipients</h3>
          <div className="space-y-3">
            {/* Mode selector */}
            <div className="space-y-2">
              {[
                { mode: "all" as const, label: "All members", sub: loadingMembers ? "Loading…" : `${allMembers.length} member${allMembers.length !== 1 ? "s" : ""}`, icon: <Users className="w-4 h-4" /> },
                { mode: "status" as const, label: "By payment status", sub: "", icon: <CheckSquare className="w-4 h-4" /> },
                { mode: "custom" as const, label: "Select members", sub: `${selectedMembers.length} selected`, icon: <User className="w-4 h-4" /> },
              ].map(({ mode, label, sub, icon }) => (
                <button
                  key={mode}
                  onClick={() => setRecipientMode(mode)}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-colors"
                  style={{ background: recipientMode === mode ? "var(--t-blue-10)" : "transparent", border: `1px solid ${recipientMode === mode ? "var(--t-blue)" : V2_CARD_BORDER}` }}
                >
                  <span style={{ color: recipientMode === mode ? "var(--t-blue)" : "var(--t-subtle)" }}>{icon}</span>
                  <div className="flex-1">
                    <div className="text-[13.5px] font-semibold" style={{ color: recipientMode === mode ? "var(--t-blue)" : "var(--t-text)" }}>{label}</div>
                    {sub && <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>{sub}</div>}
                  </div>
                </button>
              ))}
            </div>

            {/* Status sub-filter */}
            {recipientMode === "status" && (
              <div className="pl-9 space-y-1.5">
                {[
                  { value: "unpaid", label: "Unpaid", count: unpaidMembers.length },
                  { value: "paid", label: "Paid", count: paidMembers.length },
                ].map(({ value, label, count }) => (
                  <button
                    key={value}
                    onClick={() => setPaymentStatusFilter(value)}
                    className="w-full flex items-center justify-between p-2 rounded-md text-left hover:bg-black/[0.02]"
                    style={{ background: paymentStatusFilter === value ? "var(--t-surface2)" : "transparent" }}
                  >
                    <span className="text-[13px] font-semibold" style={{ color: paymentStatusFilter === value ? "var(--t-text)" : "var(--t-muted)" }}>{label}</span>
                    <span className="text-[12px]" style={{ color: "var(--t-subtle)" }}>{count}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Custom member list */}
            {recipientMode === "custom" && (
              <div className="max-h-[200px] overflow-y-auto rounded-lg" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
                {allMembers.length > 0 ? allMembers.map(username => (
                  <button
                    key={username}
                    onClick={() => toggleMember(username)}
                    className="w-full flex items-center gap-2.5 p-2.5 text-left hover:bg-black/[0.02] transition-colors"
                    style={{ borderBottom: `1px solid ${V2_CARD_BORDER}` }}
                  >
                    {selectedMembers.includes(username) ? <CheckSquare className="w-4 h-4 shrink-0" style={{ color: "var(--t-blue)" }} /> : <Square className="w-4 h-4 shrink-0" style={{ color: "var(--t-subtle)" }} />}
                    <span className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>@{username}</span>
                  </button>
                )) : (
                  <div className="p-4 text-center text-[13px]" style={{ color: "var(--t-subtle)" }}>No orders found</div>
                )}
              </div>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={sending || !body.trim() || (recipientMode === "custom" && selectedMembers.length === 0)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[14px] font-bold text-white transition-opacity disabled:opacity-40"
              style={{ background: "var(--t-blue)" }}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : sent ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {sending ? "Sending…" : sent ? "Sent!" : `Send${recipientMode !== "all" ? ` to ${recipientCount}` : " to all"}`}
            </button>

            {recipientMode !== "all" && recipientCount === 0 && (
              <div className="flex gap-2 p-2.5 rounded-lg" style={{ background: "#FFFAEB", border: "1px solid #FEF0C7" }}>
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#F79009" }} />
                <div className="text-[12px]" style={{ color: "#B54708" }}>No members match your selection</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Email blast ──────────────────────────────────────────── */}
      <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <h3 className="text-[14px] font-bold mb-0.5" style={{ color: "var(--t-text)" }}>Email Members</h3>
        <p className="text-[12px] mb-4" style={{ color: "var(--t-subtle)" }}>
          Send an email to all members of this group buy who have an email address on file.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Subject</label>
            <input
              value={emailSubject}
              onChange={e => setEmailSubject(e.target.value)}
              placeholder="e.g. Shipping update for your order"
              className="w-full px-3 py-2 rounded-lg text-[14px] outline-none"
              style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "var(--t-surface)" }}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Message</label>
            <textarea
              value={emailBody}
              onChange={e => setEmailBody(e.target.value)}
              placeholder="Type your email message here…"
              rows={6}
              className="w-full px-3 py-2 rounded-lg text-[14px] outline-none resize-none"
              style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "var(--t-surface)" }}
            />
          </div>
          {emailMsg && (
            <div className="flex gap-2 p-2.5 rounded-lg"
              style={{ background: emailMsg.ok ? "#F0FDF4" : "#FFF5F5", border: `1px solid ${emailMsg.ok ? "#BBF7D0" : "#FED7D7"}` }}>
              <div className="text-[13px]" style={{ color: emailMsg.ok ? "#16A34A" : "#DC2626" }}>{emailMsg.text}</div>
            </div>
          )}
          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={async () => {
                if (!selectedGbId || !emailSubject.trim() || !emailBody.trim() || emailSending) return;
                setEmailSending(true); setEmailMsg(null);
                try {
                  const r = await organiserApi.emailBlast(selectedGbId, { subject: emailSubject.trim(), body: emailBody.trim() });
                  if (r.ok) {
                    setEmailMsg({ ok: true, text: `Sent to ${r.sent ?? 0} of ${r.total ?? 0} members with email addresses.` });
                    setEmailSubject(""); setEmailBody("");
                  } else {
                    setEmailMsg({ ok: false, text: r.error ?? "Send failed" });
                  }
                } catch { setEmailMsg({ ok: false, text: "Network error" }); }
                setEmailSending(false);
              }}
              disabled={emailSending || !emailSubject.trim() || !emailBody.trim() || !selectedGbId}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[14px] font-bold text-white transition-opacity disabled:opacity-40"
              style={{ background: "var(--t-blue)" }}
            >
              {emailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send email blast
            </button>
            <div className="flex-1" />
            <input
              type="email"
              value={emailTestAddr}
              onChange={e => setEmailTestAddr(e.target.value)}
              placeholder="Test to email…"
              className="w-44 px-3 py-2 rounded-lg text-[13px] outline-none"
              style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "var(--t-surface)" }}
            />
            <button
              onClick={async () => {
                if (!selectedGbId || !emailSubject.trim() || !emailBody.trim() || !emailTestAddr.includes("@") || emailSending) return;
                setEmailSending(true); setEmailMsg(null);
                try {
                  const r = await organiserApi.emailBlast(selectedGbId, { subject: emailSubject.trim(), body: emailBody.trim(), testEmail: emailTestAddr });
                  setEmailMsg({ ok: r.ok, text: r.ok ? `Test sent to ${emailTestAddr}` : (r.error ?? "Send failed") });
                } catch { setEmailMsg({ ok: false, text: "Network error" }); }
                setEmailSending(false);
              }}
              disabled={emailSending || !emailSubject.trim() || !emailBody.trim() || !emailTestAddr.includes("@") || !selectedGbId}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-opacity disabled:opacity-40"
              style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-muted)", background: "var(--t-surface)" }}
            >
              {emailSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
