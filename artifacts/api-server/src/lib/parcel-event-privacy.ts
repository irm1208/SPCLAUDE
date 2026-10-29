import { translateZh } from "./translate-zh";

const COUNTRIES: [string, string][] = [
  ["hong kong", "China"], ["china", "China"], [", cn", "China"],
  ["united kingdom", "United Kingdom"], ["england", "United Kingdom"],
  ["scotland", "United Kingdom"], [", uk", "United Kingdom"],
  ["united states", "United States"], [", usa", "United States"], [", us", "United States"],
  ["germany", "Germany"], ["france", "France"], ["netherlands", "Netherlands"],
  ["belgium", "Belgium"], ["poland", "Poland"], ["sweden", "Sweden"],
  ["norway", "Norway"], ["denmark", "Denmark"], ["finland", "Finland"],
  ["spain", "Spain"], ["italy", "Italy"], ["portugal", "Portugal"],
  ["switzerland", "Switzerland"], ["austria", "Austria"],
  ["australia", "Australia"], ["canada", "Canada"], ["japan", "Japan"],
  ["south korea", "South Korea"], ["singapore", "Singapore"], ["taiwan", "China"],
  ["thailand", "Thailand"], ["india", "India"],
];
export function maskLocation(location: string): string {
  const lower = location.toLowerCase();
  return COUNTRIES.find(([key]) => lower.includes(key))?.[1] ?? "";
}
export function maskStatus(status: string): string {
  return translateZh(status)
    .replace(/signed\s+(for\s+)?by[:\s]+[A-Z][a-zA-Z]+(\s+[A-Z][a-zA-Z]+)*/gi, "Signed for")
    .replace(/received\s+by[:\s]+[A-Z][a-zA-Z]+(\s+[A-Z][a-zA-Z]+)*/gi, "Received")
    .replace(/\d{1,5}\s+[A-Z][a-zA-Z]+(\s+[A-Z][a-zA-Z]*)*(St|Ave|Blvd|Rd|Dr|Ln|Ct|Pl|Way|Street|Avenue|Road)/gi, "")
    .trim();
}

// Member responses must never contain carrier prose. New carriers and manual
// events can use arbitrary recipient/address formats that regex redaction misses.
export function memberEventDescription(value: unknown): string {
  const text = typeof value === "string" ? translateZh(value).toLowerCase() : "";
  if (/not delivered|undeliver|unsuccess|attempt|failed delivery/.test(text)) return "Delivery attempted";
  if (/out for delivery/.test(text)) return "Out for delivery";
  if (/delivered|signed\s+(?:for|by)|signed\s+for\s+by/.test(text)) return "Delivery update";
  if (/customs|clearance/.test(text)) return "Customs update";
  if (/return to|returned|returning/.test(text)) return "Return update";
  if (/exception|expired|cancelled|canceled/.test(text)) return "Shipment exception";
  if (/in transit|departed|arrived|transport|despatch|dispatch/.test(text)) return "In transit";
  if (/information received|label created|pre.?advice/.test(text)) return "Shipment information received";
  return "Tracking update";
}

export function memberEventDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(value)) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}
