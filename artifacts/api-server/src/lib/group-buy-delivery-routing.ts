import { assignedPostageCountries } from "./reshipper-postage-scope";
import { normalizeToCode } from "./country-utils";

type Assignment = { reshipperUsername: string; country?: string | null; countries?: string[] | null; enabled: boolean };
export class DeliveryRoutingError extends Error { status = 400; }
const key = (value: string) => value.trim().replace(/^@/, "").toLowerCase();

export function resolvePostageReshipper(
  requested: string | null | undefined, country: string | null | undefined, assignments: Assignment[],
): string | null {
  const code = country ? normalizeToCode(country) : null;
  const candidates = assignments.filter(row => row.enabled && code && assignedPostageCountries([row]).has(code));
  if (requested) {
    const selected = candidates.find(row => key(row.reshipperUsername) === key(requested));
    if (!selected) throw new DeliveryRoutingError("The selected postage reshipper is no longer enabled for this country. Choose another delivery option or contact the organiser.");
    return selected.reshipperUsername;
  }
  const names = [...new Set(candidates.map(row => row.reshipperUsername))];
  return names.length === 1 ? names[0] : null;
}

export function validatePostageRouting(options: { country?: string | null; reshipperUsername?: string | null }[], assignments: Assignment[]) {
  for (const option of options) {
    if (!option.reshipperUsername) continue;
    if (!option.country) return "Choose a country before assigning a postage reshipper.";
    try { resolvePostageReshipper(option.reshipperUsername, option.country, assignments); }
    catch (error) { return (error as Error).message; }
  }
  return null;
}

export function assertDirectShippingEligible(
  group: { directShippingEnabled: boolean; directShippingMinKits?: string | number | null },
  items: { quantity: number }[],
) {
  if (!group.directShippingEnabled) throw new DeliveryRoutingError("Direct shipping is not enabled for this group buy.");
  const minimum = Number(group.directShippingMinKits ?? 30);
  if (items.some(item => !Number.isFinite(item.quantity) || item.quantity <= 0)) throw new DeliveryRoutingError("Invalid kit quantity.");
  const kits = items.reduce((sum, item) => sum + item.quantity, 0);
  if (!Number.isFinite(minimum) || minimum < 0 || kits < minimum) throw new DeliveryRoutingError(`Direct shipping requires at least ${minimum} kits.`);
}
