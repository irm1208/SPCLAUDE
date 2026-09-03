export interface WholesaleOrderAccessRecord {
  orderType: string | null;
  status: string;
  paymentStatus: string;
  deletedAt: Date | null;
}

export interface WholesaleBatchCandidate {
  productId: string;
  code: string;
  stock: number;
}

function isQualifyingWholesaleOrder(order: WholesaleOrderAccessRecord): boolean {
  const wholesale = order.orderType === "wholesale"
    || order.orderType === "wholesale_shared";
  const paid = order.paymentStatus === "confirmed"
    || order.paymentStatus === "test_confirmed";
  const completed = order.status === "Completed";

  return wholesale
    && order.deletedAt == null
    && order.status !== "Cancelled"
    && (paid || completed);
}

export function hasWholesaleBatchAccess(
  orders: WholesaleOrderAccessRecord[],
): boolean {
  return orders.filter(isQualifyingWholesaleOrder).length > 5;
}

function batchDateRank(code: string): number | null {
  const match = /-(\d{2})(\d{2})$/.exec(code);
  if (!match) {
    return null;
  }

  return Number(match[1]) * 100 + Number(match[2]);
}

function isPreferredCandidate(
  candidate: WholesaleBatchCandidate,
  current: WholesaleBatchCandidate,
): boolean {
  if (candidate.stock !== current.stock) {
    return candidate.stock > current.stock;
  }

  const candidateDateRank = batchDateRank(candidate.code);
  const currentDateRank = batchDateRank(current.code);

  if (candidateDateRank !== null && currentDateRank === null) {
    return true;
  }
  if (candidateDateRank === null && currentDateRank !== null) {
    return false;
  }
  if (candidateDateRank !== null && currentDateRank !== null
    && candidateDateRank !== currentDateRank) {
    return candidateDateRank > currentDateRank;
  }

  return candidate.code.localeCompare(current.code) < 0;
}

export function selectPreferredBatchCodes(
  candidates: WholesaleBatchCandidate[],
): Map<string, string> {
  const preferredCandidates = new Map<string, WholesaleBatchCandidate>();

  for (const candidate of candidates) {
    if (candidate.stock <= 0) {
      continue;
    }

    const current = preferredCandidates.get(candidate.productId);
    if (!current || isPreferredCandidate(candidate, current)) {
      preferredCandidates.set(candidate.productId, candidate);
    }
  }

  return new Map(
    [...preferredCandidates].map(([productId, candidate]) => [productId, candidate.code]),
  );
}

export function withAuthorizedBatchCode<T extends { id: string }>(
  product: T,
  eligible: boolean,
  selected: ReadonlyMap<string, string>,
): T & { batchCode?: string } {
  const authorizedProduct = { ...product } as T & { batchCode?: string };
  delete authorizedProduct.batchCode;

  const batchCode = eligible ? selected.get(product.id) : undefined;
  if (batchCode) {
    authorizedProduct.batchCode = batchCode;
  }

  return authorizedProduct;
}