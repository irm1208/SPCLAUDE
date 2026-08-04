import type { SampleGB } from "../data.ts";
import type { OrganiserOrder, OrderStatus } from "../domain/order.ts";

export interface OrganiserProfile {
  telegramUsername: string;
  email: string | null;
  organiserStatus: string | null;
  organiserApprovedAt?: string | null;
  organiserPaymentMethods?: Record<string, unknown> | null;
}

export interface ApiGroupBuy {
  id: string;
  name: string;
  status?: string | null;
  currency?: string | null;
  closeDate?: string | null;
  memberLimit?: number | null;
  [key: string]: unknown;
}

export interface ApiOrderLineItem {
  id?: string;
  productId?: string;
  productName?: string;
  name?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  price?: number | string;
  lineTotal?: number | string;
  isOos?: boolean;
}

export interface ApiOrganiserOrder {
  id: string;
  code?: string | null;
  telegramUsername?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  grandTotal?: number | string | null;
  deliveryMethod?: string | null;
  shippingName?: string | null;
  shippingCountry?: string | null;
  accountCountry?: string | null;
  trackingNumber?: string | null;
  adminNotes?: string | null;
  paymentTxHash?: string | null;
  paymentMethod?: string | null;
  createdAt?: string | null;
  paymentConfirmedAt?: string | null;
  hasPaymentScreenshot?: boolean;
  lineItems?: ApiOrderLineItem[];
  [key: string]: unknown;
}

export interface ApiTodoSubtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface ApiTodo {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "done";
  priority?: "high" | "medium" | "low";
  dueDate?: string;
  dueTime?: string;
  durationMin?: number;
  linkedOrderId?: string;
  linkedOrderIds?: string[];
  category?: string;
  subtasks?: ApiTodoSubtask[];
  archived?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ApiMember {
  telegramUsername: string;
  hasTelegram: boolean;
}

export interface ApiTicket {
  id: string;
  accountUsername: string;
  subject: string;
  status: string;
  groupBuyId?: string | null;
  customerUnread?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiProduct {
  id: string;
  name: string;
  vendor?: string | null;
  category?: string | null;
  mgSize?: string | null;
  price?: number | string | null;
  stock?: number | null;
  sold?: number;
  active?: boolean;
  maxPerCustomer?: number | null;
  halfKitEnabled?: boolean;
}

export interface ApiLabTest {
  id: number;
  peptideName: string;
  supplier?: string | null;
  purityPct?: number | string | null;
  labName?: string | null;
  batchCode?: string | null;
  url?: string | null;
  groupBuyId?: string | null;
  pending?: boolean;
  janoshikId?: string | null;
  mgAmount?: number | null;
  testType?: string | null;
  productCategory?: string | null;
  endotoxinEuMg?: number | null;
  sterilityPass?: boolean | null;
  heavyMetalAs?: string | null;
  heavyMetalCd?: string | null;
  heavyMetalPb?: string | null;
  heavyMetalHg?: string | null;
  testDate?: string | null;
  createdAt?: string;
}

export interface ApiParcel {
  id: string;
  groupBuyId: string;
  label: string;
  carrier: string;
  trackingNumber: string;
  notes?: string | null;
  items: string[];
  status: string;
  trackingUrl?: string | null;
  createdAt?: string;
}

export interface ApiGbReshipper {
  id: string;
  gbId: string;
  reshipperUsername: string;
  country: string;
  enabledPaymentMethods: Record<string, boolean> | null;
  enabled: boolean;
  paymentTarget: string;
  createdAt: string;
}

export interface ApiPnlData {
  gbId: string;
  gbName: string;
  orders: { total: number; confirmed: number };
  revenue: { total: number; products: number; delivery: number };
  costs: { materials: number; lab: number; shipping: number; misc: number; platformFee: number; total: number; notes: string | null };
  profit: { gross: number; marginPct: number };
  productBreakdown: { name: string; totalQty: number; totalRevenue: number }[];
}

export interface ApiTicketMessage {
  id: number;
  ticketId: string;
  authorRole: string;
  authorUsername: string;
  body: string;
  createdAt: string;
}

export interface ApiTicketFull extends ApiTicket {
  category?: string;
  unreadCount?: number;
  groupBuyName?: string | null;
}

export interface ApiTestingRound {
  id: string;
  groupBuyId?: string;
  status: string;
  contributionAmount: number | string;
  anyContribution?: boolean;
  fundingNote?: string | null;
  resultNotes?: string | null;
  resultPdfUrl?: string | null;
  voteOptions?: string[] | null;
  testOptions?: string[] | null;
  createdAt?: string;
}

export interface ApiTestingContributionSummary {
  pending: number;
  confirmed: number;
  rejected: number;
  total: number;
}

export interface ApiTestingPool {
  round: ApiTestingRound | null;
  products: ApiProduct[];
  labTests: ApiLabTest[];
  contributions: ApiTestingContributionSummary;
}

export interface ApiTestingMilestone {
  label: string;
  amount: number;
  type: "test" | "vial";
  vialNum?: number;
}

export interface ApiTestingVoteSummary {
  peptideName: string;
  totalVotes: number;
  vials: Record<string, number>;
}

export interface ApiTestingPoolSnapshot {
  round: ApiTestingRound | null;
  poolTotal: number;
  contributorCount: number;
  totalVotes: number;
  milestones: ApiTestingMilestone[];
  votes: ApiTestingVoteSummary[];
  testVotes: Record<string, number>;
  peptideBatches?: Record<string, string>;
}

export interface OrganiserRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export class OrganiserApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.name = "OrganiserApiError";
    this.status = status;
    this.data = data;
  }
}

function readErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of ["error", "message", "detail", "title"]) {
      if (typeof record[key] === "string" && record[key].trim()) return record[key].trim();
    }
  }
  if (typeof data === "string" && data.trim()) return data.trim();
  return fallback;
}

export async function organiserRequest<T>(
  path: string,
  options: OrganiserRequestOptions = {},
  fetcher: typeof fetch = fetch,
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const headers = new Headers(options.headers);
  const hasBody = options.body !== undefined;
  if (hasBody && !headers.has("content-type")) headers.set("content-type", "application/json");

  const response = await fetcher(`/api${normalizedPath}`, {
    ...options,
    credentials: "include",
    headers,
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const data = response.status === 204
    ? null
    : contentType.includes("json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");

  if (!response.ok) {
    // Session expired — redirect to login instead of surfacing a cryptic error
    if (response.status === 401) {
      window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    }
    throw new OrganiserApiError(
      response.status,
      readErrorMessage(data, `Request failed with status ${response.status}`),
      data,
    );
  }

  return data as T;
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function displayName(username: string): string {
  return username
    .replace(/^@/, "")
    .split(/[_.-]+/)
    .filter(Boolean)
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ") || "Member";
}

function mapOrderStatus(status: unknown, paymentStatus: unknown): OrderStatus {
  const normalizedStatus = String(status ?? "").toLowerCase();
  const normalizedPayment = String(paymentStatus ?? "").toLowerCase();
  if (normalizedStatus === "cancelled") return "cancelled";
  if (normalizedStatus === "completed") return "delivered";
  if (normalizedStatus === "shipped") return "shipped";
  if (normalizedStatus === "processing") {
    return normalizedPayment === "confirmed" ? "processing" : "pending";
  }
  if (["confirmed", "test_confirmed"].includes(normalizedPayment)) return "paid";
  return "pending";
}

function paymentMethodLabel(value: unknown): string {
  const method = String(value ?? "manual").trim().toLowerCase();
  if (method === "revolut") return "Revolut";
  if (method === "paypal") return "PayPal";
  if (method === "anonpay") return "AnonPay";
  if (method === "crypto") return "Crypto";
  if (method === "credits") return "Store Credits";
  return method && method !== "manual" ? `${method.charAt(0).toUpperCase()}${method.slice(1)}` : "Manual";
}

export function mapApiOrder(value: ApiOrganiserOrder): OrganiserOrder {
  const username = String(value.telegramUsername ?? "unknown").replace(/^@/, "");
  const txHash = typeof value.paymentTxHash === "string" && value.paymentTxHash.trim()
    ? value.paymentTxHash.trim()
    : undefined;

  return {
    id: value.id,
    code: typeof value.code === "string" ? value.code : undefined,
    memberUsername: username,
    memberName: typeof value.shippingName === "string" && value.shippingName.trim()
      ? value.shippingName.trim()
      : displayName(username),
    status: mapOrderStatus(value.status, value.paymentStatus),
    apiStatus: typeof value.status === "string" ? value.status : undefined,
    paymentStatus: typeof value.paymentStatus === "string" ? value.paymentStatus : undefined,
    products: (value.lineItems ?? []).map(item => ({
      id: item.id,
      productId: item.productId,
      name: String(item.productName ?? item.name ?? "Product"),
      quantity: numberValue(item.quantity),
      price: numberValue(item.unitPrice ?? item.price),
      isOos: Boolean(item.isOos),
    })),
    total: numberValue(value.grandTotal),
    paymentMethod: paymentMethodLabel(value.paymentMethod),
    country: String(value.shippingCountry ?? value.accountCountry ?? "Unknown"),
    createdAt: String(value.createdAt ?? new Date(0).toISOString()),
    paidAt: typeof value.paymentConfirmedAt === "string" ? value.paymentConfirmedAt : undefined,
    shippingOption: String(value.deliveryMethod ?? "Not selected"),
    paymentProof: txHash ? { type: "txid", value: txHash } : undefined,
    trackingNumber: typeof value.trackingNumber === "string" && value.trackingNumber.trim()
      ? value.trackingNumber.trim()
      : undefined,
    internalNotes: typeof value.adminNotes === "string" && value.adminNotes.trim()
      ? value.adminNotes.trim()
      : undefined,
  };
}

export function mapApiGroupBuy(value: ApiGroupBuy): SampleGB {
  const status = value.status === "active" || value.status === "closed" || value.status === "archived"
    ? value.status
    : "draft";
  const memberLimit = numberValue(value.memberLimit, 0);
  return {
    id: value.id,
    name: value.name,
    status,
    currency: typeof value.currency === "string" && value.currency ? value.currency : "GBP",
    closeDate: typeof value.closeDate === "string" ? value.closeDate : null,
    members: 0,
    maxMembers: memberLimit > 0 ? memberLimit : 1,
    activeOrders: 0,
    revenue: 0,
    pendingPayments: 0,
    pendingLabs: 0,
    openTickets: 0,
  };
}

export function createOrganiserApi(fetcher: typeof fetch = fetch) {
  const request = <T>(path: string, options?: OrganiserRequestOptions) => organiserRequest<T>(path, options, fetcher);

  return {
  profile: () => request<OrganiserProfile>("/organiser/me"),
  groupBuys: () => request<ApiGroupBuy[]>("/organiser/group-buys"),
  groupBuy: (groupBuyId: string) => request<ApiGroupBuy>(`/organiser/group-buys/${encodeURIComponent(groupBuyId)}`),
  createGroupBuy: (body: Record<string, unknown>) => request<ApiGroupBuy>(
    "/organiser/group-buys",
    { method: "POST", body },
  ),
  updateGroupBuy: (groupBuyId: string, body: Record<string, unknown>) => request<ApiGroupBuy>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}`,
    { method: "PATCH", body },
  ),
  requestPublic: (groupBuyId: string) => request<ApiGroupBuy>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/request-public`,
    { method: "PATCH" },
  ),
  archiveGroupBuy: (groupBuyId: string) => request<{ ok: boolean; id: string }>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}`,
    { method: "DELETE" },
  ),
  members: (groupBuyId: string) => request<ApiMember[]>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/members`,
  ),
  tickets: async (groupBuyId: string) => {
    const response = await request<{ tickets: ApiTicket[] }>(
      `/organiser/tickets?groupBuyId=${encodeURIComponent(groupBuyId)}`,
    );
    return response.tickets;
  },
  testingPool: (groupBuyId: string) => request<ApiTestingPool>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/testing`,
  ),
  testingPoolSnapshot: (groupBuyId: string) => request<ApiTestingPoolSnapshot>(
    `/group-buys/${encodeURIComponent(groupBuyId)}/testing`,
  ),
  createTestingPool: (groupBuyId: string, body: Record<string, unknown>) => request<ApiTestingPool>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/testing`,
    { method: "POST", body },
  ),
  updateTestingPool: (groupBuyId: string, body: Record<string, unknown>) => request<ApiTestingPool>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/testing`,
    { method: "PATCH", body },
  ),
  products: (groupBuyId: string) => request<ApiProduct[]>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/products`,
  ),
  createProduct: (groupBuyId: string, body: Record<string, unknown>) => request<ApiProduct>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/products`,
    { method: "POST", body },
  ),
  updateProduct: (groupBuyId: string, productId: string, body: Record<string, unknown>) => request<{ ok: boolean }>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/products/${encodeURIComponent(productId)}`,
    { method: "PATCH", body },
  ),
  updateOwnedProduct: (productId: string, body: Record<string, unknown>) => request<ApiProduct>(
    `/organiser/products/${encodeURIComponent(productId)}`,
    { method: "PUT", body },
  ),
  labTests: () => request<ApiLabTest[]>("/organiser/lab-tests"),
  createLabTest: (body: Record<string, unknown>) => request<ApiLabTest>(
    "/organiser/lab-tests",
    { method: "POST", body },
  ),
  deleteLabTest: (id: number) => request<{ ok: boolean }>(
    `/organiser/lab-tests/${id}`,
    { method: "DELETE" },
  ),
  extractLabTest: (body: { url?: string; fileBase64?: string; mimeType?: string }) => request<Partial<ApiLabTest>>(
    "/organiser/lab-tests/extract",
    { method: "POST", body },
  ),
  getRules: (groupBuyId: string) => request<{ rules: Array<{ id: string; text: string; enabled?: boolean; format?: string }> }>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/rules`,
  ),
  updateRules: (groupBuyId: string, rules: Array<Record<string, unknown>>) => request<{ rules: unknown[] }>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/rules`,
    { method: "PATCH", body: { rules } },
  ),
  parcels: (groupBuyId: string) => request<ApiParcel[]>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/parcels`,
  ),
  createParcel: (groupBuyId: string, body: Record<string, unknown>) => request<ApiParcel>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/parcels`,
    { method: "POST", body },
  ),
  deleteParcel: (groupBuyId: string, parcelId: string) => request<{ ok: boolean }>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/parcels/${encodeURIComponent(parcelId)}`,
    { method: "DELETE" },
  ),
  pnl: (groupBuyId: string) => request<ApiPnlData>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/pnl`,
  ),
  updatePnlCosts: (groupBuyId: string, costs: Record<string, unknown>) => request<{ ok: boolean }>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/pnl-costs`,
    { method: "PUT", body: costs },
  ),
  gbReshippers: (groupBuyId: string) => request<ApiGbReshipper[]>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/reshippers`,
  ),
  approvedReshippers: () => request<Array<{ telegramUsername: string; reshipperPaymentMethods: unknown }>>(
    "/organiser/approved-reshippers",
  ),
  addReshipper: (groupBuyId: string, body: { reshipperUsername: string; country: string; enabledPaymentMethods?: Record<string, boolean> }) => request<ApiGbReshipper>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/reshippers`,
    { method: "POST", body },
  ),
  updateReshipper: (groupBuyId: string, username: string, body: Record<string, unknown>) => request<ApiGbReshipper>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/reshippers/${encodeURIComponent(username)}`,
    { method: "PATCH", body },
  ),
  deleteReshipper: (groupBuyId: string, username: string) => request<{ ok: boolean }>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/reshippers/${encodeURIComponent(username)}`,
    { method: "DELETE" },
  ),
  reassignReshipper: (groupBuyId: string, orderId: string, reshipperUsername: string | null) => request<{ ok: boolean }>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/orders/${encodeURIComponent(orderId)}/reassign-reshipper`,
    { method: "PATCH", body: { reshipperUsername } },
  ),
  broadcast: (groupBuyId: string, body: Record<string, unknown>) => request<{ ok: boolean; sentCount?: number; skipped?: number }>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/broadcast`,
    { method: "POST", body },
  ),
  getTicket: (ticketId: string) => request<{ ticket: ApiTicketFull; messages: ApiTicketMessage[] }>(
    `/organiser/tickets/${encodeURIComponent(ticketId)}`,
  ),
  replyTicket: (ticketId: string, body: string) => request<ApiTicketMessage>(
    `/organiser/tickets/${encodeURIComponent(ticketId)}/messages`,
    { method: "POST", body: { body } },
  ),
  generateReshippperInviteCode: (groupBuyId: string) => request<{ inviteCode: string }>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/reshipper-invite-code`,
    { method: "POST" },
  ),
  orders: async (groupBuyId: string) => {
    const rows = await request<ApiOrganiserOrder[]>(`/organiser/group-buys/${encodeURIComponent(groupBuyId)}/orders`);
    return rows.map(mapApiOrder);
  },
  updateOrder: (groupBuyId: string, orderId: string, body: Record<string, unknown>) => request(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/orders/${encodeURIComponent(orderId)}`,
    { method: "PATCH", body },
  ),
  todos: (groupBuyId: string) => request<ApiTodo[]>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/todos`,
  ),
  createTodo: (groupBuyId: string, todo: ApiTodo) => request<ApiTodo>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/todos`,
    { method: "POST", body: todo },
  ),
  updateTodo: (groupBuyId: string, todoId: string, todo: ApiTodo) => request<ApiTodo>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/todos/${encodeURIComponent(todoId)}`,
    { method: "PATCH", body: todo },
  ),
  deleteTodo: (groupBuyId: string, todoId: string) => request<{ ok: boolean; id: string }>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/todos/${encodeURIComponent(todoId)}`,
    { method: "DELETE" },
  ),
  cloneGroupBuy: (groupBuyId: string, sections: string[]) => request<ApiGroupBuy>(
    `/organiser/group-buys/${encodeURIComponent(groupBuyId)}/clone`,
    { method: "POST", body: { sections } },
  ),
  };
}

export const organiserApi = createOrganiserApi();
