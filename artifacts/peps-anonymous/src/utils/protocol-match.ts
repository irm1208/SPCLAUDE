import { type Protocol } from "@/data/protocols";

function normStr(s: string): string {
  return s
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wordBoundaryMatch(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const idx = haystack.indexOf(needle);
  if (idx === -1) return false;
  const beforeOk = idx === 0 || haystack[idx - 1] === " ";
  const afterIdx = idx + needle.length;
  const afterOk = afterIdx >= haystack.length || haystack[afterIdx] === " ";
  return beforeOk && afterOk;
}

export function matchProtocol(productName: string, protocol: Protocol): boolean {
  const normProduct = normStr(productName);
  const normName = normStr(protocol.name);
  if (wordBoundaryMatch(normProduct, normName)) return true;
  for (const alias of protocol.aliases) {
    const normAlias = normStr(alias);
    if (normAlias.length >= 4 && wordBoundaryMatch(normProduct, normAlias)) return true;
  }
  return false;
}
