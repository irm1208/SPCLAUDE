import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Loader2, X, Check, AlertTriangle, Info } from "lucide-react";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/* ---- Buttons --------------------------------------------------------------- */
type Tone = "primary" | "ghost" | "outline" | "danger" | "subtle";
export function Button({ tone = "primary", size = "md", loading, className, children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; size?: "sm" | "md" | "lg"; loading?: boolean }) {
  const tones: Record<Tone, string> = {
    primary: "bg-night text-night-fg hover:bg-night-2 font-medium",
    ghost: "text-muted hover:text-fg hover:bg-surface-2",
    outline: "border border-line-2 bg-surface text-fg hover:border-fg",
    danger: "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/15",
    subtle: "bg-surface-2 text-fg hover:bg-brand-soft",
  };
  const sizes = { sm: "h-8 px-3.5 text-xs rounded-full", md: "h-10 px-5 text-sm rounded-full", lg: "h-12 px-7 text-base rounded-full" };
  return (
    <button className={cn("inline-flex items-center justify-center gap-2 whitespace-nowrap transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2", tones[tone], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="size-4 spin" />}
      {children}
    </button>
  );
}

/* ---- Fields ----------------------------------------------------------------- */
export function Field({ label, hint, error, children, className }: { label?: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string }) {
  // Wrapping the control in the <label> associates it implicitly, so screen readers and tests can find it by name.
  return (
    <div className={cn("space-y-1", className)}>
      {label ? <label className="block"><span className="label">{label}</span>{children}</label> : children}
      {error ? <p className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => <input className={cn("field", className)} {...props} />;
export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className={cn("field min-h-24", className)} {...props} />;
export const Select = ({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => <select className={cn("field", className)} {...props}>{children}</select>;
export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cn("mt-0.5 relative h-6 w-11 rounded-full transition shrink-0", checked ? "bg-brand" : "bg-line-2")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-surface-2 transition", checked ? "left-[22px]" : "left-0.5")} />
      </button>
      <span><span className="text-sm font-medium">{label}</span>{hint && <span className="block text-xs text-muted">{hint}</span>}</span>
    </label>
  );
}

/* ---- Surfaces --------------------------------------------------------------- */
export const Card = ({ className, children, ...props }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) => <div className={cn("card p-6", className)} {...props}>{children}</div>;
export function Badge({ tone = "muted", children, className }: { tone?: "muted" | "brand" | "ok" | "info" | "warn" | "danger"; children: ReactNode; className?: string }) {
  const tones = { muted: "bg-surface-2 text-muted border-transparent", brand: "bg-brand-soft text-brand border-transparent", ok: "bg-ok/10 text-ok border-transparent", info: "bg-info/10 text-info border-transparent", warn: "bg-warn/10 text-warn border-transparent", danger: "bg-danger/10 text-danger border-transparent" };
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>;
}
export function Progress({ value, className }: { value: number; className?: string }) {
  return <div className={cn("h-2 w-full rounded-full bg-surface-2 overflow-hidden", className)}><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}
export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cn("size-5 spin text-muted", className)} />;
export function Empty({ title, children, icon }: { title: ReactNode; children?: ReactNode; icon?: ReactNode }) {
  return <div className="card-2 p-10 text-center text-sm text-muted">{icon && <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-surface text-brand shadow-sm">{icon}</div>}<p className="font-medium text-fg">{title}</p>{children && <div className="mt-1">{children}</div>}</div>;
}
export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { value: NoInfer<T>; label: ReactNode; count?: number }[]; value: T; onChange: (v: NoInfer<T>) => void; className?: string }) {
  return (
    <div className={cn("inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-surface-2 p-1", className)} role="tablist">
      {tabs.map(t => (
        <button key={t.value} role="tab" aria-selected={t.value === value} onClick={() => onChange(t.value)} className={cn("flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition", t.value === value ? "bg-night text-night-fg font-medium shadow-sm" : "text-muted hover:text-fg")}>
          {t.label}{t.count != null && <span className={cn("mono rounded-full px-1.5 text-[11px]", t.value === value ? "bg-white/15 text-night-fg" : "bg-line text-muted")}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => { if (!open) return; const h = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-night/50 p-0 sm:p-4 backdrop-blur-[2px]" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={cn("card w-full max-h-[92vh] overflow-y-auto p-6 fade-in rounded-b-none shadow-2xl sm:rounded-b-[1.25rem]", wide ? "sm:max-w-3xl" : "sm:max-w-lg")} role="dialog" aria-modal="true">
        <div className="mb-4 flex items-start justify-between gap-4">{title && <h2 className="text-lg font-semibold">{title}</h2>}<button className="ml-auto rounded-lg p-1 text-muted hover:text-fg" onClick={onClose} aria-label="Close"><X className="size-5" /></button></div>
        {children}
      </div>
    </div>
  );
}
export function Alert({ tone = "info", children, className }: { tone?: "info" | "warn" | "danger" | "ok"; children: ReactNode; className?: string }) {
  const Icon = tone === "ok" ? Check : tone === "info" ? Info : AlertTriangle;
  const tones = { info: "bg-info/8 text-info", warn: "bg-warn/10 text-warn", danger: "bg-danger/8 text-danger", ok: "bg-ok/10 text-ok" };
  return <div className={cn("flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm", tones[tone], className)}><Icon className="mt-0.5 size-4 shrink-0" /><div className="text-fg/90">{children}</div></div>;
}

/* ---- Toasts ------------------------------------------------------------------ */
type Toast = { id: number; message: string; tone: "ok" | "danger" | "info" };
const ToastContext = createContext<{ push: (message: string, tone?: Toast["tone"]) => void } | null>(null);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, tone }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
  }, []);
  const value = useMemo(() => ({ push }), [push]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map(t => <div key={t.id} className={cn("pointer-events-auto fade-in rounded-full bg-night px-5 py-2.5 text-sm text-night-fg shadow-xl", t.tone === "ok" && "ring-2 ring-ok/50", t.tone === "danger" && "ring-2 ring-danger/50")}>{t.message}</div>)}
      </div>
    </ToastContext.Provider>
  );
}
export function useToast() { const ctx = useContext(ToastContext); if (!ctx) throw new Error("useToast outside ToastProvider"); return ctx.push; }

/* ---- Copy button ------------------------------------------------------------- */
export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return <Button tone="subtle" size="sm" className={className} onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* ignore */ } }}>{done ? <><Check className="size-3.5" /> Copied</> : label}</Button>;
}
