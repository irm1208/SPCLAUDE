import { Children, createElement, isValidElement } from "react";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GroupBuyRefundCardMetadata,
  GroupBuyRefundCardList,
  GroupBuyRefundCompletionFilter,
  GroupBuyRefundFilteredResults,
  GroupBuyRefundMethodFilter,
  type GroupBuyRefundCompletionFilterValue,
  type GroupBuyRefundMethodFilterValue,
  filterRefundQueueRowsByCompletion,
  filterRefundQueueRows,
  fetchRefundQueueJson,
  normalizeRefundQueueItem,
  completeManualRefundRequest,
  MANUAL_REFUND_REASON_MAX_LENGTH,
  postManualRefundCompletion,
  refundQueueEmptyLabel,
  validateManualCompletionInput,
  withManualRefundCompletionGuard,
} from "./GroupBuyRefundQueue";

describe("GroupBuyRefundQueue", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("aborts a queue request and reports a timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("The operation was aborted.", "AbortError"));
      });
    })));

    const request = fetchRefundQueueJson("/api/admin/group-buy-refunds?limit=100", {
      headers: { "x-admin-secret": "test-secret" },
    });
    const rejection = expect(request).rejects.toThrow("timed out");

    await vi.advanceTimersByTimeAsync(15_000);

    await rejection;
  });

  it("renders every incoming payment TXID with an explicit empty state and separates refund TXIDs", () => {
    const markup = renderToStaticMarkup(createElement(GroupBuyRefundCardMetadata, {
      paymentTxids: ["payment-1", "payment-2"],
      outgoingTxid: "refund-1",
    }));
    expect(markup).toContain("Payment TXID(s)");
    expect(markup).toContain("payment-1");
    expect(markup).toContain("payment-2");
    expect(markup).toContain("Refund TXID(s): refund-1");

    const emptyMarkup = renderToStaticMarkup(createElement(GroupBuyRefundCardMetadata, {
      paymentTxids: null,
      outgoingTxid: null,
    }));
    expect(emptyMarkup).toContain("No payment TXID recorded");
  });

  it("renders both outgoing refund TXIDs without blank second-transfer noise", () => {
    const markup = renderToStaticMarkup(createElement(GroupBuyRefundCardMetadata, {
      outgoingTxid: "0x" + "1".repeat(64),
      outgoingTxid2: "0x" + "2".repeat(64),
      showPayment: false,
    }));
    expect(markup).toContain("Refund TXID(s):");
    expect(markup).toContain("0x" + "1".repeat(64));
    expect(markup).toContain("0x" + "2".repeat(64));
    expect(markup).not.toContain("undefined");
  });

  it("normalizes missing and legacy payment TXID fields for list/detail/polling data", () => {
    expect(normalizeRefundQueueItem({ paymentTxids: ["  payment-1  ", 42, ""] }).paymentTxids).toEqual(["payment-1"]);
    expect(normalizeRefundQueueItem({ paymentTxids: null }).paymentTxids).toEqual([]);
    expect(normalizeRefundQueueItem({ paymentTxids: "legacy-payment" }).paymentTxids).toEqual([]);
    expect(normalizeRefundQueueItem({}).paymentTxids).toEqual([]);
  });

  it("filters loaded refund rows by the exact selected method while keeping unknown methods in All", () => {
    const rows = [
      { id: "crypto-1", method: "crypto", status: "requested" },
      { id: "credit-1", method: "credit", status: "requested" },
      { id: "legacy-1", method: "legacy", status: "unknown" },
    ];

    expect(filterRefundQueueRows(rows, "all")).toEqual(rows);
    expect(filterRefundQueueRows(rows, "crypto")).toEqual([rows[0]]);
    expect(filterRefundQueueRows(rows, "credit")).toEqual([rows[1]]);
  });

  it("requires status data for completion-aware pure filtering and keeps method filtering exact", () => {
    const rows = [
      { id: "done-crypto", method: "crypto", status: "completed" },
      { id: "open-crypto", method: "crypto", status: "requested" },
      { id: "done-credit", method: "credit", status: "completed" },
    ];

    expect(filterRefundQueueRows(rows, "crypto", "done")).toEqual([rows[0]]);
    expect(filterRefundQueueRows(rows, "crypto", "not_done")).toEqual([rows[1]]);

    // @ts-expect-error Completion-aware filtering must not accept rows without status.
    filterRefundQueueRows([{ method: "crypto" }], "crypto", "done");
  });

  it("filters completion by exact completed status and treats every other status as not done", () => {
    const rows = [
      refundRow("done", "crypto", "done-customer", "completed"),
      refundRow("requested", "crypto", "requested-customer", "requested"),
      refundRow("verifying", "crypto", "verifying-customer", "verifying"),
      refundRow("failed", "crypto", "failed-customer", "verification_failed"),
      refundRow("unknown", "crypto", "unknown-customer", "unknown"),
    ];

    expect(filterRefundQueueRowsByCompletion(rows, "all")).toEqual(rows);
    expect(filterRefundQueueRowsByCompletion(rows, "done")).toEqual([rows[0]]);
    expect(filterRefundQueueRowsByCompletion(rows, "not_done")).toEqual(rows.slice(1));
  });

  it("renders keyboard-native method filters with an accessible pressed state", () => {
    const markup = renderToStaticMarkup(createElement(GroupBuyRefundMethodFilter, {
      value: "crypto",
      onChange: () => undefined,
    }));

    expect(markup).toContain('aria-label="Filter refund requests"');
    expect(markup).toContain(">All</button>");
    expect(markup).toContain(">Crypto</button>");
    expect(markup).toContain(">Credits</button>");
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain("<button");
    expect(markup).not.toContain('role="button"');
    expect(markup).toContain("focus-visible:ring-2");
  });

  it("invokes native filter button handlers without requiring a DOM", () => {
    const selected: GroupBuyRefundMethodFilterValue[] = [];
    const selector = GroupBuyRefundMethodFilter({
      value: "all",
      onChange: value => selected.push(value),
    });
    const buttons = Children.toArray((selector as ReactElement).props.children).filter(isValidElement) as Array<ReactElement<{ onClick: () => void }>>;

    buttons[1].props.onClick();
    buttons[2].props.onClick();

    expect(selected).toEqual(["crypto", "credit"]);
  });

  it("renders and invokes an independently labelled completion filter with a default All state", () => {
    const selected: GroupBuyRefundCompletionFilterValue[] = [];
    const selector = GroupBuyRefundCompletionFilter({
      value: "all",
      onChange: value => selected.push(value),
    });
    const markup = renderToStaticMarkup(selector);
    const buttons = Children.toArray((selector as ReactElement).props.children).filter(isValidElement) as Array<ReactElement<{ onClick: () => void }>>;

    expect(markup).toContain('aria-label="Filter refund completion"');
    expect(markup).toContain(">All</button>");
    expect(markup).toContain(">Done</button>");
    expect(markup).toContain(">Not done</button>");
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain("focus-visible:ring-2");

    buttons[1].props.onClick();
    buttons[2].props.onClick();
    expect(selected).toEqual(["done", "not_done"]);
  });

  it("uses distinct empty states for filtered queues and preserves the queue empty state", () => {
    expect(refundQueueEmptyLabel("all")).toBe("No refund requests.");
    expect(refundQueueEmptyLabel("crypto")).toBe("No crypto refund requests.");
    expect(refundQueueEmptyLabel("credit")).toBe("No credit refund requests.");
    expect(refundQueueEmptyLabel("all", "done")).toBe("No done refund requests.");
    expect(refundQueueEmptyLabel("all", "not_done")).toBe("No unfinished refund requests.");
    expect(refundQueueEmptyLabel("crypto", "not_done")).toBe("No unfinished crypto refund requests.");
  });

  it("filters SSR card results for All, Crypto, and Credits", () => {
    const rows = [
      refundRow("crypto-1", "crypto", "crypto-customer"),
      refundRow("credit-1", "credit", "credit-customer"),
    ];
    const allMarkup = renderFilteredResults(rows, "all");
    const cryptoMarkup = renderFilteredResults(rows, "crypto");
    const creditMarkup = renderFilteredResults(rows, "credit");

    expect(allMarkup).toContain("crypto-customer");
    expect(allMarkup).toContain("credit-customer");
    expect(cryptoMarkup).toContain("crypto-customer");
    expect(cryptoMarkup).not.toContain("credit-customer");
    expect(creditMarkup).not.toContain("crypto-customer");
    expect(creditMarkup).toContain("credit-customer");
  });

  it("combines method and completion filters with AND semantics", () => {
    const rows = [
      refundRow("done-crypto", "crypto", "done-crypto-customer", "completed"),
      refundRow("open-crypto", "crypto", "open-crypto-customer", "requested"),
      refundRow("done-credit", "credit", "done-credit-customer", "completed"),
    ];
    const markup = renderFilteredResults(rows, "crypto", "not_done");

    expect(markup).toContain("open-crypto-customer");
    expect(markup).not.toContain("done-crypto-customer");
    expect(markup).not.toContain("done-credit-customer");
  });

  it("shows the queue empty state when the filtered results have no requests", () => {
    const markup = renderFilteredResults([], "all");

    expect(markup).toContain("No refund requests.");
  });

  it("shows a selected-method empty state when requests exist for another method", () => {
    const markup = renderFilteredResults([refundRow("credit-1", "credit", "credit-customer")], "crypto");

    expect(markup).toContain("No crypto refund requests.");
    expect(markup).not.toContain("No refund requests.");
  });

  it("describes completion empty states and preserves the truly empty queue label", () => {
    expect(renderFilteredResults([refundRow("done-1", "crypto", "done-customer", "completed")], "all", "not_done"))
      .toContain("No unfinished refund requests.");
    expect(renderFilteredResults([refundRow("open-1", "credit", "open-customer", "requested")], "crypto", "done"))
      .toContain("No done crypto refund requests.");
    expect(renderFilteredResults([], "all", "not_done"))
      .toContain("No refund requests.");
  });

  it("renders unknown methods as Unsupported without either mutation action", () => {
    const markup = renderToStaticMarkup(createElement(GroupBuyRefundCardList, {
      rows: [refundRow("legacy-1", "legacy", "legacy-customer")],
      workingId: null,
      pollingId: null,
      txids: {},
      onTxidChange: () => undefined,
      onVerify: () => undefined,
      onCompleteCredit: () => undefined,
    }));

    expect(markup).toContain("Unsupported");
    expect(markup).not.toContain("Verify outgoing transfer");
    expect(markup).not.toContain("Complete credit refund");
  });

  it("renders manual completion only for Admin crypto cards with a required reason warning", () => {
    const row = refundRow("admin-crypto", "crypto", "admin-customer");
    const adminMarkup = renderToStaticMarkup(createElement(GroupBuyRefundCardList, {
      role: "admin",
      rows: [row],
      workingId: null,
      pollingId: null,
      txids: { [row.id]: "0x" + "a".repeat(64) },
      txid2s: { [row.id]: "0x" + "b".repeat(64) },
      reasons: { [row.id]: "Provider unavailable" },
      onTxidChange: () => undefined,
      onReasonChange: () => undefined,
      onVerify: () => undefined,
      onManualComplete: () => undefined,
      onCompleteCredit: () => undefined,
    }));
    expect(adminMarkup).toContain("Mark complete manually");
    expect(adminMarkup).toContain("verification. Confirm the transfer was sent");
    expect(adminMarkup).toContain("Manual completion reason");
    expect(adminMarkup).toContain("Second TXID for ORDER-admin-crypto");
    expect(adminMarkup).toContain("0x" + "b".repeat(64));

    const organiserMarkup = renderToStaticMarkup(createElement(GroupBuyRefundCardList, {
      role: "organiser",
      rows: [row],
      workingId: null,
      pollingId: null,
      txids: {},
      onTxidChange: () => undefined,
      onVerify: () => undefined,
      onCompleteCredit: () => undefined,
    }));
    expect(organiserMarkup).not.toContain("Mark complete manually");
    expect(organiserMarkup).not.toContain("Manual completion reason");
    expect(organiserMarkup).not.toContain("Second TXID");
  });

  it("wires the Admin card's entered second TXID into the exact manual POST body", async () => {
    const row = refundRow("admin-integrated", "crypto", "admin-integrated-customer");
    const txid = "0x" + "a".repeat(64);
    const txid2 = "0x" + "b".repeat(64);
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => response({ status: "completed" }));
    vi.stubGlobal("fetch", fetchMock);
    const card = GroupBuyRefundCardList({
      role: "admin",
      rows: [row],
      workingId: null,
      pollingId: null,
      txids: { [row.id]: txid },
      txid2s: { [row.id]: txid2 },
      reasons: { [row.id]: "Provider unavailable" },
      onTxidChange: () => undefined,
      onTxid2Change: () => undefined,
      onReasonChange: () => undefined,
      onVerify: () => undefined,
      onManualComplete: selected => postManualRefundCompletion({
        basePath: "/api/admin/group-buy-refunds",
        refundId: selected.id,
        txid,
        txid2,
        reason: "Provider unavailable",
        headers: {},
        credentials: "omit",
      }),
      onCompleteCredit: () => undefined,
    });
    const button = findButton(card, "Mark complete manually");
    expect(button).toBeDefined();
    await button!.props.onClick();
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      txid,
      txid2,
      reason: "Provider unavailable",
    });
  });

  it("validates missing manual TXID and reason before making a request", () => {
    expect(validateManualCompletionInput("", "reason")).toContain("TXID");
    expect(validateManualCompletionInput("0x" + "a".repeat(64), " ")).toContain("reason");
    expect(MANUAL_REFUND_REASON_MAX_LENGTH).toBe(1000);
    expect(validateManualCompletionInput("0x" + "a".repeat(64), "x".repeat(MANUAL_REFUND_REASON_MAX_LENGTH + 1))).toContain("too long");
    expect(validateManualCompletionInput("0x" + "a".repeat(64), "reason")).toBeNull();
  });

  it("posts the exact manual completion URL/body and refreshes only after success", async () => {
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("/api/admin/group-buy-refunds/refund-1/manual-complete");
      expect(init.method).toBe("POST");
      expect(init.body).toBe(JSON.stringify({ txid: "0x" + "a".repeat(64), reason: "because" }));
      return response({ status: "completed" });
    });
    vi.stubGlobal("fetch", fetchMock);
    const refreshed: string[] = [];
    await completeManualRefundRequest({
      basePath: "/api/admin/group-buy-refunds",
      refundId: "refund-1",
      txid: "  0x" + "a".repeat(64) + " ",
      reason: " because ",
      headers: { "x-admin-secret": "secret" },
      credentials: "omit",
    }, async () => { refreshed.push("yes"); });
    expect(refreshed).toEqual(["yes"]);
  });

  it("includes a nonblank second TXID in the manual request while omitting blank txid2", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => response({ status: "completed" }));
    vi.stubGlobal("fetch", fetchMock);
    await postManualRefundCompletion({
      basePath: "/api/admin/group-buy-refunds",
      refundId: "refund-1",
      txid: "0x" + "a".repeat(64),
      txid2: "  0x" + "b".repeat(64) + " ",
      reason: "because",
      headers: {},
      credentials: "omit",
    });
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      txid: "0x" + "a".repeat(64),
      txid2: "0x" + "b".repeat(64),
      reason: "because",
    });
  });

  it("surfaces server errors and does not refresh after a failed manual request", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ code: "txid_replay" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    })));
    await expect(postManualRefundCompletion({
      basePath: "/api/admin/group-buy-refunds",
      refundId: "refund-1",
      txid: "0x" + "a".repeat(64),
      reason: "because",
      headers: {},
      credentials: "omit",
    })).rejects.toThrow("txid_replay");
  });

  it("coalesces rapid duplicate manual completion invocations per refund", async () => {
    const inFlight = new Set<string>();
    let requests = 0;
    const operation = () => withManualRefundCompletionGuard(inFlight, "refund-1", async () => {
      requests += 1;
      await new Promise(resolve => setTimeout(resolve, 5));
      return "completed";
    });
    const results = await Promise.all([operation(), operation()]);
    expect(requests).toBe(1);
    expect(results).toEqual(["completed", undefined]);
    expect(inFlight).toEqual(new Set());
  });

  it("keeps the normal verify request path and payload unchanged", async () => {
    const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("./GroupBuyRefundQueue.tsx", import.meta.url), "utf8"));
    expect(source).toContain('/verify');
    expect(source).toContain('body: JSON.stringify({ txid })');
    expect(source).toContain('Verify outgoing transfer');
  });
});

function response(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function refundRow(
  id: string,
  method: "crypto" | "credit" | "legacy",
  customerUsername: string,
  status: string = "requested",
) {
  return {
    id,
    orderId: `order-${id}`,
    orderCode: `ORDER-${id}`,
    groupBuyId: "group-buy-1",
    groupBuyName: "Test group buy",
    customerUsername,
    method,
    asset: method === "crypto" ? "USDT" : null,
    network: method === "crypto" ? "TRC20" : null,
    amountUsd: "12.50",
    destinationWallet: method === "crypto" ? "wallet-1" : null,
    status,
    requestedAt: "2026-01-01T00:00:00.000Z",
    paymentTxids: [`payment-${id}`],
  };
}

function findButton(node: unknown, label: string): ReactElement<{ onClick: () => void | Promise<void> }> | undefined {
  if (!isValidElement(node)) return undefined;
  const element = node as ReactElement<any>;
  if (element.type === "button" && Children.toArray(element.props.children).join("").includes(label)) {
    return element as ReactElement<{ onClick: () => void | Promise<void> }>;
  }
  for (const child of Children.toArray(element.props.children)) {
    const found = findButton(child, label);
    if (found) return found;
  }
  return undefined;
}

function renderFilteredResults(
  rows: ReturnType<typeof refundRow>[],
  methodFilter: GroupBuyRefundMethodFilterValue,
  completionFilter: GroupBuyRefundCompletionFilterValue = "all",
): string {
  return renderToStaticMarkup(createElement(GroupBuyRefundFilteredResults, {
    rows,
    methodFilter,
    completionFilter,
    workingId: null,
    pollingId: null,
    txids: {},
    onTxidChange: () => undefined,
    onVerify: () => undefined,
    onCompleteCredit: () => undefined,
  }));
}
