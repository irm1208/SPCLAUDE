import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Save, Bot, Send, Cpu, Info, RotateCcw, KeyRound, Eye, EyeOff, Trash2, AlertTriangle, Plus, X, Globe, FileText } from "lucide-react";

const apiUrl = (path: string) => `/api${path}`;

const LOCAL_AUTH_TOKEN_KEY = "sagePlaygroundAuthToken";
const LOCAL_BASE_URL_KEY = "sagePlaygroundBaseUrl";

interface SageSettings {
  model: string;
  fallbackModel: string;
  availableModels: string[];
  customModels: string[];
  webSearchEnabled: boolean;
  serverKeyConfigured: boolean;
  systemPromptTemplate: string;
  defaultSystemPromptTemplate: string;
  isSystemPromptCustomised: boolean;
}

interface ChatMessage {
  role: "user" | "bot";
  text: string;
  error?: boolean;
  endpoint?: string; // which proxy was used, shown as a label on bot replies
}

const PROXY_PRESETS = [
  { label: "nuoda", url: "https://api.nuoda.vip", color: "#2563eb" },
  { label: "zhihuiai", url: "https://cn.zhihuiai.top", color: "#7c3aed" },
] as const;

function familyOf(model: string): string {
  const m = model.toLowerCase();
  if (m.startsWith("gpt")) return "GPT";
  if (m.startsWith("qwen") || m.startsWith("qwq")) return "Qwen";
  if (m.startsWith("glm")) return "GLM";
  if (m.startsWith("kimi")) return "Kimi";
  if (m.startsWith("deepseek")) return "DeepSeek";
  return "Other";
}

function groupModels(models: string[], customModels: string[] = []): Array<{ family: string; models: string[] }> {
  const order = ["GPT", "Qwen", "GLM", "Kimi", "DeepSeek", "Custom", "Other"];
  const customSet = new Set(customModels);
  const map = new Map<string, string[]>();
  for (const m of models) {
    const fam = customSet.has(m) ? "Custom" : familyOf(m);
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

  const [customModelInput, setCustomModelInput] = useState("");
  const [addingModel, setAddingModel] = useState(false);
  const [customModelError, setCustomModelError] = useState("");
  const [removingModel, setRemovingModel] = useState<string | null>(null);

  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [webSearchSaving, setWebSearchSaving] = useState(false);
  const [webSearchError, setWebSearchError] = useState("");

  const [promptDraft, setPromptDraft] = useState("");
  const [promptSaving, setPromptSaving] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);
  const [promptResetting, setPromptResetting] = useState(false);
  const [promptError, setPromptError] = useState("");
  const [showDefaultPrompt, setShowDefaultPrompt] = useState(false);

  // Which proxy endpoint to use for test chat (null = use saved proxyBaseUrl / server default)
  const [testEndpoint, setTestEndpoint] = useState<string | null>(null);

  // Personal proxy credentials — stored only in this browser's localStorage, never sent
  // to the server except as part of this admin's own test-chat requests below.
  const [authToken, setAuthToken] = useState("");
  const [proxyBaseUrl, setProxyBaseUrl] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [credsSaved, setCredsSaved] = useState(false);
  const hasLocalCreds = !!(authToken.trim() || proxyBaseUrl.trim());

  useEffect(() => {
    try {
      setAuthToken(localStorage.getItem(LOCAL_AUTH_TOKEN_KEY) ?? "");
      setProxyBaseUrl(localStorage.getItem(LOCAL_BASE_URL_KEY) ?? "");
    } catch {
      // localStorage unavailable — ignore, fields just start empty
    }
  }, []);

  const saveLocalCreds = () => {
    try {
      if (authToken.trim()) localStorage.setItem(LOCAL_AUTH_TOKEN_KEY, authToken.trim());
      else localStorage.removeItem(LOCAL_AUTH_TOKEN_KEY);
      if (proxyBaseUrl.trim()) localStorage.setItem(LOCAL_BASE_URL_KEY, proxyBaseUrl.trim());
      else localStorage.removeItem(LOCAL_BASE_URL_KEY);
      setCredsSaved(true);
      setTimeout(() => setCredsSaved(false), 2000);
    } catch {
      // ignore
    }
  };

  const clearLocalCreds = () => {
    setAuthToken("");
    setProxyBaseUrl("");
    try {
      localStorage.removeItem(LOCAL_AUTH_TOKEN_KEY);
      localStorage.removeItem(LOCAL_BASE_URL_KEY);
    } catch {
      // ignore
    }
  };

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
      setWebSearchEnabled(data.webSearchEnabled);
      setPromptDraft(data.systemPromptTemplate);
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

  const addCustomModel = async () => {
    const name = customModelInput.trim();
    if (!name || addingModel) return;
    setAddingModel(true);
    setCustomModelError("");
    try {
      const res = await fetch(apiUrl("/admin/sage-settings/models"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ model: name }),
      });
      const data = await res.json() as { customModels?: string[]; availableModels?: string[]; error?: string };
      if (!res.ok || data.error) {
        setCustomModelError(data.error ?? "Failed to add model.");
        return;
      }
      setSettings(s => s ? { ...s, customModels: data.customModels ?? s.customModels, availableModels: data.availableModels ?? s.availableModels } : s);
      setCustomModelInput("");
    } catch {
      setCustomModelError("Network error — please try again.");
    } finally {
      setAddingModel(false);
    }
  };

  const removeCustomModel = async (model: string) => {
    if (removingModel) return;
    setRemovingModel(model);
    setCustomModelError("");
    try {
      const res = await fetch(apiUrl(`/admin/sage-settings/models/${encodeURIComponent(model)}`), {
        method: "DELETE",
        headers: { "x-admin-secret": secret },
      });
      const data = await res.json() as { customModels?: string[]; availableModels?: string[]; error?: string };
      if (!res.ok || data.error) {
        setCustomModelError(data.error ?? "Failed to remove model.");
        return;
      }
      setSettings(s => s ? { ...s, customModels: data.customModels ?? s.customModels, availableModels: data.availableModels ?? s.availableModels } : s);
      // If the removed model was selected locally but not yet saved, fall back to the saved active model.
      setSelectedModel(sel => (sel === model && settings) ? settings.model : sel);
      setTestModel(tm => (tm === model && settings) ? settings.model : tm);
    } catch {
      setCustomModelError("Network error — please try again.");
    } finally {
      setRemovingModel(null);
    }
  };

  const toggleWebSearch = async () => {
    if (webSearchSaving) return;
    const next = !webSearchEnabled;
    setWebSearchSaving(true);
    setWebSearchError("");
    try {
      const res = await fetch(apiUrl("/admin/sage-settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ webSearchEnabled: next }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json() as { webSearchEnabled: boolean };
      setWebSearchEnabled(data.webSearchEnabled);
      setSettings(s => s ? { ...s, webSearchEnabled: data.webSearchEnabled } : s);
    } catch {
      setWebSearchError("Failed to save. Please try again.");
    } finally {
      setWebSearchSaving(false);
    }
  };

  const savePrompt = async () => {
    if (promptSaving) return;
    const trimmed = promptDraft.trim();
    if (!trimmed) {
      setPromptError("Prompt cannot be empty.");
      return;
    }
    if (!trimmed.includes("{{HEALTH_DATA}}")) {
      setPromptError('Prompt must include the "{{HEALTH_DATA}}" placeholder so Sage can see the member\'s blood test data.');
      return;
    }
    setPromptSaving(true);
    setPromptError("");
    try {
      const res = await fetch(apiUrl("/admin/sage-settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ systemPromptTemplate: promptDraft }),
      });
      const data = await res.json() as { systemPromptTemplate?: string; isSystemPromptCustomised?: boolean; error?: string };
      if (!res.ok || data.error) {
        setPromptError(data.error ?? "Failed to save prompt.");
        return;
      }
      setSettings(s => s ? {
        ...s,
        systemPromptTemplate: data.systemPromptTemplate ?? s.systemPromptTemplate,
        isSystemPromptCustomised: data.isSystemPromptCustomised ?? s.isSystemPromptCustomised,
      } : s);
      if (data.systemPromptTemplate) setPromptDraft(data.systemPromptTemplate);
      setPromptSaved(true);
      setTimeout(() => setPromptSaved(false), 2500);
    } catch {
      setPromptError("Network error — please try again.");
    } finally {
      setPromptSaving(false);
    }
  };

  const resetPrompt = async () => {
    if (promptResetting) return;
    if (!window.confirm("Reset Sage's system prompt back to the default? Your customisations will be lost.")) return;
    setPromptResetting(true);
    setPromptError("");
    try {
      const res = await fetch(apiUrl("/admin/sage-settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ resetSystemPromptToDefault: true }),
      });
      const data = await res.json() as { systemPromptTemplate?: string; isSystemPromptCustomised?: boolean; error?: string };
      if (!res.ok || data.error) {
        setPromptError(data.error ?? "Failed to reset prompt.");
        return;
      }
      setSettings(s => s ? {
        ...s,
        systemPromptTemplate: data.systemPromptTemplate ?? s.systemPromptTemplate,
        isSystemPromptCustomised: data.isSystemPromptCustomised ?? false,
      } : s);
      if (data.systemPromptTemplate) setPromptDraft(data.systemPromptTemplate);
    } catch {
      setPromptError("Network error — please try again.");
    } finally {
      setPromptResetting(false);
    }
  };

  const handleCustomModelKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomModel();
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

    // testEndpoint overrides proxyBaseUrl when set via the preset buttons
    const effectiveBaseUrl = testEndpoint ?? (proxyBaseUrl.trim() || undefined);
    const presetLabel = PROXY_PRESETS.find(p => p.url === testEndpoint)?.label;

    try {
      const res = await fetch(apiUrl("/admin/sage-settings/test"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          message: text,
          model: testModel,
          history,
          ...(authToken.trim() ? { authToken: authToken.trim() } : {}),
          ...(effectiveBaseUrl ? { baseUrl: effectiveBaseUrl } : {}),
        }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      if (!res.ok || data.error) {
        setChatMessages(prev => [...prev, { role: "bot", text: data.error ?? "Request failed.", error: true, endpoint: presetLabel }]);
      } else {
        setChatMessages(prev => [...prev, { role: "bot", text: data.reply ?? "", endpoint: presetLabel }]);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: "bot", text: "Network error — check the server.", error: true, endpoint: presetLabel }]);
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

  const groups = settings ? groupModels(settings.availableModels, settings.customModels) : [];
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

        <div className="p-4 rounded-xl border space-y-3" style={{ background: "var(--adm-btn)", borderColor: "var(--adm-border)" }}>
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--adm-text)" }}>
              <Plus className="w-4 h-4" style={{ color: "#F24908" }} />
              Add a custom model
            </h3>
            <p className="text-[11px] mt-1" style={{ color: "var(--adm-muted)" }}>
              Not seeing a model your proxy supports? Add its exact model ID here — it'll show up in the
              dropdowns above under "Custom" without needing a code change.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customModelInput}
              onChange={e => { setCustomModelInput(e.target.value); if (customModelError) setCustomModelError(""); }}
              onKeyDown={handleCustomModelKey}
              placeholder="e.g. gpt-5.5"
              autoComplete="off"
              className="flex-1 h-9 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-orange-400/50 font-mono"
              style={{ background: "var(--adm-content)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
            />
            <button
              onClick={addCustomModel}
              disabled={addingModel || !customModelInput.trim()}
              className="flex items-center gap-1.5 px-4 h-9 rounded-lg text-sm font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 shrink-0"
              style={{ background: "#F24908" }}
            >
              {addingModel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add
            </button>
          </div>

          {customModelError && <p className="text-sm text-red-400">{customModelError}</p>}

          {!!settings?.customModels.length && (
            <div className="flex flex-wrap gap-2 pt-1">
              {settings.customModels.map(m => (
                <span
                  key={m}
                  className="flex items-center gap-1.5 pl-2.5 pr-1.5 h-7 rounded-full text-xs font-mono"
                  style={{ background: "var(--adm-content)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
                >
                  {m}
                  <button
                    onClick={() => removeCustomModel(m)}
                    disabled={removingModel === m}
                    title={`Remove ${m}`}
                    className="flex items-center justify-center w-4 h-4 rounded-full disabled:opacity-50"
                    style={{ color: "var(--adm-muted)" }}
                  >
                    {removingModel === m ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 rounded-xl border space-y-3" style={{ background: "var(--adm-btn)", borderColor: "var(--adm-border)" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--adm-text)" }}>
                <Globe className="w-4 h-4" style={{ color: "#F24908" }} />
                Real-time web search
              </h3>
              <p className="text-[11px] mt-1" style={{ color: "var(--adm-muted)" }}>
                When on, Sage looks up current info (news, research, prices, availability) for questions that
                need it before replying, and cites the sources it found. Off by default it only knows what's in
                its training data.
              </p>
            </div>
            <button
              onClick={toggleWebSearch}
              disabled={webSearchSaving}
              role="switch"
              aria-checked={webSearchEnabled}
              title={webSearchEnabled ? "Turn off web search" : "Turn on web search"}
              className="relative shrink-0 w-10 h-6 rounded-full transition-colors disabled:opacity-50"
              style={{ background: webSearchEnabled ? "#F24908" : "var(--adm-content)", border: "1px solid var(--adm-border)" }}
            >
              <span
                className="absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all shadow"
                style={{ left: webSearchEnabled ? "18px" : "2px" }}
              />
            </button>
          </div>
          {webSearchError && <p className="text-sm text-red-400">{webSearchError}</p>}
        </div>

        <div className="p-4 rounded-xl border space-y-3" style={{ background: "var(--adm-btn)", borderColor: "var(--adm-border)" }}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--adm-text)" }}>
                <FileText className="w-4 h-4" style={{ color: "#F24908" }} />
                Sage's system prompt
              </h3>
              <p className="text-[11px] mt-1" style={{ color: "var(--adm-muted)" }}>
                This is Sage's full persona, rules, and knowledge base — edit and fine-tune it directly. Keep the{" "}
                <code>{"{{HEALTH_DATA}}"}</code> placeholder — that's where the member's blood test data gets
                inserted. <code>{"{{CHARTABLE_MARKERS}}"}</code> is optional (controls which markers Sage can chart).
              </p>
            </div>
            <span
              className="shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full"
              style={{
                color: settings?.isSystemPromptCustomised ? "#F24908" : "var(--adm-muted)",
                background: settings?.isSystemPromptCustomised ? "rgba(242,73,8,0.12)" : "var(--adm-content)",
                border: "1px solid var(--adm-border)",
              }}
            >
              {settings?.isSystemPromptCustomised ? "Customised" : "Default"}
            </span>
          </div>

          <textarea
            value={promptDraft}
            onChange={e => { setPromptDraft(e.target.value); if (promptError) setPromptError(""); }}
            rows={14}
            spellCheck={false}
            className="w-full rounded-lg px-3 py-2.5 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-orange-400/50 font-mono resize-y"
            style={{ background: "var(--adm-content)", border: "1px solid var(--adm-border)", color: "var(--adm-text)", minHeight: "220px" }}
          />

          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-[11px]" style={{ color: promptDraft.length > 40000 ? "#dc2626" : "var(--adm-muted)" }}>
              {promptDraft.length.toLocaleString()} / 40,000 characters
            </p>
            <button
              onClick={() => setShowDefaultPrompt(v => !v)}
              className="text-[11px] font-semibold"
              style={{ color: "var(--adm-muted)" }}
            >
              {showDefaultPrompt ? "Hide default prompt" : "View default prompt"}
            </button>
          </div>

          {showDefaultPrompt && settings && (
            <pre
              className="text-[11px] leading-relaxed whitespace-pre-wrap rounded-lg p-3 max-h-64 overflow-y-auto font-mono"
              style={{ background: "var(--adm-content)", border: "1px solid var(--adm-border)", color: "var(--adm-muted)" }}
            >
              {settings.defaultSystemPromptTemplate}
            </pre>
          )}

          {promptError && <p className="text-sm text-red-400">{promptError}</p>}

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={savePrompt}
              disabled={promptSaving || promptDraft === settings?.systemPromptTemplate}
              className="flex items-center gap-2 px-5 h-9 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              style={{ background: promptSaved ? "#16a34a" : "#F24908" }}
            >
              {promptSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {promptSaved ? "Saved" : "Save prompt"}
            </button>
            {settings?.isSystemPromptCustomised && (
              <button
                onClick={resetPrompt}
                disabled={promptResetting}
                className="flex items-center gap-1.5 px-4 h-9 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ color: "var(--adm-muted)" }}
              >
                {promptResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                Reset to default
              </button>
            )}
            {promptDraft !== settings?.systemPromptTemplate && !promptSaving && (
              <span className="text-xs" style={{ color: "var(--adm-muted)" }}>Unsaved change</span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl border space-y-3" style={{ background: "var(--adm-btn)", borderColor: "var(--adm-border)" }}>
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--adm-text)" }}>
              <KeyRound className="w-4 h-4" style={{ color: "#F24908" }} />
              Your proxy credentials (saved in this browser only)
            </h3>
            <p className="text-[11px] mt-1" style={{ color: "var(--adm-muted)" }}>
              Optional. Stored only in this browser's local storage — never saved on the server or shared with
              other admins. When set, they're sent along with your own test messages below (equivalent to the
              server's <code>SAGE_PROXY_API_KEY</code> / <code>SAGE_PROXY_BASE_URL</code>), letting you test with
              your personal Anthropic-compatible credentials without touching the shared server config.
            </p>
          </div>

          {settings && !settings.serverKeyConfigured && (
            <p className="text-xs flex items-start gap-1.5 px-2.5 py-2 rounded-lg" style={{ color: "#b45309", background: "rgba(245,158,11,0.12)" }}>
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              No server-side API key is configured, so test chat will fail unless you set your own credentials here.
            </p>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--adm-muted)" }}>ANTHROPIC_AUTH_TOKEN</label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={authToken}
                onChange={e => setAuthToken(e.target.value)}
                placeholder="sk-ant-…"
                autoComplete="off"
                className="w-full h-9 rounded-lg pl-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-orange-400/50 font-mono"
                style={{ background: "var(--adm-content)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
              />
              <button
                type="button"
                onClick={() => setShowToken(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2"
                style={{ color: "var(--adm-muted)" }}
                title={showToken ? "Hide" : "Show"}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--adm-muted)" }}>ANTHROPIC_BASE_URL</label>
            <input
              type="text"
              value={proxyBaseUrl}
              onChange={e => setProxyBaseUrl(e.target.value)}
              placeholder="https://cn.zhihuiai.top"
              autoComplete="off"
              className="w-full h-9 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-orange-400/50 font-mono"
              style={{ background: "var(--adm-content)", border: "1px solid var(--adm-border)", color: "var(--adm-text)" }}
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={saveLocalCreds}
              className="flex items-center gap-2 px-4 h-8 rounded-lg text-xs font-bold text-white transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: credsSaved ? "#16a34a" : "#F24908" }}
            >
              <Save className="w-3.5 h-3.5" />
              {credsSaved ? "Saved" : "Save to this browser"}
            </button>
            {hasLocalCreds && (
              <button
                onClick={clearLocalCreds}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold"
                style={{ color: "var(--adm-muted)" }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            {hasLocalCreds && (
              <span className="text-[11px]" style={{ color: "var(--adm-muted)" }}>Active for your test chat →</span>
            )}
          </div>
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
          {/* Endpoint preset buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] shrink-0" style={{ color: "var(--adm-muted)" }}>Endpoint:</span>
            <button
              type="button"
              onClick={() => { setTestEndpoint(null); setChatMessages([]); }}
              className="text-[11px] px-2 py-0.5 rounded-md font-semibold border transition-colors"
              style={{
                background: testEndpoint === null ? "rgba(242,73,8,0.12)" : "transparent",
                borderColor: testEndpoint === null ? "#F24908" : "var(--adm-border)",
                color: testEndpoint === null ? "#F24908" : "var(--adm-muted)",
              }}
            >
              default
            </button>
            {PROXY_PRESETS.map(p => (
              <button
                key={p.url}
                type="button"
                onClick={() => { setTestEndpoint(p.url); setChatMessages([]); }}
                className="text-[11px] px-2 py-0.5 rounded-md font-semibold border transition-colors"
                style={{
                  background: testEndpoint === p.url ? `${p.color}22` : "transparent",
                  borderColor: testEndpoint === p.url ? p.color : "var(--adm-border)",
                  color: testEndpoint === p.url ? p.color : "var(--adm-muted)",
                }}
              >
                {p.label}
              </button>
            ))}
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
            <div key={i} className="flex flex-col" style={{ alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
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
              {m.role === "bot" && m.endpoint && (() => {
                const preset = PROXY_PRESETS.find(p => p.label === m.endpoint);
                return (
                  <span className="text-[10px] mt-0.5 px-1" style={{ color: preset?.color ?? "var(--adm-muted)" }}>
                    via {m.endpoint}
                  </span>
                );
              })()}
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
