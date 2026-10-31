/** Format saved delivery text without changing the customer's stored address. */
export function vendorAddressLines(address: string, country: string): string[] {
  const lines = address.split(/[\r\n,]+/).map(line => line.trim()).filter(Boolean);
  const isUk = /^(united kingdom|uk|gb|great britain|england|scotland|wales|northern ireland)$/i.test(country.trim());
  if (!isUk || !lines.length) return lines;
  const last = lines[lines.length - 1];
  const postcode = last.match(/\b([a-z]{1,2}\d[a-z\d]?\s*\d[a-z]{2}|gir\s*0aa)$/i);
  if (!postcode) return lines;
  const compact = postcode[0].replace(/\s/g, "").toUpperCase();
  const prefix = last.slice(0, postcode.index).trim();
  return [...lines.slice(0, -1), ...(prefix ? [prefix] : []), `${compact.slice(0, -3)} ${compact.slice(-3)}`];
}
