import { vendorTranslate as vt, useVendorLanguage } from "@/lib/vendor-language";
import type { CSSProperties, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock, X } from "lucide-react";

/* Polaris-flavoured primitives shared by the vendor portal, its sign-in flow and the admin preview. */

export type Tone = "neutral" | "attention" | "info" | "success" | "warning" | "critical";
export const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: "#E3E3E3", fg: "#303030" },
  attention: { bg: "#FFEB78", fg: "#4F4700" },
  info: { bg: "#E0F0FF", fg: "#00527C" },
  success: { bg: "#CDFEE1", fg: "#0C5132" },
  warning: { bg: "#FFD6A4", fg: "#5E4200" },
  critical: { bg: "#FEDAD9", fg: "#8E1F0B" },
};
export type Progress = "incomplete" | "partial" | "complete";
export function ProgressDot({ kind }: { kind: Progress }) {
  useVendorLanguage();
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className="shrink-0">
      <circle cx="5" cy="5" r="3.5" fill={kind === "complete" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" />
      {kind === "partial" && <path d="M5 1.5 A3.5 3.5 0 0 0 5 8.5 Z" fill="currentColor" />}
    </svg>
  );
}
export function Badge({ tone = "neutral", progress, children, testId, className = "" }: { tone?: Tone; progress?: Progress; children: ReactNode; testId?: string; className?: string }) {
  useVendorLanguage();
  return (
    <span className={`inline-flex items-center gap-1 h-5 px-2 rounded-lg text-xs font-medium whitespace-nowrap ${className}`}
      style={{ background: TONES[tone].bg, color: TONES[tone].fg }} data-testid={testId}>
      {progress && <ProgressDot kind={progress} />}{children}
    </span>
  );
}

export function Banner({ tone, children, role = "status", testId, onDismiss }: { tone: Tone; children: ReactNode; role?: "status" | "alert"; testId?: string; onDismiss?: () => void }) {
  useVendorLanguage();
  const Icon = tone === "success" ? CheckCircle2 : tone === "info" ? Clock : AlertTriangle;
  return (
    <div role={role} className="rounded-xl px-3 py-2.5 text-[13px] flex gap-2 items-start" style={{ background: TONES[tone].bg, color: TONES[tone].fg }} data-testid={testId}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" /><div className="flex-1 min-w-0">{children}</div>
      {onDismiss && <button type="button" onClick={onDismiss} aria-label={vt("Dismiss")} className="shrink-0 -m-1 p-1 rounded hover:bg-black/5"><X className="w-4 h-4" /></button>}
    </div>
  );
}

export type BtnVariant = "primary" | "secondary" | "plain" | "critical";
export function btnStyle(v: BtnVariant): CSSProperties {
  if (v === "primary") return { background: "var(--t-text)", color: "var(--t-surface)", boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.25)" };
  if (v === "secondary") return { background: "var(--t-surface)", color: "var(--t-text)", border: "1px solid var(--t-border)", boxShadow: "0 1px 0 rgba(26,26,26,0.07)" };
  if (v === "critical") return { background: "#E51C00", color: "#fff" };
  return { color: "var(--t-blue)" };
}
export const btnBase = "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-semibold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6BCC]";
export interface BtnProps {
  variant?: BtnVariant; className?: string; style?: CSSProperties; children?: ReactNode; type?: "button" | "submit";
  onClick?: () => void; disabled?: boolean; title?: string; "aria-label"?: string; "data-testid"?: string;
}
export function Btn({ variant = "secondary", className = "", style, children, type = "button", ...rest }: BtnProps) {
  useVendorLanguage();
  return <button type={type} className={`${btnBase} ${variant === "plain" ? "px-1 h-7" : ""} ${className}`} style={{ ...btnStyle(variant), ...style }} {...rest}>{children}</button>;
}
export const aBtnPrimary = `${btnBase} h-9`;

export const cardStyle: CSSProperties = { background: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "0 1px 0 rgba(26,26,26,0.06)", borderRadius: 12 };
export function Card({ title, actions, children, footer, flush, className = "", testId }: {
  title?: ReactNode; actions?: ReactNode; children: ReactNode; footer?: ReactNode; flush?: boolean; className?: string; testId?: string;
}) {
  useVendorLanguage();
  return (
    <section className={`overflow-hidden ${className}`} style={cardStyle} data-testid={testId}>
      {(title || actions) && (
        <div className={`flex items-center gap-2 px-4 pt-4 ${flush ? "pb-3" : "pb-1"}`}>
          {title && <h2 className="text-[13px] font-semibold flex items-center gap-2 min-w-0" style={{ color: "var(--t-text)" }}>{title}</h2>}
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </div>)}
      <div className={flush ? "" : "px-4 pb-4 pt-2"}>{children}</div>
      {footer && <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3" style={{ borderTop: "1px solid var(--t-border)", background: "var(--t-surface2)" }}>{footer}</div>}
    </section>
  );
}
export const field: CSSProperties = { background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)", boxShadow: "inset 0 1px 0 rgba(26,26,26,0.04)" };
export const fieldCls = "w-full h-8 rounded-lg px-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2D6BCC]";
export const muted: CSSProperties = { color: "var(--t-muted)" };
export const subtle: CSSProperties = { color: "var(--t-subtle)" };

/** Labelled form field in the Shopify style: small medium-weight label above a 32px input. */
export function Field({ label, children, hint, className = "" }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  useVendorLanguage();
  return (
    <label className={`block text-xs font-medium ${className}`} style={muted}>
      {label}
      <span className="block mt-1">{children}</span>
      {hint && <span className="block mt-1 text-[11px] font-normal" style={subtle}>{hint}</span>}
    </label>
  );
}
