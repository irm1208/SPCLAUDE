import React, { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Save, RotateCcw, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Eye, EyeOff, MessageSquare, Bold, Italic, Underline, Code, Strikethrough, Link, Smile, Bot } from "lucide-react";

// ─── Emoji Picker ─────────────────────────────────────────────────────────────

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: "Common", emojis: ["✅","❌","⚠️","📦","🚚","💰","🔔","🎉","🌟","🔥","💎","🙌","👋","👤","📋","📬","✏️","🗑️","🛒","🧪","🔬","🌍","🎫","❓","🔍","💳","🔒","🔓","📣","📊","🆕","⚙️","📝","💬","🤝","📈","⏳","🚀","🏆","✨"] },
  { label: "People", emojis: ["😊","😎","🙂","😅","🤔","😮","🥳","🫡","💪","🙏","👍","👎","🫶","❤️","💙","💚","💛","🧡","💜","🤍","🤎"] },
  { label: "Objects", emojis: ["📱","💻","🖥️","⌚","📷","🎥","🎙️","📞","📧","📅","📌","🗂️","🗃️","🧾","🏷️","🔑","🔐","💊","🧬","🔭","🧲","⚡","🌡️","💉","🩺","🩻"] },
  { label: "Symbols", emojis: ["✔️","🔴","🟡","🟢","🔵","⭕","🚫","⛔","♻️","🔁","🔄","⬆️","⬇️","➡️","⬅️","🔗","📎","✂️","🖊️","🖋️","#️⃣","*️⃣","0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"] },
];

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
  onClose: () => void;
}

function EmojiPicker({ onPick, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeGroup, setActiveGroup] = useState(0);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 rounded-xl shadow-2xl border overflow-hidden"
      style={{
        background: "var(--adm-bg)",
        borderColor: "var(--adm-border)",
        width: 280,
        bottom: "calc(100% + 6px)",
        left: 0,
      }}
    >
      {/* Group tabs */}
      <div className="flex border-b" style={{ borderColor: "var(--adm-border)" }}>
        {EMOJI_GROUPS.map((g, i) => (
          <button
            key={g.label}
            onClick={() => setActiveGroup(i)}
            className="flex-1 text-[10px] py-1.5 font-semibold transition-colors"
            style={{
              color: activeGroup === i ? "#F24908" : "var(--adm-muted)",
              borderBottom: activeGroup === i ? "2px solid #F24908" : "2px solid transparent",
            }}
          >
            {g.label}
          </button>
        ))}
      </div>
      {/* Emoji grid */}
      <div className="p-2 grid grid-cols-8 gap-0.5 max-h-40 overflow-y-auto">
        {EMOJI_GROUPS[activeGroup]?.emojis.map(emoji => (
          <button
            key={emoji}
            onClick={() => { onPick(emoji); }}
            className="text-lg p-1 rounded hover:bg-white/10 transition-colors leading-none"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

function apiUrl(path: string) { return `/api${path}`; }

interface TemplateEvent {
  eventKey: string;
  label: string;
  audience: "customer" | "admin" | "organiser";
  prefKey: string | null;
  description: string;
  placeholders: string[];
  defaultTemplate: string;
  template: string;
  enabled: boolean;
  isCustomized: boolean;
}

interface TemplateCardState {
  draft: string;
  enabled: boolean;
  saving: boolean;
  resetting: boolean;
  savedMsg: string;
  errorMsg: string;
  expanded: boolean;
  preview: boolean;
}

const EXAMPLE_VARS: Record<string, string> = {
  code:           "PA-1042",
  username:       "johndoe",
  date:           "14 Apr 2026",
  order_total:    "84.50",
  items:          "BPC-157 5mg × 2\nTB-500 2mg × 1",
  total_qty:      "3",
  delivery:       "Royal Mail Tracked 48",
  tip:            "2.00",
  payment_status: "Paid",
  gb_context:     "\nGB: Spring Run\nOrganiser: @pepsadmin",
  gb_lines:       "\nGB: Spring Run\nOrganiser: @pepsadmin",
  app_url:        "https://saltandpeps.co.uk",
  emoji:          "🔄",
  status:         "Processing",
  tracking_line:  "\nTracking: GB123456789GB",
  tracking:       "GB123456789GB",
  delivery_fee:   "3.95",
  tip_line:       "\nTip: $2.00",
  orders_summary: "3 orders deleted",
  orders_list:    "#PA-1042 @johndoe\n#PA-1043 @janedoe\n#PA-1044 @bobsmith",
  gb_name:        "Spring Run",
  organiser:      "@pepsadmin",
  old_status:     "Draft",
  new_status:     "Active",
};

function renderPreview(template: string): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => EXAMPLE_VARS[key] ?? `[${key}]`);
}

// ─── Formatting toolbar helpers ───────────────────────────────────────────────

type FormatTag = "b" | "i" | "u" | "s" | "code" | "pre";

/**
 * Wrap or unwrap the selected text in a textarea with an HTML tag.
 * Returns the updated string and the new cursor positions.
 */
function applyTag(
  value: string,
  selStart: number,
  selEnd: number,
  tag: FormatTag,
): { next: string; nextStart: number; nextEnd: number } {
  const open  = `<${tag}>`;
  const close = `</${tag}>`;
  const selected = value.slice(selStart, selEnd);

  // Detect if the selection is already wrapped — if so, unwrap
  if (
    value.slice(selStart - open.length, selStart) === open &&
    value.slice(selEnd, selEnd + close.length) === close
  ) {
    const next =
      value.slice(0, selStart - open.length) +
      selected +
      value.slice(selEnd + close.length);
    return {
      next,
      nextStart: selStart - open.length,
      nextEnd: selEnd - open.length,
    };
  }

  // Wrap selection
  const next = value.slice(0, selStart) + open + selected + close + value.slice(selEnd);
  return {
    next,
    nextStart: selStart + open.length,
    nextEnd: selEnd + open.length,
  };
}

interface FmtButtonProps {
  label: string;
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function FmtButton({ label, title, icon, onClick }: FmtButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex items-center gap-0.5 px-2 py-1 rounded text-[10px] font-semibold transition-all hover:brightness-110 active:scale-95 select-none"
      style={{
        background: "var(--adm-content)",
        border: "1px solid var(--adm-border)",
        color: "var(--adm-text)",
      }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ─── TemplateCard ─────────────────────────────────────────────────────────────

function TemplateCard({
  event,
  secret,
  onSaved,
}: {
  event: TemplateEvent;
  secret: string;
  onSaved: (updated: TemplateEvent) => void;
}) {
  const [state, setState] = useState<TemplateCardState>({
    draft: event.template,
    enabled: event.enabled,
    saving: false,
    resetting: false,
    savedMsg: "",
    errorMsg: "",
    expanded: false,
    preview: false,
  });
  const [showEmoji, setShowEmoji] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDirty =
    state.draft !== event.template || state.enabled !== event.enabled;

  const save = useCallback(async () => {
    setState(s => ({ ...s, saving: true, savedMsg: "", errorMsg: "" }));
    try {
      const res = await fetch(apiUrl(`/admin/telegram-templates/${event.eventKey}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ template: state.draft, enabled: state.enabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState(s => ({ ...s, saving: false, errorMsg: data.error ?? "Save failed" }));
        return;
      }
      onSaved(data as TemplateEvent);
      setState(s => ({ ...s, saving: false, savedMsg: "Saved ✓" }));
      setTimeout(() => setState(s => ({ ...s, savedMsg: "" })), 2500);
    } catch {
      setState(s => ({ ...s, saving: false, errorMsg: "Network error" }));
    }
  }, [event.eventKey, secret, state.draft, state.enabled, onSaved]);

  const reset = useCallback(async () => {
    setState(s => ({ ...s, resetting: true, savedMsg: "", errorMsg: "" }));
    try {
      const res = await fetch(apiUrl(`/admin/telegram-templates/${event.eventKey}`), {
        method: "DELETE",
        headers: { "x-admin-secret": secret },
      });
      const data = await res.json();
      if (!res.ok) {
        setState(s => ({ ...s, resetting: false, errorMsg: data.error ?? "Reset failed" }));
        return;
      }
      onSaved(data as TemplateEvent);
      setState(s => ({
        ...s,
        resetting: false,
        draft: (data as TemplateEvent).defaultTemplate,
        enabled: true,
        savedMsg: "Reset to default ✓",
      }));
      setTimeout(() => setState(s => ({ ...s, savedMsg: "" })), 2500);
    } catch {
      setState(s => ({ ...s, resetting: false, errorMsg: "Network error" }));
    }
  }, [event.eventKey, secret, onSaved]);

  const chipClick = (placeholder: string) => {
    const el = textareaRef.current;
    const token = `{{${placeholder}}}`;
    if (el) {
      const start = el.selectionStart ?? state.draft.length;
      const end   = el.selectionEnd   ?? state.draft.length;
      const next  = state.draft.slice(0, start) + token + state.draft.slice(end);
      setState(s => ({ ...s, draft: next }));
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + token.length, start + token.length);
      });
    } else {
      setState(s => ({ ...s, draft: s.draft + token }));
    }
  };

  // Insert emoji at cursor position
  const insertEmoji = useCallback((emoji: string) => {
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart ?? state.draft.length;
      const end   = el.selectionEnd   ?? state.draft.length;
      const next  = state.draft.slice(0, start) + emoji + state.draft.slice(end);
      setState(s => ({ ...s, draft: next }));
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + emoji.length, start + emoji.length);
      });
    } else {
      setState(s => ({ ...s, draft: s.draft + emoji }));
    }
    setShowEmoji(false);
  }, [state.draft]);

  // Apply a format tag to the current textarea selection
  const applyFormat = useCallback((tag: FormatTag) => {
    const el = textareaRef.current;
    if (!el) return;
    const selStart = el.selectionStart ?? 0;
    const selEnd   = el.selectionEnd   ?? 0;
    const { next, nextStart, nextEnd } = applyTag(state.draft, selStart, selEnd, tag);
    setState(s => ({ ...s, draft: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextStart, nextEnd);
    });
  }, [state.draft]);

  // Keyboard shortcut handler: Ctrl/Cmd + B/I/U
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;
    if (e.key === "b" || e.key === "B") { e.preventDefault(); applyFormat("b"); }
    if (e.key === "i" || e.key === "I") { e.preventDefault(); applyFormat("i"); }
    if (e.key === "u" || e.key === "U") { e.preventDefault(); applyFormat("u"); }
  }, [applyFormat]);

  return (
    <div
      className="rounded-xl border transition-all"
      style={{
        background: "var(--adm-btn)",
        borderColor: state.enabled ? "var(--adm-border)" : "rgba(239,68,68,0.3)",
      }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setState(s => ({ ...s, expanded: !s.expanded }))}
      >
        <button
          className="shrink-0"
          onClick={e => {
            e.stopPropagation();
            setState(s => ({ ...s, enabled: !s.enabled }));
          }}
          title={state.enabled ? "Disable this notification" : "Enable this notification"}
        >
          {state.enabled
            ? <ToggleRight className="w-5 h-5" style={{ color: "#22c55e" }} />
            : <ToggleLeft className="w-5 h-5" style={{ color: "var(--adm-muted)" }} />}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: "var(--adm-text)" }}>
            {event.label}
          </p>
          <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--adm-muted)" }}>
            {event.description}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {event.isCustomized && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: "rgba(242,73,8,0.15)", color: "#F24908" }}
            >
              CUSTOM
            </span>
          )}
          {!state.enabled && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}
            >
              OFF
            </span>
          )}
          {state.expanded
            ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--adm-muted)" }} />
            : <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--adm-muted)" }} />}
        </div>
      </div>

      {/* Expanded body */}
      {state.expanded && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--adm-border)" }}>
          {/* Placeholders */}
          {event.placeholders.length > 0 && (
            <div className="pt-3">
              <p className="text-[10px] font-semibold mb-1.5" style={{ color: "var(--adm-muted)" }}>
                Available placeholders — click to insert at cursor
              </p>
              <div className="flex flex-wrap gap-1">
                {event.placeholders.map(ph => (
                  <button
                    key={ph}
                    onClick={() => chipClick(ph)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md transition-colors hover:brightness-110 active:scale-95"
                    style={{
                      background: "var(--adm-content)",
                      border: "1px solid var(--adm-border)",
                      color: "#F24908",
                    }}
                  >
                    {`{{${ph}}}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Editor / preview toggle */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold" style={{ color: "var(--adm-muted)" }}>
                Template (HTML supported)
              </p>
              <button
                className="flex items-center gap-1 text-[10px]"
                style={{ color: "var(--adm-muted)" }}
                onClick={() => setState(s => ({ ...s, preview: !s.preview }))}
              >
                {state.preview
                  ? <><EyeOff className="w-3 h-3" /> Edit</>
                  : <><Eye className="w-3 h-3" /> Preview</>}
              </button>
            </div>

            {state.preview ? (
              <div className="space-y-1">
                <p className="text-[9px]" style={{ color: "var(--adm-muted)" }}>
                  Rendered with example values — formatting shown as it will appear in Telegram
                </p>
                <div
                  className="w-full min-h-[120px] rounded-lg p-3 text-[12px] leading-relaxed"
                  style={{
                    background: "var(--adm-content)",
                    border: "1px solid var(--adm-border)",
                    color: "var(--adm-text)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                  dangerouslySetInnerHTML={{
                    __html: renderPreview(state.draft) || '<span style="opacity:0.4">Empty template</span>',
                  }}
                />
              </div>
            ) : (
              <div className="space-y-1">
                {/* Formatting toolbar */}
                <div className="flex flex-wrap items-center gap-1 pb-1">
                  <FmtButton
                    label="Bold"
                    title="Bold — Ctrl+B / ⌘B"
                    icon={<Bold className="w-3 h-3" />}
                    onClick={() => applyFormat("b")}
                  />
                  <FmtButton
                    label="Italic"
                    title="Italic — Ctrl+I / ⌘I"
                    icon={<Italic className="w-3 h-3" />}
                    onClick={() => applyFormat("i")}
                  />
                  <FmtButton
                    label="Underline"
                    title="Underline — Ctrl+U / ⌘U"
                    icon={<Underline className="w-3 h-3" />}
                    onClick={() => applyFormat("u")}
                  />
                  <FmtButton
                    label="Strike"
                    title="Strikethrough"
                    icon={<Strikethrough className="w-3 h-3" />}
                    onClick={() => applyFormat("s")}
                  />
                  <FmtButton
                    label="Code"
                    title="Inline code"
                    icon={<Code className="w-3 h-3" />}
                    onClick={() => applyFormat("code")}
                  />
                  <FmtButton
                    label="Pre"
                    title="Code block (pre)"
                    icon={<Link className="w-3 h-3" />}
                    onClick={() => applyFormat("pre")}
                  />
                  {/* Emoji picker button */}
                  <div className="relative">
                    <FmtButton
                      label="Emoji"
                      title="Insert emoji"
                      icon={<Smile className="w-3 h-3" />}
                      onClick={() => setShowEmoji(v => !v)}
                    />
                    {showEmoji && (
                      <EmojiPicker
                        onPick={insertEmoji}
                        onClose={() => setShowEmoji(false)}
                      />
                    )}
                  </div>
                  <span className="text-[9px] ml-1" style={{ color: "var(--adm-muted)" }}>
                    Select text then click, or use Ctrl+B / I / U
                  </span>
                </div>

                <textarea
                  ref={textareaRef}
                  value={state.draft}
                  onChange={e => setState(s => ({ ...s, draft: e.target.value }))}
                  onKeyDown={handleKeyDown}
                  rows={6}
                  className="w-full rounded-lg px-3 py-2.5 font-mono text-[11px] leading-relaxed resize-y outline-none focus:ring-2 focus:ring-orange-400/40 transition-all"
                  style={{
                    background: "var(--adm-content)",
                    border: "1px solid var(--adm-border)",
                    color: "var(--adm-text)",
                  }}
                  placeholder="Enter notification template…"
                  spellCheck={false}
                />
                <p className="text-right text-[9px]" style={{ color: "var(--adm-muted)" }}>
                  {state.draft.length} chars
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={state.saving || state.resetting || !isDirty}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "#F24908", color: "#fff" }}
            >
              {state.saving
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Save className="w-3 h-3" />}
              Save
            </button>

            {event.isCustomized && (
              <button
                onClick={reset}
                disabled={state.saving || state.resetting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
                style={{
                  background: "var(--adm-content)",
                  border: "1px solid var(--adm-border)",
                  color: "var(--adm-muted)",
                }}
              >
                {state.resetting
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <RotateCcw className="w-3 h-3" />}
                Reset to default
              </button>
            )}

            {state.savedMsg && (
              <span className="text-xs font-medium" style={{ color: "#22c55e" }}>
                {state.savedMsg}
              </span>
            )}
            {state.errorMsg && (
              <span className="text-xs font-medium" style={{ color: "#ef4444" }}>
                {state.errorMsg}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminTelegramTemplates({ secret }: { secret: string }) {
  const [events, setEvents] = useState<TemplateEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/admin/telegram-templates"), {
        headers: { "x-admin-secret": secret },
      });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setEvents(data as TemplateEvent[]);
    } catch {
      setError("Failed to load templates. Check your connection.");
    }
    setLoading(false);
  }, [secret]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = useCallback((updated: TemplateEvent) => {
    setEvents(prev =>
      prev.map(e => e.eventKey === updated.eventKey ? { ...e, ...updated } : e)
    );
  }, []);

  const customerEvents  = events.filter(e => e.audience === "customer");
  const adminEvents     = events.filter(e => e.audience === "admin");
  const organiserEvents = events.filter(e => e.audience === "organiser");
  const reshipperEvents = events.filter(e => (e.audience as string) === "reshipper");
  const botEvents       = events.filter(e => (e.audience as string) === "bot");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--adm-muted)" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={load}
          className="mt-2 text-xs underline"
          style={{ color: "var(--adm-muted)" }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold" style={{ color: "var(--adm-text)" }}>
          Telegram Notification Templates
        </h2>
        <p className="text-xs mt-1" style={{ color: "var(--adm-muted)" }}>
          Customise the text of every Telegram notification. Use{" "}
          <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: "var(--adm-content)", color: "#F24908" }}>
            {"{{placeholder}}"}
          </code>{" "}
          tokens to insert dynamic values. Select text and use the toolbar (or Ctrl+B / I / U) to add formatting. Disable any event to suppress it entirely.
        </p>
      </div>

      {/* Customer notifications */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4" style={{ color: "#F24908" }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--adm-text)" }}>
            Customer Notifications
          </h3>
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{ background: "var(--adm-content)", color: "var(--adm-muted)" }}
          >
            {customerEvents.length}
          </span>
        </div>
        {customerEvents.map(e => (
          <TemplateCard key={e.eventKey} event={e} secret={secret} onSaved={handleSaved} />
        ))}
      </section>

      {/* Admin notifications */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4" style={{ color: "#6366f1" }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--adm-text)" }}>
            Admin Notifications
          </h3>
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{ background: "var(--adm-content)", color: "var(--adm-muted)" }}
          >
            {adminEvents.length}
          </span>
        </div>
        {adminEvents.map(e => (
          <TemplateCard key={e.eventKey} event={e} secret={secret} onSaved={handleSaved} />
        ))}
      </section>

      {/* Organiser notifications */}
      {organiserEvents.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4" style={{ color: "#f59e0b" }} />
            <h3 className="text-sm font-bold" style={{ color: "var(--adm-text)" }}>
              Organiser Notifications
            </h3>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: "var(--adm-content)", color: "var(--adm-muted)" }}
            >
              {organiserEvents.length}
            </span>
          </div>
          {organiserEvents.map(e => (
            <TemplateCard key={e.eventKey} event={e} secret={secret} onSaved={handleSaved} />
          ))}
        </section>
      )}

      {/* Reshipper notifications */}
      {reshipperEvents.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4" style={{ color: "#10b981" }} />
            <h3 className="text-sm font-bold" style={{ color: "var(--adm-text)" }}>
              Reshipper Notifications
            </h3>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: "var(--adm-content)", color: "var(--adm-muted)" }}
            >
              {reshipperEvents.length}
            </span>
          </div>
          {reshipperEvents.map(e => (
            <TemplateCard key={e.eventKey} event={e} secret={secret} onSaved={handleSaved} />
          ))}
        </section>
      )}

      {/* Bot interactive messages */}
      {botEvents.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-4 h-4" style={{ color: "#a78bfa" }} />
            <h3 className="text-sm font-bold" style={{ color: "var(--adm-text)" }}>
              Bot Messages
            </h3>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: "var(--adm-content)", color: "var(--adm-muted)" }}
            >
              {botEvents.length}
            </span>
          </div>
          <p className="text-[10px] mb-2" style={{ color: "var(--adm-muted)" }}>
            The interactive messages the bot sends in response to commands and menu taps — e.g. the welcome screen, main menu header, and lab report search prompts.
          </p>
          {botEvents.map(e => (
            <TemplateCard key={e.eventKey} event={e} secret={secret} onSaved={handleSaved} />
          ))}
        </section>
      )}
    </div>
  );
}
