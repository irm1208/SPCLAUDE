import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, ArrowRight, Check, Clock3, LoaderCircle, RefreshCw, ShieldCheck, X } from "lucide-react";

type RevisionItem = { id: string; productId: string; productName: string; quantity: number; unitPrice: number; lineTotal: number };
type RevisionRequest = {
  id: string; orderId: string; orderCode: string; member: string;
  priceProposal?: boolean;
  status: "pending" | "accepted" | "declined" | "cancelled" | "stale" | "withdrawn";
  message: string; createdAt: string;
  before: { items: RevisionItem[]; grandTotal: number };
  proposal: { items: RevisionItem[]; grandTotal: number };
  eligible: boolean;
  ineligibleReason: string | null;
  currency: string;
};
type MemberView = { enabled: boolean; requests: RevisionRequest[] };
type Decision = "accepted" | "declined" | "cancelled";

const cardStyle = { background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)" } as const;
const insetStyle = { background: "var(--t-bg)", border: "1px solid var(--t-border)" } as const;
const mutedStyle = { color: "var(--t-muted)" } as const;

function money(value: number, currency: string) {
  const code = currency === "USDT" || currency === "USDC" ? "USD" : currency;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: code, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  }
}

function errorText(value: unknown, fallback: string) {
  return value instanceof Error ? value.message : fallback;
}

function StatusPill({ status }: { status: RevisionRequest["status"] }) {
  const palette: Record<RevisionRequest["status"], { fg: string; bg: string }> = {
    pending: { fg: "#8A5A00", bg: "rgba(233,160,32,.14)" },
    accepted: { fg: "#15803d", bg: "rgba(34,197,94,.12)" },
    declined: { fg: "#b42318", bg: "rgba(239,68,68,.10)" },
    cancelled: { fg: "#b42318", bg: "rgba(239,68,68,.10)" },
    stale: { fg: "var(--t-subtle)", bg: "var(--t-bg)" },
    withdrawn: { fg: "var(--t-subtle)", bg: "var(--t-bg)" },
  };
  const tone = palette[status];
  return <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold capitalize" style={{ color: tone.fg, background: tone.bg }}>
    {status === "accepted" ? <Check size={11} /> : status === "pending" ? <Clock3 size={11} /> : null}
    {status}
  </span>;
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function ItemList({ items, currency, label }: { items: RevisionItem[]; currency: string; label: string }) {
  if (!items.length) return <div className="rounded-md px-3 py-3 text-xs" style={{ ...insetStyle, ...mutedStyle }}>No items</div>;
  return <div className="space-y-1.5" aria-label={label}>
    {items.map(item => <div key={item.id} className="flex items-start justify-between gap-3 rounded-md px-3 py-2" style={insetStyle} data-testid={`revision-line-${label}-${item.id}`}>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold">{item.productName}</p>
        <p className="mt-0.5 text-[10px] tabular-nums" style={mutedStyle}>{item.quantity} × {money(item.unitPrice, currency)}</p>
      </div>
      <span className="shrink-0 font-mono text-xs font-semibold tabular-nums">{money(item.lineTotal, currency)}</span>
    </div>)}
  </div>;
}

function Snapshot({ request, proposed = false }: { request: RevisionRequest; proposed?: boolean }) {
  const title = proposed ? "Proposed order" : "Current order";
  const items = proposed ? request.proposal.items : request.before.items;
  const total = proposed ? request.proposal.grandTotal : request.before.grandTotal;
  return <div className="min-w-0 flex-1 space-y-2">
    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: proposed ? "var(--t-blue)" : "var(--t-subtle)" }}>{title}</p>
    <ItemList items={items} currency={request.currency} label={`${proposed ? "proposed" : "current"}-${request.id}`} />
    <div className="flex items-center justify-between gap-2 px-1 pt-1 text-xs">
      <span style={mutedStyle}>{proposed ? "Proposed total" : "Original total"}</span>
      <strong className="font-mono tabular-nums">{money(total, request.currency)}</strong>
    </div>
  </div>;
}

function RevisionDetails({ request }: { request: RevisionRequest }) {
  return <div className="space-y-3">
    <div className="rounded-lg px-3 py-2.5 text-xs leading-relaxed" style={{ ...insetStyle, color: "var(--t-text)" }}>
      <p className="mb-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--t-subtle)" }}>Organiser’s note</p>
      <p className="whitespace-pre-wrap">{request.message}</p>
    </div>
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-start">
      <Snapshot request={request} />
      <ArrowRight size={15} className="hidden sm:mt-8 sm:block" style={{ color: "var(--t-subtle)" }} />
      <Snapshot request={request} proposed />
    </div>
  </div>;
}

function DecisionButton({ children, onClick, disabled, quiet, testId }: {
  children: ReactNode; onClick: () => void; disabled?: boolean; quiet?: boolean; testId: string;
}) {
  return <button type="button" onClick={onClick} disabled={disabled} data-testid={testId}
    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
    style={quiet ? { color: "var(--t-muted)", background: "var(--t-bg)", border: "1px solid var(--t-border)" } : { color: "#fff", background: "#1B3A7A" }}>
    {children}
  </button>;
}

export function MemberOrderRevision({ orderId, onChanged, onCancelled }: { orderId: string; onChanged?: () => void; onCancelled?: () => void }) {
  const [view, setView] = useState<MemberView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const seq = useRef(0);
  const callbackRef = useRef(onChanged);
  callbackRef.current = onChanged;
  const cancelledRef = useRef(onCancelled);
  cancelledRef.current = onCancelled;
  const activeController = useRef<AbortController | null>(null);
  const actionController = useRef<AbortController | null>(null);
  const endpoint = useMemo(() => `/api/orders/${encodeURIComponent(orderId)}/order-revisions`, [orderId]);

  const load = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++seq.current;
    setLoadError(null);
    try {
      const response = await fetch(endpoint, { credentials: "include", signal });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || "Could not load order change requests.");
      }
      const result = await response.json() as MemberView;
      if (requestId === seq.current) setView(result);
    } catch (error) {
      if (signal?.aborted || requestId !== seq.current) return;
      setLoadError(errorText(error, "Could not load order change requests."));
    } finally {
      if (!signal?.aborted && requestId === seq.current) setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    setView(null);
    setLoadError(null);
    setActionError(null);
    setLoading(true);
    setBusyId(null);
    const controller = new AbortController();
    activeController.current = controller;
    void load(controller.signal);
    return () => {
      controller.abort();
      actionController.current?.abort();
      actionController.current = null;
      activeController.current = null;
      seq.current += 1;
    };
  }, [orderId, load]);

  useEffect(() => {
    if (!view || busyId) return;
    const timer = window.setInterval(() => {
      const controller = new AbortController();
      activeController.current?.abort();
      activeController.current = controller;
      void load(controller.signal);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [view, busyId, load]);

  const refresh = useCallback(async () => {
    const controller = new AbortController();
    activeController.current?.abort();
    activeController.current = controller;
    await load(controller.signal);
  }, [load]);

  const pending = useMemo(() => (view?.requests ?? [])
    .filter(request => request.status === "pending")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null, [view]);
  const history = useMemo(() => (view?.requests ?? [])
    .filter(request => request.id !== pending?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [view, pending]);

  const decide = async (request: RevisionRequest, decision: Decision) => {
    if (decision === "cancelled" && !window.confirm(
      `Decline the new price and cancel order ${request.orderCode}? This removes the entire unpaid order, not just the affected product.`
    )) return;
    const controller = new AbortController();
    actionController.current?.abort();
    actionController.current = controller;
    setBusyId(request.id);
    setActionError(null);
    try {
      const response = await fetch(`${endpoint}/${encodeURIComponent(request.id)}/decision`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || `Could not ${decision} this change request.`);
      }
      if (controller.signal.aborted) return;
      if (decision === "accepted" || decision === "cancelled") callbackRef.current?.();
      if (decision === "cancelled") { cancelledRef.current?.(); return; }
      await refresh();
    } catch (error) {
      if (controller.signal.aborted) return;
      setActionError(errorText(error, `Could not ${decision} this change request.`));
    } finally {
      if (!controller.signal.aborted) setBusyId(null);
      if (actionController.current === controller) actionController.current = null;
    }
  };

  if (loading && !view) {
    return <section className="space-y-3 rounded-xl p-4 sm:p-5" style={cardStyle} aria-label="Loading order changes">
      <div className="h-4 w-44 animate-pulse rounded" style={{ background: "var(--t-border)" }} />
      <div className="h-14 animate-pulse rounded-lg" style={{ background: "var(--t-bg)" }} />
      <div className="h-20 animate-pulse rounded-lg" style={{ background: "var(--t-bg)" }} />
    </section>;
  }
  if (loadError && !view) {
    return <section className="flex flex-wrap items-center gap-3 rounded-xl p-4" style={cardStyle} role="alert">
      <AlertCircle size={17} style={{ color: "#b42318" }} /><p className="flex-1 text-sm">{loadError}</p>
      <button type="button" onClick={() => void refresh()} className="inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: "var(--t-blue)" }}>
        <RefreshCw size={13} /> Retry
      </button>
    </section>;
  }
  if (!view || view.requests.length === 0) return null;

  return <section className="space-y-4 rounded-xl p-4 sm:p-5" style={cardStyle} aria-labelledby="member-order-revision-title">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}>
          <ShieldCheck size={18} />
        </span>
        <div>
          <h2 id="member-order-revision-title" className="text-base font-extrabold tracking-tight">Order change requests</h2>
          <p className="mt-0.5 text-xs" style={mutedStyle}>Review any proposed changes to your order.</p>
        </div>
      </div>
      <button type="button" onClick={() => void refresh()} disabled={!!busyId || loading}
        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold disabled:opacity-50" style={{ color: "var(--t-blue)" }} data-testid="button-refresh-order-revisions">
        <RefreshCw size={13} /> Refresh
      </button>
    </header>

    {loadError && <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2.5 text-xs" style={{ color: "#b42318", background: "rgba(239,68,68,.08)" }}>
      <AlertCircle size={14} /> Could not refresh. Your request details are still shown.
      <button type="button" className="font-bold underline" onClick={() => void refresh()}>Try again</button>
    </div>}
    {actionError && <div role="alert" className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm" style={{ color: "#b42318", background: "rgba(239,68,68,.08)" }}>
      <AlertCircle size={16} className="mt-0.5 shrink-0" />{actionError}
    </div>}

    {pending && <article className="space-y-4 rounded-lg p-3 sm:p-4" style={{ background: "var(--t-blue-04)", border: "1px solid var(--t-blue-18)" }} data-testid={`pending-revision-${pending.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status="pending" />
          <span className="text-sm font-extrabold">Order {pending.orderCode}</span>
        </div>
        <span className="text-[10px]" style={mutedStyle}>{dateLabel(pending.createdAt)}</span>
      </div>
      <div className="rounded-lg px-3 py-2 text-xs leading-relaxed" style={{ background: "rgba(233,160,32,.10)", border: "1px solid rgba(233,160,32,.20)", color: "var(--t-muted)" }}>
        {pending.priceProposal
          ? "Accept to use the new price. Declining and cancelling removes your entire unpaid order, even if the group buy is closed. This is not a payment request."
          : "Nothing changes unless you accept. This is not a payment request. Declining keeps your original order."}
      </div>
      <RevisionDetails request={pending} />

      {!pending.eligible && <p className="rounded-md px-3 py-2 text-xs leading-relaxed" style={{ ...insetStyle, ...mutedStyle }}>
        {pending.ineligibleReason || "This request can no longer be accepted."} {pending.priceProposal ? "You can dismiss this proposal, but this order cannot be cancelled here." : "You can still decline it."}
      </p>}
      {!view.enabled && <p className="text-[11px]" style={mutedStyle}>The organiser has turned off new requests. This pending request can still be declined.</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3" style={{ borderColor: "var(--t-blue-15)" }}>
        <p className="max-w-md text-[10px] leading-relaxed" style={mutedStyle}>If accepted, the revision is applied to this order. Review every item and total before confirming.</p>
        <div className="flex flex-wrap gap-2">
          <DecisionButton quiet disabled={!!busyId} onClick={() => void decide(pending, pending.priceProposal && pending.eligible ? "cancelled" : "declined")} testId={`button-decline-${pending.id}`}>
            {busyId === pending.id ? <LoaderCircle size={14} className="animate-spin" /> : <X size={14} />}
            {pending.priceProposal ? pending.eligible ? "Decline price and cancel order" : "Dismiss proposal" : "Decline"}
          </DecisionButton>
          <DecisionButton disabled={!view.enabled || !pending.eligible || !!busyId} onClick={() => void decide(pending, "accepted")} testId={`button-accept-${pending.id}`}>
            {busyId === pending.id ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} {pending.priceProposal ? "Accept new price" : "Accept changes"}
          </DecisionButton>
        </div>
      </div>
    </article>}

    {history.length > 0 && <div className="space-y-2 border-t pt-4" style={{ borderColor: "var(--t-border)" }}>
      <div className="flex items-center gap-2">
        <Clock3 size={14} style={{ color: "var(--t-blue)" }} />
        <h3 className="text-xs font-extrabold">Past decisions</h3>
      </div>
      <div className="space-y-2">
        {history.map(request => <details key={request.id} className="group rounded-lg" style={insetStyle} data-testid={`history-revision-${request.id}`}>
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2.5">
            <StatusPill status={request.status} />
            <span className="text-xs font-bold">Order {request.orderCode}</span>
            <span className="ml-auto text-[10px]" style={mutedStyle}>{dateLabel(request.createdAt)}</span>
            <span className="w-full text-[10px]" style={mutedStyle}>
              {money(request.before.grandTotal, request.currency)} <span aria-hidden="true">→</span> {money(request.proposal.grandTotal, request.currency)}
            </span>
          </summary>
          <div className="border-t p-3" style={{ borderColor: "var(--t-border)" }}>
            {request.status === "declined" && <p className="mb-3 text-[11px]" style={mutedStyle}>Declined — your original order remained unchanged.</p>}
            {request.status === "accepted" && <p className="mb-3 text-[11px]" style={mutedStyle}>Accepted — this revision was confirmed.</p>}
            <RevisionDetails request={request} />
          </div>
        </details>)}
      </div>
    </div>}
  </section>;
}
