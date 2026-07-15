import React, { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, ArrowUp, X, Loader2, History, Plus, MessageSquare, Trash2, CheckCircle2, Search, SquarePen, Activity, FlaskConical, BookMarked } from "lucide-react";
import { type DiscussMessage, type DiscussChart, type DiscussSource } from "@/hooks/use-blood-tests";
import { SageTrendChart } from "@/components/SageTrendChart";

const ACCENT = "#0176D3";

function stripMarkers(text: string): string {
  return text.replace(/[\n\r\s]*(?:I?SOURCES?_?JSON_?START|CHIPS?_?JSON_?START|CHARTS?_?JSON_?START)[\s\S]*/i, "").trim();
}

type Tokens = {
  panel: string;
  panel2: string;
  border: string;
  borderSoft: string;
  text: string;
  muted: string;
  subtle: string;
  chip: string;
};

interface SageMessage extends DiscussMessage {
  greeting?: boolean;
}

interface StoredConversation {
  id: string;
  title: string;
  messages: SageMessage[];
  updatedAt: Date;
}

interface SageChatProps {
  open: boolean;
  onClose: () => void;
  /** A question to auto-send when the panel opens. */
  seed?: string;
  /** Open directly to the history panel instead of a new chat. */
  openToHistory?: boolean;
  /** Theme tokens (from the dashboard palette). */
  t: Tokens;
  accent?: string;
  /** Render as a full-page layout (no modal backdrop, fills the container). */
  fullPage?: boolean;
}

const GREETING =
  "Hi, I'm Sage. Ask me anything about your compounds, bloodwork, or protocols and I'll help you make sense of it.";

function makeGreeting(): SageMessage {
  return { id: "greeting", role: "assistant", content: GREETING, greeting: true, timestamp: new Date() };
}

/** Renders markdown-lite: headings, bullets, numbered lists, bold, italic, hr. */
function renderRich(text: string): React.ReactNode {
  const lines = text.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  let ordered: { n: string; text: string }[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={`ul-${key++}`} style={{ margin: "6px 0 6px 0", paddingLeft: 20, listStyle: "disc" }}>
        {bullets.map((b, i) => (
          <li key={i} style={{ marginBottom: 3, lineHeight: 1.55 }}>
            {renderInline(b)}
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  const flushOrdered = () => {
    if (ordered.length === 0) return;
    blocks.push(
      <ol key={`ol-${key++}`} style={{ margin: "6px 0 6px 0", paddingLeft: 20, listStyle: "decimal" }}>
        {ordered.map((o, i) => (
          <li key={i} style={{ marginBottom: 3, lineHeight: 1.55 }}>
            {renderInline(o.text)}
          </li>
        ))}
      </ol>,
    );
    ordered = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Bullet list
    const bulletMatch = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bulletMatch) {
      flushOrdered();
      bullets.push(bulletMatch[1]);
      continue;
    }
    // Numbered list
    const orderedMatch = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (orderedMatch) {
      flushBullets();
      ordered.push({ n: orderedMatch[1], text: orderedMatch[2] });
      continue;
    }

    flushBullets();
    flushOrdered();

    // Horizontal rule
    if (/^\s*[-*_]{3,}\s*$/.test(line)) {
      blocks.push(<hr key={`hr-${key++}`} style={{ margin: "10px 0", border: "none", borderTop: "1px solid rgba(0,0,0,0.1)" }} />);
      continue;
    }
    // H1
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1) {
      blocks.push(
        <p key={`h1-${key++}`} style={{ margin: "10px 0 4px", fontWeight: 800, fontSize: 15 }}>
          {renderInline(h1[1])}
        </p>,
      );
      continue;
    }
    // H2
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      blocks.push(
        <p key={`h2-${key++}`} style={{ margin: "10px 0 4px", fontWeight: 700, fontSize: 13.5, letterSpacing: "0.01em", textTransform: "uppercase", opacity: 0.7 }}>
          {renderInline(h2[1])}
        </p>,
      );
      continue;
    }
    // H3
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      blocks.push(
        <p key={`h3-${key++}`} style={{ margin: "8px 0 3px", fontWeight: 700, fontSize: 13 }}>
          {renderInline(h3[1])}
        </p>,
      );
      continue;
    }
    // Blank line
    if (line.trim().length === 0) {
      blocks.push(<div key={`sp-${key++}`} style={{ height: 6 }} />);
    } else {
      blocks.push(
        <p key={`p-${key++}`} style={{ margin: 0, lineHeight: 1.6 }}>
          {renderInline(line)}
        </p>,
      );
    }
  }
  flushBullets();
  flushOrdered();
  return blocks;
}

function renderInline(text: string): React.ReactNode {
  // Split on **bold** and _italic_ / *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    if ((part.startsWith("_") && part.endsWith("_")) || (part.startsWith("*") && part.endsWith("*"))) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function formatSessionDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
}

export function SageChat({ open, onClose, seed, openToHistory, t, accent = ACCENT, fullPage = false }: SageChatProps) {
  const [messages, setMessages] = useState<SageMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingHasContent, setStreamingHasContent] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  const convIdRef = useRef<string | null>(null);
  const convTitleRef = useRef<string>("New Chat");
  const messagesRef = useRef<SageMessage[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const persistConversation = useCallback(async (msgs: SageMessage[]) => {
    const id = convIdRef.current;
    if (!id) return;
    const toSave = msgs.filter((m) => !m.greeting);
    if (toSave.length === 0) return;
    try {
      await fetch(`/api/blood-tests/conversations/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: convTitleRef.current, messages: toSave }),
      });
    } catch {
      // Best-effort persistence — a failed save shouldn't interrupt the chat.
    }
  }, []);

  const send = useCallback(
    async (text: string, historyOverride?: { role: "user" | "assistant"; content: string }[]) => {
      const q = text.trim();
      if (!q || sending || limitReached) return;

      if (!convIdRef.current) {
        convIdRef.current = Math.random().toString(36).slice(2);
        convTitleRef.current = q.slice(0, 40);
      }

      const userMsg: SageMessage = { id: Math.random().toString(36).slice(2), role: "user", content: q, timestamp: new Date() };
      const streamId = Math.random().toString(36).slice(2);
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: streamId, role: "assistant", content: "", timestamp: new Date() },
      ]);
      setInput("");
      setSending(true);
      setStreamingHasContent(false);
      setSearchStatus(null);
      setError(null);

      const myRequestId = ++requestIdRef.current;
      const isStale = () => requestIdRef.current !== myRequestId;

      const history =
        historyOverride ??
        messagesRef.current
          .filter((m) => !m.greeting)
          .slice(-8)
          .map((m) => ({ role: m.role, content: m.content }));

      try {
        const response = await fetch("/api/blood-tests/discuss", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: q, history }),
          signal: AbortSignal.timeout(65_000),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: "Request failed" })) as { error?: string; response?: string; used?: number; limit?: number };
          if (!isStale()) {
            setMessages((prev) => prev.filter((m) => m.id !== streamId));
            if (errData.error === "limit_reached") {
              setLimitReached(true);
              setMessages((prev) => [...prev, { id: Math.random().toString(36).slice(2), role: "assistant" as const, content: "You've reached your daily question limit. Please check back tomorrow.", timestamp: new Date() }]);
            } else if (errData.response) {
              setMessages((prev) => [...prev, { id: Math.random().toString(36).slice(2), role: "assistant" as const, content: errData.response!, timestamp: new Date() }]);
            } else {
              setError("Sage couldn't respond just now. Please try again in a moment.");
            }
          }
          return;
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";
        let donePayload: { response?: string; sources?: DiscussSource[]; chips?: string[]; charts?: DiscussChart[]; contextSession?: { id: string; testName: string; testDate: string } | null; used?: number; limit?: number } | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr) continue;
            let event: Record<string, unknown>;
            try { event = JSON.parse(jsonStr) as Record<string, unknown>; }
            catch { continue; }
            if (event["type"] === "token" && typeof event["text"] === "string") {
              accumulated += event["text"] as string;
              if (!isStale()) {
                setStreamingHasContent(true);
                setSearchStatus(null);
                const displayText = stripMarkers(accumulated);
                setMessages((prev) => prev.map((m) => m.id === streamId ? { ...m, content: displayText } : m));
              }
            } else if (event["type"] === "status" && typeof event["text"] === "string") {
              if (!isStale()) setSearchStatus(event["text"] as string);
            } else if (event["type"] === "done") {
              donePayload = event as typeof donePayload;
            } else if (event["type"] === "error") {
              throw new Error((event["error"] as string | undefined) ?? "ai_unavailable");
            }
          }
        }

        if (isStale()) return;

        const finalMsg: SageMessage = {
          id: streamId,
          role: "assistant",
          content: donePayload?.response ?? stripMarkers(accumulated),
          chips: donePayload?.chips ?? [],
          sources: donePayload?.sources ?? [],
          charts: donePayload?.charts ?? [],
          contextSession: donePayload?.contextSession ?? null,
          timestamp: new Date(),
        };
        setMessages((prev) => {
          const next = prev.map((m) => m.id === streamId ? finalMsg : m);
          void persistConversation(next);
          return next;
        });
      } catch (e) {
        if (isStale()) return;
        const err = e as Error & { used?: number; limit?: number };
        setMessages((prev) => prev.filter((m) => m.id !== streamId));
        if (err.message === "limit_reached") {
          setLimitReached(true);
          setMessages((prev) => [...prev, { id: Math.random().toString(36).slice(2), role: "assistant" as const, content: "You've reached your daily question limit. Please check back tomorrow.", timestamp: new Date() }]);
        } else {
          setError("Sage couldn't respond just now. Please try again in a moment.");
        }
      } finally {
        if (!isStale()) setSending(false);
      }
    },
    [sending, limitReached, persistConversation],
  );

  const startNewChat = useCallback(() => {
    convIdRef.current = null;
    convTitleRef.current = "New Chat";
    requestIdRef.current++;
    setMessages([makeGreeting()]);
    setInput("");
    setSending(false);
    setError(null);
    setLimitReached(false);
    setHistoryOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const loadConversations = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/blood-tests/conversations", { credentials: "include" });
      if (res.ok) {
        const rows: { id: string; title: string; messagesJson: string; updatedAt: string }[] = await res.json();
        setConversations(
          rows.map((row) => ({
            id: row.id,
            title: row.title,
            messages: (() => {
              try {
                return JSON.parse(row.messagesJson) as SageMessage[];
              } catch {
                return [];
              }
            })(),
            updatedAt: new Date(row.updatedAt),
          })),
        );
      }
    } catch {
      // Silent — history is a nice-to-have overlay, not critical path.
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const openHistory = useCallback(() => {
    setHistoryOpen(true);
    void loadConversations();
  }, [loadConversations]);

  const resumeConversation = useCallback((conv: StoredConversation) => {
    convIdRef.current = conv.id;
    convTitleRef.current = conv.title;
    requestIdRef.current++;
    setMessages(conv.messages.length > 0 ? conv.messages : [makeGreeting()]);
    setSending(false);
    setHistoryOpen(false);
    setError(null);
    setLimitReached(false);
  }, []);

  const deleteConversation = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (convIdRef.current === id) startNewChat();
      try {
        await fetch(`/api/blood-tests/conversations/${id}`, { method: "DELETE", credentials: "include" });
      } catch {
        // Best-effort delete.
      }
    },
    [startNewChat],
  );

  // Reset conversation each time the panel opens; auto-send the seed question if provided.
  useEffect(() => {
    if (!open) return;
    requestIdRef.current++;
    convIdRef.current = null;
    convTitleRef.current = "New Chat";
    setMessages([makeGreeting()]);
    setInput("");
    setSending(false);
    setError(null);
    setLimitReached(false);
    void loadConversations();
    if (openToHistory) {
      setHistoryOpen(true);
    } else {
      setHistoryOpen(false);
      if (seed && seed.trim()) {
        void send(seed.trim(), []);
      } else {
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Autoscroll on new content.
  useEffect(() => {
    if (!open || historyOpen) return;
    const id = setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 40);
    return () => clearTimeout(id);
  }, [messages, sending, open, historyOpen]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (historyOpen) setHistoryOpen(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, historyOpen]);

  if (!open && !fullPage) return null;

  const canSend = input.trim().length > 0 && !sending && !limitReached;

  const chatPanel = (
    <div
      className={fullPage
        ? "flex flex-col w-full h-full overflow-hidden"
        : "flex flex-col w-full sm:w-[520px] lg:w-[640px] sm:rounded-2xl overflow-hidden shadow-2xl h-dvh sm:h-[88vh]"}
      style={{
        background: t.panel,
        border: fullPage ? "none" : `1px solid ${t.border}`,
      }}
    >
        {/* Header */}
        <div
          className="flex items-center gap-2.5 shrink-0"
          style={{
            padding: "12px 14px",
            background: "linear-gradient(120deg, #1B3A7A 0%, #0176D3 100%)",
          }}
        >
          <span
            className="flex items-center justify-center rounded-full shrink-0"
            style={{ width: 34, height: 34, background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.3)" }}
          >
            <Sparkles className="w-[17px] h-[17px]" style={{ color: "#fff" }} />
          </span>
          <div className="flex flex-col leading-none flex-1 min-w-0">
            <span className="font-bold text-white" style={{ fontSize: 14 }}>
              Sage
            </span>
            <span className="flex items-center gap-1.5" style={{ fontSize: 11, color: "rgba(255,255,255,.75)", marginTop: 4 }}>
              <span className="rounded-full" style={{ width: 6, height: 6, background: "#22c55e" }} /> Health assistant
            </span>
          </div>
          <button
            onClick={startNewChat}
            className="flex items-center justify-center rounded-lg active:scale-95"
            style={{ width: 32, height: 32, background: "rgba(255,255,255,.14)", color: "#fff" }}
            title="New chat"
            aria-label="New chat"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={openHistory}
            className="relative flex items-center justify-center rounded-lg active:scale-95"
            style={{ width: 32, height: 32, background: "rgba(255,255,255,.14)", color: "#fff" }}
            title="Past conversations"
            aria-label="Past conversations"
          >
            <History className="w-4 h-4" />
            {conversations.length > 0 && (
              <span
                className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white font-bold"
                style={{ width: 14, height: 14, fontSize: 9, background: accent, lineHeight: 1 }}
              >
                {conversations.length > 9 ? "9+" : conversations.length}
              </span>
            )}
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg active:scale-95"
            style={{ width: 32, height: 32, background: "rgba(255,255,255,.14)", color: "#fff" }}
            title="Close"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body (messages or history overlay) */}
        <div className="flex-1 relative overflow-hidden">
          {historyOpen && (
            <div className="absolute inset-0 z-10 flex flex-col" style={{ background: t.panel }}>
              <div className="flex items-center justify-between shrink-0" style={{ padding: "10px 14px", borderBottom: `1px solid ${t.border}` }}>
                <span className="text-sm font-bold" style={{ color: t.text }}>Past conversations</span>
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="flex items-center justify-center rounded-lg active:scale-95"
                  style={{ width: 28, height: 28, color: t.muted }}
                  aria-label="Close history"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto" style={{ padding: 10 }}>
                {loadingHistory && (
                  <div className="flex items-center justify-center py-6" style={{ color: t.muted }}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                )}
                {!loadingHistory && conversations.length === 0 && (
                  <p className="text-xs text-center py-6" style={{ color: t.muted }}>No past conversations yet.</p>
                )}
                {!loadingHistory &&
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => resumeConversation(conv)}
                      className="flex items-start gap-2 rounded-xl w-full text-left group active:scale-[.98] transition-transform"
                      style={{ padding: "9px 10px", marginBottom: 4, background: t.panel2, border: `1px solid ${t.border}` }}
                    >
                      <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: accent }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: t.text }}>{conv.title}</p>
                        <p className="text-[10px]" style={{ color: t.muted }}>{relativeTime(conv.updatedAt)}</p>
                      </div>
                      <span
                        onClick={(e) => deleteConversation(conv.id, e)}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        style={{ color: t.subtle }}
                        aria-label="Delete conversation"
                        role="button"
                        tabIndex={0}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div className="absolute inset-0 overflow-y-auto overflow-x-hidden" style={{ background: t.panel2, padding: "14px 12px" }}>
            <div className="flex flex-col gap-3">
              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <div
                      className="rounded-2xl break-words"
                      style={{
                        maxWidth: "82%",
                        padding: "9px 13px",
                        background: accent,
                        color: "#fff",
                        fontSize: 13.5,
                        lineHeight: 1.5,
                        borderBottomRightRadius: 6,
                      }}
                    >
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex flex-col gap-2" style={{ maxWidth: "90%" }}>
                    {m.contextSession && (
                      <p className="flex items-center gap-1" style={{ fontSize: 10.5, color: accent, paddingLeft: 2 }}>
                        <CheckCircle2 className="w-3 h-3" />
                        Retrieved {formatSessionDate(m.contextSession.testDate)} — {m.contextSession.testName}
                      </p>
                    )}
                    <div
                      className="rounded-2xl break-words"
                      style={{
                        padding: "10px 13px",
                        background: t.panel,
                        color: t.text,
                        border: `1px solid ${t.borderSoft}`,
                        fontSize: 13.5,
                        lineHeight: 1.55,
                        borderBottomLeftRadius: 6,
                      }}
                    >
                      {renderRich(m.content)}
                    </div>
                    {m.charts && m.charts.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {m.charts.map((c: DiscussChart, i: number) => (
                          <SageTrendChart key={`${m.id}-chart-${i}`} chart={c} />
                        ))}
                      </div>
                    )}
                    {m.chips && m.chips.length > 0 && !sending && (
                      <div className="flex flex-wrap gap-1.5">
                        {m.chips.slice(0, 4).map((chip, i) => (
                          <button
                            key={i}
                            onClick={() => send(chip)}
                            disabled={sending || limitReached}
                            className="rounded-full active:scale-95"
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: accent,
                              padding: "6px 12px",
                              background: t.chip,
                              border: `1px solid ${t.border}`,
                            }}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              )}

              {/* Past-conversations widget — shown only on a fresh session before any user message */}
              {messages.length === 1 && messages[0].greeting && conversations.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <p className="text-xs font-semibold" style={{ color: t.muted, paddingLeft: 2, marginBottom: 2 }}>
                    Pick up where you left off
                  </p>
                  {conversations.slice(0, 4).map((conv) => (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => resumeConversation(conv)}
                      className="flex items-center gap-2.5 rounded-xl text-left w-full active:scale-[.98] transition-transform"
                      style={{ padding: "9px 11px", background: t.panel, border: `1px solid ${t.border}` }}
                    >
                      <MessageSquare className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} />
                      <span className="flex-1 min-w-0 text-xs font-semibold truncate" style={{ color: t.text }}>
                        {conv.title}
                      </span>
                      <span className="text-[10px] shrink-0" style={{ color: t.muted }}>
                        {relativeTime(conv.updatedAt)}
                      </span>
                    </button>
                  ))}
                  {conversations.length > 4 && (
                    <button
                      type="button"
                      onClick={openHistory}
                      className="text-xs text-left"
                      style={{ color: accent, padding: "2px 11px" }}
                    >
                      View {conversations.length - 4} more…
                    </button>
                  )}
                </div>
              )}

              {sending && !streamingHasContent && (
                <div className="flex items-center gap-2" style={{ color: t.muted, fontSize: 12.5, paddingLeft: 4 }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {searchStatus ?? "Sage is thinking…"}
                  </span>
                </div>
              )}

              {error && (
                <div
                  className="rounded-xl"
                  style={{ padding: "9px 12px", background: "rgba(220,38,38,.10)", border: "1px solid rgba(220,38,38,.3)", color: "#dc2626", fontSize: 12.5 }}
                >
                  {error}
                </div>
              )}

              <div ref={endRef} />
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="shrink-0" style={{ background: t.panel, borderTop: `1px solid ${t.border}`, padding: 10 }}>
          <div
            className="flex items-center gap-2 rounded-xl"
            style={{ background: t.panel2, border: `1px solid ${t.border}`, padding: 6 }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSend) send(input);
              }}
              disabled={limitReached}
              placeholder={limitReached ? "Question limit reached" : "Message Sage…"}
              maxLength={2000}
              className="flex-1 min-w-0 bg-transparent outline-none"
              style={{ color: t.text, fontSize: 13.5, padding: "0 6px" }}
            />
            <button
              onClick={() => send(input)}
              disabled={!canSend}
              className="flex items-center justify-center rounded-lg shrink-0 active:scale-95"
              style={{
                width: 38,
                height: 38,
                background: accent,
                color: "#fff",
                opacity: canSend ? 1 : 0.5,
                cursor: canSend ? "pointer" : "default",
              }}
              title="Send"
              aria-label="Send"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-5 h-5" />}
            </button>
          </div>
          <p style={{ fontSize: 10.5, color: t.subtle, textAlign: "center", marginTop: 7 }}>
            Sage offers general information, not medical advice.
          </p>
        </div>
    </div>
  );

  if (fullPage) {
    const isEmptyChat = messages.length <= 1 && (messages.length === 0 || !!messages[0]?.greeting) && !sending;

    const SUGGESTIONS: Array<{ Icon: React.ElementType; text: string }> = [
      { Icon: Activity,     text: "Explain my latest bloodwork" },
      { Icon: FlaskConical, text: "Review my active compounds" },
      { Icon: BookMarked,   text: "Build a peptide protocol" },
    ];

    return (
      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

        {/* ── Left history sidebar (desktop only) ── */}
        <div
          className="hidden lg:flex flex-col"
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
          style={{
            width: sidebarHovered ? 240 : 52,
            flexShrink: 0,
            background: t.panel2,
            borderRight: `1px solid ${t.border}`,
            transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
            overflow: "hidden",
          }}
        >
          {/* Brand */}
          <div style={{ padding: "18px 11px 10px" }}>
            <div className="flex items-center gap-2.5" style={{ whiteSpace: "nowrap" }}>
              <span className="flex items-center justify-center rounded-full shrink-0" style={{ width: 30, height: 30, background: accent }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: "#fff" }} />
              </span>
              <span
                className="font-semibold"
                style={{ fontSize: 15, color: t.text, opacity: sidebarHovered ? 1 : 0, transition: "opacity 0.15s" }}
              >
                Sage
              </span>
            </div>
          </div>

          {/* New chat */}
          <div style={{ padding: "0 8px 2px" }}>
            <button
              onClick={startNewChat}
              className="flex items-center gap-2 w-full rounded-lg text-left"
              style={{ padding: "8px 11px", fontSize: 13.5, color: t.text, background: "transparent", transition: "background .12s", whiteSpace: "nowrap" }}
              onMouseEnter={e => (e.currentTarget.style.background = t.chip)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              title={!sidebarHovered ? "New chat" : undefined}
            >
              <SquarePen className="w-4 h-4 shrink-0" style={{ color: t.muted }} />
              <span style={{ opacity: sidebarHovered ? 1 : 0, transition: "opacity 0.15s" }}>New chat</span>
            </button>
          </div>

          {/* Search */}
          <div style={{ padding: "0 8px 8px" }}>
            <button
              className="flex items-center gap-2 w-full rounded-lg text-left"
              style={{ padding: "8px 11px", fontSize: 13.5, color: t.muted, background: "transparent", transition: "background .12s", whiteSpace: "nowrap" }}
              onMouseEnter={e => (e.currentTarget.style.background = t.chip)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              title={!sidebarHovered ? "Search chats" : undefined}
            >
              <Search className="w-4 h-4 shrink-0" />
              <span style={{ opacity: sidebarHovered ? 1 : 0, transition: "opacity 0.15s" }}>Search chats</span>
            </button>
          </div>

          <div style={{ height: 1, background: t.border, margin: "0 12px 6px" }} />

          {/* Chats list */}
          <div className="flex-1 overflow-y-auto" style={{ padding: "0 8px 8px" }}>
            {loadingHistory && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: t.muted }} />
              </div>
            )}
            {!loadingHistory && conversations.length === 0 && sidebarHovered && (
              <p style={{ fontSize: 12, color: t.subtle, textAlign: "center", padding: "16px 8px", whiteSpace: "nowrap" }}>No chats yet.</p>
            )}
            {conversations.length > 0 && sidebarHovered && (
              <p style={{ fontSize: 11, fontWeight: 600, color: t.subtle, padding: "4px 8px 6px", letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                Chats
              </p>
            )}
            {conversations.map(conv => {
              const isActive = convIdRef.current === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => resumeConversation(conv)}
                  className="flex items-center gap-1.5 w-full rounded-lg text-left group"
                  style={{ padding: "7px 11px", marginBottom: 1, color: t.text, fontSize: 13, background: isActive ? t.chip : "transparent", transition: "background .12s", whiteSpace: "nowrap" }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = t.chip; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  title={!sidebarHovered ? conv.title : undefined}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" style={{ color: t.subtle }} />
                  <span className="flex-1 min-w-0 truncate" style={{ opacity: sidebarHovered ? 1 : 0, transition: "opacity 0.15s" }}>{conv.title}</span>
                  <span
                    onClick={e => deleteConversation(conv.id, e as unknown as React.MouseEvent)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity shrink-0"
                    style={{ color: t.subtle, display: sidebarHovered ? undefined : "none" }}
                    role="button"
                    tabIndex={0}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main chat area ── */}
        <div className="flex-1 flex flex-col overflow-hidden relative" style={{ background: t.panel }}>

          {/* Mobile-only top bar */}
          <div
            className="flex lg:hidden items-center justify-between shrink-0"
            style={{ padding: "10px 16px", borderBottom: `1px solid ${t.border}` }}
          >
            <span className="font-semibold" style={{ fontSize: 15, color: t.text }}>Sage</span>
            <div className="flex items-center gap-2">
              <button onClick={startNewChat} style={{ color: t.muted }} title="New chat"><Plus className="w-5 h-5" /></button>
              <button onClick={openHistory} style={{ color: t.muted }} title="Past conversations"><History className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Mobile history overlay */}
          {historyOpen && (
            <div className="flex lg:hidden absolute inset-0 z-10 flex-col" style={{ background: t.panel }}>
              <div className="flex items-center justify-between shrink-0" style={{ padding: "10px 16px", borderBottom: `1px solid ${t.border}` }}>
                <span className="text-sm font-bold" style={{ color: t.text }}>Past conversations</span>
                <button onClick={() => setHistoryOpen(false)} style={{ color: t.muted }}><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto" style={{ padding: 10 }}>
                {loadingHistory && <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin" style={{ color: t.muted }} /></div>}
                {!loadingHistory && conversations.length === 0 && (
                  <p className="text-xs text-center py-6" style={{ color: t.muted }}>No past conversations yet.</p>
                )}
                {conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => resumeConversation(conv)}
                    className="flex items-start gap-2 rounded-xl w-full text-left group"
                    style={{ padding: "9px 10px", marginBottom: 4, background: t.panel2, border: `1px solid ${t.border}` }}
                  >
                    <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: accent }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: t.text }}>{conv.title}</p>
                      <p className="text-[10px]" style={{ color: t.muted }}>{relativeTime(conv.updatedAt)}</p>
                    </div>
                    <span
                      onClick={e => deleteConversation(conv.id, e as unknown as React.MouseEvent)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      style={{ color: t.subtle }}
                      role="button"
                      tabIndex={0}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isEmptyChat ? (
            /* ── Empty / landing state ── */
            <div className="flex-1 flex flex-col items-center justify-center pb-[calc(70px+env(safe-area-inset-bottom))] lg:pb-16" style={{ padding: "0 24px 0" }}>
              <h2 style={{ fontSize: 28, fontWeight: 600, color: t.text, marginBottom: 32, textAlign: "center", maxWidth: 520, lineHeight: 1.3 }}>
                How can I help you today?
              </h2>

              <div className="w-full" style={{ maxWidth: 680 }}>
                <div
                  className="flex items-center gap-3 rounded-2xl"
                  style={{ background: t.panel2, border: `1px solid ${t.border}`, padding: "14px 18px" }}
                >
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && canSend) send(input); }}
                    disabled={limitReached}
                    placeholder="Message Sage…"
                    maxLength={2000}
                    className="flex-1 min-w-0 bg-transparent outline-none"
                    style={{ color: t.text, fontSize: 15 }}
                  />
                  <button
                    onClick={() => send(input)}
                    disabled={!canSend}
                    className="flex items-center justify-center rounded-full shrink-0 active:scale-95"
                    style={{ width: 36, height: 36, background: canSend ? accent : t.chip, color: canSend ? "#fff" : t.subtle, cursor: canSend ? "pointer" : "default", transition: "background .15s" }}
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-[18px] h-[18px]" />}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {SUGGESTIONS.map(({ Icon, text }) => (
                    <button
                      key={text}
                      onClick={() => send(text, [])}
                      className="flex items-center gap-2 rounded-xl"
                      style={{ padding: "8px 14px", background: t.panel2, border: `1px solid ${t.border}`, fontSize: 13, color: t.muted, transition: "background .12s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = t.chip)}
                      onMouseLeave={e => (e.currentTarget.style.background = t.panel2)}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: t.subtle }} />
                      {text}
                    </button>
                  ))}
                </div>

                <p style={{ textAlign: "center", fontSize: 11.5, color: t.subtle, marginTop: 14 }}>
                  Sage offers general information, not medical advice.
                </p>
              </div>
            </div>
          ) : (
            /* ── Active chat ── */
            <>
              <div className="flex-1 relative overflow-hidden">
                <div className="absolute inset-0 overflow-y-auto" style={{ padding: "20px 0 16px" }}>
                  <div className="flex flex-col gap-5 mx-auto" style={{ maxWidth: 700, padding: "0 24px" }}>
                    {messages.filter(m => !m.greeting).map(m =>
                      m.role === "user" ? (
                        <div key={m.id} className="flex justify-end">
                          <div
                            className="rounded-2xl"
                            style={{ maxWidth: "80%", padding: "10px 16px", background: accent, color: "#fff", fontSize: 14, lineHeight: 1.6, borderBottomRightRadius: 6 }}
                          >
                            {m.content}
                          </div>
                        </div>
                      ) : (
                        <div key={m.id} className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center rounded-full shrink-0" style={{ width: 22, height: 22, background: accent }}>
                              <Sparkles className="w-3 h-3" style={{ color: "#fff" }} />
                            </span>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: t.muted }}>Sage</span>
                          </div>
                          {m.contextSession && (
                            <p className="flex items-center gap-1" style={{ fontSize: 11, color: accent, paddingLeft: 30 }}>
                              <CheckCircle2 className="w-3 h-3" />
                              Retrieved {formatSessionDate(m.contextSession.testDate)} — {m.contextSession.testName}
                            </p>
                          )}
                          {m.content && (
                            <div style={{ paddingLeft: 30, fontSize: 14, lineHeight: 1.7, color: t.text }}>
                              {renderRich(m.content)}
                            </div>
                          )}
                          {m.charts && m.charts.length > 0 && (
                            <div className="flex flex-col gap-2" style={{ paddingLeft: 30 }}>
                              {m.charts.map((c: DiscussChart, i: number) => <SageTrendChart key={`${m.id}-chart-${i}`} chart={c} />)}
                            </div>
                          )}
                          {m.chips && m.chips.length > 0 && !sending && (
                            <div className="flex flex-wrap gap-1.5" style={{ paddingLeft: 30 }}>
                              {m.chips.slice(0, 4).map((chip, ci) => (
                                <button
                                  key={ci}
                                  onClick={() => send(chip)}
                                  disabled={sending || limitReached}
                                  className="rounded-full"
                                  style={{ fontSize: 12, fontWeight: 600, color: accent, padding: "5px 12px", background: t.chip, border: `1px solid ${t.border}` }}
                                >
                                  {chip}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    )}

                    {sending && !streamingHasContent && (
                      <div className="flex items-center gap-2" style={{ color: t.muted, fontSize: 13, paddingLeft: 30 }}>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>{searchStatus ?? "Sage is thinking…"}</span>
                      </div>
                    )}

                    {error && (
                      <p style={{ paddingLeft: 30, color: "#dc2626", fontSize: 13 }}>{error}</p>
                    )}

                    <div ref={endRef} />
                  </div>
                </div>
              </div>

              {/* Sticky bottom input */}
              <div className="pb-[calc(70px+env(safe-area-inset-bottom))] lg:pb-[14px]" style={{ paddingTop: 10, paddingLeft: 24, paddingRight: 24, borderTop: `1px solid ${t.border}` }}>
                <div className="mx-auto" style={{ maxWidth: 700 }}>
                  <div
                    className="flex items-center gap-3 rounded-2xl"
                    style={{ background: t.panel2, border: `1px solid ${t.border}`, padding: "10px 16px" }}
                  >
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && canSend) send(input); }}
                      disabled={limitReached}
                      placeholder={limitReached ? "Question limit reached" : "Message Sage…"}
                      maxLength={2000}
                      className="flex-1 min-w-0 bg-transparent outline-none"
                      style={{ color: t.text, fontSize: 14 }}
                    />
                    <button
                      onClick={() => send(input)}
                      disabled={!canSend}
                      className="flex items-center justify-center rounded-full shrink-0 active:scale-95"
                      style={{ width: 34, height: 34, background: canSend ? accent : t.chip, color: canSend ? "#fff" : t.subtle, cursor: canSend ? "pointer" : "default", transition: "background .15s" }}
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-[18px] h-[18px]" />}
                    </button>
                  </div>
                  <p style={{ textAlign: "center", fontSize: 10.5, color: t.subtle, marginTop: 7 }}>
                    Sage offers general information, not medical advice.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-stretch sm:items-center sm:justify-center"
      style={{ background: "rgba(10,12,20,.55)", backdropFilter: "blur(3px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {chatPanel}
    </div>
  );
}
