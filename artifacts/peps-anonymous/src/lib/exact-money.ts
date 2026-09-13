const MONEY_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

function normalizedMoney(value: string | number): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("money_format");
    return value.toFixed(2);
  }
  if (!MONEY_PATTERN.test(value)) throw new Error("money_format");
  return value;
}

export function moneyToCents(value: string | number): bigint {
  const normalized = normalizedMoney(value);
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole, fraction = ""] = unsigned.split(".");
  const cents = BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
  return negative ? -cents : cents;
}

export function centsToMoneyString(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const value = `${absolute / 100n}.${(absolute % 100n).toString().padStart(2, "0")}`;
  return negative ? `-${value}` : value;
}

export function centsToMoneyNumber(cents: bigint): number {
  return Number(centsToMoneyString(cents));
}

export function subtractMoneyClamped(left: string | number, ...deductions: Array<string | number>): number {
  const result = deductions.reduce(
    (remaining, deduction) => remaining - moneyToCents(deduction),
    moneyToCents(left),
  );
  return centsToMoneyNumber(result > 0n ? result : 0n);
}

export function addMoney(left: string | number, right: string | number): number {
  return centsToMoneyNumber(moneyToCents(left) + moneyToCents(right));
}

export function sumMoneyCents(values: Array<string | number>): bigint {
  return values.reduce((total, value) => total + moneyToCents(value), 0n);
}

export function minMoney(left: string | number, right: string | number): number {
  const leftCents = moneyToCents(left);
  const rightCents = moneyToCents(right);
  return centsToMoneyNumber(leftCents < rightCents ? leftCents : rightCents);
}