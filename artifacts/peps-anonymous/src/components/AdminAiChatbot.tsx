import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Save, Bot, ToggleLeft, ToggleRight, Info, Send, Trash2, FlaskConical, Plus, ChevronDown, ChevronUp, GripVertical, X, RotateCcw, SlidersHorizontal } from "lucide-react";

const apiUrl = (path: string) => `/api${path}`;

interface AiChatConfig {
  enabled: boolean;
  transcript: string;
  messageLimit: number;
  contactHandle: string;
}

interface ChatMessage {
  role: "user" | "bot";
  text: string;
  error?: boolean;
}

const SECTION_TYPES = [
  { key: "faq",      label: "FAQs",               placeholder: "Q: How long does shipping take?\nA: Usually 3–5 business days within the UK.\n\nQ: Can I track my order?\nA: Yes, tracking is provided once dispatched." },
  { key: "products", label: "Product Info",        placeholder: "BPC-157 10mg — promotes healing, joint repair.\nTB-500 5mg — tissue repair and recovery.\nSemaglutide 5mg — GLP-1 for weight management." },
  { key: "shipping", label: "Shipping & Delivery", placeholder: "UK standard shipping: 3–5 days.\nInternational: 7–14 days depending on country.\nAll orders are shipped in plain, discreet packaging." },
  { key: "payment",  label: "Payment Info",        placeholder: "We accept USDT (TRC20 & ERC20), Revolut, and AnonPay.\nPayment must be confirmed before dispatch.\nContact us if you have issues completing payment." },
  { key: "policy",   label: "Policies & Rules",    placeholder: "All sales are final. No returns on opened products.\nOrders are for research purposes only.\nCustomers must be 18+ to purchase." },
  { key: "custom",   label: "Custom Section",      placeholder: "Add any other knowledge here…" },
];

const BEHAVIOUR_PLACEHOLDER = `Describe the bot's tone and how it should handle questions. Examples:

Tone: Be friendly, concise, and professional. Avoid being overly formal. Write like a helpful team member, not a corporate bot.

Handling uncertain questions: If you don't know the answer, say so clearly and tell the customer to contact support — never guess or make up details.

Sensitive topics: Never comment on the legality of products. If asked, say "Our products are sold for research purposes only" and move on.

Complaints: Acknowledge the issue, apologise briefly, and direct them to contact support for resolution. Don't make promises about refunds or replacements.

Niche rules: Only recommend products that are listed in the Product Info section. Do not suggest dosages or medical advice under any circumstances.`;

interface Section {
  id: string;
  type: string;
  label: string;
  content: string;
  collapsed: boolean;
}

interface TranscriptPayload {
  behaviour?: string;
  sections: Array<{ id: string; type: string; label: string; content: string }>;
}

function parsePayload(transcript: string): { behaviour: string; sections: Section[] } {
  try {
    const parsed = JSON.parse(transcript) as TranscriptPayload;
    if (parsed && typeof parsed === "object" && "sections" in parsed) {
      return {
        behaviour: parsed.behaviour ?? "",
        sections: (parsed.sections ?? []).map((s) => ({ ...s, collapsed: false })),
      };
    }
    // Legacy format: array of sections (no behaviour field)
    if (Array.isArray(parsed) && parsed.length > 0 && "type" in parsed[0]) {
      return {
        behaviour: "",
        sections: parsed.map((s: Section) => ({ ...s, collapsed: false })),
      };
    }
  } catch { /* fall through */ }
  if (transcript.trim()) {
    return {
      behaviour: "",
      sections: [{ id: "legacy", type: "custom", label: "Knowledge Base", content: transcript, collapsed: false }],
    };
  }
  return { behaviour: "", sections: [] };
}

function buildTranscript(behaviour: string, sections: Section[]): string {
  const payload: TranscriptPayload = {
    behaviour,
    sections: sections.map(({ id, type, label, content }) => ({ id, type, label, content })),
  };
  return JSON.stringify(payload);
}

function flattenForAi(transcript: string): string {
  try {
    const parsed = JSON.parse(transcript) as TranscriptPayload;
    if (parsed && typeof parsed === "object" && "sections" in parsed) {
      const parts: string[] = [];
      if (parsed.behaviour?.trim()) {
        parts.push(`=== Bot Behaviour & Tone ===\n${parsed.behaviour}`);
      }
      for (const s of parsed.sections ?? []) {
        parts.push(`=== ${s.label} ===\n${s.content}`);
      }
      return parts.join("\n\n");
    }
    if (Array.isArray(parsed) && parsed.length > 0 && "type" in parsed[0]) {
      return parsed.map((s: Section) => `=== ${s.label} ===\n${s.content}`).join("\n\n");
    }
  } catch { /* fall through */ }
  return transcript;
}

function newSection(type: string): Section {
  const meta = SECTION_TYPES.find((t) => t.key === type) ?? SECTION_TYPES[SECTION_TYPES.length - 1];
  return { id: `${type}-${Date.now()}`, type, label: meta.label, content: "", collapsed: false };
}

export default function AdminAiChatbot({ secret }: { secret: string }) {
  const [config, setConfig] = useState<AiChatConfig>({
    enabled: false,
    transcript: "",
    messageLimit: 15,
    contactHandle: "@urbanblend789",
  });
  const [behaviour, setBehaviour] = useState("");
  const [sections, setSections]   = useState<Section[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState("");
  const [addingType, setAddingType]     = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Test chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput]       = useState("");
  const [chatLoading, setChatLoading]   = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/admin/ai-chatbot/config"), {
        headers: { "x-admin-secret": secret },
      });
      if (res.ok) {
        const data = await res.json() as AiChatConfig;
        setConfig(data);
        const { behaviour: b, sections: s } = parsePayload(data.transcript);
        setBehaviour(b);
        setSections(s);
      }
    } catch {
      setError("Failed to load config.");
    } finally {
      setLoading(false);
    }
  }, [secret]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const currentTranscript = buildTranscript(behaviour, sections);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/admin/ai-chatbot/config"), {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ ...config, transcript: currentTranscript }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setBehaviour("");
    setSections([]);
    setConfirmReset(false);
    setSaving(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/admin/ai-chatbot/config"), {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ ...config, transcript: buildTranscript("", []) }),
      });
      if (!res.ok) throw new Error("Reset failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Reset failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const sendTestMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text }]);
    setChatLoading(true);

    const history = chatMessages.map((m) => ({
      role: m.role === "user" ? "user" as const : "model" as const,
      text: m.text,
    }));

    try {
      const res = await fetch(apiUrl("/admin/ai-chatbot/test"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          message: text,
          transcript: flattenForAi(currentTranscript),
          contactHandle: config.contactHandle,
          history,
        }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      if (!res.ok || data.error) {
        setChatMessages((prev) => [...prev, { role: "bot", text: data.error ?? "Request failed.", error: true }]);
      } else {
        setChatMessages((prev) => [...prev, { role: "bot", text: data.reply ?? "" }]);
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: "bot", text: "Network error — check the server.", error: true }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendTestMessage(); }
  };

  const updateSection  = (id: string, patch: Partial<Section>) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeSection  = (id: string) =>
    setSections((prev) => prev.filter((s) => s.id !== id));
  const addSection     = (type: string) => { setSections((prev) => [...prev, newSection(type)]); setAddingType(false); };

  const totalChars = behaviour.length + sections.reduce((n, s) => n + s.content.length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--adm-muted)" }} />
      </div>
    );
  }

  return (
    <div className="flex gap-6 items-start" style={{ maxWidth: "1100px" }}>

      {/* ── Left column: settings ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-5">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--adm-text)" }}>
            <Bot className="w-5 h-5" style={{ color: "#F24908" }} />
            AI Chatbot
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--adm-muted)" }}>
            When enabled, the bot answers customer questions with AI before routing to support tickets.
          </p>
        </div>

        {/* Enable toggle */}
        <div
          className="flex items-center justify-between p-4 rounded-xl border"
          style={{ background: "var(--adm-btn)", borderColor: "var(--adm-border)" }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Enable AI chatbot</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--adm-muted)" }}>
              {config.enabled ? "Bot is responding to messages with AI" : "Bot uses guided ticket flow only"}
            </p>
          </div>
          <button onClick={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))} className="transition-transform active:scale-95">
            {config.enabled
              ? <ToggleRight className="w-8 h-8" style={{ color: "#F24908" }} />
              : <ToggleLeft  className="w-8 h-8" style={{ color: "var(--adm-muted)" }} />}
          </button>
        </div>

        {/* Message limit + contact handle */}
        <div
          className="p-4 rounded-xl border space-y-4"
          style={{ background: "var(--adm-btn)", borderColor: "var(--adm-border)" }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--adm-muted)" }}>
                Message limit (per 24 hours)
              </label>
              <input
                type="number" min={1} max={100}
                value={config.messageLimit}
                onChange={(e) => setConfig((c) => ({ ...c, messageLimit: Math.max(1, parseInt(e.target.value) || 15) }))}
                className="w-full h-9 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-orange-400/50"
                style={{ background: "var(--adm-content)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--adm-muted)" }}>
                Contact handle (shown at limit)
              </label>
              <input
                type="text" placeholder="@username"
                value={config.contactHandle}
                onChange={(e) => setConfig((c) => ({ ...c, contactHandle: e.target.value }))}
                className="w-full h-9 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-orange-400/50"
                style={{ background: "var(--adm-content)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
              />
            </div>
          </div>
          <p className="text-xs flex items-start gap-1.5" style={{ color: "var(--adm-muted)" }}>
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            After {config.messageLimit} messages the bot says: "Please contact {config.contactHandle || "@handle"} for further help."
          </p>
        </div>

        {/* ── Bot Behaviour & Tone (pinned, always visible) ── */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "#6366f1", background: "var(--adm-btn)" }}
        >
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid #6366f120", background: "#6366f108" }}>
            <SlidersHorizontal className="w-4 h-4 shrink-0" style={{ color: "#6366f1" }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Bot Behaviour &amp; Tone</p>
              <p className="text-xs" style={{ color: "var(--adm-muted)" }}>
                Tell the bot how to communicate — tone, style, how to handle tricky or niche questions. This is read before everything else.
              </p>
            </div>
            <span className="text-xs shrink-0" style={{ color: "var(--adm-faint)" }}>
              {behaviour.length > 0 ? `${behaviour.length.toLocaleString()} chars` : "empty"}
            </span>
          </div>
          <div className="p-3">
            <textarea
              value={behaviour}
              onChange={(e) => setBehaviour(e.target.value)}
              placeholder={BEHAVIOUR_PLACEHOLDER}
              rows={10}
              className="w-full rounded-lg px-3 py-2.5 text-xs font-mono outline-none focus:ring-2 resize-y"
              style={{
                background: "var(--adm-content)",
                border: "1px solid #6366f140",
                color: "var(--adm-text)",
                lineHeight: "1.6",
              }}
            />
          </div>
        </div>

        {/* ── Knowledge base sections ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Knowledge base</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--adm-muted)" }}>
                Each section trains the bot on a different topic. The more you fill in, the better the answers.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: "var(--adm-faint)" }}>
                {totalChars.toLocaleString()} chars
                {totalChars > 50000 && <span className="text-yellow-500 ml-1">⚠ large</span>}
              </span>
              {/* Reset button */}
              {confirmReset ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs" style={{ color: "var(--adm-muted)" }}>Clear everything?</span>
                  <button
                    onClick={handleReset}
                    className="px-2 py-1 rounded-md text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
                  >
                    Yes, reset
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="px-2 py-1 rounded-md text-xs font-semibold border transition-colors"
                    style={{ borderColor: "var(--adm-border)", color: "var(--adm-muted)" }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all hover:bg-red-500/10 hover:border-red-400/30 hover:text-red-400"
                  style={{ borderColor: "var(--adm-border)", color: "var(--adm-muted)" }}
                  title="Clear all sections and behaviour"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset all
                </button>
              )}
            </div>
          </div>

          {sections.length === 0 && (
            <div
              className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-10 gap-2"
              style={{ borderColor: "var(--adm-border)" }}
            >
              <Bot className="w-7 h-7" style={{ color: "var(--adm-faint)" }} />
              <p className="text-sm" style={{ color: "var(--adm-muted)" }}>No sections yet — add one below to start training the bot.</p>
            </div>
          )}

          {sections.map((section) => {
            const meta = SECTION_TYPES.find((t) => t.key === section.type) ?? SECTION_TYPES[SECTION_TYPES.length - 1];
            return (
              <div
                key={section.id}
                className="rounded-xl border overflow-hidden"
                style={{ background: "var(--adm-btn)", borderColor: "var(--adm-border)" }}
              >
                <div
                  className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none"
                  style={{ borderBottom: section.collapsed ? "none" : "1px solid var(--adm-border)" }}
                  onClick={() => updateSection(section.id, { collapsed: !section.collapsed })}
                >
                  <GripVertical className="w-4 h-4 shrink-0" style={{ color: "var(--adm-faint)" }} />
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-md" style={{ background: "#F24908", color: "#fff" }}>
                      {meta.label}
                    </span>
                    <input
                      type="text"
                      value={section.label}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateSection(section.id, { label: e.target.value })}
                      className="flex-1 min-w-0 bg-transparent text-sm font-medium outline-none border-b border-transparent focus:border-current"
                      style={{ color: "var(--adm-text)" }}
                    />
                    <span className="text-xs shrink-0" style={{ color: "var(--adm-faint)" }}>
                      {section.content.length > 0 ? `${section.content.length.toLocaleString()} chars` : "empty"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                      className="p-1 rounded hover:bg-red-500/10 transition-colors"
                      title="Remove section"
                    >
                      <X className="w-3.5 h-3.5 text-red-400" />
                    </button>
                    {section.collapsed
                      ? <ChevronDown className="w-4 h-4" style={{ color: "var(--adm-muted)" }} />
                      : <ChevronUp   className="w-4 h-4" style={{ color: "var(--adm-muted)" }} />}
                  </div>
                </div>

                {!section.collapsed && (
                  <div className="p-3">
                    <textarea
                      value={section.content}
                      onChange={(e) => updateSection(section.id, { content: e.target.value })}
                      placeholder={meta.placeholder}
                      rows={8}
                      className="w-full rounded-lg px-3 py-2.5 text-xs font-mono outline-none focus:ring-2 focus:ring-orange-400/50 resize-y"
                      style={{
                        background: "var(--adm-content)",
                        border: "1px solid var(--adm-border)",
                        color: "var(--adm-text)",
                        lineHeight: "1.6",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Add section */}
          {addingType ? (
            <div
              className="rounded-xl border p-3"
              style={{ background: "var(--adm-btn)", borderColor: "var(--adm-border)" }}
            >
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--adm-muted)" }}>Choose a section type</p>
              <div className="flex flex-wrap gap-2">
                {SECTION_TYPES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => addSection(t.key)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:brightness-95"
                    style={{ background: "var(--adm-content)", borderColor: "var(--adm-border)", color: "var(--adm-text)" }}
                  >
                    {t.label}
                  </button>
                ))}
                <button
                  onClick={() => setAddingType(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:bg-red-500/10"
                  style={{ borderColor: "var(--adm-border)", color: "var(--adm-muted)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingType(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed text-sm font-semibold transition-all hover:brightness-95"
              style={{ borderColor: "var(--adm-border)", color: "var(--adm-muted)" }}
            >
              <Plus className="w-4 h-4" />
              Add section
            </button>
          )}
        </div>

        {/* Save */}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 h-10 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          style={{ background: saved ? "#16a34a" : "#F24908" }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved!" : "Save settings"}
        </button>
      </div>

      {/* ── Right column: test chat ────────────────────────────────────────── */}
      <div
        className="w-80 shrink-0 rounded-2xl border flex flex-col overflow-hidden"
        style={{
          background: "var(--adm-chat-card)",
          borderColor: "var(--adm-border)",
          height: "620px",
          position: "sticky",
          top: "1.5rem",
          boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{ borderColor: "var(--adm-border)", background: "var(--adm-chat-card)" }}
        >
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4" style={{ color: "#F24908" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Test chat</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--adm-muted)" }}>uses current draft</span>
            {chatMessages.length > 0 && (
              <button
                onClick={() => setChatMessages([])}
                className="p-1 rounded hover:bg-red-500/10 transition-colors"
                title="Clear chat"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
          style={{ background: "var(--adm-chat-area)" }}
        >
          {chatMessages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-4">
              <Bot className="w-8 h-8" style={{ color: "var(--adm-faint)" }} />
              <p className="text-xs" style={{ color: "var(--adm-muted)" }}>
                Type a question to test how the AI responds using your behaviour instructions and knowledge base.
              </p>
              <p className="text-xs" style={{ color: "var(--adm-faint)" }}>
                No need to save first — changes are reflected immediately.
              </p>
            </div>
          )}

          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[90%] rounded-2xl px-3 py-2 text-xs leading-relaxed"
                style={
                  msg.role === "user"
                    ? { background: "#F24908", color: "#fff", borderBottomRightRadius: "4px" }
                    : {
                        background: msg.error ? "rgba(239,68,68,0.12)" : "var(--adm-chat-bot-bubble)",
                        color: msg.error ? "#f87171" : "var(--adm-text)",
                        border: `1px solid ${msg.error ? "rgba(239,68,68,0.25)" : "var(--adm-chat-bot-border)"}`,
                        borderBottomLeftRadius: "4px",
                        boxShadow: msg.error ? "none" : "0 1px 3px rgba(0,0,0,0.08)",
                      }
                }
              >
                {msg.text}
              </div>
            </div>
          ))}

          {chatLoading && (
            <div className="flex justify-start">
              <div
                className="rounded-2xl px-3 py-2.5 flex items-center gap-1.5"
                style={{
                  background: "var(--adm-chat-bot-bubble)",
                  border: "1px solid var(--adm-chat-bot-border)",
                  borderBottomLeftRadius: "4px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--adm-muted)", animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--adm-muted)", animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--adm-muted)", animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input */}
        <div
          className="px-3 py-3 border-t flex gap-2 shrink-0"
          style={{ borderColor: "var(--adm-border)", background: "var(--adm-chat-card)" }}
        >
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleChatKey}
            placeholder="Ask something a customer might ask…"
            rows={2}
            disabled={chatLoading}
            className="flex-1 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-400/50 resize-none"
            style={{
              background: "var(--adm-chat-input)",
              border: "1px solid var(--adm-border)",
              color: "var(--adm-text)",
              lineHeight: "1.5",
            }}
          />
          <button
            onClick={sendTestMessage}
            disabled={chatLoading || !chatInput.trim()}
            className="self-end w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
            style={{ background: "#F24908" }}
          >
            {chatLoading
              ? <Loader2 className="w-4 h-4 text-white animate-spin" />
              : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>

    </div>
  );
}
