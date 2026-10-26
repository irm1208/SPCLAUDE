export interface BankAccount {
  enabled: boolean;
  accountHolder: string;
  accountNumber: string;
  bankName: string;
  sortCode?: string;
  swiftBic?: string;
  clearingCode?: string;
  bankAddress?: string;
}
export interface BankTransfer {
  uk?: BankAccount;
  international?: BankAccount;
}

/** Settings validation shared by the organiser form and every server write path. */
export function parseBankTransfer(input: unknown): BankTransfer | null {
  if (input == null) return null;
  if (typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid bank transfer settings");
  const result: BankTransfer = {};
  for (const kind of ["uk", "international"] as const) {
    const raw = (input as Record<string, unknown>)[kind];
    if (raw == null) continue;
    if (typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid bank account details");
    const obj = raw as Record<string, unknown>;
    if (typeof obj.enabled !== "boolean") throw new Error("Bank transfer enabled must be true or false");
    const account = { enabled: obj.enabled } as BankAccount;
    for (const key of ["accountHolder", "accountNumber", "bankName", "sortCode", "swiftBic", "clearingCode", "bankAddress"] as const) {
      if (obj[key] != null && typeof obj[key] !== "string") throw new Error(`Invalid bank ${key}`);
      account[key] = ((obj[key] as string | undefined) ?? "").trim();
      if (account[key]!.length > (key === "bankAddress" ? 1000 : 200)) throw new Error(`Bank ${key} is too long`);
    }
    account.swiftBic = account.swiftBic?.toUpperCase();
    if (account.enabled) {
      if (!account.accountHolder || !account.accountNumber || !account.bankName)
        throw new Error(`${kind === "uk" ? "UK" : "International"} bank transfer needs an account holder, account number and bank name`);
      if (kind === "uk" && (!/^\d{6}$/.test(account.sortCode!.replace(/[-\s]/g, "")) || !/^\d{8}$/.test(account.accountNumber)))
        throw new Error("UK bank transfer needs a 6-digit sort code and an 8-digit account number");
      if (kind === "international" && (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(account.swiftBic!) || !account.bankAddress))
        throw new Error("International bank transfer needs a valid 8- or 11-character SWIFT/BIC and the bank's full address");
    }
    result[kind] = account;
  }
  return result;
}

export function hasBankTransfer(input: unknown): boolean {
  try {
    const parsed = parseBankTransfer(input);
    return !!(parsed?.uk?.enabled || parsed?.international?.enabled);
  } catch {
    return false;
  }
}
