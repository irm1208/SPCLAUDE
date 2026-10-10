import { getCanonicalGroup } from "./peptide-groups";

type PurityResult = { peptideName: string; purityPct: number | null };

export function labTestPurityThreshold(peptideName?: string): number {
  return getCanonicalGroup(peptideName ?? "")?.canonical === "HGH" ? 95 : 98;
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
