import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Wallet } from "lucide-react";

export type GroupBuyRefundQueueRole = "admin" | "organiser";

export interface GroupBuyRefundQueueItem {
  id: string;
  orderId: string;
  orderCode: string | null;
  groupBuyId: string;
  groupBuyName: string | null;
  customerUsername: string;
  method: "credit" | "crypto" | string;
  asset: string | null;
  network: string | null;
  amountUsd: string | null;
  destinationWallet: string | null;
  status: "requested" | "verifying" | "verification_failed" | "completed" | string;
  requestedAt: string;
  verifyingAt?: string | null;
  completedAt?: string | null;
  paymentTxids: string[];
  outgoingTxid?: string | null;
  outgoingTxid2?: string | null;
  explorerUrl?: string | null;
  verificationError?: { code?: string | null; message?: string | null } | null;
  attempts?: Array<{ id: string; submittedTxid?: string | null }>;
}

export type GroupBuyRefundMethodFilterValue = "all" | "crypto" | "credit";
export type GroupBuyRefundCompletionFilterValue = "all" | "done" | "not_done";

export function filterRefundQueueRows<T extends Pick<GroupBuyRefundQueueItem, "method" | "status">>(
  rows: T[],
  method: GroupBuyRefundMethodFilterValue,
  completion?: GroupBuyRefundCompletionFilterValue,
): T[] {
  const methodRows = method === "all" ? rows : rows.filter(row => row.method === method);
  return completion && completion !== "all"
    ? filterRefundQueueRowsByCompletion(methodRows, completion)
    : methodRows;
}

export function filterRefundQueueRowsByCompletion<T extends Pick<GroupBuyRefundQueueItem, "status">>(
  rows: T[],
  completion: GroupBuyRefundCompletionFilterValue,
): T[] {
  if (completion === "all") return rows;
  if (completion === "done") return rows.filter(row => row.status === "completed");
  return rows.filter(row => row.status !== "completed");
}

export function refundQueueEmptyLabel(
  method: GroupBuyRefundMethodFilterValue,
  completion: GroupBuyRefundCompletionFilterValue = "all",
): string {
  if (completion === "done") {
    if (method === "crypto") return "No done crypto refund requests.";
    if (method === "credit") return "No done credit refund requests.";
    return "No done refund requests.";
  }
  if (completion === "not_done") {
    if (method === "crypto") return "No unfinished crypto refund requests.";
    if (method === "credit") return "No unfinished credit refund requests.";
    return "No unfinished refund requests.";
  }
  if (method === "crypto") return "No crypto refund requests.";
  if (method === "credit") return "No credit refund requests.";
  return "No refund requests.";
}

export interface GroupBuyRefundMethodFilterProps {
  value: GroupBuyRefundMethodFilterValue;
  onChange: (value: GroupBuyRefundMethodFilterValue) => void;
}

export function GroupBuyRefundMethodFilter({ value, onChange }: GroupBuyRefundMethodFilterProps) {
  const options: Array<{ value: GroupBuyRefundMethodFilterValue; label: string }> = [
    { value: "all", label: "All" },
    { value: "crypto", label: "Crypto" },
    { value: "credit", label: "Credits" },
  ];
  return (
    <div role="group" aria-label="Filter refund requests" className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6BCC] ${value === option.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export interface GroupBuyRefundCompletionFilterProps {
  value: GroupBuyRefundCompletionFilterValue;
  onChange: (value: GroupBuyRefundCompletionFilterValue) => void;
}

export function GroupBuyRefundCompletionFilter({ value, onChange }: GroupBuyRefundCompletionFilterProps) {
  const options: Array<{ value: GroupBuyRefundCompletionFilterValue; label: string }> = [
    { value: "all", label: "All" },
    { value: "done", label: "Done" },
    { value: "not_done", label: "Not done" },
  ];
  return (
    <div role="group" aria-label="Filter refund completion" className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6BCC] ${value === option.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export interface GroupBuyRefundQueueProps {
  role: GroupBuyRefundQueueRole;
  adminSecret?: string;
  groupBuyId?: string | null;
  onUpdated?: () => void | Promise<void>;
}

const REFUND_QUEUE_TIMEOUT_MS = 15_000;
export const MANUAL_REFUND_REASON_MAX_LENGTH = 1000;

export async function fetchRefundQueueJson(
  url: string,
  init: RequestInit,
  timeoutMs = REFUND_QUEUE_TIMEOUT_MS,
): Promise<{ response: Response; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body: unknown = await response.json().catch(() => null);
    return { response, body };
  } catch (cause) {
    if (controller.signal.aborted) {
      throw new Error("Request timed out. Please try again.");
    }
    throw cause;
  } finally {
    clearTimeout(timer);
  }
}

export function validateManualCompletionInput(txid: string, reason: string): string | null {
  if (!txid.trim()) return "Enter a TXID before manually completing the refund.";
  const trimmedReason = reason.trim();
  if (!trimmedReason) return "Enter a reason before manually completing the refund.";
  if (trimmedReason.length > MANUAL_REFUND_REASON_MAX_LENGTH) return "Manual completion reason is too long.";
  return null;
}

export interface ManualRefundCompletionRequest {
  basePath: string;
  refundId: string;
  txid: string;
  txid2?: string;
  reason: string;
  headers: Record<string, string>;
  credentials: RequestCredentials;
}

export async function postManualRefundCompletion(
  request: ManualRefundCompletionRequest,
): Promise<unknown> {
  const { response, body } = await fetchRefundQueueJson(
    `${request.basePath}/${encodeURIComponent(request.refundId)}/manual-complete`,
    {
      method: "POST",
      credentials: request.credentials,
      headers: { ...request.headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        txid: request.txid.trim(),
        ...(request.txid2?.trim() ? { txid2: request.txid2.trim() } : {}),
        reason: request.reason.trim(),
      }),
    },
  );
  if (!response.ok) throw new Error(errorText(response, body));
  return body;
}

export async function completeManualRefundRequest(
  request: ManualRefundCompletionRequest,
  refresh: () => void | Promise<void>,
): Promise<unknown> {
  const body = await postManualRefundCompletion(request);
  await refresh();
  return body;
}

export async function withManualRefundCompletionGuard<T>(
  inFlight: Set<string>,
  refundId: string,
  operation: () => Promise<T>,
): Promise<T | undefined> {
  if (inFlight.has(refundId)) return undefined;
  inFlight.add(refundId);
  try {
    return await operation();
  } finally {
    inFlight.delete(refundId);
  }
}

function errorText(response: Response, body: unknown): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (typeof record.error === "string" && record.error.length > 0 && record.error !== "internal_error") return record.error;
    if (typeof record.code === "string" && record.code.length > 0 && record.code !== "internal_error") return record.code;
  }
  return `Request failed (HTTP ${response.status}).`;
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function money(amount: string | null): string {
  if (amount == null || amount === "") return "—";
  const value = Number(amount);
  return Number.isFinite(value) ? `$${value.toFixed(2)}` : amount;
}

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export interface GroupBuyRefundCardMetadataProps {
  paymentTxids?: string[] | null;
  outgoingTxid?: string | null;
  outgoingTxid2?: string | null;
  showPayment?: boolean;
  showRefund?: boolean;
}

export function normalizePaymentTxids(value: unknown): string[] {
  return Array.isArray(value)
    ? value
      .filter((txid): txid is string => typeof txid === "string")
      .map(txid => txid.trim())
      .filter(Boolean)
    : [];
}

export function normalizeRefundQueueItem(value: unknown): GroupBuyRefundQueueItem {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    ...record,
    paymentTxids: normalizePaymentTxids(record.paymentTxids),
  } as unknown as GroupBuyRefundQueueItem;
}

export function GroupBuyRefundCardMetadata({
  paymentTxids,
  outgoingTxid,
  outgoingTxid2,
  showPayment = true,
  showRefund = true,
}: GroupBuyRefundCardMetadataProps) {
  const normalizedPaymentTxids = normalizePaymentTxids(paymentTxids);
  return (
    <>
      {showPayment && (
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment TXID(s)</p>
          {normalizedPaymentTxids.length > 0
            ? <div className="space-y-1">{normalizedPaymentTxids.map((txid, index) => <p key={`${txid}-${index}`} className="break-all font-mono text-xs">{txid}</p>)}</div>
            : <p className="text-sm">No payment TXID recorded</p>}
        </div>
      )}
      {showRefund && (outgoingTxid || outgoingTxid2) && (
        <span className="max-w-full break-all font-mono text-xs text-muted-foreground">
          Refund TXID(s): {[outgoingTxid, outgoingTxid2].filter(Boolean).join(" · ")}
        </span>
      )}
    </>
  );
}

export interface GroupBuyRefundCardListProps {
  role?: GroupBuyRefundQueueRole;
  rows: GroupBuyRefundQueueItem[];
  workingId: string | null;
  pollingId: string | null;
  txids: Record<string, string>;
  txid2s?: Record<string, string>;
  onTxidChange: (id: string, value: string) => void;
  onTxid2Change?: (id: string, value: string) => void;
  onVerify: (row: GroupBuyRefundQueueItem) => void | Promise<void>;
  reasons?: Record<string, string>;
  onReasonChange?: (id: string, value: string) => void;
  onManualComplete?: (row: GroupBuyRefundQueueItem) => void | Promise<void>;
  onCompleteCredit: (row: GroupBuyRefundQueueItem) => void | Promise<void>;
}

export function GroupBuyRefundCardList({
  role = "organiser",
  rows,
  workingId,
  pollingId,
  txids,
  txid2s = {},
  onTxidChange,
  onTxid2Change,
  onVerify,
  reasons = {},
  onReasonChange,
  onManualComplete,
  onCompleteCredit,
}: GroupBuyRefundCardListProps) {
  return (
    <div className="space-y-3">
      {rows.map(row => {
        const isCrypto = row.method === "crypto";
        const isCredit = row.method === "credit";
        const busy = workingId === row.id;
        const verifying = pollingId === row.id;
        return (
          <article key={row.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer</p><p className="text-sm font-semibold">{row.customerUsername || "—"}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Order</p><p className="text-sm font-semibold">{row.orderCode || row.orderId}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Group buy</p><p className="text-sm">{row.groupBuyName || row.groupBuyId}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Method</p><p className="text-sm">{isCrypto ? "Crypto" : isCredit ? "Credits" : "Unsupported"}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Asset</p><p className="text-sm">{isCrypto ? row.asset || "—" : isCredit ? "Account credit" : "Unsupported"}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Network</p><p className="text-sm">{isCrypto ? row.network || "—" : "—"}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Refund amount</p><p className="text-sm font-semibold">{money(row.amountUsd)}</p></div>
              <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Destination wallet</p><p className="break-all font-mono text-xs">{isCrypto ? row.destinationWallet || "—" : isCredit ? "Account credits" : "Unsupported"}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Request date</p><p className="text-sm">{dateLabel(row.requestedAt)}</p></div>
              <GroupBuyRefundCardMetadata paymentTxids={row.paymentTxids} showRefund={false} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold capitalize">Status: {statusLabel(row.status)}</span>
              <span className="text-xs text-muted-foreground">Processing attempts: {row.attempts?.length ?? 0}</span>
               <GroupBuyRefundCardMetadata paymentTxids={row.paymentTxids} outgoingTxid={row.outgoingTxid} outgoingTxid2={row.outgoingTxid2} showPayment={false} />
            </div>
            {row.verificationError && <p className="mt-2 text-xs font-medium text-red-600">{row.verificationError.message || row.verificationError.code || "Verification failed."}</p>}
            {isCrypto && row.status !== "completed" && (
              <div className="mt-3 space-y-2">
                <p className="flex items-start gap-1.5 text-xs text-amber-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Irreversible warning: confirm the destination wallet, asset, network, and amount before sending crypto externally.</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="min-w-0 flex-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Outgoing refund TXID
                    <input aria-label={`TXID for ${row.orderCode || row.orderId}`} value={txids[row.id] ?? ""} onChange={event => onTxidChange(row.id, event.target.value)} placeholder="Required first transfer TXID" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs font-normal normal-case tracking-normal text-foreground" disabled={busy || verifying} />
                  </label>
                  {role === "admin" && (
                    <label className="min-w-0 flex-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Second outgoing refund TXID
                      <input aria-label={`Second TXID for ${row.orderCode || row.orderId}`} value={txid2s[row.id] ?? ""} onChange={event => onTxid2Change?.(row.id, event.target.value)} placeholder="Optional top-up transfer TXID" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs font-normal normal-case tracking-normal text-foreground" disabled={busy || verifying} />
                    </label>
                  )}
                  <button type="button" onClick={() => void onVerify(row)} disabled={busy || verifying} className="rounded-lg bg-[#1B3A7A] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{verifying ? "Verifying…" : "Verify outgoing transfer"}</button>
                </div>
                {role === "admin" && (
                  <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
                    <p className="text-xs font-semibold text-amber-800">Admin override: this bypasses blockchain verification. Confirm the transfer was sent before completing.</p>
                    <p className="text-xs text-amber-800">Manual completion uses the outgoing refund TXID entered above.</p>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      Required manual completion reason
                      <input
                        aria-label={`Manual completion reason for ${row.orderCode || row.orderId}`}
                        value={reasons[row.id] ?? ""}
                        onChange={event => onReasonChange?.(row.id, event.target.value)}
                        placeholder="Why blockchain verification is being bypassed"
                        maxLength={MANUAL_REFUND_REASON_MAX_LENGTH}
                        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-normal normal-case tracking-normal text-foreground"
                        disabled={busy || verifying}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void onManualComplete?.(row)}
                      disabled={busy || verifying || !(txids[row.id] ?? "").trim() || !(reasons[row.id] ?? "").trim()}
                      className="rounded-lg border border-amber-700 px-3 py-2 text-xs font-bold text-amber-800 disabled:opacity-50"
                    >
                      {busy ? "Completing…" : "Mark complete manually"}
                    </button>
                  </div>
                )}
              </div>
            )}
            {isCredit && row.status !== "completed" && (
              <button type="button" onClick={() => void onCompleteCredit(row)} disabled={busy} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#1B3A7A] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Complete credit refund
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}

export interface GroupBuyRefundFilteredResultsProps extends GroupBuyRefundCardListProps {
  methodFilter: GroupBuyRefundMethodFilterValue;
  completionFilter?: GroupBuyRefundCompletionFilterValue;
  showEmptyState?: boolean;
}

export function GroupBuyRefundFilteredResults({
  rows,
  methodFilter,
  completionFilter = "all",
  showEmptyState = true,
  ...cardListProps
}: GroupBuyRefundFilteredResultsProps) {
  const filteredRows = filterRefundQueueRows(rows, methodFilter, completionFilter);
  if (showEmptyState && filteredRows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        {refundQueueEmptyLabel(rows.length === 0 ? "all" : methodFilter, rows.length === 0 ? "all" : completionFilter)}
      </p>
    );
  }
  return <GroupBuyRefundCardList rows={filteredRows} {...cardListProps} />;
}

/**
 * Manual-only processor queue. The server owns the refund amount and destination;
 * this surface only records a credit completion or verifies an externally sent TXID.
 */
export function GroupBuyRefundQueue({ role, adminSecret, groupBuyId, onUpdated }: GroupBuyRefundQueueProps) {
  const [rows, setRows] = useState<GroupBuyRefundQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [txids, setTxids] = useState<Record<string, string>>({});
  const [txid2s, setTxid2s] = useState<Record<string, string>>({});
  const [manualReasons, setManualReasons] = useState<Record<string, string>>({});
  const manualCompletionInFlight = useRef(new Set<string>());
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [pollingId, setPollingId] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState<GroupBuyRefundMethodFilterValue>("all");
  const [completionFilter, setCompletionFilter] = useState<GroupBuyRefundCompletionFilterValue>("all");

  const basePath = role === "admin" ? "/api/admin/group-buy-refunds" : "/api/organiser/group-buy-refunds";
  const headers = useMemo<Record<string, string>>(() => {
    const requestHeaders: Record<string, string> = {};
    if (role === "admin") requestHeaders["x-admin-secret"] = adminSecret ?? "";
    return requestHeaders;
  }, [role, adminSecret]);

  const load = useCallback(async (silent = false) => {
    if (role === "organiser" && !groupBuyId) {
      setRows([]);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    const params = new URLSearchParams({ limit: "100" });
    if (groupBuyId) params.set("groupBuyId", groupBuyId);
    try {
      const { response, body } = await fetchRefundQueueJson(`${basePath}?${params.toString()}`, {
        credentials: role === "organiser" ? "include" : "omit",
        headers,
      });
      if (!response.ok) throw new Error(errorText(response, body));
      setRows(Array.isArray(body) ? body.map(normalizeRefundQueueItem) : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load refund queue.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [basePath, groupBuyId, headers, role]);

  useEffect(() => { void load(); }, [load]);

  const refreshAfterMutation = useCallback(async () => {
    await load();
    await onUpdated?.();
  }, [load, onUpdated]);

  const detail = useCallback(async (id: string) => {
    const response = await fetch(`${basePath}/${encodeURIComponent(id)}`, {
      credentials: role === "organiser" ? "include" : "omit",
      headers,
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(errorText(response, body));
    return normalizeRefundQueueItem(body);
  }, [basePath, headers, role]);

  // Deliberately polls just the row selected for verification, never the whole queue.
  useEffect(() => {
    if (!pollingId) return;
    const current = rows.find(row => row.id === pollingId);
    if (!current || current.status !== "verifying") {
      setPollingId(null);
      return;
    }
    const timer = window.setInterval(() => {
      void detail(pollingId).then(updated => {
        setRows(previous => previous.map(row => row.id === updated.id ? updated : row));
        if (updated.status !== "verifying") {
          setPollingId(null);
          void refreshAfterMutation();
        }
      }).catch(cause => {
        setActionError(cause instanceof Error ? cause.message : "Unable to refresh verification status.");
        setPollingId(null);
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [detail, pollingId, refreshAfterMutation, rows]);

  const completeCredit = async (row: GroupBuyRefundQueueItem) => {
    setWorkingId(row.id);
    setActionError(null);
    try {
      const response = await fetch(`${basePath}/${encodeURIComponent(row.id)}/credit-complete`, {
        method: "POST",
        credentials: role === "organiser" ? "include" : "omit",
        headers,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorText(response, body));
      await refreshAfterMutation();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to complete credit refund.");
    } finally {
      setWorkingId(null);
    }
  };

  const verifyTransfer = async (row: GroupBuyRefundQueueItem) => {
    const txid = (txids[row.id] ?? "").trim();
    if (!txid) {
      setActionError("Enter a TXID before verifying the outgoing transfer.");
      return;
    }
    setWorkingId(row.id);
    setActionError(null);
    try {
      const response = await fetch(`${basePath}/${encodeURIComponent(row.id)}/verify`, {
        method: "POST",
        credentials: role === "organiser" ? "include" : "omit",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ txid }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorText(response, body));
      await refreshAfterMutation();
      const updated = body as GroupBuyRefundQueueItem;
      setPollingId(updated?.status === "verifying" ? row.id : null);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to verify outgoing transfer.");
      setPollingId(null);
    } finally {
      setWorkingId(null);
    }
  };

  const manuallyComplete = async (row: GroupBuyRefundQueueItem) => {
    const txid = (txids[row.id] ?? "").trim();
    const txid2 = (txid2s[row.id] ?? "").trim();
    const reason = (manualReasons[row.id] ?? "").trim();
    const inputError = validateManualCompletionInput(txid, reason);
    if (inputError) {
      setActionError(inputError);
      return;
    }
    await withManualRefundCompletionGuard(manualCompletionInFlight.current, row.id, async () => {
      setWorkingId(row.id);
      setActionError(null);
      try {
        await completeManualRefundRequest({
          basePath,
          refundId: row.id,
          txid,
          txid2: txid2 || undefined,
          reason,
          credentials: role === "organiser" ? "include" : "omit",
          headers,
        }, refreshAfterMutation);
      } catch (cause) {
        setActionError(cause instanceof Error ? cause.message : "Unable to manually complete refund.");
      } finally {
        setWorkingId(null);
      }
    });
  };

  return (
    <section className="space-y-4" aria-label="Group-buy refund queue">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-[#2D6BCC]" />
            <h3 className="text-base font-semibold">Refunds</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Manual processing only. Buyers request refunds; an admin or owning organiser completes credits or sends crypto externally.
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground disabled:opacity-50" aria-label="Refresh refund queue">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          <span>Unable to load refunds: {error}</span>
          <button type="button" onClick={() => void load()} disabled={loading} className="rounded-md border border-red-300 bg-white px-2.5 py-1 font-bold text-red-700 disabled:opacity-50">
            Retry
          </button>
        </div>
      )}
      {actionError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">Refund action failed: {actionError}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <GroupBuyRefundMethodFilter value={methodFilter} onChange={setMethodFilter} />
        <GroupBuyRefundCompletionFilter value={completionFilter} onChange={setCompletionFilter} />
      </div>
      {loading && rows.length === 0 && <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
      <GroupBuyRefundFilteredResults
        rows={rows}
        role={role}
        methodFilter={methodFilter}
        completionFilter={completionFilter}
        showEmptyState={!loading && !error}
        workingId={workingId}
        pollingId={pollingId}
        txids={txids}
        txid2s={txid2s}
        reasons={manualReasons}
        onTxidChange={(id, value) => setTxids(previous => ({ ...previous, [id]: value }))}
        onTxid2Change={(id, value) => setTxid2s(previous => ({ ...previous, [id]: value }))}
        onReasonChange={(id, value) => setManualReasons(previous => ({ ...previous, [id]: value }))}
        onVerify={verifyTransfer}
        onManualComplete={manuallyComplete}
        onCompleteCredit={completeCredit}
      />
    </section>
  );
}

export default GroupBuyRefundQueue;