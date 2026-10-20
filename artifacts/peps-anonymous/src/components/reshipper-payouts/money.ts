export const fmt = (minor: number, currency: string) =>
  `${currency.toUpperCase()} ${new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(minor / 100)}`;

/** Parses a user-entered decimal (max 2 dp) to minor units. Returns null when invalid. */
export function toMinor(input: string): number | null {
  const v = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return null;
  const [w, f = ""] = v.split(".");
  return Number(w) * 100 + Number((f + "00").slice(0, 2));
}
export const toDecimal = (minor: number) => (minor / 100).toFixed(2);

export const STATUS_LABEL: Record<string, string> = {
  needs_review: "Needs review", owed: "Owed", part_paid: "Part-paid", paid: "Paid — recorded by Admin", not_owed: "Not owed",
};
export const STATUS_TONE: Record<string, string> = {
  needs_review: "#E9A020", owed: "var(--t-blue)", part_paid: "#7c5cc4", paid: "#16a34a", not_owed: "var(--t-subtle)",
};

export async function readError(res: Response): Promise<string> {
  try { const j = await res.json(); if (j && typeof j.error === "string") return j.error; } catch { /* ignore */ }
  return `Request failed (${res.status})`;
}
