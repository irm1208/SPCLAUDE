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
  /** Canonical per-vial dose, e.g. "10mg", "10iu". Omitted for blends/unknown. */
  dose?: string;
}

// Source of truth: vendor prefix → compound → dose table.
export const BATCH_PREFIX_TABLE: BatchPrefixEntry[] = [
  { prefix: "51Q10", compound: "5-Amino-1-methylquinolinium", dose: "10mg" },
  { prefix: "51Q50", compound: "5-Amino-1-methylquinolinium", dose: "50mg" },
  { prefix: "A05", compound: "AOD-9604", dose: "5mg" },
  { prefix: "AR16", compound: "ARA-290", dose: "16mg" },
  { prefix: "ARA16", compound: "ARA-290", dose: "16mg" },
  { prefix: "BP10", compound: "BPC-157", dose: "10mg" },
  { prefix: "BP20", compound: "BPC-157", dose: "20mg" },
  { prefix: "CAG10", compound: "Cagrilintide", dose: "10mg" },
  { prefix: "CAG5", compound: "Cagrilintide", dose: "5mg" },
  { prefix: "CI1010", compound: "CJC DAC/Ipamorelin" },
  { prefix: "CJD5", compound: "CJC-1295 DAC", dose: "5mg" },
  { prefix: "CJND", compound: "CJC no DAC/Ipamorelin" },
  { prefix: "DS10", compound: "DSIP", dose: "10mg" },
  { prefix: "DS5", compound: "DSIP", dose: "5mg" },
  { prefix: "EP10", compound: "Epithalon", dose: "10mg" },
  { prefix: "EP50", compound: "Epithalon", dose: "50mg" },
  { prefix: "FOX10", compound: "Fox-04", dose: "10mg" },
  { prefix: "G10", compound: "Human Growth Hormone", dose: "10iu" },
  { prefix: "G210", compound: "GHRP-2", dose: "10mg" },
  { prefix: "G610", compound: "GHRP-6", dose: "10mg" },
  { prefix: "GLO80", compound: "GLOW blend" },
  { prefix: "H10", compound: "Human Growth Hormone", dose: "10mg" },
  { prefix: "HK/KP50/20", compound: "GHK-Cu/KPV" },
  { prefix: "HK100", compound: "GHK-Cu", dose: "100mg" },
  { prefix: "HK50", compound: "GHK-Cu", dose: "50mg" },
  { prefix: "IG1", compound: "IGF-1 LR3", dose: "1mg" },
  { prefix: "ILLUM", compound: "illumineeuro" },
  { prefix: "IP10", compound: "Ipamorelin", dose: "10mg" },
  { prefix: "KL080", compound: "GHK-Cu/BPC-157/TB-500/KPV" },
  { prefix: "KLO80", compound: "KLOW blend" },
  { prefix: "KP10", compound: "KPV", dose: "10mg" },
  { prefix: "KP30", compound: "KPV", dose: "30mg" },
  { prefix: "M010", compound: "MOTS-C", dose: "10mg" },
  { prefix: "M040", compound: "MOTS-C", dose: "40mg" },
  { prefix: "MO10", compound: "MOTS-C", dose: "10mg" },
  { prefix: "MO20", compound: "MOTS-C", dose: "20mg" },
  { prefix: "MT1", compound: "Melanotan I", dose: "10mg" },
  { prefix: "MT2", compound: "Melanotan II", dose: "10mg" },
  { prefix: "MT210", compound: "Melanotan 2", dose: "10mg" },
  { prefix: "NA500", compound: "NAD+", dose: "500mg" },
  { prefix: "NASK10", compound: "N-Acetyl Selank Amidate", dose: "10mg" },
  { prefix: "NASK50", compound: "N-Acetyl Selank", dose: "50mg" },
  { prefix: "NASX10", compound: "N-Acetyl Semax", dose: "10mg" },
  { prefix: "NASX50", compound: "N-Acetyl Semax", dose: "50mg" },
  { prefix: "OZ10", compound: "Semaglutide", dose: "10mg" },
  { prefix: "OZ20", compound: "Semaglutide", dose: "20mg" },
  { prefix: "OZ5", compound: "Semaglutide", dose: "5mg" },
  { prefix: "PE10", compound: "PE-22-28", dose: "10mg" },
  { prefix: "PT10", compound: "PT-141", dose: "10mg" },
  { prefix: "RE10", compound: "Retatrutide", dose: "10mg" },
  { prefix: "RE20", compound: "Retatrutide", dose: "20mg" },
  { prefix: "RE30", compound: "Retatrutide", dose: "30mg" },
  { prefix: "RE40", compound: "Retatrutide", dose: "40mg" },
  { prefix: "RE50", compound: "Retatrutide", dose: "50mg" },
  { prefix: "RE60", compound: "Retatrutide", dose: "60mg" },
  { prefix: "SK10", compound: "Selank", dose: "10mg" },
  { prefix: "SN10", compound: "Snap-8", dose: "10mg" },
  { prefix: "SR5", compound: "Sermorelin", dose: "5mg" },
  { prefix: "SS10", compound: "SS-31", dose: "10mg" },
  { prefix: "SS30", compound: "SS-31", dose: "30mg" },
  { prefix: "SS50", compound: "Elamipretide (SS-31)", dose: "50mg" },
  { prefix: "SUR10", compound: "Survotide", dose: "10mg" },
  { prefix: "SX10", compound: "Semax", dose: "10mg" },
  { prefix: "T/155", compound: "Tesamorelin/Ipamorelin" },
  { prefix: "T/B1010", compound: "BPC-157/TB-500 (TB4)" },
  { prefix: "T/B55", compound: "BPC-157/TB-500" },
  { prefix: "TA110", compound: "Thymosin Alpha-1", dose: "10mg" },
  { prefix: "TB10", compound: "TB-500", dose: "10mg" },
  { prefix: "TB20", compound: "TB-500", dose: "20mg" },
  { prefix: "TB410", compound: "TB-500 (TB4)", dose: "10mg" },
  { prefix: "TBF10", compound: "TB-500 Fragment", dose: "10mg" },
  { prefix: "TE10", compound: "Tesamorelin", dose: "10mg" },
  { prefix: "TE20", compound: "Tesamorelin", dose: "20mg" },
  { prefix: "VIP", compound: "VIP", dose: "10mg" },
  { prefix: "ZE10", compound: "Tirzepatide", dose: "10mg" },
  { prefix: "ZE100", compound: "Tirzepatide", dose: "100mg" },
  { prefix: "ZE15", compound: "Tirzepatide", dose: "15mg" },
  { prefix: "ZE20", compound: "Tirzepatide", dose: "20mg" },
  { prefix: "ZE30", compound: "Tirzepatide", dose: "30mg" },
  { prefix: "ZE45", compound: "Tirzepatide", dose: "45mg" },
  { prefix: "ZE60", compound: "Tirzepatide", dose: "60mg" },
  // ── Live-data additions ────────────────────────────────────────────────────
  // Prefixes below are absent from the vendor's static table but confirmed in
  // real lab data (batch code + peptide label verified in the DB).
  { prefix: "BP40", compound: "BPC-157", dose: "40mg" },
  { prefix: "RE100", compound: "Retatrutide", dose: "100mg" },
  { prefix: "RE15", compound: "Retatrutide", dose: "15mg" },
  { prefix: "ZE90", compound: "Tirzepatide", dose: "90mg" },
  { prefix: "EPI10", compound: "Epithalon", dose: "10mg" },
  { prefix: "EPI50", compound: "Epithalon", dose: "50mg" },
  { prefix: "IPA10", compound: "Ipamorelin", dose: "10mg" },
  { prefix: "NAD500", compound: "NAD+", dose: "500mg" },
  { prefix: "M020", compound: "MOTS-C", dose: "20mg" },
  { prefix: "MT110", compound: "Melanotan I", dose: "10mg" },
  { prefix: "VIP10", compound: "VIP", dose: "10mg" },
  { prefix: "TB420", compound: "TB-500 (TB4)", dose: "20mg" },
  { prefix: "SS100", compound: "Elamipretide (SS-31)", dose: "100mg" },
  { prefix: "KIS10", compound: "Kisspeptin", dose: "10mg" },
  { prefix: "KS10", compound: "Kisspeptin", dose: "10mg" },
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
  kisspeptin: ["kisspeptin", "kisspeptin10", "kiss"],
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
  dose: e.dose,
}));

// Compound identities whose prefixes must never be split by parsed dose because
// the vendor labels one physical strength in two unit systems (iu vs mg).
// HGH: G10 ("10iu") and H10 ("10mg") are the same product.
const DOSE_AGNOSTIC_IDENTITIES = new Set<string>([
  compoundIdentity("Human Growth Hormone"),
].filter(Boolean));

/**
 * Extract the per-vial dose from a product name as a canonical token, e.g.
 * "Tirzepatide 10mg" → "10mg", "HGH 10iu Kit" → "10iu". Parenthetical content
 * is ignored so "(10 vials)" style suffixes don't confuse it. Returns null
 * when no dose is present in the name.
 */
function extractDose(raw: string): string | null {
  const s = raw.replace(/\([^)]*\)/g, "");
  const m = s.match(/(\d+(?:\.\d+)?)\s*(mg|iu|mcg)\b/i);
  if (!m) return null;
  return m[1] + m[2].toLowerCase();
}

// Blend rules: multi-active blends can't be reduced to one alias bucket, so map
// them directly to their observed batch-code prefixes. Rules are checked in
// order and the first match wins (GLOW/KLOW listed first so they don't also
// trip the BPC/TB or KPV/GHK rules, since their names contain those actives).
// The BPC/TB rule is dose-aware: 5/5 → T/B55, 10/10 → T/B1010, 30/30 → T/B3030.
// Some prefixes here (GLO70, T/B3030) post-date the static prefix table but are
// confirmed in live lab data.
interface BlendRule {
  test: (name: string) => boolean;
  resolve: (name: string) => string[];
}
const BLEND_RULES: BlendRule[] = [
  { test: s => /\bglow\b/.test(s), resolve: () => ["GLO70", "GLO80", "GL70", "GL070"] },
  { test: s => /\bklow\b/.test(s), resolve: () => ["KL080", "KLO80", "KL80"] },
  { test: s => /kpv/.test(s) && /ghk/.test(s), resolve: () => ["HK/KP50/20", "HK50/KP20", "HK50KP20", "CUKP5020"] },
  {
    test: s => /bpc/.test(s) && (/\btb\b/.test(s) || /\btb-?\d/.test(s)),
    resolve: s => {
      const m = s.match(/(\d+(?:\.\d+)?)\s*mg\b/);
      if (!m) return ["T/B55", "T/B1010", "T/B3030"];
      const byDose: Record<string, string> = { "5": "T/B55", "10": "T/B1010", "30": "T/B3030" };
      const hit = byDose[m[1]];
      return hit ? [hit] : [];
    },
  },
];

function resolveBlendPrefixes(productName: string): string[] {
  const s = productName.toLowerCase();
  for (const rule of BLEND_RULES) {
    if (rule.test(s)) return rule.resolve(s);
  }
  return [];
}

/**
 * Returns the batch-code prefix(es) that correspond to a wholesale product.
 * Matching is DOSE-LEVEL: "Tirzepatide 10mg" resolves to ZE10 only, never
 * ZE30/ZE100. When the product name carries no parseable dose, all prefixes
 * for the compound are returned (better than hiding everything). When the
 * dose is parseable but the table has no prefix for that exact strength,
 * nothing is returned — showing a different strength's CoA would be wrong.
 * Blends resolve via BLEND_RULES. Returns [] for non-peptides.
 */
export function resolveProductBatchPrefixes(productName: string): string[] {
  const blend = resolveBlendPrefixes(productName);
  if (blend.length) return blend;
  const id = compoundIdentity(productName);
  if (!id) return [];
  const candidates = _tableWithIdentity.filter(e => e.identity === id);
  if (candidates.length === 0) return [];
  // Dose-agnostic compounds are sold under a single strength but dual-labelled
  // in different units (e.g. HGH batch prefixes G10 = "10iu" and H10 = "10mg"
  // are the same product). Never split these by the parsed dose — return every
  // prefix for the compound so both G10 and H10 CoAs group together.
  if (DOSE_AGNOSTIC_IDENTITIES.has(id)) return candidates.map(e => e.prefix);
  const dose = extractDose(productName);
  if (dose) {
    const exact = candidates.filter(e => e.dose === dose);
    return exact.map(e => e.prefix);
  }
  return candidates.map(e => e.prefix);
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

/**
 * Resolve the labelled (listed) per-vial dose for a lab-test batch code via
 * its prefix, e.g. "ZE15-0612" → "15mg", "G10-0610" → "10iu". Returns null for
 * unknown prefixes and for blends whose table entry carries no single dose.
 */
export function doseForBatchCode(batchCode: string | null | undefined): string | null {
  if (!batchCode) return null;
  for (const e of BATCH_PREFIX_TABLE) {
    if (e.dose && batchCodeMatchesPrefix(batchCode, e.prefix)) return e.dose;
  }
  return null;
}

export interface ResolvedBatchName {
  compound: string;
  dose: string | null;
}

/**
 * Resolve a certificate's compound + dose purely from its batch code prefix,
 * independent of `supplier`. This is the general-purpose counterpart to
 * `resolveUtherName` (which only fires for Uther-labelled tests) — use it as
 * a fallback so any lab test whose batch code matches a known prefix gets
 * titled with its corresponding compound/dose, regardless of vendor.
 */
export function resolveBatchPrefixName(batchCode: string | null | undefined): ResolvedBatchName | null {
  if (!batchCode) return null;
  for (const e of BATCH_PREFIX_TABLE) {
    if (batchCodeMatchesPrefix(batchCode, e.prefix)) return { compound: e.compound, dose: e.dose ?? null };
  }
  return null;
}
