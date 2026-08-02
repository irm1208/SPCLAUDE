import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { V2_CARD_BORDER } from "./theme";
import { organiserApi, type ApiTicket, type ApiTicketMessage, type ApiTicketFull } from "./api/organiser-api";
import {
  MessageSquare, Search, Send, ArrowLeft, Check, CheckCheck,
  ChevronDown, CircleDot, Loader2, X, RefreshCw,
} from "lucide-react";

// ─── Workspace: Tickets Tab (Telegram-style) ─────────────────────────────────
// Reads tickets from /organiser/tickets?groupBuyId=... and messages from
// /organiser/tickets/:id; replies via POST /organiser/tickets/:id/messages.

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

const STATUS_META: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  open:        { label: "Open",        color: "#16A34A", bg: "rgba(22,163,74,0.10)" },
  in_progress: { label: "In progress", color: "#D97706", bg: "rgba(217,119,6,0.10)" },
  resolved:    { label: "Resolved",    color: "#2563EB", bg: "rgba(37,99,235,0.10)" },
  closed:      { label: "Closed",      color: "#6B7280", bg: "rgba(107,114,128,0.10)" },
};

const AVATAR_COLOURS = [
  ["#FF885E", "#FF516A"],
  ["#FFCD6A", "#FFA85C"],
  ["#82B1FF", "#665FFF"],
  ["#A0DE7E", "#54CB68"],
  ["#53EDD6", "#28C9B7"],
  ["#72D5FD", "#2A9EF1"],
  ["#E0A2F3", "#D669ED"],
];

function avatarGradient(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = (hash * 31 + username.charCodeAt(i)) | 0;
  const [from, to] = AVATAR_COLOURS[Math.abs(hash) % AVATAR_COLOURS.length];
  return `linear-gradient(135deg, ${from}, ${to})`;
}

function initials(username: string): string {
  const clean = username.replace(/^@/, "");
  const parts = clean.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function fmtListTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return fmtTime(iso);
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) return d.toLocaleDateString("en-GB", { weekday: "short" });
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function fmtDatePill(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now.getTime() - 86400000);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

const CHAT_BG = "#F5F5F7";
const BUBBLE_IN = "#FFFFFF";
const BUBBLE_OUT = "#EFEDFA";
const TICK = "#6658CD";

interface TicketsTabProps {
  selectedGbId?: string;
  highlightId?: string;
}

export default function TicketsTab({ selectedGbId, highlightId }: TicketsTabProps = {}) {
  const [tickets, setTickets] = useState<(ApiTicket & { unreadCount?: number; category?: string })[]>([]);
  const [messages, setMessages] = useState<ApiTicketMessage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTicketFull, setActiveTicketFull] = useState<ApiTicketFull | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "">("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadList = useCallback(() => {
    if (!selectedGbId) return;
    setLoading(true);
    organiserApi.tickets(selectedGbId)
      .then(ts => setTickets(ts))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedGbId]);

  useEffect(() => { loadList(); }, [loadList]);

  const loadThread = useCallback((ticketId: string) => {
    setLoadingThread(true);
    organiserApi.getTicket(ticketId)
      .then(res => {
        setActiveTicketFull(res.ticket);
        setMessages(res.messages);
        // Clear unread badge locally
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, unreadCount: 0 } : t));
      })
      .catch(() => {})
      .finally(() => setLoadingThread(false));
  }, []);

  const openChat = (id: string) => {
    setActiveId(id);
    setDraft("");
    setStatusMenuOpen(false);
    loadThread(id);
  };

  useEffect(() => {
    if (highlightId) setActiveId(highlightId);
  }, [highlightId]);

  useEffect(() => {
    if (activeId) loadThread(activeId);
  }, [activeId, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [activeId, messages.length]);

  const sendReply = async () => {
    if (!activeId || !draft.trim() || sending) return;
    setSending(true);
    try {
      const msg = await organiserApi.replyTicket(activeId, draft.trim());
      setMessages(prev => [...prev, msg]);
      setDraft("");
      inputRef.current?.focus();
      // Optimistically update ticket status + updated time
      const now = new Date().toISOString();
      setTickets(prev => prev.map(t => t.id === activeId
        ? { ...t, status: t.status === "open" ? "in_progress" : t.status, updatedAt: now }
        : t));
      if (activeTicketFull) {
        setActiveTicketFull(prev => prev ? { ...prev, status: prev.status === "open" ? "in_progress" : prev.status } : null);
      }
    } catch {
      // keep draft on error
    } finally {
      setSending(false);
    }
  };

  const sortedTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...tickets]
      .filter(t =>
        (!q || t.accountUsername.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q)) &&
        (statusFilter === "" || t.status === statusFilter)
      )
      .sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime());
  }, [tickets, search, statusFilter]);

  const lastMessageByTicket = useMemo(() => {
    const map: Record<string, ApiTicketMessage> = {};
    for (const m of messages) {
      if (!map[m.ticketId] || m.id > map[m.ticketId].id) map[m.ticketId] = m;
    }
    return map;
  }, [messages]);

  const groupedMessages = useMemo(() => {
    const activeMessages = messages.filter(m => m.ticketId === activeId);
    const groups: { date: string; messages: ApiTicketMessage[] }[] = [];
    for (const msg of activeMessages) {
      const pill = fmtDatePill(msg.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.date === pill) last.messages.push(msg);
      else groups.push({ date: pill, messages: [msg] });
    }
    return groups;
  }, [messages, activeId]);

  if (!selectedGbId) {
    return (
      <div className="rounded-xl p-8 sm:p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <MessageSquare className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
        <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>No Group Buy Selected</h3>
        <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>Select a group buy to view support tickets</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white overflow-hidden flex flex-col" style={{ border: `1px solid ${V2_CARD_BORDER}`, height: "calc(100vh - 180px)", minHeight: 480 }}>
      <div className="flex flex-1 min-h-0">
        {/* ── Chat list ── */}
        <div
          className={`flex flex-col border-r ${activeId ? "hidden sm:flex" : "flex"}`}
          style={{ width: 320, minWidth: 280, maxWidth: 360, borderColor: V2_CARD_BORDER }}
        >
          {/* Search + filter header */}
          <div className="p-3 space-y-2" style={{ borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Tickets</h3>
              <button onClick={loadList} disabled={loading} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/5" style={{ color: "var(--t-muted)" }}>
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--t-subtle)" }} />
              <input
                type="text"
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-lg text-[13px] outline-none"
                style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {(["", "open", "in_progress", "resolved", "closed"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors"
                  style={{
                    background: statusFilter === s ? "var(--t-blue-10)" : "transparent",
                    color: statusFilter === s ? "var(--t-blue)" : "var(--t-muted)",
                  }}
                >
                  {s === "" ? "All" : STATUS_META[s as TicketStatus].label}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" style={{ color: "var(--t-blue)" }} />
                <p className="text-[13px]" style={{ color: "var(--t-subtle)" }}>Loading…</p>
              </div>
            ) : sortedTickets.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--t-subtle)" }} />
                <p className="text-[13px]" style={{ color: "var(--t-subtle)" }}>No tickets</p>
              </div>
            ) : sortedTickets.map(ticket => {
              const isActive = activeId === ticket.id;
              const lastMsg = lastMessageByTicket[ticket.id];
              const statusM = STATUS_META[ticket.status as TicketStatus] ?? STATUS_META.open;
              return (
                <button
                  key={ticket.id}
                  data-ticket-id={ticket.id}
                  onClick={() => openChat(ticket.id)}
                  className="w-full flex items-start gap-2.5 p-3 text-left hover:bg-black/[0.025] transition-colors"
                  style={{
                    background: isActive ? "var(--t-blue-10)" : "transparent",
                    borderBottom: `1px solid ${V2_CARD_BORDER}`,
                  }}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[12px] font-bold text-white"
                    style={{ background: avatarGradient(ticket.accountUsername), fontSize: 12 }}>
                    {initials(ticket.accountUsername)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-[13px] font-semibold truncate" style={{ color: "var(--t-text)" }}>
                        {ticket.accountUsername.replace(/^@/, "")}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {(ticket.unreadCount ?? 0) > 0 && (
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "var(--t-blue)" }}>
                            {ticket.unreadCount}
                          </span>
                        )}
                        <span className="text-[11px]" style={{ color: "var(--t-subtle)" }}>
                          {ticket.updatedAt ? fmtListTime(ticket.updatedAt) : ""}
                        </span>
                      </div>
                    </div>
                    <div className="text-[12px] font-medium truncate mb-0.5" style={{ color: "var(--t-text)" }}>{ticket.subject}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: statusM.bg, color: statusM.color }}>
                        {statusM.label}
                      </span>
                      {lastMsg && (
                        <span className="text-[11px] truncate" style={{ color: "var(--t-subtle)" }}>
                          {lastMsg.authorRole !== "customer" ? "You: " : ""}{lastMsg.body.slice(0, 30)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Chat area ── */}
        {activeId ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat header */}
            {(() => {
              const ticket = tickets.find(t => t.id === activeId);
              const statusM = ticket ? STATUS_META[ticket.status as TicketStatus] ?? STATUS_META.open : STATUS_META.open;
              return ticket ? (
                <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
                  <button
                    onClick={() => setActiveId(null)}
                    className="sm:hidden w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5"
                    style={{ color: "var(--t-muted)" }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold text-white"
                    style={{ background: avatarGradient(ticket.accountUsername) }}>
                    {initials(ticket.accountUsername)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold truncate" style={{ color: "var(--t-text)" }}>
                      {ticket.accountUsername.replace(/^@/, "")}
                    </div>
                    <div className="text-[12px] truncate" style={{ color: "var(--t-subtle)" }}>{ticket.subject}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[12px] font-bold px-2 py-1 rounded-full" style={{ background: statusM.bg, color: statusM.color }}>
                      {statusM.label}
                    </span>
                    <button
                      onClick={() => setStatusMenuOpen(o => !o)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 relative"
                      style={{ color: "var(--t-muted)" }}
                    >
                      <ChevronDown className="w-4 h-4" />
                      {statusMenuOpen && (
                        <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg z-20 py-1 min-w-[160px]" style={{ border: `1px solid ${V2_CARD_BORDER}` }} onClick={e => e.stopPropagation()}>
                          {(Object.entries(STATUS_META) as [TicketStatus, typeof STATUS_META[TicketStatus]][]).map(([s, m]) => (
                            <button
                              key={s}
                              className="w-full px-3 py-2 text-left text-[13px] hover:bg-black/[0.03] flex items-center gap-2"
                              style={{ color: m.color }}
                              onClick={() => {
                                // Optimistic local update — no organiser status endpoint
                                setTickets(prev => prev.map(t => t.id === activeId ? { ...t, status: s } : t));
                                setStatusMenuOpen(false);
                              }}
                            >
                              <CircleDot className="w-3.5 h-3.5" /> {m.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1" style={{ background: CHAT_BG }}>
              {loadingThread ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} />
                </div>
              ) : groupedMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-[13px]" style={{ color: "var(--t-subtle)" }}>No messages yet</p>
                </div>
              ) : (
                <>
                  {groupedMessages.map(group => (
                    <div key={group.date}>
                      <div className="flex items-center justify-center py-2">
                        <span className="text-[11px] font-semibold px-3 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.06)", color: "var(--t-muted)" }}>
                          {group.date}
                        </span>
                      </div>
                      {group.messages.map(msg => {
                        const isOut = msg.authorRole !== "customer";
                        return (
                          <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"} mb-1`}>
                            <div
                              className="max-w-[75%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap"
                              style={{
                                background: isOut ? BUBBLE_OUT : BUBBLE_IN,
                                color: "var(--t-text)",
                                borderRadius: isOut ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.07)",
                              }}
                            >
                              {msg.body}
                              <span className="flex items-center gap-1 justify-end mt-1">
                                <span className="text-[10px]" style={{ color: "var(--t-subtle)" }}>{fmtTime(msg.createdAt)}</span>
                                {isOut && <CheckCheck className="w-3 h-3" style={{ color: TICK }} />}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Reply box */}
            <div className="p-3 flex items-end gap-2" style={{ borderTop: `1px solid ${V2_CARD_BORDER}`, background: "#fff" }}>
              <textarea
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); }
                }}
                placeholder="Type a reply… (Enter to send, Shift+Enter for new line)"
                rows={1}
                className="flex-1 px-3 py-2 rounded-xl text-[13px] outline-none resize-none"
                style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", maxHeight: 120, overflowY: "auto" }}
              />
              <button
                onClick={sendReply}
                disabled={sending || !draft.trim()}
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40 transition-colors"
                style={{ background: "var(--t-blue)", color: "#fff" }}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ background: CHAT_BG }}>
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
              <p className="text-[14px] font-semibold mb-1" style={{ color: "var(--t-text)" }}>Select a ticket</p>
              <p className="text-[13px]" style={{ color: "var(--t-subtle)" }}>Click a conversation to open it</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
