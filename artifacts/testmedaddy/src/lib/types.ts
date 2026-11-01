import type { PaymentMethods } from "./auth";

export type PublicUser = { id: string; handle: string; displayName: string; bio: string | null; avatarKey: string | null; createdAt: string };
export type Vendor = { id: string; slug: string; name: string; website: string | null; country: string | null; description: string | null; logoKey: string | null; verified: boolean; createdAt: string };
export type VendorSummary = Vendor & { batches: number; activePools: number; results: number; passed: number; avgPurity: number | null };
export type Batch = { id: string; vendorId: string; compound: string; batchNumber: string; mg: string | null; capColour: string | null; manufacturedOn: string | null; notes: string | null; createdAt: string };
export type Photo = { id: string; key: string; kind: string; caption: string | null; batchId: string | null; poolId?: string | null; vendorId?: string | null; createdAt: string };
export type PoolItem = { id: string; poolId?: string; batchId: string | null; testType: string; lab: string | null; priceUsd: string; quantity: number; labOrderUrl: string | null; position: number; batch: Batch | null; vendor: Vendor | null };
export type Totals = { verifiedUsd: number; submittedUsd: number; memberCount: number; verifiedMemberCount: number };
export type Progress = { target: number; verified: number; remaining: number; pct: number; funded: boolean };
export type Breakdown = { tests: number; shipping: number; tip: number; subtotal: number; feePct: number; fee: number; target: number };
export type Pool = {
  id: string; slug: string; organiserId: string; title: string; description: string | null; status: string; visibility: string; inviteOnly: boolean; resultsVisibility: string;
  labName: string | null; splitMode: string; fixedShareUsd: string | null; shippingUsd: string; organiserTipUsd: string; platformFeePct: string; targetUsd: string;
  minMembers: number; maxMembers: number | null; deadlineAt: string | null; paymentMethods: PaymentMethods; coverPhotoKey: string | null;
  hasResults: boolean; resultsPublishedAt: string | null; fundedAt: string | null; createdAt: string; updatedAt: string;
  telegram: { linked: boolean; title: string | null };
  organiser: PublicUser; items: PoolItem[]; totals: Totals; progress: Progress; shareUsd: number; breakdown: Breakdown;
};
export type CryptoQuote = { currency: string; cryptoAmount: number; usdPerCoin: number; amountUsd?: number; stable: boolean };
export type Member = {
  id: string; displayName: string; anonymous: boolean; paymentStatus: string; amountUsd: string; joinedAt: string; verifiedAt: string | null;
  userId?: string | null; guestContact?: string | null; paymentMethod?: string | null; paymentCurrency?: string | null; paymentNetwork?: string | null; paymentAddress?: string | null;
  paymentRef?: string | null; hasScreenshot?: boolean; screenshotKey?: string | null; note?: string | null; submittedAt?: string | null; claimToken?: string;
  paymentAmountCrypto?: string | null; paymentUsdPerCoin?: string | null;
};
export type ResultRow = { id: string; poolItemId: string | null; summary: string | null; purityPct: string | null; quantityMg: string | null; endotoxin: string | null; sterility: string | null; heavyMetals: string | null; passed: boolean | null; reportKey: string | null; labVerifyUrl: string | null; updatedAt: string };
export type Results = { notes: string | null; publishedAt: string | null; items: ResultRow[] };
export type Message = { id: string; userId: string | null; authorName: string; kind: string; body: string; createdAt: string };
export type PoolView = {
  pool: Pool; members: Member[]; photos: Photo[]; results: Results | null; resultsLocked: boolean; announcements: Message[];
  viewer: { isOrganiser: boolean; membership: Member | null; signedIn: boolean };
};
