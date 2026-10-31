import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Loader2, PackageCheck, Printer, RefreshCw, Truck } from "lucide-react";

export interface CombinedPrintOrder {
  id: string;
  code?: string | null;
  telegramUsername: string;
  status: string;
  deliveryMethod: string | null;
  shippingName?: string | null;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingPostcode?: string | null;
  shippingCountry?: string | null;
  reshipperUsername?: string | null;
  routingType?: string | null;
  lineItems: { productName: string; quantity: number }[];
  includedOrderCodes?: string[];
}

export interface CombinedOrderShippingProps {
  groupBuyId: string;
  prefix: string;
  dfetch: (path: string, opts?: RequestInit) => Promise<Response>;
  onPrint: (order: CombinedPrintOrder) => void;
}

interface LinkedOrder {
  id: string;
  code?: string | null;
  status: string;
  paymentStatus: string;
}

interface SourceParcel {
  id: string;
  label: string;
  status: string;
}

interface LinkedGroup {
  parentId: string;
  orders: LinkedOrder[];
  printOrder: CombinedPrintOrder;
  canDispatch: boolean;
  canPrint: boolean;
  reason: string | null;
  trackingNumber: string | null;
  dispatched: boolean;
  parcels: SourceParcel[];
}

interface ViewState {
  scope: string;
  groups: LinkedGroup[];
  loading: boolean;
  error: string | null;
  success: string | null;
}

function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    for (const key of ["error", "message", "detail"]) {
      if (typeof record[key] === "string" && record[key]) return record[key] as string;
    }
  }
  return fallback;
}

function destination(order: CombinedPrintOrder): string {
  return [
    order.shippingName,
    order.shippingAddress,
    order.shippingCity,
    order.shippingPostcode,
    order.shippingCountry,
  ].filter((part): part is string => Boolean(part?.trim())).join(", ");
}

function formatStatus(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isPaidStatus(value: string): boolean {
  return /^(confirmed|test_confirmed)$/i.test(value.trim());
}

function LinkedOrderCard({
  group,
  dfetch,
  onPrint,
  onDispatched,
  registerPostController,
  isCurrentScope,
}: {
  group: LinkedGroup;
  dfetch: CombinedOrderShippingProps["dfetch"];
  onPrint: CombinedOrderShippingProps["onPrint"];
  onDispatched: (trackingNumber: string) => void;
  registerPostController: (controller: AbortController, active: boolean) => void;
  isCurrentScope: () => boolean;
}) {
  const [trackingNumber, setTrackingNumber] = useState(group.trackingNumber ?? "");
  const [selectedParcels, setSelectedParcels] = useState<string[]>(() => group.parcels.map((parcel) => parcel.id));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const parcelSignature = group.parcels.map((parcel) => parcel.id).join("\u0000");

  useEffect(() => {
    setSelectedParcels(group.parcels.map((parcel) => parcel.id));
  }, [parcelSignature]); // Reset to server-provided parcels only when that set changes.

  useEffect(() => {
    if (group.trackingNumber) setTrackingNumber(group.trackingNumber);
  }, [group.trackingNumber]);

  const quantity = group.printOrder.lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const orderCodes = group.orders.map((order) => order.code).filter(Boolean);
  const allPaid = group.orders.every((order) => isPaidStatus(order.paymentStatus));
  const waitReason = group.reason || (!allPaid ? "Payment must be complete for every linked order before dispatch." : null);
  const address = destination(group.printOrder);
  const isDispatched = group.dispatched;

  const dispatch = async () => {
    if (inFlight.current || !group.canDispatch || !trackingNumber.trim()) return;
    inFlight.current = true;
    const controller = new AbortController();
    registerPostController(controller, true);
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await dfetch(
        `/linked-orders/${encodeURIComponent(group.parentId)}/dispatch`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            trackingNumber: trackingNumber.trim(),
            parcelIds: selectedParcels,
          }),
        },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(body, `Dispatch failed (${response.status}).`));
      const appliedTracking = body && typeof body.trackingNumber === "string"
        ? body.trackingNumber
        : trackingNumber.trim();
      if (isCurrentScope()) onDispatched(appliedTracking);
    } catch (error) {
      if (!controller.signal.aborted && isCurrentScope()) {
        setSubmitError(error instanceof Error ? error.message : "Dispatch failed. Please try again.");
      }
    } finally {
      registerPostController(controller, false);
      inFlight.current = false;
      if (!controller.signal.aborted && isCurrentScope()) setSubmitting(false);
    }
  };

  return (
    <article
      className="overflow-hidden rounded-xl border border-[#D0DAE4] bg-white shadow-sm"
      data-testid={`card-linked-order-${group.parentId}`}
    >
      <div className="flex flex-col gap-3 border-b border-[#E7EDF3] bg-[#F8FAFC] px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-[#0F1F38]">
              Parent order {group.orders.find((order) => order.id === group.parentId)?.code || group.parentId.slice(0, 8)}
            </h3>
            <span className="rounded-full border border-[#D0DAE4] bg-white px-2 py-0.5 text-[11px] font-medium text-[#526274]">
              {group.orders.length} linked order{group.orders.length === 1 ? "" : "s"}
            </span>
            {isDispatched && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                <Check size={12} aria-hidden="true" /> Dispatched
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[#6B7280]">
            Orders: <span className="font-mono text-[#374151]">{orderCodes.length ? orderCodes.join(", ") : "Order codes unavailable"}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Individual order payment statuses">
            {group.orders.map((order) => {
              const paid = isPaidStatus(order.paymentStatus);
              const isTestPayment = order.paymentStatus.trim().toLowerCase() === "test_confirmed";
              return (
                <span
                  key={order.id}
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    paid
                      ? "border-green-200 bg-green-50 text-green-800"
                      : "border-amber-200 bg-amber-50 text-amber-900"
                  }`}
                  data-testid={`payment-status-${order.id}`}
                >
                  {order.code || order.id.slice(0, 8)} · {paid ? (isTestPayment ? "Test paid" : "Paid") : `Not paid · ${formatStatus(order.paymentStatus || "unknown")}`}
                </span>
              );
            })}
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#1B3A7A]">
          {quantity} item{quantity === 1 ? "" : "s"} in one parcel
        </span>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_minmax(250px,0.8fr)]">
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A9AAA]">Common destination</p>
            <p className="mt-1 text-sm text-[#374151]">{address || "Destination details unavailable"}</p>
            {group.printOrder.deliveryMethod && (
              <p className="mt-1 text-xs text-[#6B7280]">{group.printOrder.deliveryMethod}</p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A9AAA]">Combined items</p>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {group.printOrder.lineItems.map((item, index) => (
                <li
                  key={`${item.productName}-${index}`}
                  className="rounded-md border border-[#E1E8EF] bg-[#F8FAFC] px-2 py-1 text-xs text-[#374151]"
                >
                  {item.productName} <span className="font-semibold">× {item.quantity}</span>
                </li>
              ))}
              {group.printOrder.lineItems.length === 0 && (
                <li className="text-xs text-[#6B7280]">No item details provided.</li>
              )}
            </ul>
          </div>
          {isDispatched && group.trackingNumber && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-green-800">Shared tracking number</p>
              <p className="mt-0.5 break-all font-mono text-sm font-semibold text-green-900" data-testid={`tracking-number-${group.parentId}`}>
                {group.trackingNumber}
              </p>
              <p className="mt-1 text-xs text-green-800">Applied to every order in this combined shipment.</p>
            </div>
          )}
          {!group.canDispatch && !isDispatched && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
              <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{waitReason || "This linked order group is not ready to dispatch."}</span>
            </p>
          )}
        </div>

        <div className="rounded-lg border border-[#E7EDF3] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A9AAA]">Dispatch together</p>
            <button
              type="button"
              onClick={() => onPrint(group.printOrder)}
              disabled={!group.canPrint}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#D0DAE4] bg-white px-3 text-xs font-semibold text-[#1B3A7A] transition-colors hover:bg-[#F2F6FA] disabled:cursor-not-allowed disabled:opacity-45"
              data-testid={`button-print-linked-${group.parentId}`}
              aria-label={`Print combined order ${orderCodes.join(", ")}`}
            >
              <Printer size={14} aria-hidden="true" /> Print
            </button>
          </div>

          {group.parcels.length > 0 && (
            <fieldset className="mt-3 space-y-2">
              <legend className="mb-2 text-xs font-medium text-[#526274]">Include source parcels</legend>
              {group.parcels.map((parcel) => (
                <label key={parcel.id} className="flex cursor-pointer items-start gap-2 text-xs text-[#374151]">
                  <input
                    type="checkbox"
                    checked={selectedParcels.includes(parcel.id)}
                    onChange={(event) => setSelectedParcels((current) =>
                      event.target.checked
                        ? [...current, parcel.id]
                        : current.filter((id) => id !== parcel.id),
                    )}
                    disabled={isDispatched || submitting}
                    className="mt-0.5 size-4 accent-[#2D6BCC]"
                    data-testid={`checkbox-source-parcel-${parcel.id}`}
                  />
                  <span className="min-w-0">
                    <span className="font-medium">{parcel.label}</span>
                    <span className="ml-1 text-[#8A9AAA]">· {formatStatus(parcel.status)}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          <label className="mt-3 block text-xs font-medium text-[#526274]" htmlFor={`tracking-${group.parentId}`}>
            Tracking number <span className="text-red-600">*</span>
          </label>
          <input
            id={`tracking-${group.parentId}`}
            type="text"
            value={trackingNumber}
            onChange={(event) => setTrackingNumber(event.target.value)}
            placeholder="Enter shared tracking number"
            required
            disabled={!group.canDispatch || isDispatched || submitting}
            className="mt-1 min-h-10 w-full rounded-lg border border-[#D0DAE4] bg-white px-3 text-sm text-[#0F1F38] placeholder:text-[#9AA8B6] focus:border-[#2D6BCC] focus:outline-none focus:ring-2 focus:ring-[#2D6BCC]/15 disabled:bg-[#F4F6F8]"
            data-testid={`input-tracking-${group.parentId}`}
          />
          {submitError && (
            <p role="alert" className="mt-2 text-xs text-red-700" data-testid={`error-dispatch-${group.parentId}`}>
              {submitError}
            </p>
          )}
          <button
            type="button"
            onClick={dispatch}
            disabled={!group.canDispatch || isDispatched || submitting || !trackingNumber.trim()}
            className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#1B3A7A] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#142D60] disabled:cursor-not-allowed disabled:bg-[#9AA8B6]"
            data-testid={`button-dispatch-linked-${group.parentId}`}
          >
            {submitting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Truck size={16} aria-hidden="true" />}
            {submitting ? "Dispatching…" : isDispatched ? "Already dispatched" : "Dispatch linked orders"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function CombinedOrderShipping({
  groupBuyId,
  prefix,
  dfetch,
  onPrint,
}: CombinedOrderShippingProps) {
  const scope = `${prefix}\u0000${groupBuyId}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const [view, setView] = useState<ViewState>({
    scope: "",
    groups: [],
    loading: false,
    error: null,
    success: null,
  });
  const fetchController = useRef<AbortController | null>(null);
  const postControllers = useRef(new Set<AbortController>());

  const refresh = useCallback(async (preserveSuccess = true) => {
    if (!groupBuyId) return;
    fetchController.current?.abort();
    const controller = new AbortController();
    fetchController.current = controller;
    const currentScope = scope;
    setView((current) => ({
      scope: currentScope,
      groups: current.scope === currentScope ? current.groups : [],
      loading: true,
      error: null,
      success: preserveSuccess && current.scope === currentScope ? current.success : null,
    }));
    try {
      const base = prefix.replace(/\/+$/, "");
      const response = await dfetch(
        `${base}/${encodeURIComponent(groupBuyId)}/linked-orders`,
        { signal: controller.signal },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(body, `Could not load linked orders (${response.status}).`));
      if (scopeRef.current !== currentScope || controller.signal.aborted) return;
      setView((current) => ({
        scope: currentScope,
        groups: Array.isArray(body?.groups) ? body.groups as LinkedGroup[] : [],
        loading: false,
        error: null,
        success: preserveSuccess && current.scope === currentScope ? current.success : null,
      }));
    } catch (error) {
      if (controller.signal.aborted || scopeRef.current !== currentScope) return;
      setView((current) => ({
        scope: currentScope,
        groups: current.scope === currentScope ? current.groups : [],
        loading: false,
        error: error instanceof Error ? error.message : "Could not load linked orders.",
        success: preserveSuccess && current.scope === currentScope ? current.success : null,
      }));
    }
  }, [dfetch, groupBuyId, prefix, scope]);

  useEffect(() => {
    if (!groupBuyId) {
      fetchController.current?.abort();
      setView({ scope, groups: [], loading: false, error: null, success: null });
      return;
    }
    void refresh(false);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(() => void refresh(), 30_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
      fetchController.current?.abort();
      postControllers.current.forEach((controller) => controller.abort());
      postControllers.current.clear();
    };
  }, [groupBuyId, prefix, refresh, scope]);

  const currentView = view.scope === scope ? view : null;
  const markDispatched = (trackingNumber: string) => {
    if (scopeRef.current !== scope) return;
    setView((current) => current.scope === scope ? {
      ...current,
      success: `Tracking ${trackingNumber} was applied to all orders in this linked shipment.`,
    } : current);
    void refresh();
  };

  const registerPostController = (controller: AbortController, active: boolean) => {
    if (active) postControllers.current.add(controller);
    else postControllers.current.delete(controller);
  };

  if (!groupBuyId) {
    return (
      <section className="rounded-xl border border-[#D0DAE4] bg-white px-5 py-8 text-center" data-testid="linked-orders-choose-group-buy">
        <PackageCheck size={24} className="mx-auto text-[#2D6BCC]" aria-hidden="true" />
        <h2 className="mt-2 text-base font-bold text-[#0F1F38]">Choose a group buy</h2>
        <p className="mt-1 text-sm text-[#6B7280]">Select a group buy to view its linked orders.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl space-y-4" aria-label="Linked order shipping">
      <div className="flex flex-col gap-3 rounded-xl border border-[#D0DAE4] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#0F1F38]">Linked orders</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#6B7280]">
            Linked add-on orders ship together as one parcel. Payments remain separate and are never merged.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={currentView?.loading}
          className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#D0DAE4] bg-white px-3 text-xs font-semibold text-[#1B3A7A] hover:bg-[#F2F6FA] disabled:cursor-wait disabled:opacity-60"
          data-testid="button-refresh-linked-orders"
        >
          <RefreshCw size={14} className={currentView?.loading ? "animate-spin" : ""} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {currentView?.success && (
        <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" data-testid="status-linked-dispatch-success">
          {currentView.success}
        </p>
      )}
      {currentView?.error && (
        <div role="alert" className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between" data-testid="error-linked-orders">
          <span className="flex items-start gap-2"><AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{currentView.error}</span>
          <button type="button" onClick={() => void refresh()} className="font-semibold underline underline-offset-2">Try again</button>
        </div>
      )}

      {(!currentView || currentView.loading) && (
        <div className="space-y-3" aria-label="Loading linked orders" aria-live="polite">
          {[0, 1].map((index) => (
            <div key={index} className="animate-pulse rounded-xl border border-[#D0DAE4] bg-white p-4">
              <div className="h-4 w-44 rounded bg-[#E7EDF3]" />
              <div className="mt-3 h-3 w-3/4 rounded bg-[#EEF2F6]" />
              <div className="mt-5 h-24 rounded-lg bg-[#F3F6F8]" />
            </div>
          ))}
        </div>
      )}

      {currentView && !currentView.loading && !currentView.error && currentView.groups.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#C8D4E0] bg-[#F8FAFC] px-5 py-9 text-center" data-testid="empty-linked-orders">
          <PackageCheck size={23} className="mx-auto text-[#8A9AAA]" aria-hidden="true" />
          <h3 className="mt-2 text-sm font-semibold text-[#0F1F38]">No linked orders to ship</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#6B7280]">
            Only orders with linked add-ons appear here. Orders without add-ons are handled in the regular dispatch list.
          </p>
        </div>
      )}

      {currentView?.groups.map((group) => (
        <LinkedOrderCard
          key={group.parentId}
          group={group}
          dfetch={(path, options) => dfetch(
            `${prefix.replace(/\/+$/, "")}/${encodeURIComponent(groupBuyId)}${path}`,
            options,
          )}
          onPrint={onPrint}
          onDispatched={markDispatched}
          registerPostController={registerPostController}
          isCurrentScope={() => scopeRef.current === scope}
        />
      ))}
    </section>
  );
}
