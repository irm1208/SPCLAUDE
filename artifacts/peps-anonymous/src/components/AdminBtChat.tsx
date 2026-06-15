import { useState, useEffect, useCallback } from "react";
import { Loader2, Search, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, MessageSquare, User, Bot, X } from "lucide-react";

const FLAG_KEYWORDS = [
  "api key", "api_key", "apikey",
  "gemini", "openai", "gpt", "chatgpt",
  "claude", "anthropic",
  "llm", "large language model",
  "what model", "which model", "what ai",
  "your model", "your ai", "are you ai",
  "are you an ai", "what are you",
];

function hasFlaggedContent(content: string): boolean {
  const lower = content.toLowerCase();
  return FLAG_KEYWORDS.some(kw => lower.includes(kw));
}

function highlightFlagged(text: string): React.ReactNode {
  const lower = text.toLowerCase();
  let result: React.ReactNode[] = [];
  let pos = 0;

  const matches: Array<{ start: number; end: number }> = [];
  for (const kw of FLAG_KEYWORDS) {
    let searchFrom = 0;
    while (true) {
      const idx = lower.indexOf(kw, searchFrom);
      if (idx === -1) break;
      matches.push({ start: idx, end: idx + kw.length });
      searchFrom = idx + 1;
    }
  }
  matches.sort((a, b) => a.start - b.start);

  const merged: Array<{ start: number; end: number }> = [];
  for (const m of matches) {
    if (merged.length && m.start < merged[merged.length - 1].end) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, m.end);
    } else {
      merged.push({ ...m });
    }
  }

  for (const m of merged) {
    if (pos < m.start) result.push(text.slice(pos, m.start));
    result.push(
      <mark key={`${m.start}-${m.end}`} className="bg-amber-200 text-amber-900 rounded px-0.5">
        {text.slice(m.start, m.end)}
      </mark>
    );
    pos = m.end;
  }
  if (pos < text.length) result.push(text.slice(pos));
  return result.length ? <>{result}</> : text;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  telegramUsername: string;
  title: string;
  messages: ChatMessage[];
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  conversations: Conversation[];
  total: number;
  page: number;
  limit: number;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function ConversationRow({ conv, secret }: { conv: Conversation; secret: string }) {
  const [expanded, setExpanded] = useState(false);
  const flaggedMsgCount = conv.messages.filter(m => m.role === "user" && hasFlaggedContent(m.content)).length;
  const isFlagged = flaggedMsgCount > 0;

  return (
    <div
      className="rounded-xl border overflow-hidden transition-shadow"
      style={{
        borderColor: isFlagged ? "#f59e0b" : "var(--adm-border)",
        background: isFlagged ? "rgba(251,191,36,0.04)" : "var(--adm-card)",
        boxShadow: isFlagged ? "0 0 0 1px rgba(245,158,11,0.3)" : undefined,
      }}
    >
      <button
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-black/5 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--adm-accent)" }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate" style={{ color: "var(--adm-text)" }}>
              {conv.title}
            </span>
            {isFlagged && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                <AlertTriangle className="w-2.5 h-2.5" />
                {flaggedMsgCount} flagged
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs font-mono" style={{ color: "var(--adm-accent)" }}>@{conv.telegramUsername}</span>
            <span className="text-[11px]" style={{ color: "var(--adm-muted)" }}>·</span>
            <span className="text-[11px]" style={{ color: "var(--adm-muted)" }}>{conv.messageCount} messages</span>
            <span className="text-[11px]" style={{ color: "var(--adm-muted)" }}>·</span>
            <span className="text-[11px]" style={{ color: "var(--adm-muted)" }}>{fmtDate(conv.updatedAt)}</span>
          </div>
        </div>
        <div className="flex-shrink-0 mt-0.5" style={{ color: "var(--adm-muted)" }}>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: "var(--adm-border)" }}>
          {conv.messages.length === 0 && (
            <p className="text-xs text-center py-4" style={{ color: "var(--adm-muted)" }}>No messages</p>
          )}
          {conv.messages.map(msg => {
            const isUser = msg.role === "user";
            const flagged = isUser && hasFlaggedContent(msg.content);
            return (
              <div
                key={msg.id}
                className="flex gap-2"
                style={{ flexDirection: isUser ? "row" : "row-reverse" }}
              >
                <div
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: isUser ? "var(--adm-accent)" : "rgba(0,0,0,0.08)" }}
                >
                  {isUser
                    ? <User className="w-3 h-3 text-white" />
                    : <Bot className="w-3 h-3" style={{ color: "var(--adm-muted)" }} />
                  }
                </div>
                <div className="flex flex-col max-w-[85%]" style={{ alignItems: isUser ? "flex-start" : "flex-end" }}>
                  <div
                    className="rounded-xl px-3 py-2 text-xs leading-relaxed"
                    style={{
                      background: flagged
                        ? "rgba(251,191,36,0.15)"
                        : isUser
                          ? "var(--adm-accent-soft, rgba(99,102,241,0.08))"
                          : "rgba(0,0,0,0.04)",
                      border: flagged ? "1px solid rgba(245,158,11,0.4)" : undefined,
                      color: "var(--adm-text)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {flagged ? highlightFlagged(msg.content) : msg.content}
                  </div>
                  <span className="text-[10px] mt-0.5 px-1" style={{ color: "var(--adm-muted)" }}>
                    {fmtDate(msg.timestamp)}
                    {flagged && (
                      <span className="ml-1 text-amber-600 font-semibold">⚑ flagged</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminBtChat({ secret }: { secret: string }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const LIMIT = 30;

  const load = useCallback(async (q: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/bt-conversations?${params}`, {
        headers: { "x-admin-secret": secret },
        credentials: "omit",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ApiResponse = await res.json();
      setData(json);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [secret]);

  useEffect(() => { load(query, page); }, []);

  const handleSearch = () => { setPage(1); load(query, 1); };

  const displayConvs = data
    ? showFlaggedOnly
      ? data.conversations.filter(c => c.messages.some(m => m.role === "user" && hasFlaggedContent(m.content)))
      : data.conversations
    : [];

  const totalFlagged = data
    ? data.conversations.filter(c => c.messages.some(m => m.role === "user" && hasFlaggedContent(m.content))).length
    : 0;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <MessageSquare className="w-5 h-5" style={{ color: "var(--adm-accent)" }} />
        <span className="text-base font-bold" style={{ color: "var(--adm-text)" }}>Blood Test Chat Logs</span>
        {totalFlagged > 0 && (
          <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3 h-3" />
            {totalFlagged} with flagged messages
          </span>
        )}
      </div>

      <p className="text-xs" style={{ color: "var(--adm-muted)" }}>
        Messages from users asking about AI models, API keys, or similar are highlighted in amber.
        Flagged keywords: api key, gemini, openai, gpt, claude, anthropic, llm, chatgpt.
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--adm-muted)" }} />
          <input
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border text-sm"
            style={{ borderColor: "var(--adm-border)", background: "var(--adm-card)", color: "var(--adm-text)" }}
            placeholder="Search username or title…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
          {query && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => { setQuery(""); setPage(1); load("", 1); }}
            >
              <X className="w-3 h-3" style={{ color: "var(--adm-muted)" }} />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold text-white"
          style={{ background: "var(--adm-accent)" }}
        >
          <Search className="w-3 h-3" />
          Search
        </button>
        <button
          onClick={() => { setPage(1); load(query, 1); }}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold border"
          style={{ borderColor: "var(--adm-border)", color: "var(--adm-text)", background: "var(--adm-card)" }}
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
        <button
          onClick={() => setShowFlaggedOnly(v => !v)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold border transition-colors"
          style={{
            borderColor: showFlaggedOnly ? "#f59e0b" : "var(--adm-border)",
            background: showFlaggedOnly ? "rgba(251,191,36,0.1)" : "var(--adm-card)",
            color: showFlaggedOnly ? "#b45309" : "var(--adm-text)",
          }}
        >
          <AlertTriangle className="w-3 h-3" />
          {showFlaggedOnly ? "Show all" : "Flagged only"}
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--adm-accent)" }} />
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          Failed to load: {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="text-xs" style={{ color: "var(--adm-muted)" }}>
            {showFlaggedOnly
              ? `Showing ${displayConvs.length} flagged conversation${displayConvs.length !== 1 ? "s" : ""}`
              : `${data.total} conversation${data.total !== 1 ? "s" : ""} total — page ${data.page} of ${Math.ceil(data.total / LIMIT)}`
            }
          </div>

          {displayConvs.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2" style={{ color: "var(--adm-muted)" }}>
              <MessageSquare className="w-7 h-7 opacity-30" />
              <p className="text-sm">{showFlaggedOnly ? "No flagged conversations" : "No conversations found"}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayConvs.map(conv => (
                <ConversationRow key={conv.id} conv={conv} secret={secret} />
              ))}
            </div>
          )}

          {!showFlaggedOnly && data.total > LIMIT && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                disabled={page <= 1}
                onClick={() => { const p = page - 1; setPage(p); load(query, p); }}
                className="text-xs px-3 py-1.5 rounded-lg border disabled:opacity-40"
                style={{ borderColor: "var(--adm-border)", color: "var(--adm-text)", background: "var(--adm-card)" }}
              >
                ← Prev
              </button>
              <span className="text-xs" style={{ color: "var(--adm-muted)" }}>
                {page} / {Math.ceil(data.total / LIMIT)}
              </span>
              <button
                disabled={page >= Math.ceil(data.total / LIMIT)}
                onClick={() => { const p = page + 1; setPage(p); load(query, p); }}
                className="text-xs px-3 py-1.5 rounded-lg border disabled:opacity-40"
                style={{ borderColor: "var(--adm-border)", color: "var(--adm-text)", background: "var(--adm-card)" }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
