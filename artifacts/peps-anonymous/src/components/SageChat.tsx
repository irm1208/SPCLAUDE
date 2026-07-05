import React, { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, ArrowUp, X, Loader2 } from "lucide-react";
import { useBloodTestDiscuss } from "@/hooks/use-blood-tests";

const ACCENT = "#0176D3";

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

interface SageMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  chips?: string[];
  greeting?: boolean;
}

interface SageChatProps {
  open: boolean;
  onClose: () => void;
  /** A question to auto-send when the panel opens. */
  seed?: string;
  /** Theme tokens (from the dashboard palette). */
  t: Tokens;
  accent?: string;
}

const GREETING =
  "Hi, I'm Sage. Ask me anything about your compounds, bloodwork, or protocols and I'll help you make sense of it.";

/** Lightweight renderer: preserves line breaks, bullet lists and **bold** without a markdown dependency. */
function renderRich(text: string): React.ReactNode {
  const lines = text.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={`ul-${key++}`} style={{ margin: "4px 0", paddingLeft: 18, listStyle: "disc" }}>
        {bullets.map((b, i) => (
          <li key={i} style={{ marginBottom: 2 }}>
            {renderInline(b)}
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const bulletMatch = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bulletMatch) {
      bullets.push(bulletMatch[1]);
      continue;
    }
    flushBullets();
    if (line.trim().length === 0) {
      blocks.push(<div key={`sp-${key++}`} style={{ height: 6 }} />);
    } else {
      blocks.push(
        <p key={`p-${key++}`} style={{ margin: 0 }}>
          {renderInline(line)}
        </p>,
      );
    }
  }
  flushBullets();
  return blocks;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} style={{ fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export function SageChat({ open, onClose, seed, t, accent = ACCENT }: SageChatProps) {
  const discuss = useBloodTestDiscuss();
  const [messages, setMessages] = useState<SageMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const idRef = useRef(0);
  const nextId = () => ++idRef.current;
  const messagesRef = useRef<SageMessage[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const send = useCallback(
    async (text: string, historyOverride?: { role: "user" | "assistant"; content: string }[]) => {
      const q = text.trim();
      if (!q || sending || limitReached) return;

      const userMsg: SageMessage = { id: nextId(), role: "user", content: q };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setSending(true);
      setError(null);

      const history =
        historyOverride ??
        messagesRef.current
          .filter((m) => !m.greeting)
          .slice(-8)
          .map((m) => ({ role: m.role, content: m.content }));

      try {
        const res = await discuss.mutateAsync({ message: q, history });
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "assistant", content: res.response, chips: res.chips ?? [] },
        ]);
      } catch (e) {
        const err = e as Error & { used?: number; limit?: number };
        if (err.message === "limit_reached") {
          setLimitReached(true);
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              content: "You've reached your question limit for now. Please check back a little later.",
            },
          ]);
        } else {
          setError("Sage couldn't respond just now. Please try again in a moment.");
        }
      } finally {
        setSending(false);
      }
    },
    [sending, limitReached, discuss],
  );

  // Reset conversation each time the panel opens; auto-send the seed question if provided.
  useEffect(() => {
    if (!open) return;
    const greeting: SageMessage = { id: nextId(), role: "assistant", content: GREETING, greeting: true };
    setMessages([greeting]);
    setInput("");
    setError(null);
    setLimitReached(false);
    if (seed && seed.trim()) {
      void send(seed.trim(), []);
    } else {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Autoscroll on new content.
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 40);
    return () => clearTimeout(id);
  }, [messages, sending, open]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canSend = input.trim().length > 0 && !sending && !limitReached;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-stretch sm:items-center sm:justify-center"
      style={{ background: "rgba(10,12,20,.55)", backdropFilter: "blur(3px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex flex-col w-full sm:w-[460px] sm:rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: t.panel,
          border: `1px solid ${t.border}`,
          height: "100dvh",
          maxHeight: "100dvh",
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
            onClick={onClose}
            className="flex items-center justify-center rounded-lg active:scale-95"
            style={{ width: 32, height: 32, background: "rgba(255,255,255,.14)", color: "#fff" }}
            title="Close"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ background: t.panel2, padding: "14px 12px" }}>
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

            {sending && (
              <div className="flex items-center gap-2" style={{ color: t.muted, fontSize: 12.5, paddingLeft: 4 }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Sage is thinking…
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
    </div>
  );
}
