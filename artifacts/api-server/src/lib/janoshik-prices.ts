// Janoshik peptide analysis prices (USD).
// EXCLUDED: LCMS (not offered in pool voting).
// Endotoxin is fixed at $120. Mass/Purity varies by peptide.
// Variance testing (vials) is $60/vial, max 3 vials.

export const ENDOTOXIN_PRICE = 120;
export const VIAL_PRICE = 60;
export const MAX_VIALS = 3;

// All configurable test types with their fixed prices.
// Mass/Purity price is per-peptide (see JANOSHIK_PEPTIDE_PRICES).
export const ALL_TEST_OPTIONS: { name: string; price: number | "per_peptide" }[] = [
  { name: "Endotoxin",    price: 120 },
  { name: "Mass/Purity",  price: "per_peptide" },
  { name: "Sterility",    price: 350 },
  { name: "Heavy Metals", price: 200 },
];

export const ALL_TEST_OPTION_NAMES = ALL_TEST_OPTIONS.map(t => t.name);

// Default test ballot when admin hasn't configured one
export const DEFAULT_TEST_OPTIONS = ["Endotoxin", "Mass/Purity"];

// Maps display name → Janoshik analysis price
export const JANOSHIK_PEPTIDE_PRICES: Record<string, number> = {
  "GLP (Retatrutide / Tirzepatide / Semaglutide)": 300,
  "HGH": 420,
  "NAD": 380,
  "HCG": 180,
  "Ara-290": 380,
  "BPC-157 / TB-500": 270,
  "Cagrilintide": 380,
  "CJC-1295/IPA & Tesa/IPA": 270,
  "CJC No DAC": 270,
  "Epitalon": 240,
  "GHK-Cu": 240,
  "GHRP-2": 180,
  "Glow": 420,
  "Glutathione": 230,
  "Hexarelin": 380,
  "IGF-1": 300,
  "IPA": 180,
  "Kisspeptin": 380,
  "Klow": 680,
  "KPV": 380,
  "LL-37": 380,
  "MT-1": 380,
  "MT-2": 180,
  "MOTS-C": 380,
  "Oxytocin": 380,
  "PE-22-28": 380,
  "PT-141": 180,
  "Selank": 240,
  "Semax": 240,
  "Tesamorelin": 240,
  "TA-1": 240,
  "VIP": 380,
  "SS-31": 380,
  "AOD": 180,
  "DSIP": 240,
};

export const PEPTIDE_NAMES = Object.keys(JANOSHIK_PEPTIDE_PRICES).sort();

// ── Price overrides (from test_catalog DB) ───────────────────────────────────
//
// Pass this to computeMilestones / computeThresholds so the calculations
// reflect the current catalog prices rather than the hardcoded fallbacks above.

export interface PriceOverrides {
  /** Override for fixed test types, keyed by test name ("Endotoxin", "Sterility", etc.) */
  testPrices?: Partial<Record<string, number>>;
  /** Pre-resolved per-peptide price for the leading compound */
  peptidePrice?: number | null;
}

// ── Progressive milestone computation ────────────────────────────────────────
//
// Milestones are generated in order:
//   1. Tests ranked by vote count (most-voted first), each unlocking cumulatively
//   2. Vial #1, then #2, then #3 (based on leading vial vote)
//
// If testOrder is empty/null we fall back to DEFAULT_TEST_OPTIONS order.

export interface Milestone {
  label: string;       // e.g. "Endotoxin Test", "Mass/Purity · DSIP", "Vial #1"
  amount: number;      // cumulative pool target for this milestone to unlock
  type: "test" | "vial";
  vialNum?: number;
}

export function computeMilestones(
  peptideName: string | null,
  vialCount: number,
  testOrder: string[],  // tests sorted by vote count (most-voted first)
  overrides?: PriceOverrides,
): Milestone[] {
  const tests = testOrder.length > 0 ? testOrder : DEFAULT_TEST_OPTIONS;

  // peptidePrice: prefer explicit override, then fallback map, then null
  const peptidePrice =
    overrides?.peptidePrice !== undefined
      ? overrides.peptidePrice
      : peptideName ? (JANOSHIK_PEPTIDE_PRICES[peptideName] ?? null) : null;

  const milestones: Milestone[] = [];
  let cumulative = 0;

  for (const testName of tests) {
    const def = ALL_TEST_OPTIONS.find(t => t.name === testName);
    if (!def) continue;

    let cost: number;
    if (def.price === "per_peptide") {
      if (peptidePrice === null || peptidePrice === undefined) continue; // skip if no peptide known yet
      cost = peptidePrice;
    } else {
      // Use catalog price override if available, else hardcoded
      cost = overrides?.testPrices?.[testName] ?? def.price;
    }

    cumulative += cost;
    milestones.push({
      label: def.price === "per_peptide" && peptideName ? `Mass/Purity · ${peptideName}` : `${testName} Test`,
      amount: cumulative,
      type: "test",
    });
  }

  // Vials unlock after all tests
  const vials = Math.max(1, Math.min(MAX_VIALS, vialCount));
  for (let v = 1; v <= vials; v++) {
    cumulative += VIAL_PRICE;
    milestones.push({
      label: `Vial #${v}`,
      amount: cumulative,
      type: "vial",
      vialNum: v,
    });
  }

  return milestones;
}

/**
 * Legacy helper — kept for backward compat.
 * Returns tier1 = first milestone, tier2 = last milestone.
 */
export function computeThresholds(
  peptideName: string | null,
  vialCount: number,
  overrides?: PriceOverrides,
): {
  tier1: number;
  tier2: number | null;
  peptidePrice: number | null;
} {
  const peptidePrice =
    overrides?.peptidePrice !== undefined
      ? overrides.peptidePrice
      : peptideName ? (JANOSHIK_PEPTIDE_PRICES[peptideName] ?? null) : null;

  const endotoxinPrice = overrides?.testPrices?.["Endotoxin"] ?? ENDOTOXIN_PRICE;
  const tier1 = endotoxinPrice;
  const tier2 = peptidePrice !== null && peptidePrice !== undefined
    ? peptidePrice + endotoxinPrice + Math.max(1, Math.min(MAX_VIALS, vialCount)) * VIAL_PRICE
    : null;
  return { tier1, tier2, peptidePrice: peptidePrice ?? null };
}
