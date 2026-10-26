import { useState } from "react";
import type { BankTransfer } from "@workspace/api-zod/bank-transfer";

export function BankTransferDetails({ value, reference }: { value: BankTransfer; reference: string }) {
  const [copyMessage, setCopyMessage] = useState("");
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setCopyMessage("Copied"); }
    catch { setCopyMessage("Could not copy. Select and copy the details manually."); }
  }
  const row = (label: string, text?: string) => text ? <div key={label} className="flex items-start justify-between gap-3 border-b py-2" style={{ borderColor: "var(--t-border)" }}>
    <div className="min-w-0"><p className="text-xs" style={{ color: "var(--t-subtle)" }}>{label}</p><p className="text-sm font-semibold whitespace-pre-wrap break-words">{text}</p></div>
    <button type="button" className="shrink-0 text-xs underline p-1" aria-label={`Copy ${label}`} onClick={() => copy(text)}>Copy</button>
  </div> : null;
  return <div className="space-y-4" style={{ color: "var(--t-text)" }}>
    {(["uk", "international"] as const).map(kind => {
      const a = value[kind];
      if (!a?.enabled) return null;
      return <section key={kind} className="rounded-xl border p-3" style={{ borderColor: "var(--t-border)" }}>
        <h4 className="font-bold text-sm mb-2">{kind === "uk" ? "UK → UK" : "International"}</h4>
        {row("Account holder", a.accountHolder)}
        {kind === "uk" && row("Sort code", a.sortCode)}
        {row(kind === "uk" ? "Account number" : "Account number or IBAN", a.accountNumber)}
        {kind === "international" && <>{row("SWIFT / BIC", a.swiftBic)}{row("Clearing code / routing number", a.clearingCode)}</>}
        {row("Bank name", a.bankName)}
        {kind === "international" && row("Bank full address", a.bankAddress)}
      </section>;
    })}
    {row("Payment reference", reference)}
    <p className="text-xs" role="status">{copyMessage}</p>
  </div>;
}
