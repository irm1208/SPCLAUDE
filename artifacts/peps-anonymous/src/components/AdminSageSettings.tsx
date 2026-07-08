import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Save, Bot, Send, Cpu, Info, RotateCcw } from "lucide-react";

const apiUrl = (path: string) => `/api${path}`;

interface SageSettings {
  model: string;
  fallbackModel: string;
  availableModels: string[];
}

interface ChatMessage {
  role: "user" | "bot";
  text: string;
  error?: boolean;
}

function familyOf(model: string): string {
  const m = model.toLowerCase();
  if (m.startsWith("claude")) return "Claude";
  if (m.startsWith("gpt")) return "GPT";
  if (m.startsWith("qwen") || m.startsWith("qwq")) return "Qwen";
  if (m.startsWith("glm")) return "GLM";
  if (m.startsWith("kimi")) return "Kimi";
  if (m.startsWith("deepseek")) return "DeepSeek";
  return "Other";
}

function groupModels(models: string[]): Array<{ family: string; models: string[] }> {
  const order = ["Claude", "GPT", "Qwen", "GLM", "Kimi", "DeepSeek", "Other"];
  const map = new Map<string, string[]>();
  for (const m of models) {
    const fam = familyOf(m);
    if (!map.has(fam)) map.set(fam, []);
    map.get(fam)!.push(m);
  }
  for (const list of map.values()) list.sort((a, b) => a.localeCompare(b));
  return order.filter(f => map.has(f)).map(f => ({ family: f, models: map.get(f)! }));
}

export default function AdminSageSettings({ secret }: { secret: string }) {
  const [settings, setSettings] = useState<SageSettings | null>(null);
  const [selectedModel, setSelectedModel] = useState("");
  const [testModel, setTestModel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/admin/sage-settings"), { headers: { "x-admin-secret": secret } });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json() as SageSettings;
      setSettings(data);
      setSelectedModel(data.model);
      setTestModel(data.model);
    } catch {
      setError("Failed to load Sage settings.");
    } finally {
      setLoading(false);
    }
  }, [secret]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const save = async () => {
    if (!selectedModel) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/admin/sage-settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ model: selectedModel }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json() as { model: string };
      setSettings(s => s ? { ...s, model: data.model } : s);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const sendTestMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text }]);
    setChatLoading(true);

    const history = chatMessages.map(m => ({
      role: m.role === "user" ? "user" as const : "assistant" as const,
      text: m.text,
    }));

    try {
      const res = await fetch(apiUrl("/admin/sage-settings/test"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ message: text, model: testModel, history }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      if (!res.ok || data.error) {
        setChatMessages(prev => [...prev, { role: "bot", text: data.error ?? "Request failed.", error: true }]);
      } else {
        setChatMessages(prev => [...prev, { role: "bot", text: data.reply ?? "" }]);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: "bot", text: "Network error — check the server.", error: true }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendTestMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--adm-muted)" }} />
      </div>
    );
  }

  const groups = settings ? groupModels(settings.availableModels) : [];
  const hasUnsavedChange = !!settings && selectedModel !== settings.model;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start" style={{ maxWidth: "1100px" }}>
      {/* Left column: settings */}
      <div className="flex-1 min-w-0 w-full space-y-5">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--adm-text)" }}>
            <Bot className="w-5 h-5" style={{ color: "#F24908" }} />
            Sage Health Bot Settings
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--adm-muted)" }}>
            Choose which AI model powers Sage — the health assistant used in blood test analysis and member chat.
          </p>
        </div>

        <div className="p-4 rounded-xl border space-y-4" style={{ background: "var(--adm-btn)", borderColor: "var(--adm-border)" }}>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--adm-muted)" }}>Active model</label>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="w-full h-9 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-orange-400/50"
              style={{ background: "var(--adm-content)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
            >
              {groups.map(g => (
                <optgroup key={g.family} label={g.family}>
                  {g.models.map(m => <option key={m} value={m}>{m}</option>)}
                </optgroup>
              ))}
            </select>
            <p className="text-[11px]" style={{ color: "var(--adm-muted)" }}>
              {settings?.availableModels.length ?? 0} models available.
            </p>
          </div>

          <p className="text-xs flex items-start gap-1.5" style={{ color: "var(--adm-muted)" }}>
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Fallback model when the active model runs out of tokens: <code>{settings?.fallbackModel}</code>
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={save}
              disabled={saving || !hasUnsavedChange}
              className="flex items-center gap-2 px-5 h-9 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              style={{ background: saved ? "#16a34a" : "#F24908" }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saved ? "Saved" : "Save model"}
            </button>
            {hasUnsavedChange && !saving && (
              <span className="text-xs" style={{ color: "var(--adm-muted)" }}>Unsaved change</span>
            )}
            {settings && !hasUnsavedChange && (
              <span className="text-xs" style={{ color: "var(--adm-muted)" }}>
                Currently live: <span className="font-mono">{settings.model}</span>
              </span>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>

      {/* Right column: test chat */}
      <div className="w-full lg:w-[380px] shrink-0 rounded-xl border flex flex-col" style={{ background: "var(--adm-btn)", borderColor: "var(--adm-border)", height: "560px" }}>
        <div className="px-4 py-3 border-b space-y-2" style={{ borderColor: "var(--adm-border)" }}>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4" style={{ color: "#F24908" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Test chat</span>
            {chatMessages.length > 0 && (
              <button
                onClick={() => setChatMessages([])}
                className="ml-auto flex items-center gap-1 text-[11px] font-semibold"
                style={{ color: "var(--adm-muted)" }}
                title="Clear conversation"
              >
                <RotateCcw className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          <select
            value={testModel}
            onChange={e => setTestModel(e.target.value)}
            className="w-full h-8 rounded-lg px-2 text-xs outline-none focus:ring-2 focus:ring-orange-400/50"
            style={{ background: "var(--adm-content)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
          >
            {groups.map(g => (
              <optgroup key={g.family} label={g.family}>
                {g.models.map(m => <option key={m} value={m}>{m}</option>)}
              </optgroup>
            ))}
          </select>
          <p className="text-[11px]" style={{ color: "var(--adm-muted)" }}>
            Testing calls this model directly (no fallback), independent of the saved setting.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {chatMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
              <Bot className="w-7 h-7" style={{ color: "var(--adm-muted)" }} />
              <p className="text-xs" style={{ color: "var(--adm-muted)" }}>Send a message to test Sage with the selected model.</p>
            </div>
          )}
          {chatMessages.map((m, i) => (
            <div key={i} className="flex" style={{ justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div
                className="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed"
                style={{
                  background: m.error ? "rgba(239,68,68,0.1)" : m.role === "user" ? "rgba(242,73,8,0.12)" : "rgba(0,0,0,0.04)",
                  border: m.error ? "1px solid rgba(239,68,68,0.4)" : undefined,
                  color: m.error ? "#dc2626" : "var(--adm-text)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.text}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="rounded-xl px-3 py-2" style={{ background: "rgba(0,0,0,0.04)" }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--adm-muted)" }} />
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        <div className="p-3 border-t flex items-end gap-2" style={{ borderColor: "var(--adm-border)" }}>
          <textarea
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={handleChatKey}
            placeholder="Ask Sage something…"
            rows={1}
            className="flex-1 resize-none rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-400/50"
            style={{ background: "var(--adm-content)", border: "1px solid var(--adm-border)", color: "var(--adm-text)", maxHeight: "80px" }}
          />
          <button
            onClick={sendTestMessage}
            disabled={chatLoading || !chatInput.trim()}
            className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg text-white disabled:opacity-40"
            style={{ background: "#F24908" }}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
