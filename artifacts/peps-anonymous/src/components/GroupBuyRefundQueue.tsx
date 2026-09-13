import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  outgoingTxid?: string | null;
  explorerUrl?: string | null;
  verificationError?: { code?: string | null; message?: string | null } | null;
  attempts?: Array<{ id: string; submittedTxid?: string | null }>;
}

export interface GroupBuyRefundQueueProps {
  role: GroupBuyRefundQueueRole;
  adminSecret?: string;
  groupBuyId?: string | null;
  onUpdated?: () => void | Promise<void>;
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
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [pollingId, setPollingId] = useState<string | null>(null);

  const basePath = role === "admin" ? "/api/admin/group-buy-refunds" : "/api/organiser/group-buy-refunds";
  const headers = useMemo(() => role === "admin"
    ? { "x-admin-secret": adminSecret ?? "" }
    : {}, [role, adminSecret]);

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
      const response = await fetch(`${basePath}?${params.toString()}`, {
        credentials: role === "organiser" ? "include" : "omit",
        headers,
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorText(response, body));
      setRows(Array.isArray(body) ? body as GroupBuyRefundQueueItem[] : []);
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
    return body as GroupBuyRefundQueueItem;
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

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">Unable to load refunds: {error}</p>}
      {actionError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">Refund action failed: {actionError}</p>}
      {loading && rows.length === 0 && <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
      {!loading && !error && rows.length === 0 && <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">No refund requests.</p>}

      <div className="space-y-3">
        {rows.map(row => {
          const isCrypto = row.method === "crypto";
          const busy = workingId === row.id;
          const verifying = pollingId === row.id;
          return (
            <article key={row.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer</p><p className="text-sm font-semibold">{row.customerUsername || "—"}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Order</p><p className="text-sm font-semibold">{row.orderCode || row.orderId}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Group buy</p><p className="text-sm">{row.groupBuyName || row.groupBuyId}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Asset</p><p className="text-sm">{isCrypto ? row.asset || "—" : "Account credit"}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Network</p><p className="text-sm">{isCrypto ? row.network || "—" : "—"}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Refund amount</p><p className="text-sm font-semibold">{money(row.amountUsd)}</p></div>
                <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Destination wallet</p><p className="break-all font-mono text-xs">{isCrypto ? row.destinationWallet || "—" : "Account credits"}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Request date</p><p className="text-sm">{dateLabel(row.requestedAt)}</p></div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold capitalize">Status: {statusLabel(row.status)}</span>
                <span className="text-xs text-muted-foreground">Processing attempts: {row.attempts?.length ?? 0}</span>
                {row.outgoingTxid && <span className="max-w-full break-all font-mono text-xs text-muted-foreground">TXID: {row.outgoingTxid}</span>}
              </div>
              {row.verificationError && <p className="mt-2 text-xs font-medium text-red-600">{row.verificationError.message || row.verificationError.code || "Verification failed."}</p>}
              {isCrypto && row.status !== "completed" && (
                <div className="mt-3 space-y-2">
                  <p className="flex items-start gap-1.5 text-xs text-amber-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Irreversible warning: confirm the destination wallet, asset, network, and amount before sending crypto externally.</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input aria-label={`TXID for ${row.orderCode || row.orderId}`} value={txids[row.id] ?? ""} onChange={event => setTxids(previous => ({ ...previous, [row.id]: event.target.value }))} placeholder="Enter outgoing transfer TXID" className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs" disabled={busy || verifying} />
                    <button type="button" onClick={() => void verifyTransfer(row)} disabled={busy || verifying} className="rounded-lg bg-[#1B3A7A] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{verifying ? "Verifying…" : "Verify outgoing transfer"}</button>
                  </div>
                </div>
              )}
              {!isCrypto && row.status !== "completed" && (
                <button type="button" onClick={() => void completeCredit(row)} disabled={busy} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#1B3A7A] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Complete credit refund
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default GroupBuyRefundQueue;