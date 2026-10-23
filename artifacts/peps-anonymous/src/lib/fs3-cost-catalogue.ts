export interface Fs3SavedCost { id: number; productName: string; unitCost: number; }

/** Read the existing private catalogue; no price defaults or mutations here. */
export async function loadFs3Costs(binding: string, signal?: AbortSignal): Promise<Fs3SavedCost[]> {
  const response = await fetch("/api/admin/fs3-costs", {
    headers: { "x-admin-secret": binding }, credentials: "omit", cache: "no-store", signal,
  });
  if (!response.ok) {
    throw new Error(response.status === 401 || response.status === 403
      ? "Please sign in to Admin again to load saved prices."
      : "Unable to load saved prices. Try refreshing.");
  }
  const data: unknown = await response.json();
  const ids = new Set<number>();
  if (!Array.isArray(data) || data.some(row => {
    if (!row || !Number.isSafeInteger(row.id) || row.id <= 0 || ids.has(row.id)
      || typeof row.productName !== "string" || typeof row.unitCost !== "number") return true;
    ids.add(row.id);
    return false;
  })) throw new Error("Unexpected saved-price catalogue. Refresh or check My Prices.");
  return data;
}
