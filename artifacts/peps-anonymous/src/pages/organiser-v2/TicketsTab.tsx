import { useState, useEffect, useRef, useMemo } from "react";
import { V2_CARD_BORDER } from "./theme";
import {
  MessageSquare, Search, Send, ArrowLeft, Check, CheckCheck,
  ChevronDown, CircleDot, Loader2, X
} from "lucide-react";

// ─── Workspace: Tickets Tab (Telegram-style) ─────────────────────────────────
// Support ticket messenger styled like Telegram: chat list on the left with
// avatars / previews / unread badges, the open conversation on the right with
// date pills, message bubbles and read ticks. Replies persist to localStorage
// until the live /api/organiser/tickets endpoints are wired in.

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

interface Ticket {
  id: string;
  accountUsername: string;
  category: string;
  subject: string;
  status: TicketStatus;
  groupBuyId: string | null;
  customerUnread: boolean;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

interface TicketMessage {
  id: number;
  ticketId: string;
  authorRole: "customer" | "organiser";
  authorUsername: string;
  body: string;
  createdAt: string;
}

interface TicketsTabProps {
  selectedGbId?: string;
  highlightId?: string;
}

const STATUS_META: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  open:        { label: "Open",        color: "#16A34A", bg: "rgba(22,163,74,0.10)" },
  in_progress: { label: "In progress", color: "#D97706", bg: "rgba(217,119,6,0.10)" },
  resolved:    { label: "Resolved",    color: "#2563EB", bg: "rgba(37,99,235,0.10)" },
  closed:      { label: "Closed",      color: "#6B7280", bg: "rgba(107,114,128,0.10)" },
};

// Telegram-style deterministic avatar colours, keyed off the username
const AVATAR_COLOURS = [
  ["#FF885E", "#FF516A"], // orange-red
  ["#FFCD6A", "#FFA85C"], // yellow-orange
  ["#82B1FF", "#665FFF"], // blue-violet
  ["#A0DE7E", "#54CB68"], // green
  ["#53EDD6", "#28C9B7"], // teal
  ["#72D5FD", "#2A9EF1"], // light blue
  ["#E0A2F3", "#D669ED"], // pink-purple
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

const SAMPLE_TICKETS: Ticket[] = [
  {
    id: "t1",
    accountUsername: "@alice_p",
    category: "order_issue",
    subject: "Missing vial in my order",
    status: "open",
    groupBuyId: "gb_winter25",
    customerUnread: false,
    unreadCount: 2,
    createdAt: "2026-07-12T09:14:00Z",
    updatedAt: "2026-07-13T11:42:00Z",
  },
  {
    id: "t2",
    accountUsername: "@bob_gb",
    category: "general_support",
    subject: "Payment not showing as confirmed",
    status: "in_progress",
    groupBuyId: "gb_winter25",
    customerUnread: true,
    unreadCount: 0,
    createdAt: "2026-07-11T16:30:00Z",
    updatedAt: "2026-07-13T08:05:00Z",
  },
  {
    id: "t3",
    accountUsername: "@carol_uk",
    category: "order_issue",
    subject: "Change my delivery address",
    status: "resolved",
    groupBuyId: "gb_winter25",
    customerUnread: false,
    unreadCount: 0,
    createdAt: "2026-07-09T13:00:00Z",
    updatedAt: "2026-07-11T19:22:00Z",
  },
  {
    id: "t4",
    accountUsername: "@dave_m",
    category: "testing_pool",
    subject: "When do testing results come out?",
    status: "closed",
    groupBuyId: "gb_winter25",
    customerUnread: false,
    unreadCount: 0,
    createdAt: "2026-07-05T10:45:00Z",
    updatedAt: "2026-07-08T14:10:00Z",
  },
];

const SAMPLE_MESSAGES: TicketMessage[] = [
  // t1 — Missing vial
  { id: 1, ticketId: "t1", authorRole: "customer", authorUsername: "@alice_p", body: "Hi! My parcel arrived today but I'm missing one vial of Semaglutide 5mg. I ordered 3 and only 2 were inside.", createdAt: "2026-07-12T09:14:00Z" },
  { id: 2, ticketId: "t1", authorRole: "organiser", authorUsername: "@organiser", body: "Hey Alice, sorry about that! Can you send me a photo of the parcel contents and the packing slip?", createdAt: "2026-07-12T10:02:00Z" },
  { id: 3, ticketId: "t1", authorRole: "customer", authorUsername: "@alice_p", body: "Sure, just sent it to your DM. The slip says 3 vials but the box only had 2.", createdAt: "2026-07-13T11:40:00Z" },
  { id: 4, ticketId: "t1", authorRole: "customer", authorUsername: "@alice_p", body: "Also the box seal looked fine, so I don't think it was opened in transit.", createdAt: "2026-07-13T11:42:00Z" },
  // t2 — Payment
  { id: 5, ticketId: "t2", authorRole: "customer", authorUsername: "@bob_gb", body: "I sent the USDT payment 2 days ago but my order still shows awaiting payment. Tx hash: 0x8f3a…c21d", createdAt: "2026-07-11T16:30:00Z" },
  { id: 6, ticketId: "t2", authorRole: "organiser", authorUsername: "@organiser", body: "Thanks Bob, checking the wallet now. Which network did you send on?", createdAt: "2026-07-11T17:15:00Z" },
  { id: 7, ticketId: "t2", authorRole: "customer", authorUsername: "@bob_gb", body: "TRC-20, same as the instructions said.", createdAt: "2026-07-12T09:00:00Z" },
  { id: 8, ticketId: "t2", authorRole: "organiser", authorUsername: "@organiser", body: "Found it — it landed but under the wrong memo so it wasn't auto-matched. I've confirmed your order manually. You should see it update now 👍", createdAt: "2026-07-13T08:05:00Z" },
  // t3 — Address change
  { id: 9, ticketId: "t3", authorRole: "customer", authorUsername: "@carol_uk", body: "Hi, I'm moving house next week — can I change the delivery address on order ORD-014?", createdAt: "2026-07-09T13:00:00Z" },
  { id: 10, ticketId: "t3", authorRole: "organiser", authorUsername: "@organiser", body: "No problem, it hasn't shipped yet. Send me the new address and I'll update it.", createdAt: "2026-07-09T14:20:00Z" },
  { id: 11, ticketId: "t3", authorRole: "customer", authorUsername: "@carol_uk", body: "42 New Street, Manchester, M1 2AB. Thank you!", createdAt: "2026-07-10T08:30:00Z" },
  { id: 12, ticketId: "t3", authorRole: "organiser", authorUsername: "@organiser", body: "Updated ✅ Your parcel will go to the new address.", createdAt: "2026-07-11T19:22:00Z" },
  // t4 — Testing results
  { id: 13, ticketId: "t4", authorRole: "customer", authorUsername: "@dave_m", body: "Any ETA on the testing pool results?", createdAt: "2026-07-05T10:45:00Z" },
  { id: 14, ticketId: "t4", authorRole: "organiser", authorUsername: "@organiser", body: "Samples went to Janoshik on Monday — usually takes 7-10 days. I'll notify everyone as soon as they're in.", createdAt: "2026-07-08T14:10:00Z" },
];

const TICKETS_KEY = "v2Tickets";
const MESSAGES_KEY = "v2TicketMessages";

// Telegram canvas colours
const CHAT_BG = "#F5F5F7";
const BUBBLE_IN = "#FFFFFF";
const BUBBLE_OUT = "#EFEDFA";
const TICK = "#6658CD";

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

export default function TicketsTab({ selectedGbId, highlightId }: TicketsTabProps = {}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    if (!selectedGbId) return;
    const storedT = localStorage.getItem(TICKETS_KEY);
    const storedM = localStorage.getItem(MESSAGES_KEY);
    setTickets(storedT ? JSON.parse(storedT) : SAMPLE_TICKETS);
    setMessages(storedM ? JSON.parse(storedM) : SAMPLE_MESSAGES);
  }, [selectedGbId]);

  // Open specific ticket if passed via highlightId
  useEffect(() => {
    if (highlightId) {
      setActiveId(highlightId);
      setTimeout(() => {
        const el = document.querySelector(`[data-ticket-id="${highlightId}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [highlightId]);

  const persistTickets = (next: Ticket[]) => {
    setTickets(next);
    localStorage.setItem(TICKETS_KEY, JSON.stringify(next));
  };
  const persistMessages = (next: TicketMessage[]) => {
    setMessages(next);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(next));
  };

  const activeTicket = tickets.find(t => t.id === activeId) ?? null;
  const activeMessages = useMemo(
    () => messages.filter(m => m.ticketId === activeId),
    [messages, activeId],
  );

  // Sort like Telegram: most recent activity first
  const sortedTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...tickets]
      .filter(t =>
        (!q || t.accountUsername.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q)) &&
        (statusFilter === "" || t.status === statusFilter) &&
        (categoryFilter === "" || t.category === categoryFilter)
      )
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [tickets, search, statusFilter, categoryFilter]);

  const lastMessageByTicket = useMemo(() => {
    const map: Record<string, TicketMessage> = {};
    for (const m of messages) {
      if (!map[m.ticketId] || m.id > map[m.ticketId].id) map[m.ticketId] = m;
    }
    return map;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [activeId, activeMessages.length]);

  const openChat = (id: string) => {
    setActiveId(id);
    setDraft("");
    setStatusMenuOpen(false);
    // Opening the chat clears its unread badge
    persistTickets(tickets.map(t => t.id === id ? { ...t, unreadCount: 0 } : t));
  };

  const sendReply = async () => {
    if (!activeTicket || !draft.trim() || sending) return;
    setSending(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    const msg: TicketMessage = {
      id: Math.max(0, ...messages.map(m => m.id)) + 1,
      ticketId: activeTicket.id,
      authorRole: "organiser",
      authorUsername: "@organiser",
      body: draft.trim(),
      createdAt: new Date().toISOString(),
    };
    persistMessages([...messages, msg]);
    persistTickets(tickets.map(t => t.id === activeTicket.id
      ? { ...t, status: t.status === "open" ? "in_progress" : t.status, updatedAt: msg.createdAt }
      : t));
    setDraft("");
    setSending(false);
    inputRef.current?.focus();
  };

  const setStatus = (status: TicketStatus) => {
    if (!activeTicket) return;
    persistTickets(tickets.map(t => t.id === activeTicket.id ? { ...t, status } : t));
    setStatusMenuOpen(false);
  };

  if (!selectedGbId) {
    return (
      <div className="rounded-xl p-8 sm:p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <MessageSquare className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
        <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>
          No Group Buy Selected
        </h3>
        <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>
          Select a group buy to view support tickets
        </p>
      </div>
    );
  }

  const openCount = tickets.filter(t => t.status === "open" || t.status === "in_progress").length;

  return (
    <div
      className="rounded-xl overflow-hidden bg-white flex"
      style={{ border: `1px solid ${V2_CARD_BORDER}`, height: "min(700px, calc(100vh - 160px))" }}
    >
      {/* ── Left pane: chat list ── */}
      <div
        className={`${activeId ? "hidden md:flex" : "flex"} flex-col w-full md:w-[320px] lg:w-[360px] shrink-0`}
        style={{ borderRight: `1px solid ${V2_CARD_BORDER}` }}
      >
        {/* Search header */}
        <div className="p-3 space-y-2" style={{ borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[15px] font-bold" style={{ color: "var(--t-text)" }}>Tickets</h2>
            <span className="text-[12px] font-semibold" style={{ color: "var(--t-subtle)" }}>
              {openCount} open
            </span>
          </div>
          <div className="flex items-center gap-2 h-9 px-3 rounded-full" style={{ background: "var(--t-surface2)" }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: "var(--t-subtle)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search"
              className="flex-1 bg-transparent text-[14px] outline-none"
              style={{ color: "var(--t-text)" }}
            />
            {search && (
              <button onClick={() => setSearch("")}>
                <X className="w-3.5 h-3.5" style={{ color: "var(--t-subtle)" }} />
              </button>
            )}
          </div>

          {/* Status filter buttons */}
          <div className="flex gap-1 overflow-x-auto">
            {(["", "open", "in_progress", "resolved", "closed"] as const).map(status => {
              const count = status === "" ? tickets.length : tickets.filter(t => t.status === status).length;
              const isActive = statusFilter === status;
              const label = status === "" ? "All" : status.replace("_", " ").split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");

              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className="px-2.5 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors"
                  style={{
                    background: isActive ? "var(--t-blue)" : "var(--t-surface2)",
                    color: isActive ? "#fff" : "var(--t-subtle)",
                  }}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="w-full h-8 px-2 rounded-lg text-[13px] outline-none"
            style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
          >
            <option value="">All Categories</option>
            <option value="order_issue">Order Issue</option>
            <option value="general">General Question</option>
            <option value="gb">Group Buy</option>
            <option value="wholesale">Wholesale</option>
            <option value="testing">Testing Contribution</option>
          </select>
        </div>

        {/* Chat rows */}
        <div className="flex-1 overflow-y-auto">
          {sortedTickets.length === 0 && (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--t-subtle)", opacity: 0.4 }} />
              <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>
                {search ? "No tickets match your search" : "No tickets yet for this group buy"}
              </p>
            </div>
          )}
          {sortedTickets.map(t => {
            const last = lastMessageByTicket[t.id];
            const isActive = t.id === activeId;
            const sm = STATUS_META[t.status];
            return (
              <button
                key={t.id}
                onClick={() => openChat(t.id)}
                className="w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors"
                style={isActive
                  ? { background: "var(--t-blue)" }
                  : { background: "transparent" }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(0,0,0,0.03)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                {/* Avatar */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-[15px] font-bold text-white"
                  style={{ background: avatarGradient(t.accountUsername) }}
                >
                  {initials(t.accountUsername)}
                </div>
                {/* Name + preview */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[14px] font-semibold truncate" style={{ color: isActive ? "#fff" : "var(--t-text)" }}>
                      {t.accountUsername}
                    </span>
                    <span className="text-[12px] shrink-0 flex items-center gap-1" style={{ color: isActive ? "rgba(255,255,255,0.8)" : "var(--t-subtle)" }}>
                      {last?.authorRole === "organiser" && (
                        t.customerUnread
                          ? <Check className="w-3.5 h-3.5" style={{ color: isActive ? "rgba(255,255,255,0.8)" : TICK }} />
                          : <CheckCheck className="w-3.5 h-3.5" style={{ color: isActive ? "rgba(255,255,255,0.8)" : TICK }} />
                      )}
                      {fmtListTime(t.updatedAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-[13.5px] truncate" style={{ color: isActive ? "rgba(255,255,255,0.85)" : "var(--t-subtle)" }}>
                      {last ? (
                        <>
                          {last.authorRole === "organiser" && <span style={{ color: isActive ? "#fff" : "var(--t-text)" }}>You: </span>}
                          {last.body}
                        </>
                      ) : t.subject}
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="w-2 h-2 rounded-full"
                        title={sm.label}
                        style={{ background: isActive ? "#fff" : sm.color, opacity: isActive ? 0.9 : 1 }}
                      />
                      {t.unreadCount > 0 && (
                        <span
                          className="min-w-[20px] h-5 px-1.5 rounded-full text-[12px] font-bold flex items-center justify-center"
                          style={isActive ? { background: "#fff", color: "var(--t-blue)" } : { background: "var(--t-blue)", color: "#fff" }}
                        >
                          {t.unreadCount}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right pane: conversation ── */}
      <div className={`${activeId ? "flex" : "hidden md:flex"} flex-col flex-1 min-w-0`}>
        {!activeTicket ? (
          <div className="flex-1 flex items-center justify-center" style={{ background: CHAT_BG }}>
            <span className="px-3 py-1.5 rounded-full text-[14px]" style={{ background: "rgba(0,0,0,0.2)", color: "#fff" }}>
              Select a ticket to start messaging
            </span>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-3 py-2 bg-white relative" style={{ borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
              <button
                onClick={() => setActiveId(null)}
                className="md:hidden w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 shrink-0"
              >
                <ArrowLeft className="w-4.5 h-4.5" style={{ color: "var(--t-muted)" }} />
              </button>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[14px] font-bold text-white"
                style={{ background: avatarGradient(activeTicket.accountUsername) }}
              >
                {initials(activeTicket.accountUsername)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold truncate" style={{ color: "var(--t-text)" }}>
                  {activeTicket.accountUsername}
                </p>
                <p className="text-[13px] truncate" style={{ color: "var(--t-subtle)" }}>
                  {activeTicket.subject}
                </p>
              </div>
              {/* Status pill + menu */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setStatusMenuOpen(o => !o)}
                  className="flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-full"
                  style={{ color: STATUS_META[activeTicket.status].color, background: STATUS_META[activeTicket.status].bg }}
                >
                  {STATUS_META[activeTicket.status].label}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {statusMenuOpen && (
                  <div
                    className="absolute right-0 top-8 z-10 rounded-xl bg-white py-1 shadow-lg"
                    style={{ border: `1px solid ${V2_CARD_BORDER}`, minWidth: 150 }}
                  >
                    {(Object.keys(STATUS_META) as TicketStatus[]).map(s => (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className="w-full text-left px-3 py-1.5 text-[13px] font-semibold flex items-center gap-2 hover:bg-black/[0.04]"
                        style={{ color: "var(--t-text)" }}
                      >
                        <CircleDot className="w-3 h-3" style={{ color: STATUS_META[s].color }} />
                        {STATUS_META[s].label}
                        {activeTicket.status === s && <Check className="w-3 h-3 ml-auto" style={{ color: "var(--t-blue)" }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-8 py-3" style={{ background: CHAT_BG }}>
              <div className="max-w-[640px] mx-auto flex flex-col gap-1">
                {activeMessages.map((m, i) => {
                  const prev = activeMessages[i - 1];
                  const isOut = m.authorRole === "organiser";
                  const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
                  const samePrevAuthor = prev && prev.authorRole === m.authorRole && !newDay;
                  return (
                    <div key={m.id}>
                      {newDay && (
                        <div className="flex justify-center my-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[13px] font-semibold" style={{ background: "rgba(0,0,0,0.2)", color: "#fff" }}>
                            {fmtDatePill(m.createdAt)}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isOut ? "justify-end" : "justify-start"} ${samePrevAuthor ? "mt-0.5" : "mt-1.5"}`}>
                        <div
                          className="relative max-w-[85%] sm:max-w-[70%] px-3 py-1.5 text-[14px] shadow-sm"
                          style={{
                            background: isOut ? BUBBLE_OUT : BUBBLE_IN,
                            color: "#000",
                            borderRadius: 12,
                            borderBottomRightRadius: isOut ? 4 : 12,
                            borderBottomLeftRadius: isOut ? 12 : 4,
                          }}
                        >
                          <span style={{ whiteSpace: "pre-wrap", lineHeight: 1.45, wordBreak: "break-word" }}>{m.body}</span>
                          {/* time + ticks, telegram-style bottom-right inline */}
                          <span className="inline-flex items-center gap-0.5 ml-1.5 align-bottom translate-y-[3px] float-right relative top-[5px]">
                            <span className="text-[12px]" style={{ color: isOut ? "#5DA854" : "#9AA3AB" }}>
                              {fmtTime(m.createdAt)}
                            </span>
                            {isOut && (
                              activeTicket.customerUnread
                                ? <Check className="w-3.5 h-3.5" style={{ color: TICK }} />
                                : <CheckCheck className="w-3.5 h-3.5" style={{ color: TICK }} />
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Composer */}
            {activeTicket.status === "closed" ? (
              <div className="px-4 py-3 bg-white text-center" style={{ borderTop: `1px solid ${V2_CARD_BORDER}` }}>
                <p className="text-[13.5px]" style={{ color: "var(--t-subtle)" }}>
                  This ticket is closed. Change its status above to reply.
                </p>
              </div>
            ) : (
              <div className="flex items-end gap-2 px-3 py-2.5 bg-white" style={{ borderTop: `1px solid ${V2_CARD_BORDER}` }}>
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendReply();
                    }
                  }}
                  placeholder="Message"
                  rows={Math.min(4, Math.max(1, draft.split("\n").length))}
                  className="flex-1 px-3 py-2 rounded-2xl text-[14px] outline-none resize-none"
                  style={{ background: "var(--t-surface2)", color: "var(--t-text)" }}
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !draft.trim()}
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-opacity disabled:opacity-40"
                  style={{ background: "var(--t-blue)", color: "#fff" }}
                >
                  {sending ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Send className="w-4.5 h-4.5 -ml-0.5" />}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
