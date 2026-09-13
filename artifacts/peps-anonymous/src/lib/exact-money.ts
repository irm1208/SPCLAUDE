const MONEY_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
const SIGNED_MONEY_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
const MAX_SAFE_CENTS = BigInt(Number.MAX_SAFE_INTEGER);

function normalizedMoney(value: string | number, signed: boolean): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("money_format");
    const stringValue = String(value);
    if (signed ? !SIGNED_MONEY_PATTERN.test(stringValue) : !MONEY_PATTERN.test(stringValue)) {
      throw new Error("money_format");
    }
    return stringValue;
  }
  if (signed ? !SIGNED_MONEY_PATTERN.test(value) : !MONEY_PATTERN.test(value)) throw new Error("money_format");
  return value;
}

function parseMoneyCents(value: string | number, signed: boolean): bigint {
  const normalized = normalizedMoney(value, signed);
  const negative = normalized.startsWith("-");
  if (!signed && negative) throw new Error("money_negative");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole, fraction = ""] = unsigned.split(".");
  const cents = BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
  const result = negative ? -cents : cents;
  if (result > MAX_SAFE_CENTS || result < -MAX_SAFE_CENTS) throw new Error("money_range");
  return result;
}

export function moneyToCents(value: string | number): bigint {
  return parseMoneyCents(value, false);
}

export function signedMoneyToCents(value: string | number): bigint {
  return parseMoneyCents(value, true);
}

export function centsToMoneyString(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const value = `${absolute / 100n}.${(absolute % 100n).toString().padStart(2, "0")}`;
  return negative ? `-${value}` : value;
}

export function centsToMoneyNumber(cents: bigint): number {
  if (cents > MAX_SAFE_CENTS || cents < -MAX_SAFE_CENTS) throw new Error("money_range");
  return Number(centsToMoneyString(cents));
}

export function safeMoneyToCents(value: string | number): bigint | null {
  try {
    return moneyToCents(value);
  } catch {
    return null;
  }
}

export function safeSignedMoneyToCents(value: string | number): bigint | null {
  try {
    return signedMoneyToCents(value);
  } catch {
    return null;
  }
}

export function safeCentsToMoneyNumber(cents: bigint, fallback = 0): number {
  try {
    return centsToMoneyNumber(cents);
  } catch {
    return fallback;
  }
}

export function subtractMoneyClamped(left: string | number, ...deductions: Array<string | number>): number {
  const result = deductions.reduce(
    (remaining, deduction) => remaining - moneyToCents(deduction),
    moneyToCents(left),
  );
  return centsToMoneyNumber(result > 0n ? result : 0n);
}

export function safeSubtractMoneyClamped(left: string | number, ...deductions: Array<string | number>): number {
  try {
    return subtractMoneyClamped(left, ...deductions);
  } catch {
    return 0;
  }
}

export function addMoney(left: string | number, right: string | number): number {
  return centsToMoneyNumber(moneyToCents(left) + moneyToCents(right));
}

export function sumMoneyCents(values: Array<string | number>): bigint {
  return values.reduce((total, value) => total + signedMoneyToCents(value), 0n);
}

export function sumCents(values: bigint[]): bigint {
  return values.reduce((total, value) => total + value, 0n);
}

export function safeAddMoney(left: string | number, right: string | number): number {
  try {
    return addMoney(left, right);
  } catch {
    return 0;
  }
}

export function safeMinMoney(left: string | number, right: string | number): number {
  try {
    return minMoney(left, right);
  } catch {
    return 0;
  }
}

export function minMoney(left: string | number, right: string | number): number {
  const leftCents = moneyToCents(left);
  const rightCents = moneyToCents(right);
  return centsToMoneyNumber(leftCents < rightCents ? leftCents : rightCents);
}