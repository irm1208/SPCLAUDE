import React, { useState, useEffect, useCallback } from "react";
import { Loader2, MessageSquare, ChevronRight, ArrowLeft, Send, RefreshCw, Filter, X, Plus } from "lucide-react";

function apiUrl(path: string) { return `/api${path}`; }

type TicketCategory = "order_issue" | "general_support" | "group_buy" | "wholesale" | "testing_pool";
type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

interface Ticket {
  id: string;
  accountUsername: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  groupBuyId?: string | null;
  groupBuyName?: string | null;
  issueType?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TicketMessage {
  id: number;
  ticketId: string;
  authorRole: "customer" | "admin";
  authorUsername: string;
  body: string;
  createdAt: string;
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  order_issue: "Order Issue",
  general_support: "General Support",
  group_buy: "Group Buy",
  wholesale: "Wholesale",
  testing_pool: "Testing Pool",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: "bg-orange-100 text-orange-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-slate-100 text-slate-500",
};

const CATEGORY_COLORS: Record<TicketCategory, string> = {
  order_issue: "bg-red-50 text-red-600",
  general_support: "bg-violet-50 text-violet-600",
  group_buy: "bg-blue-50 text-blue-600",
  wholesale: "bg-emerald-50 text-emerald-700",
  testing_pool: "bg-fuchsia-50 text-fuchsia-700",
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function CategoryBadge({ category }: { category: TicketCategory }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${CATEGORY_COLORS[category] ?? "bg-slate-50 text-slate-600"}`}>
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );
}

// ─── Ticket Detail Panel ──────────────────────────────────────────────────────

function TicketDetail({ ticketId, secret, onBack }: { ticketId: string; secret: string; onBack: () => void }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [statusChanging, setStatusChanging] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/admin/tickets/${ticketId}`), {
        headers: { "x-admin-secret": secret },
        credentials: "omit",
      });
      if (res.ok) {
        const data = await res.json() as { ticket: Ticket; messages: TicketMessage[] };
        setTicket(data.ticket);
        setMessages(data.messages);
      }
    } finally {
      setLoading(false);
    }
  }, [ticketId, secret]);

  useEffect(() => { void load(); }, [load]);

  const changeStatus = async (status: TicketStatus) => {
    if (!ticket || statusChanging) return;
    setStatusChanging(true);
    try {
      const res = await fetch(apiUrl(`/admin/tickets/${ticketId}/status`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        credentials: "omit",
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setTicket(t => t ? { ...t, status } : t);
      }
    } finally {
      setStatusChanging(false);
    }
  };

  const sendReply = async () => {
    if (!replyBody.trim() || sending) return;
    setSending(true);
    setReplyError("");
    try {
      const res = await fetch(apiUrl(`/admin/tickets/${ticketId}/messages`), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        credentials: "omit",
        body: JSON.stringify({ body: replyBody.trim() }),
      });
      if (res.ok) {
        const msg = await res.json() as TicketMessage;
        setMessages(prev => [...prev, msg]);
        setReplyBody("");
        setTicket(t => t ? { ...t, status: t.status === "open" ? "in_progress" : t.status } : t);
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setReplyError(err.error ?? "Failed to send reply");
      }
    } catch {
      setReplyError("Network error");
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  if (!ticket) return (
    <div className="text-center py-12 text-muted-foreground text-sm">Ticket not found.</div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate">{ticket.subject}</h2>
          <p className="text-[11px] text-muted-foreground">@{ticket.accountUsername} · {fmtDate(ticket.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <CategoryBadge category={ticket.category} />
          <StatusBadge status={ticket.status} />
        </div>
      </div>

      {/* GB / issue-type meta */}
      {(ticket.groupBuyId || ticket.issueType) && (
        <div className="flex items-center gap-3 flex-wrap rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
          {ticket.issueType && (
            <span className="text-[11px] text-blue-700"><span className="font-semibold">Issue type:</span> {ticket.issueType}</span>
          )}
          {ticket.groupBuyId && (
            <span className="text-[11px] text-blue-700"><span className="font-semibold">Group Buy:</span> {ticket.groupBuyName ?? ticket.groupBuyId}</span>
          )}
        </div>
      )}

      {/* Status changer */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold text-muted-foreground">Change status:</span>
        {(["open", "in_progress", "resolved", "closed"] as TicketStatus[]).map(s => (
          <button key={s} onClick={() => changeStatus(s)} disabled={statusChanging || ticket.status === s}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
              ticket.status === s
                ? "opacity-50 cursor-default border-transparent bg-muted text-foreground"
                : "border-border bg-background hover:bg-muted/50 text-foreground"
            }`}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Message thread */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-xs">No messages yet.</div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.authorRole === "admin" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
              msg.authorRole === "admin"
                ? "bg-[#2D6BCC] text-white rounded-br-sm"
                : "bg-muted text-foreground rounded-bl-sm"
            }`}>
              <p className={`text-[10px] font-semibold mb-1 ${msg.authorRole === "admin" ? "text-blue-100" : "text-muted-foreground"}`}>
                {msg.authorRole === "admin" ? `Admin (@${msg.authorUsername})` : `@${msg.authorUsername}`}
              </p>
              <p className="text-xs whitespace-pre-wrap break-words">{msg.body}</p>
              <p className={`text-[9px] mt-1 text-right ${msg.authorRole === "admin" ? "text-blue-100" : "text-muted-foreground"}`}>
                {fmtDate(msg.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Reply box */}
      <div className="border border-border rounded-xl p-3 space-y-2 bg-background">
        <textarea
          value={replyBody}
          onChange={e => setReplyBody(e.target.value)}
          placeholder="Type your reply…"
          rows={3}
          className="w-full text-xs resize-none bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
          onKeyDown={e => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendReply();
          }}
        />
        {replyError && <p className="text-xs text-red-500">{replyError}</p>}
        <div className="flex justify-end">
          <button onClick={sendReply} disabled={!replyBody.trim() || sending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2D6BCC] text-white hover:bg-[#1B3A7A] transition-colors disabled:opacity-50">
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Send Reply
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── New Conversation Form ────────────────────────────────────────────────────

interface NewConvFormProps {
  secret: string;
  onCancel: () => void;
  onCreated: (ticketId: string) => void;
}

function NewConversationForm({ secret, onCancel, onCreated }: NewConvFormProps) {
  const [username, setUsername] = useState("");
  const [category, setCategory] = useState<TicketCategory>("general_support");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !subject.trim() || !message.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/admin/tickets"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        credentials: "omit",
        body: JSON.stringify({
          username: username.trim().replace(/^@/, ""),
          category,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      if (res.ok) {
        const ticket = await res.json() as Ticket;
        onCreated(ticket.id);
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setError(err.error ?? "Failed to create conversation");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onCancel}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div>
          <h2 className="text-sm font-semibold text-foreground">New Conversation</h2>
          <p className="text-[11px] text-muted-foreground">Start a support thread on behalf of a user</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Telegram Username
          </label>
          <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-background focus-within:border-[#2D6BCC] transition-colors">
            <span className="text-muted-foreground text-xs select-none">@</span>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value.replace(/^@/, ""))}
              placeholder="username"
              className="flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
              autoFocus
              required
            />
          </div>
        </div>

        {/* Category */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Category
          </label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as TicketCategory)}
            className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-background text-foreground outline-none focus:border-[#2D6BCC] transition-colors"
          >
            {(Object.entries(CATEGORY_LABELS) as [TicketCategory, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Brief subject line…"
            maxLength={200}
            className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-background text-foreground outline-none focus:border-[#2D6BCC] placeholder:text-muted-foreground transition-colors"
            required
          />
        </div>

        {/* Opening message */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Opening Message
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Write your message to the user…"
            rows={5}
            className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-background text-foreground outline-none focus:border-[#2D6BCC] placeholder:text-muted-foreground resize-none transition-colors"
            required
          />
          <p className="text-[10px] text-muted-foreground">
            This will be sent as the first admin message. The user will receive a Telegram notification.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-border bg-background hover:bg-muted/50 text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !username.trim() || !subject.trim() || !message.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#2D6BCC] text-white hover:bg-[#1B3A7A] transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Send &amp; Open Thread
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main Tickets Tab ─────────────────────────────────────────────────────────

type View = { type: "list" } | { type: "detail"; ticketId: string } | { type: "new" };

export function AdminTicketsTab({ secret }: { secret: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "all">("all");
  const [view, setView] = useState<View>({ type: "list" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      const res = await fetch(apiUrl(`/admin/tickets${params.toString() ? "?" + params.toString() : ""}`), {
        headers: { "x-admin-secret": secret },
        credentials: "omit",
      });
      if (res.ok) {
        const data = await res.json() as { tickets: Ticket[] };
        setTickets(data.tickets);
      }
    } finally {
      setLoading(false);
    }
  }, [secret, statusFilter, categoryFilter]);

  useEffect(() => { void load(); }, [load]);

  if (view.type === "detail") {
    return (
      <TicketDetail
        ticketId={view.ticketId}
        secret={secret}
        onBack={() => setView({ type: "list" })}
      />
    );
  }

  if (view.type === "new") {
    return (
      <NewConversationForm
        secret={secret}
        onCancel={() => setView({ type: "list" })}
        onCreated={(ticketId) => {
          void load();
          setView({ type: "detail", ticketId });
        }}
      />
    );
  }

  const statusCounts: Record<string, number> = {};
  for (const t of tickets) {
    statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-bold text-foreground">Support Tickets</h2>
          <p className="text-[11px] text-muted-foreground">
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
            {statusCounts["open"] ? ` · ${statusCounts["open"]} open` : ""}
            {statusCounts["in_progress"] ? ` · ${statusCounts["in_progress"]} in progress` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView({ type: "new" })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2D6BCC] text-white hover:bg-[#1B3A7A] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New Conversation
          </button>
          <button onClick={() => load()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-background hover:bg-muted/50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[11px] font-semibold text-muted-foreground">Status:</span>
          {(["all", "open", "in_progress", "resolved", "closed"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
                statusFilter === s ? "bg-[#2D6BCC] text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}>
              {s === "all" ? "All" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[11px] font-semibold text-muted-foreground">Category:</span>
          {(["all", "order_issue", "general_support", "group_buy", "wholesale", "testing_pool"] as const).map(c => (
            <button key={c} onClick={() => setCategoryFilter(c)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
                categoryFilter === c ? "bg-[#2D6BCC] text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}>
              {c === "all" ? "All" : CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        {(statusFilter !== "all" || categoryFilter !== "all") && (
          <button onClick={() => { setStatusFilter("all"); setCategoryFilter("all"); }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-red-500 hover:bg-red-50 transition-colors">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No tickets found</p>
          <button
            onClick={() => setView({ type: "new" })}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2D6BCC] text-white hover:bg-[#1B3A7A] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Start a conversation
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(ticket => (
            <button key={ticket.id} onClick={() => setView({ type: "detail", ticketId: ticket.id })}
              className="w-full text-left p-3 rounded-xl border border-border bg-background hover:bg-muted/30 transition-colors group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-foreground truncate">{ticket.subject}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground font-mono">@{ticket.accountUsername}</span>
                    <CategoryBadge category={ticket.category} />
                    <StatusBadge status={ticket.status} />
                    {ticket.issueType && (
                      <span className="text-[10px] text-muted-foreground">{ticket.issueType}</span>
                    )}
                    {ticket.groupBuyId && (
                      <span className="text-[10px] text-blue-600 bg-blue-50 rounded px-1">{ticket.groupBuyName ?? ticket.groupBuyId}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{fmtDate(ticket.updatedAt)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
