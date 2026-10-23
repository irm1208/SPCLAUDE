/** Keep the provider session ID separate from the actual outgoing blockchain TXID. */
export function AnonPayPaymentDetails({ value, explorerUrl }: {
  value: string;
  explorerUrl?: (hash: string) => string;
}) {
  const [paymentId, outgoingHash] = value.replace(/^anonpay:/, "").split("|");
  return (
    <div className="min-w-0 space-y-1 text-xs">
      <p className="text-[10px] text-muted-foreground">AnonPay Payment ID</p>
      <a className="font-mono break-all text-primary hover:underline select-all"
        href={`https://trocador.app/en/anonpay/${encodeURIComponent(paymentId)}`}
        target="_blank" rel="noopener noreferrer">{paymentId}</a>
      <p className="text-[10px] text-muted-foreground pt-1">Blockchain TXID</p>
      {outgoingHash ? (explorerUrl ? (
        <a className="block font-mono break-all text-primary hover:underline select-all"
          href={explorerUrl(outgoingHash)} target="_blank" rel="noopener noreferrer">{outgoingHash}</a>
      ) : <p className="font-mono break-all select-all">{outgoingHash}</p>)
        : <p className="text-[10px] text-muted-foreground">Not available from AnonPay yet</p>}
    </div>
  );
}
