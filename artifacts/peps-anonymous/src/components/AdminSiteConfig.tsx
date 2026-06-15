import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Save, RotateCcw, Trash2, Plus, Search, Eye, EyeOff } from "lucide-react";

type ConfigType = "boolean" | "number" | "string" | "json" | "secret";

interface ConfigItem {
  key: string;
  group: string;
  label: string;
  description: string;
  type: ConfigType;
  defaultValue: string | null;
  isRegistered: boolean;
  publicallyExposed: boolean;
  value: string | null;
  hasValue: boolean;
  updatedAt: string | null;
}

function apiUrl(p: string) { return `/api${p}`; }

export function AdminSiteConfig({ secret }: { secret: string }) {
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/admin/site-config-all"), { headers: { "x-admin-secret": secret } });
      if (res.ok) {
        const d = await res.json();
        setItems(d.items as ConfigItem[]);
      }
    } finally { setLoading(false); }
  }, [secret]);

  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) set.add(i.group);
    return [...set].sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => {
      if (groupFilter && i.group !== groupFilter) return false;
      if (!q) return true;
      return i.key.toLowerCase().includes(q) ||
        i.label.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q);
    });
  }, [items, search, groupFilter]);

  const grouped = useMemo(() => {
    const m = new Map<string, ConfigItem[]>();
    for (const i of filtered) {
      if (!m.has(i.group)) m.set(i.group, []);
      m.get(i.group)!.push(i);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const draftFor = (i: ConfigItem) => drafts[i.key] ?? i.value ?? i.defaultValue ?? "";
  const isDirty = (i: ConfigItem) => drafts[i.key] !== undefined && drafts[i.key] !== (i.value ?? "");

  const save = async (i: ConfigItem) => {
    const value = draftFor(i);
    setSavingKey(i.key);
    try {
      const res = await fetch(apiUrl(`/admin/site-config-all/${encodeURIComponent(i.key)}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(`Save failed: ${e.error ?? res.statusText}`);
        return;
      }
      setDrafts(d => { const n = { ...d }; delete n[i.key]; return n; });
      await load();
    } finally { setSavingKey(null); }
  };

  const reset = (i: ConfigItem) => setDrafts(d => { const n = { ...d }; delete n[i.key]; return n; });

  const remove = async (i: ConfigItem) => {
    if (!confirm(`Delete site_config key "${i.key}"? This restores the default behaviour.`)) return;
    setSavingKey(i.key);
    try {
      await fetch(apiUrl(`/admin/site-config-all/${encodeURIComponent(i.key)}`), {
        method: "DELETE",
        headers: { "x-admin-secret": secret },
      });
      await load();
    } finally { setSavingKey(null); }
  };

  const addAdHoc = async () => {
    const k = newKey.trim();
    if (!k) return;
    setAdding(true);
    try {
      const res = await fetch(apiUrl(`/admin/site-config-all/${encodeURIComponent(k)}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ value: newValue }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(`Add failed: ${e.error ?? res.statusText}`);
        return;
      }
      setNewKey(""); setNewValue("");
      await load();
    } finally { setAdding(false); }
  };

  const renderInput = (i: ConfigItem) => {
    const value = draftFor(i);
    const onChange = (v: string) => setDrafts(d => ({ ...d, [i.key]: v }));

    if (i.type === "boolean") {
      const isOn = value === "true";
      return (
        <button
          type="button"
          onClick={() => onChange(isOn ? "false" : "true")}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${isOn ? "bg-orange-500" : "bg-slate-300 dark:bg-slate-600"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isOn ? "translate-x-5" : ""}`} />
        </button>
      );
    }

    if (i.type === "json") {
      return (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={Math.min(8, Math.max(2, value.split("\n").length))}
          className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-mono"
          placeholder={i.defaultValue ?? "[]"}
        />
      );
    }

    if (i.type === "secret") {
      const revealed = !!revealedSecrets[i.key];
      const draftActive = drafts[i.key] !== undefined;
      const displayValue = draftActive ? value : (revealed ? value : (i.value ?? ""));
      return (
        <div className="flex items-center gap-1">
          <input
            type={revealed || draftActive ? "text" : "password"}
            value={displayValue}
            onChange={e => onChange(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-mono"
            placeholder={i.hasValue ? "(set — masked)" : "(not set)"}
          />
          <button
            type="button"
            onClick={() => setRevealedSecrets(s => ({ ...s, [i.key]: !s[i.key] }))}
            className="p-1.5 text-muted-foreground hover:text-foreground"
            title={revealed ? "Hide" : "Show"}
          >
            {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      );
    }

    const inputType = i.type === "number" ? "number" : "text";
    return (
      <input
        type={inputType}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
        placeholder={i.defaultValue ?? ""}
      />
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Site config</h2>
          <p className="text-xs text-muted-foreground">Generic key/value editor for every site_config row. Changes apply immediately.</p>
        </div>
        <button onClick={load} disabled={loading} className="h-8 px-3 rounded-lg text-xs font-bold bg-orange-500 text-white disabled:opacity-50 flex items-center gap-1.5">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search keys, labels, descriptions…"
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-border bg-background text-xs"
          />
        </div>
        <select
          value={groupFilter}
          onChange={e => setGroupFilter(e.target.value)}
          className="h-9 px-2 rounded-lg border border-border bg-background text-xs"
        >
          <option value="">All groups</option>
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <span className="text-[11px] text-muted-foreground">{filtered.length} of {items.length}</span>
      </div>

      <div className="space-y-5">
        {grouped.map(([group, rows]) => (
          <div key={group} className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{group}</h3>
            <div className="rounded-xl border border-border divide-y divide-border bg-card">
              {rows.map(i => (
                <div key={i.key} className="p-3 grid grid-cols-1 md:grid-cols-[2fr_3fr_auto] gap-3 items-start">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <code className="text-xs font-mono font-bold text-foreground break-all">{i.key}</code>
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{i.type}</span>
                      {i.publicallyExposed && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Public</span>
                      )}
                      {!i.isRegistered && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Ad-hoc</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{i.label}</p>
                    {i.description && <p className="text-[10.5px] text-muted-foreground mt-0.5">{i.description}</p>}
                    {i.defaultValue !== null && (
                      <p className="text-[10px] text-muted-foreground/80 mt-0.5">Default: <code className="font-mono">{i.defaultValue}</code></p>
                    )}
                  </div>
                  <div className="min-w-0">{renderInput(i)}</div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => save(i)}
                      disabled={!isDirty(i) || savingKey === i.key}
                      className="h-8 px-2.5 rounded-lg text-[11px] font-bold bg-orange-500 text-white disabled:opacity-30 flex items-center gap-1"
                    >
                      {savingKey === i.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Save
                    </button>
                    {isDirty(i) && (
                      <button onClick={() => reset(i)} className="h-8 px-2 rounded-lg text-[11px] text-muted-foreground hover:text-foreground">
                        Cancel
                      </button>
                    )}
                    {i.hasValue && (
                      <button
                        onClick={() => remove(i)}
                        disabled={savingKey === i.key}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 disabled:opacity-30"
                        title={i.isRegistered ? "Reset to default" : "Delete key"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add ad-hoc key</h3>
        <p className="text-[11px] text-muted-foreground">Stores any key/value in site_config. Use for one-off backend toggles.</p>
        <div className="flex gap-2 flex-wrap">
          <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="key (e.g. featureXEnabled)" className="flex-1 min-w-[180px] h-9 px-2.5 rounded-lg border border-border bg-background text-xs font-mono" />
          <input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="value" className="flex-1 min-w-[180px] h-9 px-2.5 rounded-lg border border-border bg-background text-xs font-mono" />
          <button
            onClick={addAdHoc}
            disabled={!newKey.trim() || adding}
            className="h-9 px-3 rounded-lg text-xs font-bold bg-orange-500 text-white disabled:opacity-50 flex items-center gap-1.5"
          >
            {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminSiteConfig;
