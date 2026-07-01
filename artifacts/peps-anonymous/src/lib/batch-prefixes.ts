// ─────────────────────────────────────────────────────────────────────────────
// Batch-code prefix matching for wholesale lab reports.
//
// Lab-test batch codes are formatted as `PREFIX-date` (e.g. "RE10-0603",
// "BP10-1110", "T/B1010-0402").  The PREFIX encodes the compound + dose.
// This module maps a wholesale product to its batch-code prefix(es) using the
// vendor's authoritative prefix → compound table, then matches lab tests whose
// batch code starts with that prefix.
//
// This is intentionally self-contained (rather than reusing peptide-groups.ts)
// so that both a product name AND a table compound name resolve through the
// exact same identity function — mixing two resolvers can bucket the two sides
// differently and silently drop matches.
// ─────────────────────────────────────────────────────────────────────────────

export interface BatchPrefixEntry {
  prefix: string;
  compound: string;
}

// Source of truth: vendor prefix → compound table.
export const BATCH_PREFIX_TABLE: BatchPrefixEntry[] = [
  { prefix: "51Q10", compound: "5-Amino-1-methylquinolinium" },
  { prefix: "51Q50", compound: "5-Amino-1-methylquinolinium" },
  { prefix: "A05", compound: "AOD-9604" },
  { prefix: "AR16", compound: "ARA-290" },
  { prefix: "ARA16", compound: "ARA-290" },
  { prefix: "BP10", compound: "BPC-157" },
  { prefix: "BP20", compound: "BPC-157" },
  { prefix: "CAG10", compound: "Cagrilintide" },
  { prefix: "CAG5", compound: "Cagrilintide" },
  { prefix: "CI1010", compound: "CJC DAC/Ipamorelin" },
  { prefix: "CJD5", compound: "CJC-1295 DAC" },
  { prefix: "CJND", compound: "CJC no DAC/Ipamorelin" },
  { prefix: "DS10", compound: "DSIP" },
  { prefix: "DS5", compound: "DSIP" },
  { prefix: "EP10", compound: "Epithalon" },
  { prefix: "EP50", compound: "Epithalon" },
  { prefix: "FOX10", compound: "Fox-04" },
  { prefix: "G10", compound: "Human Growth Hormone" },
  { prefix: "G210", compound: "GHRP-2" },
  { prefix: "G610", compound: "GHRP-6" },
  { prefix: "GLO80", compound: "GLOW blend" },
  { prefix: "H10", compound: "Human Growth Hormone" },
  { prefix: "HK/KP50/20", compound: "GHK-Cu/KPV" },
  { prefix: "HK100", compound: "GHK-Cu" },
  { prefix: "HK50", compound: "GHK-Cu" },
  { prefix: "IG1", compound: "IGF-1 LR3" },
  { prefix: "ILLUM", compound: "illumineeuro" },
  { prefix: "IP10", compound: "Ipamorelin" },
  { prefix: "KL080", compound: "GHK-Cu/BPC-157/TB-500/KPV" },
  { prefix: "KLO80", compound: "KLOW blend" },
  { prefix: "KP10", compound: "KPV" },
  { prefix: "KP30", compound: "KPV" },
  { prefix: "M010", compound: "MOTS-C" },
  { prefix: "M040", compound: "MOTS-C" },
  { prefix: "MO10", compound: "MOTS-C" },
  { prefix: "MO20", compound: "MOTS-C" },
  { prefix: "MT1", compound: "Melanotan I" },
  { prefix: "MT2", compound: "Melanotan II" },
  { prefix: "MT210", compound: "Melanotan 2" },
  { prefix: "NA500", compound: "NAD+" },
  { prefix: "NASK10", compound: "N-Acetyl Selank Amidate" },
  { prefix: "NASK50", compound: "N-Acetyl Selank" },
  { prefix: "NASX10", compound: "N-Acetyl Semax" },
  { prefix: "NASX50", compound: "N-Acetyl Semax" },
  { prefix: "OZ10", compound: "Semaglutide" },
  { prefix: "OZ20", compound: "Semaglutide" },
  { prefix: "OZ5", compound: "Semaglutide" },
  { prefix: "PE10", compound: "PE-22-28" },
  { prefix: "PT10", compound: "PT-141" },
  { prefix: "RE10", compound: "Retatrutide" },
  { prefix: "RE20", compound: "Retatrutide" },
  { prefix: "RE30", compound: "Retatrutide" },
  { prefix: "RE40", compound: "Retatrutide" },
  { prefix: "RE50", compound: "Retatrutide" },
  { prefix: "RE60", compound: "Retatrutide" },
  { prefix: "SK10", compound: "Selank" },
  { prefix: "SN10", compound: "Snap-8" },
  { prefix: "SR5", compound: "Sermorelin" },
  { prefix: "SS10", compound: "SS-31" },
  { prefix: "SS30", compound: "SS-31" },
  { prefix: "SS50", compound: "Elamipretide (SS-31)" },
  { prefix: "SUR10", compound: "Survotide" },
  { prefix: "SX10", compound: "Semax" },
  { prefix: "T/155", compound: "Tesamorelin/Ipamorelin" },
  { prefix: "T/B1010", compound: "BPC-157/TB-500 (TB4)" },
  { prefix: "T/B55", compound: "BPC-157/TB-500" },
  { prefix: "TA110", compound: "Thymosin Alpha-1" },
  { prefix: "TB10", compound: "TB-500" },
  { prefix: "TB20", compound: "TB-500" },
  { prefix: "TB410", compound: "TB-500 (TB4)" },
  { prefix: "TBF10", compound: "TB-500 Fragment" },
  { prefix: "TE10", compound: "Tesamorelin" },
  { prefix: "TE20", compound: "Tesamorelin" },
  { prefix: "VIP", compound: "VIP" },
  { prefix: "ZE10", compound: "Tirzepatide" },
  { prefix: "ZE100", compound: "Tirzepatide" },
  { prefix: "ZE15", compound: "Tirzepatide" },
  { prefix: "ZE20", compound: "Tirzepatide" },
  { prefix: "ZE30", compound: "Tirzepatide" },
  { prefix: "ZE45", compound: "Tirzepatide" },
  { prefix: "ZE60", compound: "Tirzepatide" },
];

// Compound alias buckets (canonical → alias forms). Both product names and the
// table compound names are resolved through these so equivalent names (e.g.
// "5-Amino-1MQ" vs "5-Amino-1-methylquinolinium", "Epitalon" vs "Epithalon")
// land in the same bucket. Single compounds only — multi-active blends are
// handled separately by BLEND_RULES below (their names list several actives and
// can't be reduced to one alias bucket).
const COMPOUND_ALIASES: Record<string, string[]> = {
  retatrutide: ["retatrutide", "ly3437943"],
  tirzepatide: ["tirzepatide", "tir", "mounjaro", "zepbound"],
  semaglutide: ["semaglutide", "sema", "ozempic", "wegovy", "rybelsus"],
  bpc157: ["bpc157"],
  tb500: ["tb500", "tb4", "thymosinbeta4"],
  tb500fragment: ["tb500fragment", "tb500frag"],
  ghkcu: ["ghkcu", "ghk"],
  cagrilintide: ["cagrilintide", "cagri"],
  motsc: ["motsc", "mots"],
  kpv: ["kpv"],
  ss31: ["ss31", "elamipretide"],
  pt141: ["pt141"],
  amino1mq: ["5amino1mq", "5amino1methylquinolinium", "51q", "5amino1q"],
  nad: ["nad", "nad500"],
  epithalon: ["epithalon", "epitalon"],
  dsip: ["dsip"],
  ipamorelin: ["ipamorelin", "ipa"],
  tesamorelin: ["tesamorelin"],
  melanotan1: ["melanotani", "melanotan1", "mt1"],
  melanotan2: ["melanotanii", "melanotan2", "mt2"],
  aod9604: ["aod9604", "aod"],
  ara290: ["ara290"],
  selank: ["selank"],
  naselank: ["nacetylselank", "naselank", "nacetylselankamidate"],
  semax: ["semax"],
  nasemax: ["nacetylsemax", "nasemax", "nacetylsemaxamidate"],
  snap8: ["snap8"],
  sermorelin: ["sermorelin"],
  survotide: ["survotide"],
  vip: ["vip"],
  thymosinalpha1: ["thymosinalpha1", "ta1"],
  ghrp2: ["ghrp2"],
  ghrp6: ["ghrp6"],
  hgh: ["hgh", "humangrowthhormone", "somatropin"],
  igf1: ["igf1lr3", "igf1"],
  pe2228: ["pe2228"],
  fox04: ["fox04", "fox04dri"],
};

const _aliasToCanon = new Map<string, string>();
for (const [canon, aliases] of Object.entries(COMPOUND_ALIASES)) {
  for (const a of aliases) {
    if (!_aliasToCanon.has(a)) _aliasToCanon.set(a, canon);
  }
}

function normKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Strip dose/units and noise words, then normalize — mirrors the product-name
// cleanup used elsewhere so "BPC 157 10mg" → "bpc157".
function stripDose(s: string): string {
  return s
    .replace(/\([^)]*\)/g, "")
    .replace(/\d+(\.\d+)?\s*mg\b/gi, "")
    .replace(/\d+(\.\d+)?\s*iu\b/gi, "")
    .replace(/\d+(\.\d+)?\s*mcg\b/gi, "")
    .replace(/\b(uther|peptide|research|grade|kit|vial|lyophilized|lyophilised)\b/gi, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
    .trim();
}

// Resolve a raw name to a compound-identity bucket. Returns "" when nothing
// meaningful can be extracted (e.g. needles, water, blank names).
function compoundIdentity(raw: string): string {
  const canon = _aliasToCanon.get(normKey(raw)) ?? _aliasToCanon.get(stripDose(raw));
  if (canon) return "C:" + canon;
  const n = stripDose(raw);
  return n ? "N:" + n : "";
}

// Precompute table identities once.
const _tableWithIdentity = BATCH_PREFIX_TABLE.map(e => ({
  prefix: e.prefix,
  identity: compoundIdentity(e.compound),
}));

// Blend rules: multi-active blends can't be reduced to one alias bucket, so map
// them directly to their observed batch-code prefixes. Rules are checked in
// order and the first match wins (GLOW/KLOW listed first so they don't also
// trip the BPC/TB or KPV/GHK rules, since their names contain those actives).
// Some prefixes here (GLO70, T/B3030) post-date the static prefix table but are
// confirmed in live lab data.
interface BlendRule {
  test: (name: string) => boolean;
  prefixes: string[];
}
const BLEND_RULES: BlendRule[] = [
  { test: s => /\bglow\b/.test(s), prefixes: ["GLO70", "GLO80"] },
  { test: s => /\bklow\b/.test(s), prefixes: ["KL080", "KLO80"] },
  { test: s => /kpv/.test(s) && /ghk/.test(s), prefixes: ["HK/KP50/20", "HK50/KP20"] },
  { test: s => /bpc/.test(s) && (/\btb\b/.test(s) || /\btb-?\d/.test(s)), prefixes: ["T/B55", "T/B1010", "T/B3030"] },
];

function resolveBlendPrefixes(productName: string): string[] {
  const s = productName.toLowerCase();
  for (const rule of BLEND_RULES) {
    if (rule.test(s)) return rule.prefixes;
  }
  return [];
}

/**
 * Returns the batch-code prefix(es) that correspond to a wholesale product.
 * Matches at the compound level (all doses), so e.g. "Retatrutide 10mg" resolves
 * to every Retatrutide prefix (RE10, RE20, …). Blends resolve to their blend
 * batch prefixes. Returns [] for non-peptides / unmapped blends.
 */
export function resolveProductBatchPrefixes(productName: string): string[] {
  const blend = resolveBlendPrefixes(productName);
  if (blend.length) return blend;
  const id = compoundIdentity(productName);
  if (!id) return [];
  return _tableWithIdentity.filter(e => e.identity === id).map(e => e.prefix);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * True when a batch code starts with the given prefix followed by a boundary
 * (a non-alphanumeric char or end of string). The boundary prevents look-alike
 * collisions, e.g. "RE10" must not match "RE100-…", "HK50" must not match
 * "HK50KP20-…".
 */
export function batchCodeMatchesPrefix(batchCode: string, prefix: string): boolean {
  if (!batchCode || !prefix) return false;
  const re = new RegExp("^" + escapeRegExp(prefix) + "([^a-z0-9]|$)", "i");
  return re.test(batchCode.trim());
}

/** True when any of the batch codes matches any of the prefixes. */
export function anyBatchCodeMatches(batchCodes: string[], prefixes: string[]): boolean {
  if (prefixes.length === 0) return false;
  return batchCodes.some(code => prefixes.some(p => batchCodeMatchesPrefix(code, p)));
}
