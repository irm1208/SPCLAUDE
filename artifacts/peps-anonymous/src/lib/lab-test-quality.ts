import { getCanonicalGroup } from "./peptide-groups";

type PurityResult = { peptideName: string; purityPct: number | null };

export function labTestPurityThreshold(peptideName?: string): number {
  // Certificates often include the labelled dose, e.g. "HGH 36IU".
  // Strip only a trailing dose; never treat HGH fragments or blends as HGH.
  const compound = (peptideName ?? "").replace(/\s*\(?\d+(?:\.\d+)?\s*(?:iu|mg|mcg|µg|μg)\s*\)?\s*$/i, "").trim();
  return getCanonicalGroup(compound)?.canonical === "HGH" ? 95 : 98;
}

export function failsLabTestPurity(test: PurityResult): boolean {
  return test.purityPct != null && test.purityPct < labTestPurityThreshold(test.peptideName);
}

export function isLabTestFailed(test: PurityResult & {
  sterilityPass: boolean | null;
  endotoxinEuMg: number | null;
}): boolean {
  return failsLabTestPurity(test)
    || test.sterilityPass === false
    || (test.endotoxinEuMg != null && test.endotoxinEuMg > 5);
}
