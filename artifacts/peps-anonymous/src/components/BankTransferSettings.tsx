import type { BankAccount, BankTransfer } from "@workspace/api-zod/bank-transfer";

const emptyAccount = (): BankAccount => ({ enabled: false, accountHolder: "", accountNumber: "", sortCode: "", swiftBic: "", clearingCode: "", bankName: "", bankAddress: "" });

export function BankTransferSettings({ value, onChange }: { value: BankTransfer | null | undefined; onChange: (value: BankTransfer) => void }) {
  return <fieldset className="rounded-xl border p-4 space-y-4" style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }}>
    <legend className="px-2 font-bold text-sm">Bank transfer</legend>
    <p className="text-xs" style={{ color: "var(--t-subtle)" }}>Members transfer to your bank using their order number as the reference. You must confirm receipt manually.</p>
    {(["uk", "international"] as const).map(kind => {
      const account = { ...emptyAccount(), ...value?.[kind] };
      const update = (patch: Partial<BankAccount>) => onChange({ ...value, [kind]: { ...account, ...patch } });
      const fields: [keyof BankAccount, string][] = [
        ["accountHolder", "Account holder’s name"],
        ...(kind === "uk" ? [["sortCode", "Sort code"]] as [keyof BankAccount, string][] : []),
        ["accountNumber", kind === "uk" ? "Account number" : "Account number or IBAN"],
        ...(kind === "international" ? [["swiftBic", "SWIFT / BIC"], ["clearingCode", "National clearing code / routing number (optional)"]] as [keyof BankAccount, string][] : []),
        ["bankName", "Bank name"],
        ...(kind === "international" ? [["bankAddress", "Bank full address"]] as [keyof BankAccount, string][] : []),
      ];
      return <div key={kind} className="space-y-3">
        <label className="flex items-center gap-2 font-semibold text-sm">
          <input type="checkbox" checked={account.enabled} onChange={e => update({ enabled: e.target.checked })} />
          {kind === "uk" ? "UK → UK bank transfer" : "International bank transfer"}
        </label>
        {account.enabled && <div className="grid gap-3 sm:grid-cols-2">{fields.map(([field, label]) =>
          <label key={field} className={`block text-xs font-semibold ${field === "bankAddress" ? "sm:col-span-2" : ""}`}>
            {label}
            <input type="text" value={String(account[field] ?? "")} onChange={e => update({ [field]: e.target.value })}
              maxLength={field === "bankAddress" ? 1000 : 200}
              placeholder={field === "sortCode" ? "12-34-56" : field === "swiftBic" ? "8 or 11 characters" : ""}
              className="mt-1 w-full rounded-lg border px-3 py-2 font-normal text-sm"
              style={{ background: "var(--t-surface)", color: "var(--t-text)", borderColor: "var(--t-border)" }} />
          </label>)}</div>}
      </div>;
    })}
  </fieldset>;
}
