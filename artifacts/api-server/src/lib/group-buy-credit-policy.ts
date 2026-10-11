/** Missing GB settings fail closed; ordinary orders retain their existing credit support. */
export async function groupBuyCreditsAllowed(
  groupBuyId: string | null | undefined,
  loadAllowCredits: (id: string) => Promise<boolean | null | undefined>,
): Promise<boolean> {
  return !groupBuyId || (await loadAllowCredits(groupBuyId)) === true;
}

export function validAllowCreditsSetting(value: unknown): boolean {
  return value === undefined || typeof value === "boolean";
}
