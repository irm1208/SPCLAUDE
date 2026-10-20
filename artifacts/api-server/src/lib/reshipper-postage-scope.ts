import { isDeepStrictEqual } from "node:util";
import { COUNTRY_CODE_TO_NAME, normalizeToCode } from "./country-utils";
import { EU_DESTINATIONS } from "./gb-onward-delivery-rules";
import { validateGroupBuyShippingOptions, type CustomPostageOption } from "./group-buy-shipping-options";

export class ReshipperPostageError extends Error {
  constructor(message: string, public status = 403) { super(message); }
}

export function assignedPostageCountries(assignments: { country?: string | null; countries?: string[] | null }[]) {
  const countries = new Set<string>();
  for (const assignment of assignments) {
    for (const raw of assignment.countries?.length ? assignment.countries : [assignment.country]) {
      if (!raw) continue;
      if (["EU", "EUROPEAN UNION"].includes(raw.trim().toUpperCase())) {
        for (const [code] of EU_DESTINATIONS) countries.add(code);
      } else {
        const code = normalizeToCode(raw);
        if (COUNTRY_CODE_TO_NAME[code]) countries.add(code);
      }
    }
  }
  return countries;
}

/** Merge only the caller's country options into the freshly locked GB row.
 * The base snapshot detects stale same-country saves; other countries retain
 * their latest server values, never the caller's browser copy.
 */
export function mergeReshipperPostage(
  current: CustomPostageOption[], proposed: unknown, base: unknown,
  assignments: { country?: string | null; countries?: string[] | null }[],
): CustomPostageOption[] {
  if (!Array.isArray(base)) throw new ReshipperPostageError("Please reload the group buy before saving postage.", 409);
  const error = validateGroupBuyShippingOptions(proposed) || validateGroupBuyShippingOptions(base);
  if (error) throw new ReshipperPostageError(error, 400);
  const next = proposed as CustomPostageOption[];
  const original = base as CustomPostageOption[];
  const countries = assignedPostageCountries(assignments);
  const editable = (option: CustomPostageOption) => Boolean(option.country && countries.has(normalizeToCode(option.country)));
  const sameRows = (a: CustomPostageOption[], b: CustomPostageOption[]) => isDeepStrictEqual(
    [...a].sort((x, y) => x.id.localeCompare(y.id)), [...b].sort((x, y) => x.id.localeCompare(y.id)),
  );
  // Global options affect every reshipper and remain Admin/organiser-managed.
  if (!sameRows(original.filter(option => !editable(option)), next.filter(option => !editable(option)))) {
    throw new ReshipperPostageError("You can only change postage options for your assigned countries.");
  }
  if (!sameRows(current.filter(editable), original.filter(editable))) {
    throw new ReshipperPostageError("Postage for your countries changed. Please reload before saving.", 409);
  }
  const protectedIds = new Set(current.filter(option => !editable(option)).map(option => option.id));
  if (next.some(option => editable(option) && protectedIds.has(option.id))) {
    throw new ReshipperPostageError("You can only change postage options for your assigned countries.");
  }
  const byId = new Map(next.filter(editable).map(option => [option.id, option]));
  const merged = current.flatMap(option => {
    if (!editable(option)) return [option];
    const replacement = byId.get(option.id);
    byId.delete(option.id);
    return replacement ? [replacement] : [];
  });
  return [...merged, ...byId.values()];
}
