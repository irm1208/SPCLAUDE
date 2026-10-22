export interface ExportPaymentFields {
  paymentTxHash?: string | null;
  paymentTxHashes?: string[] | null;
  testPaymentTxHash?: string | null;
  balanceTxHash?: string | null;
}

export const PAYMENT_EXPORT_HEADERS = [
  "Payment TXIDs", "Test Payment TXID", "Balance / Top-up TXID",
];

function transactionId(value: string | null | undefined): string {
  const txid = value?.trim() ?? "";
  return /^(fiat|anonpay|test):/i.test(txid) ? "" : txid;
}

export function paymentExportCells(order: ExportPaymentFields): string[] {
  const seen = new Set<string>();
  const payments = [order.paymentTxHash, ...(order.paymentTxHashes ?? [])]
    .map(transactionId)
    .filter(txid => {
      if (!txid) return false;
      // EVM hashes are case-insensitive; Solana signatures are not.
      const key = /^(0x)?[0-9a-f]{64}$/i.test(txid)
        ? txid.replace(/^0x/i, "").toLowerCase() : txid;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return [
    payments.join("; "),
    transactionId(order.testPaymentTxHash),
    transactionId(order.balanceTxHash),
  ];
}

export function encodeCsv(rows: unknown[][]): string {
  return rows.map(row => row.map(cell =>
    `"${String(cell ?? "").replace(/"/g, '""')}"`,
  ).join(",")).join("\n");
}
