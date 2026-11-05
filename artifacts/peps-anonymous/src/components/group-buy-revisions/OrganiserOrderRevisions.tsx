import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, ChevronDown, Clock3, LoaderCircle, RefreshCw, Send, SlidersHorizontal, X } from "lucide-react";
import type { ProductPricing } from "./ProductPriceProposals";
import { validProposedPrice, type PriceProduct } from "./product-price-csv";

type RevisionItem = { id: string; productId: string; productName: string; quantity: number; unitPrice: number; lineTotal: number };
type RevisionOrder = {
  id: string; code: string; telegramUsername: string; currency: string; grandTotal: number;
  adminFee?: number; adminFeePercent?: number | null;
  eligible: boolean; ineligibleReason: string | null; items: RevisionItem[];
};
type RevisionRequest = {
  id: string; orderId: string; orderCode: string; member: string;
  status: "pending" | "accepted" | "declined" | "stale" | "withdrawn";
  message: string; createdAt: string;
  before: { items: RevisionItem[]; grandTotal: number };
  proposal: { items: RevisionItem[]; grandTotal: number };
};
type OrganiserView = {
  enabled: boolean; eligible: boolean; products: PriceProduct[];
  orders: RevisionOrder[]; requests: RevisionRequest[];
};
type DraftLine = { quantity: number; unitPrice: number };
type EditableLine = { id: string; quantity: number; unitPrice: number };
type OrderChange = { orderId: string; items: EditableLine[] };

const cardStyle = { background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)" } as const;
const insetStyle = { background: "var(--t-bg)", border: "1px solid var(--t-border)" } as const;
const fieldStyle = { background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)" } as const;
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
  const styles: Record<RevisionRequest["status"], { fg: string; bg: string }> = {
    pending: { fg: "#8A5A00", bg: "rgba(233,160,32,.14)" },
    accepted: { fg: "#15803d", bg: "rgba(34,197,94,.12)" },
    declined: { fg: "#b42318", bg: "rgba(239,68,68,.10)" },
    stale: { fg: "var(--t-subtle)", bg: "var(--t-bg)" },
    withdrawn: { fg: "var(--t-subtle)", bg: "var(--t-bg)" },
  };
  const tone = styles[status];
  return <span className="rounded-full px-2 py-1 text-[10px] font-bold capitalize" style={{ color: tone.fg, background: tone.bg }}>{status}</span>;
}

function OrderTotal({ order }: { order: RevisionOrder }) {
  return <span className="font-mono text-xs tabular-nums">{money(order.grandTotal, order.currency)}</span>;
}

export function OrganiserOrderRevisions({ groupBuyId, pricing }: { groupBuyId: string; pricing?: ProductPricing }) {
  const [view, setView] = useState<OrganiserView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftLine> | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [bulkProductId, setBulkProductId] = useState("");
  const [bulkMode, setBulkMode] = useState<"price" | "unavailable">("price");
  const [bulkPrice, setBulkPrice] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [reviewedPrices, setReviewedPrices] = useState<string | null>(null);
  const seq = useRef(0);
  const activeController = useRef<AbortController | null>(null);
  const actionController = useRef<AbortController | null>(null);
  const endpoint = useMemo(() => `/api/organiser/group-buys/${encodeURIComponent(groupBuyId)}/order-revisions`, [groupBuyId]);
  const setPricingAccess = pricing?.setAccess;
  useEffect(() => {
    setPricingAccess?.({ enabled: !!view?.eligible && view.enabled, products: view?.products ?? [], busy: !!busy });
  }, [view, busy, setPricingAccess]);
  const priceDraftKey = JSON.stringify(pricing?.prices ?? {});
  const stagedPrices = Object.entries(pricing?.prices ?? {});
  const invalidPrices = stagedPrices.some(([id, price]) => !validProposedPrice(price) || !view?.products.some(p => p.id === id));
  const pricesNeedReview = reviewedPrices !== null && reviewedPrices !== priceDraftKey;

  const load = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++seq.current;
    setLoadError(null);
    try {
      const response = await fetch(endpoint, { credentials: "include", signal });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || "Could not load order revision requests.");
      }
      const result = await response.json() as OrganiserView;
      if (requestId !== seq.current) return;
      setView(result);
      setDrafts(current => current ?? Object.fromEntries(result.orders.flatMap(order =>
        order.items.map(item => [`${order.id}:${item.id}`, { quantity: item.quantity, unitPrice: item.unitPrice }]),
      )));
    } catch (error) {
      if (signal?.aborted || requestId !== seq.current) return;
      setLoadError(errorText(error, "Could not load order revision requests."));
    } finally {
      if (!signal?.aborted && requestId === seq.current) setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    setView(null);
    setDrafts(null);
    setSelectedOrders([]);
    setBulkProductId("");
    setMessage("");
    setActionError(null);
    setLoadError(null);
    setLoading(true);
    setEditing(false);
    setReviewedPrices(null);
    setBusy(null);
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
  }, [groupBuyId, load]);

  useEffect(() => {
    if (!view || editing || busy) return;
    const timer = window.setInterval(() => {
      const controller = new AbortController();
      activeController.current?.abort();
      activeController.current = controller;
      void load(controller.signal);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [view, editing, busy, load]);

  const refresh = useCallback(async () => {
    const controller = new AbortController();
    activeController.current?.abort();
    activeController.current = controller;
    await load(controller.signal);
  }, [load]);

  const eligibleOrders = view?.orders.filter(order => order.eligible) ?? [];
  const draftLine = (orderId: string, item: RevisionItem): DraftLine =>
    drafts?.[`${orderId}:${item.id}`] ?? { quantity: item.quantity, unitPrice: item.unitPrice };

  const updateLine = (order: RevisionOrder, item: RevisionItem, field: keyof DraftLine, value: number) => {
    setEditing(true);
    setDrafts(current => ({
      ...(current ?? {}),
      [`${order.id}:${item.id}`]: {
        ...((current ?? {})[`${order.id}:${item.id}`] ?? { quantity: item.quantity, unitPrice: item.unitPrice }),
        [field]: Number.isFinite(value) ? value : 0,
      },
    }));
  };

  const applyBulk = () => {
    if (!view || !bulkProductId) return;
    const targets = eligibleOrders.filter(order => selectedOrders.includes(order.id));
    if (!targets.length) return;
    setDrafts(current => {
      const next = { ...(current ?? {}) };
      for (const order of targets) {
        for (const item of order.items) {
          if (item.productId !== bulkProductId) continue;
          const key = `${order.id}:${item.id}`;
          const existing = next[key] ?? { quantity: item.quantity, unitPrice: item.unitPrice };
          next[key] = bulkMode === "unavailable"
            ? { ...existing, quantity: 0 }
            : { ...existing, unitPrice: Number(bulkPrice) };
        }
      }
      return next;
    });
    setEditing(true);
  };

  const reviewProductPrices = () => {
    if (!view?.enabled || !pricing || invalidPrices || busy) return;
    const priceMap = new Map(stagedPrices.map(([id, price]) => [id, Number(price)]));
    const affected = eligibleOrders.filter(order => order.items.some(item =>
      item.quantity > 0 && priceMap.has(item.productId) && priceMap.get(item.productId) !== item.unitPrice));
    if (!affected.length) { setActionError("No eligible unpaid orders have a change from these proposed prices."); return; }
    const hasUnsentEdits = view.orders.some(order => order.items.some(item => {
      const draft = draftLine(order.id, item);
      return draft.quantity !== item.quantity || draft.unitPrice !== item.unitPrice;
    }));
    if (hasUnsentEdits && !window.confirm("Replace unsent order-line edits with these product prices? Original quantities will be preserved.")) return;
    const affectedIds = new Set(affected.map(order => order.id));
    setDrafts(Object.fromEntries(view.orders.flatMap(order => order.items.map(item => [
      `${order.id}:${item.id}`,
      { quantity: item.quantity, unitPrice: affectedIds.has(order.id) && item.quantity > 0
        ? priceMap.get(item.productId) ?? item.unitPrice : item.unitPrice },
    ]))));
    setSelectedOrders([...affectedIds]);
    setReviewedPrices(priceDraftKey);
    setEditing(true);
    setActionError(null);
  };

  const changes = useMemo<OrderChange[]>(() => {
    if (!view || !drafts) return [];
    return view.orders.flatMap(order => {
      if (!order.eligible || !selectedOrders.includes(order.id)) return [];
      const changed = order.items.some(item => {
        const draft = drafts[`${order.id}:${item.id}`];
        return !!draft && (draft.quantity !== item.quantity || draft.unitPrice !== item.unitPrice);
      });
      if (!changed) return [];
      return [{
        orderId: order.id,
        // The API receives every original line. Lines not editable by this organiser remain untouched.
        items: order.items.map(item => {
          const draft = drafts[`${order.id}:${item.id}`] ?? item;
          return {
            id: item.id,
            quantity: item.productId && view.products.some(product => product.id === item.productId)
              ? Math.min(item.quantity, Math.max(0, draft.quantity))
              : item.quantity,
            unitPrice: item.productId && view.products.some(product => product.id === item.productId)
              ? Math.max(0, draft.unitPrice)
              : item.unitPrice,
          };
        }),
      }];
    });
  }, [view, drafts, selectedOrders]);

  const proposedTotal = (order: RevisionOrder) => {
    const subtotal = order.items.reduce((sum, item) => {
      const draft = draftLine(order.id, item);
      return sum + (view?.products.some(product => product.id === item.productId)
        ? Math.round(Math.max(0, draft.quantity) * Math.max(0, draft.unitPrice) * 100) / 100 : item.lineTotal);
    }, 0);
    const delta = subtotal - order.items.reduce((sum, item) => sum + item.lineTotal, 0);
    const feeDelta = order.adminFeePercent != null
      ? Math.round(subtotal * order.adminFeePercent) / 100 - (order.adminFee ?? 0) : 0;
    return order.grandTotal + delta + feeDelta;
  };

  const submitProposal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!view?.enabled || busy || !message.trim() || changes.length === 0 || pricesNeedReview) return;
    const controller = new AbortController();
    actionController.current?.abort();
    actionController.current = controller;
    setBusy("submit");
    setActionError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), changes }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || "The proposal could not be sent.");
      }
      if (controller.signal.aborted) return;
      setMessage("");
      setDrafts(null);
      setSelectedOrders([]);
      setEditing(false);
      setReviewedPrices(null);
      if (reviewedPrices !== null) pricing?.clear();
      await refresh();
    } catch (error) {
      if (controller.signal.aborted) return;
      setActionError(errorText(error, "The proposal could not be sent."));
    } finally {
      if (!controller.signal.aborted) setBusy(null);
      if (actionController.current === controller) actionController.current = null;
    }
  };

  const toggleEnabled = async (enabled: boolean) => {
    const controller = new AbortController();
    actionController.current?.abort();
    actionController.current = controller;
    setBusy("toggle");
    setActionError(null);
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || "Could not update the revision setting.");
      }
      if (controller.signal.aborted) return;
      setView(current => current ? { ...current, enabled } : current);
      setEditing(false);
      await refresh();
    } catch (error) {
      if (controller.signal.aborted) return;
      setActionError(errorText(error, "Could not update the revision setting."));
    } finally {
      if (!controller.signal.aborted) setBusy(null);
      if (actionController.current === controller) actionController.current = null;
    }
  };

  const withdraw = async (request: RevisionRequest) => {
    if (!window.confirm(`Withdraw the pending request for order ${request.orderCode}?`)) return;
    const controller = new AbortController();
    actionController.current?.abort();
    actionController.current = controller;
    setBusy(`withdraw-${request.id}`);
    setActionError(null);
    try {
      const response = await fetch(`${endpoint}/${encodeURIComponent(request.id)}`, { method: "DELETE", credentials: "include", signal: controller.signal });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || "Could not withdraw this request.");
      }
      if (!controller.signal.aborted) await refresh();
    } catch (error) {
      if (controller.signal.aborted) return;
      setActionError(errorText(error, "Could not withdraw this request."));
    } finally {
      if (!controller.signal.aborted) setBusy(null);
      if (actionController.current === controller) actionController.current = null;
    }
  };

  if (loading && !view) {
    return <section className="space-y-3 rounded-xl p-4 sm:p-5" style={cardStyle} aria-label="Loading order revisions">
      <div className="h-4 w-48 animate-pulse rounded" style={{ background: "var(--t-border)" }} />
      <div className="h-12 animate-pulse rounded-lg" style={{ background: "var(--t-bg)" }} />
      <div className="h-8 w-2/3 animate-pulse rounded" style={{ background: "var(--t-bg)" }} />
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
  if (!view || !view.eligible) return null;

  return (
    <section className="space-y-4 rounded-xl p-4 sm:p-5" style={cardStyle} aria-labelledby="organiser-order-revisions-title">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}>
            <SlidersHorizontal size={17} />
          </span>
          <div>
            <h2 id="organiser-order-revisions-title" className="text-base font-extrabold tracking-tight">Order change requests</h2>
            <p className="mt-0.5 text-xs leading-relaxed" style={mutedStyle}>Propose a correction. Members confirm before anything changes.</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={view.enabled}
          disabled={busy === "toggle"}
          onClick={() => void toggleEnabled(!view.enabled)}
          className="inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-bold transition-colors disabled:opacity-60"
          style={view.enabled ? { color: "#fff", background: "#2D6BCC", borderColor: "#2D6BCC" } : { color: "var(--t-muted)", background: "var(--t-bg)", borderColor: "var(--t-border)" }}
          data-testid="toggle-order-revisions"
        >
          {busy === "toggle" ? <LoaderCircle size={14} className="animate-spin" /> : <span className="h-2 w-2 rounded-full" style={{ background: view.enabled ? "#fff" : "#9ca3af" }} />}
          {view.enabled ? "On" : "Off"}
        </button>
      </header>

      {!view.enabled && <p className="rounded-lg px-3 py-2.5 text-xs leading-relaxed" style={{ ...insetStyle, ...mutedStyle }}>
        Turn this on to request member confirmation for corrections to your products. No live order changes happen here.
      </p>}

      {actionError && <div role="alert" className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm" style={{ color: "#b42318", background: "rgba(239,68,68,.08)" }}>
        <AlertCircle size={16} className="mt-0.5 shrink-0" />{actionError}
      </div>}
      {loadError && view && <div role="alert" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs" style={{ color: "#b42318", background: "rgba(239,68,68,.08)" }}>
        <AlertCircle size={14} /> Refresh failed. Your current data and drafts are kept. <button type="button" className="font-bold underline" onClick={() => void refresh()}>Try again</button>
      </div>}

      {view.enabled && <>
        <div className="rounded-lg px-3 py-2.5 text-xs leading-relaxed" style={{ background: "rgba(233,160,32,.10)", border: "1px solid rgba(233,160,32,.22)", color: "var(--t-muted)" }}>
          Paid orders, supplier-batched orders and orders with an active payment attempt cannot be changed. The member’s original order stays in place until they accept.
        </div>

        {pricing && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3" style={{ borderColor: "var(--t-border)" }}>
          <div className="text-xs">
            <p className="font-bold">Propose prices from your product list</p>
            <p className="mt-1" style={mutedStyle}>Enter New prices below or import a price-update CSV, then review affected unpaid orders here. Quantities stay unchanged.</p>
            <p className="mt-1" role="status">{stagedPrices.length} product price{stagedPrices.length === 1 ? "" : "s"} staged</p>
            {invalidPrices && <p role="alert" className="mt-1" style={{ color: "#b42318" }}>Correct invalid or unavailable product prices before reviewing.</p>}
            {pricesNeedReview && <p role="alert" className="mt-1" style={{ color: "#b42318" }}>New prices changed after review. Review again before sending.</p>}
          </div>
          <button type="button" onClick={reviewProductPrices} disabled={!stagedPrices.length || invalidPrices || !!busy}
            className="rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-40" style={{ background: "var(--t-blue-deep)" }} data-testid="review-product-prices">Review product price changes</button>
        </div>}

        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-extrabold">1. Choose orders and adjust your product lines</p>
              <p className="mt-0.5 text-[11px]" style={mutedStyle}>Quantity can only go down; set it to zero to mark unavailable.</p>
            </div>
            <button type="button" onClick={() => void refresh()} disabled={!!busy || loading} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold disabled:opacity-50" style={mutedStyle}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {eligibleOrders.length === 0 ? <div className="rounded-lg px-3 py-4 text-sm" style={{ ...insetStyle, ...mutedStyle }}>No eligible orders to revise yet.</div> :
            <div className="space-y-2">
              {view.orders.map(order => {
                const ownLines = order.items.filter(item => view.products.some(product => product.id === item.productId));
                const chosen = selectedOrders.includes(order.id);
                const hasDraftChange = ownLines.some(item => {
                  const draft = draftLine(order.id, item);
                  return draft.quantity !== item.quantity || draft.unitPrice !== item.unitPrice;
                });
                return <article key={order.id} className="rounded-lg p-3 transition-colors" style={chosen ? { ...insetStyle, borderColor: "var(--t-blue-30)" } : insetStyle}>
                  <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                    {order.eligible && <label className="flex items-center gap-2 pt-0.5 text-xs font-semibold">
                      <input type="checkbox" checked={chosen} onChange={event => {
                        setSelectedOrders(current => event.target.checked ? [...current, order.id] : current.filter(id => id !== order.id));
                        setEditing(true);
                      }} aria-label={`Select order ${order.code}`} data-testid={`select-order-${order.id}`} />
                    </label>}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-extrabold">{order.code}</span>
                        <span className="text-xs" style={mutedStyle}>{order.telegramUsername ? `@${order.telegramUsername}` : "Member"}</span>
                        {!order.eligible && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "var(--t-bg)", color: "var(--t-subtle)" }}>Not eligible</span>}
                      </div>
                      {order.ineligibleReason && <p className="mt-1 text-[11px]" style={mutedStyle}>{order.ineligibleReason}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--t-subtle)" }}>Original total</p>
                      <OrderTotal order={order} />
                      {hasDraftChange && <p className="mt-1 text-[10px] font-semibold" style={{ color: "var(--t-blue)" }}>Proposed {money(proposedTotal(order), order.currency)}</p>}
                    </div>
                  </div>
                  <div className="mt-3 divide-y" style={{ borderColor: "var(--t-border)" }}>
                    {order.items.map(item => {
                      const own = view.products.some(product => product.id === item.productId);
                      const draft = draftLine(order.id, item);
                      const quantity = own ? Math.min(item.quantity, Math.max(0, draft.quantity)) : item.quantity;
                      const unitPrice = own ? Math.max(0, draft.unitPrice) : item.unitPrice;
                      const changed = quantity !== item.quantity || unitPrice !== item.unitPrice;
                      return <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_72px_96px] items-center gap-2 py-2.5 sm:grid-cols-[minmax(0,1fr)_84px_112px_110px]">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold">{item.productName}</p>
                          {!own && <p className="mt-0.5 text-[10px]" style={mutedStyle}>Shared catalogue item · read only</p>}
                          {changed && <p className="mt-0.5 text-[10px] font-semibold" style={{ color: "var(--t-blue)" }}>Proposed line total {money(quantity * unitPrice, order.currency)}</p>}
                        </div>
                        <label className="block text-[9px] font-bold uppercase tracking-wide" style={{ color: "var(--t-subtle)" }}>
                          Qty
                          <input type="number" min={0} max={item.quantity} step={0.5} value={own ? draft.quantity : item.quantity} disabled={!own || !chosen || !!busy}
                            onChange={event => updateLine(order, item, "quantity", Number(event.target.value))}
                            className="mt-1 h-8 w-full rounded-md px-2 text-xs font-medium tabular-nums outline-none focus:ring-2 focus:ring-[#2D6BCC]/30 disabled:opacity-60" style={fieldStyle}
                            aria-label={`Quantity for ${item.productName} in order ${order.code}`} data-testid={`input-quantity-${item.id}`} />
                        </label>
                        <label className="block text-[9px] font-bold uppercase tracking-wide" style={{ color: "var(--t-subtle)" }}>
                          Unit price
                          <input type="number" min={0} step="0.01" value={own ? draft.unitPrice : item.unitPrice} disabled={!own || !chosen || !!busy}
                            onChange={event => updateLine(order, item, "unitPrice", Number(event.target.value))}
                            className="mt-1 h-8 w-full rounded-md px-2 text-xs font-medium tabular-nums outline-none focus:ring-2 focus:ring-[#2D6BCC]/30 disabled:opacity-60" style={fieldStyle}
                            aria-label={`Unit price for ${item.productName} in order ${order.code}`} data-testid={`input-unit-price-${item.id}`} />
                        </label>
                        <span className="hidden text-right font-mono text-xs tabular-nums sm:block">{money(item.lineTotal, order.currency)}</span>
                      </div>;
                    })}
                  </div>
                </article>;
              })}
            </div>}
        </div>

        {eligibleOrders.length > 0 && <div className="space-y-3 rounded-lg p-3" style={{ ...insetStyle }}>
          <div>
            <p className="text-xs font-extrabold">2. Apply one change across orders</p>
            <p className="mt-0.5 text-[11px]" style={mutedStyle}>Only applies to the selected orders and your product lines.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--t-subtle)" }}>
              Product
              <select value={bulkProductId} onChange={event => setBulkProductId(event.target.value)} className="mt-1 h-9 w-full rounded-md px-2 text-xs font-medium normal-case tracking-normal outline-none" style={fieldStyle} data-testid="select-bulk-product">
                <option value="">Choose own product</option>
                {view.products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </label>
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--t-subtle)" }}>
              Change
              <div className="mt-1 flex h-9 rounded-md border p-0.5" style={{ borderColor: "var(--t-border)" }}>
                <button type="button" onClick={() => setBulkMode("price")} className="flex-1 rounded px-2 text-xs font-semibold" style={bulkMode === "price" ? { background: "var(--t-blue-10)", color: "var(--t-blue)" } : mutedStyle}>Set price</button>
                <button type="button" onClick={() => setBulkMode("unavailable")} className="flex-1 rounded px-2 text-xs font-semibold" style={bulkMode === "unavailable" ? { background: "var(--t-blue-10)", color: "var(--t-blue)" } : mutedStyle}>Unavailable</button>
              </div>
            </label>
            {bulkMode === "price" && <label className="text-[10px] font-bold uppercase tracking-wider sm:col-span-2" style={{ color: "var(--t-subtle)" }}>
              New unit price
              <input type="number" min={0} step="0.01" value={bulkPrice} onChange={event => setBulkPrice(event.target.value)} placeholder="0.00" className="mt-1 h-9 w-full rounded-md px-2 text-xs font-medium outline-none sm:max-w-48" style={fieldStyle} data-testid="input-bulk-price" />
            </label>}
            <button type="button" onClick={applyBulk} disabled={!bulkProductId || !selectedOrders.length || (bulkMode === "price" && (bulkPrice === "" || Number(bulkPrice) < 0)) || !!busy}
              className="h-9 self-end rounded-md px-3 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45 sm:col-start-3" style={{ background: "#1B3A7A", color: "#fff" }} data-testid="button-apply-bulk">
              Apply to selected
            </button>
          </div>
          <details>
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-semibold" style={{ color: "var(--t-blue)" }}>
              Select orders <ChevronDown size={13} />
            </summary>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {eligibleOrders.map(order => <label key={order.id} className="inline-flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={event => setSelectedOrders(current => event.target.checked ? [...current, order.id] : current.filter(id => id !== order.id))} />
                {order.code}
              </label>)}
            </div>
          </details>
        </div>}

        <form onSubmit={submitProposal} className="space-y-3 border-t pt-4" style={{ borderColor: "var(--t-border)" }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-extrabold">3. Add a note for the member</p>
            <span className="text-[11px] font-semibold" style={mutedStyle}>{changes.length} order{changes.length === 1 ? "" : "s"} with changes · {new Set(changes.map(change => view.orders.find(order => order.id === change.orderId)?.telegramUsername.toLowerCase().replace(/^@/, ""))).size} recipients</span>
          </div>
          <p className="text-[11px]" style={mutedStyle}>The member will see the before and proposed order totals, plus your note.</p>
          <textarea value={message} onChange={event => { setMessage(event.target.value); setEditing(true); }} rows={2} maxLength={1000} required placeholder="Explain what changed and why…"
            className="w-full resize-y rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2D6BCC]/30" style={fieldStyle} data-testid="input-revision-message" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px]" style={mutedStyle}>This sends a proposal only; it never edits the live order.</p>
            <button type="submit" disabled={!view.enabled || changes.length === 0 || !message.trim() || !!busy || pricesNeedReview}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-bold text-white transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
              style={{ background: "#1B3A7A" }} data-testid="button-send-revision">
              {busy === "submit" ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={14} />}
              Request member confirmation
            </button>
          </div>
        </form>
      </>}

      {view.requests.length > 0 && <div className="space-y-2 border-t pt-4" style={{ borderColor: "var(--t-border)" }}>
        <div className="flex items-center gap-2">
          <Clock3 size={14} style={{ color: "var(--t-blue)" }} />
          <p className="text-xs font-extrabold">Recent requests</p>
        </div>
        {view.requests.map(request => <div key={request.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-3 py-2.5" style={insetStyle}>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold">{request.orderCode} <span className="font-normal" style={mutedStyle}>· @{request.member}</span></p>
            <p className="mt-0.5 truncate text-[11px]" style={mutedStyle}>{request.message}</p>
          </div>
          <StatusPill status={request.status} />
          {request.status === "pending" && <button type="button" onClick={() => void withdraw(request)} disabled={!!busy} className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-bold disabled:opacity-50" style={{ color: "#b42318" }} data-testid={`button-withdraw-${request.id}`}>
            {busy === `withdraw-${request.id}` ? <LoaderCircle size={13} className="animate-spin" /> : <X size={13} />} Withdraw
          </button>}
        </div>)}
      </div>}
    </section>
  );
}
