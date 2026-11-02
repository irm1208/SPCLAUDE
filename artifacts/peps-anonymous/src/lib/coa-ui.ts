import type { CoaRequest } from "./coa-api";

export type CoaPhase = "unpaid" | "review" | "paid" | "processing" | "completed" | "closed";

export const COA_STATUS_LABEL: Record<CoaRequest["status"], string> = {
  invited: "Invited", reserved: "Reserved, unpaid", expired: "Expired", withdrawn: "Withdrawn",
  review: "Payment under review", paid: "Paid", processing: "Processing", completed: "Completed",
};

export function coaPhase(status: CoaRequest["status"]): CoaPhase {
  if (status === "invited" || status === "reserved") return "unpaid";
  if (status === "expired" || status === "withdrawn") return "closed";
  return status;
}

export const COA_PHASE_TONE: Record<CoaPhase, { fg: string; bg: string }> = {
  unpaid: { fg: "#B7791F", bg: "rgba(233,160,32,0.14)" },
  review: { fg: "#2D6BCC", bg: "rgba(45,107,204,0.12)" },
  paid: { fg: "#15803d", bg: "rgba(34,197,94,0.14)" },
  processing: { fg: "#1B3A7A", bg: "rgba(27,58,122,0.12)" },
  completed: { fg: "#15803d", bg: "rgba(34,197,94,0.20)" },
  closed: { fg: "#6B7280", bg: "rgba(107,114,128,0.12)" },
};

export function fmtCoaFee(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export type CoaDetails = { client: string; sample: string; manufacturer: string; batch: string };
export const COA_FIELDS: { key: keyof CoaDetails; label: string; hint: string }[] = [
  { key: "client", label: "Client name on report", hint: "Name or alias printed on the COA" },
  { key: "sample", label: "Sample", hint: "Compound and strength, e.g. BPC-157 10mg" },
  { key: "manufacturer", label: "Manufacturer", hint: "Who made the vial" },
  { key: "batch", label: "Batch", hint: "Batch or lot number on the vial" },
];

export function missingCoaFields(d: CoaDetails): (keyof CoaDetails)[] {
  return COA_FIELDS.filter(f => !d[f.key].trim()).map(f => f.key);
}

export function coaAdminQuery(f: { groupBuyId?: string; search?: string; status?: string; batch?: string }): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v && v.trim()) p.set(k, v.trim());
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function hasCoaEvidence(r: Pick<CoaRequest, "txHash" | "reference">): boolean {
  return !!(r.txHash || r.reference);
}

export function coaDetailsComplete(r: CoaDetails): boolean {
  return missingCoaFields(r).length === 0;
}

export function canMemberEdit(r: CoaRequest | null): boolean {
  return !r || ((r.status === "invited" || r.status === "reserved") && !hasCoaEvidence(r));
}

/** Expired/withdrawn without evidence may reserve again while eligible. Evidence never re-reserves. */
export function canReReserve(r: CoaRequest | null, eligible: boolean): boolean {
  return !!r && eligible && (r.status === "expired" || r.status === "withdrawn") && !hasCoaEvidence(r);
}

/** Payment only once details are saved on an unpaid active request with no evidence yet. */
export function canMemberPay(r: CoaRequest | null): boolean {
  return !!r && r.status === "reserved" && canMemberEdit(r) && coaDetailsComplete(r);
}

/** Every Admin manual confirmation requires a note (server min 5 chars). */
export function confirmNoteOk(note: string): boolean {
  return note.trim().length >= 5;
}

export function canConfirm(r: CoaRequest): boolean {
  if (r.status === "invited") return coaDetailsComplete(r);
  return r.status === "review" || r.status === "reserved" || r.status === "expired";
}

export function canRelease(r: CoaRequest): boolean {
  return (r.status === "invited" || r.status === "reserved" || r.status === "expired") && !r.txHash && !r.reference;
}

/** Orders with no live commitment (anything except expired/withdrawn without evidence). */
export function inviteCandidates<O extends { id: string }>(orders: O[], allRequests: CoaRequest[]): O[] {
  const taken = new Set(allRequests
    .filter(r => !((r.status === "withdrawn" || r.status === "expired") && !hasCoaEvidence(r)))
    .map(r => r.orderId));
  return orders.filter(o => !taken.has(o.id));
}
