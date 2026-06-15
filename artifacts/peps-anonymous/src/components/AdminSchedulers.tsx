import { useCallback, useEffect, useState } from "react";
import { Loader2, Play, RotateCcw, AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface SchedulerStatus {
  name: string;
  label: string;
  description: string;
  defaultIntervalMs: number;
  minIntervalMs: number;
  maxIntervalMs: number;
  intervalMs: number;
  enabled: boolean;
  running: boolean;
  lastRunAt: string | null;
  lastDurationMs: number | null;
  lastError: string | null;
  nextRunAt: string | null;
}

function apiUrl(p: string) { return `/api${p}`; }

function fmtInterval(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 60 * 60_000) return `${Math.round(ms / 60_000)} min`;
  if (ms < 24 * 60 * 60_000) {
    const h = ms / (60 * 60_000);
    return `${h % 1 === 0 ? h : h.toFixed(1)} h`;
  }
  return `${(ms / (24 * 60 * 60_000)).toFixed(1)} d`;
}

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const future = diff > 0;
  let v: string;
  if (abs < 60_000) v = `${Math.round(abs / 1000)}s`;
  else if (abs < 60 * 60_000) v = `${Math.round(abs / 60_000)} min`;
  else if (abs < 24 * 60 * 60_000) v = `${Math.round(abs / (60 * 60_000))} h`;
  else v = `${Math.round(abs / (24 * 60 * 60_000))} d`;
  return future ? `in ${v}` : `${v} ago`;
}

export function AdminSchedulers({ secret }: { secret: string }) {
  const [items, setItems] = useState<SchedulerStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyName, setBusyName] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/admin/schedulers"), { headers: { "x-admin-secret": secret } });
      if (res.ok) {
        const d = await res.json();
        setItems(d.items as SchedulerStatus[]);
      }
    } finally { setLoading(false); }
  }, [secret]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  const runNow = async (name: string) => {
    setBusyName(name);
    try {
      const res = await fetch(apiUrl(`/admin/schedulers/${encodeURIComponent(name)}/run`), {
        method: "POST", headers: { "x-admin-secret": secret },
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(`Run failed: ${e.error ?? res.statusText}`);
      }
      await load();
    } finally { setBusyName(null); }
  };

  const saveSettings = async (s: SchedulerStatus, patch: { intervalMs?: number; enabled?: boolean }) => {
    setBusyName(s.name);
    try {
      const res = await fetch(apiUrl(`/admin/schedulers/${encodeURIComponent(s.name)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(`Save failed: ${e.error ?? res.statusText}`);
      } else if (patch.intervalMs !== undefined) {
        setDrafts(d => { const n = { ...d }; delete n[s.name]; return n; });
      }
      await load();
    } finally { setBusyName(null); }
  };

  const draftFor = (s: SchedulerStatus): number => drafts[s.name] ?? s.intervalMs;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Schedulers</h2>
          <p className="text-xs text-muted-foreground">Background jobs with run-now, interval and enable/disable controls.</p>
        </div>
        <button onClick={load} disabled={loading} className="h-8 px-3 rounded-lg text-xs font-bold bg-orange-500 text-white disabled:opacity-50 flex items-center gap-1.5">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {items.length === 0 && !loading && (
          <div className="rounded-xl border border-border p-4 text-xs text-muted-foreground col-span-full">No schedulers registered yet. Wait a few seconds and refresh.</div>
        )}
        {items.map(s => {
          const draft = draftFor(s);
          const dirty = draft !== s.intervalMs;
          const isBusy = busyName === s.name;
          return (
            <div key={s.name} className="rounded-xl border border-border bg-card p-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-foreground">{s.label}</h3>
                    {s.running ? (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 flex items-center gap-1">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />Running
                      </span>
                    ) : s.enabled ? (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-green-100 text-green-700">Enabled</span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">Disabled</span>
                    )}
                  </div>
                  <code className="text-[10px] font-mono text-muted-foreground">{s.name}</code>
                  <p className="text-[11px] text-muted-foreground mt-1">{s.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => saveSettings(s, { enabled: !s.enabled })}
                  disabled={isBusy}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${s.enabled ? "bg-orange-500" : "bg-slate-300"}`}
                  title={s.enabled ? "Disable" : "Enable"}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${s.enabled ? "translate-x-5" : ""}`} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg bg-muted/50 p-2">
                  <div className="text-muted-foreground flex items-center gap-1">
                    {s.lastError ? <AlertCircle className="w-3 h-3 text-red-500" /> : <CheckCircle2 className="w-3 h-3 text-green-500" />}
                    Last run
                  </div>
                  <div className="font-bold text-foreground">{relTime(s.lastRunAt)}</div>
                  {s.lastDurationMs !== null && <div className="text-[10px] text-muted-foreground">took {s.lastDurationMs}ms</div>}
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <div className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />Next run</div>
                  <div className="font-bold text-foreground">{relTime(s.nextRunAt)}</div>
                  <div className="text-[10px] text-muted-foreground">interval: {fmtInterval(s.intervalMs)}</div>
                </div>
              </div>

              {s.lastError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-[11px] text-red-700">
                  <span className="font-bold">Last error:</span> {s.lastError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground flex items-center justify-between">
                  Interval (minutes)
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {fmtInterval(s.minIntervalMs)} – {fmtInterval(s.maxIntervalMs)} · default {fmtInterval(s.defaultIntervalMs)}
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={Math.ceil(s.minIntervalMs / 60_000)}
                    max={Math.floor(s.maxIntervalMs / 60_000)}
                    value={Math.round(draft / 60_000)}
                    onChange={e => {
                      const mins = parseFloat(e.target.value);
                      if (isNaN(mins)) return;
                      setDrafts(d => ({ ...d, [s.name]: Math.round(mins * 60_000) }));
                    }}
                    className="flex-1 h-8 px-2.5 rounded-lg border border-border bg-background text-xs"
                  />
                  <button
                    onClick={() => saveSettings(s, { intervalMs: draft })}
                    disabled={!dirty || isBusy}
                    className="h-8 px-3 rounded-lg text-xs font-bold bg-orange-500 text-white disabled:opacity-30"
                  >
                    Save
                  </button>
                  {dirty && (
                    <button onClick={() => setDrafts(d => { const n = { ...d }; delete n[s.name]; return n; })} className="h-8 px-2 rounded-lg text-xs text-muted-foreground hover:text-foreground">
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={() => runNow(s.name)}
                disabled={isBusy || s.running}
                className="w-full h-9 rounded-lg text-xs font-bold bg-blue-600 text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isBusy || s.running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Run now
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AdminSchedulers;
