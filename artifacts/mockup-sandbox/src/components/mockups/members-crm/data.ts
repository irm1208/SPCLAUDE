export type PaymentStatus = "confirmed" | "pending" | "overdue";

export type FulfilmentStatus =
  | "ready"
  | "packing"
  | "dispatched"
  | "on-hold"
  | "blocked";

export type ActivityTone = "info" | "success" | "warning" | "danger";

export type MemberRecord = {
  id: string;
  name: string;
  username: string;
  initials: string;
  country: string;
  countryCode: string;
  memberSince: string;
  orderCount: number;
  productCount: number;
  totalSpent: number;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  lastOrderAt: string | null;
  attention: boolean;
};

export type OrderRecord = {
  id: string;
  memberId: string;
  createdAt: string;
  total: number;
  products: Array<{ name: string; quantity: number }>;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
};

export type ActivityEvent = {
  id: string;
  memberId: string;
  occurredAt: string;
  title: string;
  detail: string;
  tone: ActivityTone;
};

export const FEATURED_MEMBERS: MemberRecord[] = [
  {
    id: "james-reed",
    name: "James Reed",
    username: "@j4mes_r",
    initials: "JR",
    country: "United Kingdom",
    countryCode: "GB",
    memberSince: "Jan 2025",
    orderCount: 5,
    productCount: 11,
    totalSpent: 1_860,
    paymentStatus: "confirmed",
    fulfilmentStatus: "packing",
    lastOrderAt: "2026-07-12",
    attention: false,
  },
  {
    id: "reeper90",
    name: "Reeper90",
    username: "@reeper90",
    initials: "R9",
    country: "Germany",
    countryCode: "DE",
    memberSince: "Mar 2025",
    orderCount: 4,
    productCount: 8,
    totalSpent: 1_240,
    paymentStatus: "pending",
    fulfilmentStatus: "on-hold",
    lastOrderAt: "2026-07-11",
    attention: true,
  },
  {
    id: "maya-chen",
    name: "Maya Chen",
    username: "@mchen",
    initials: "MC",
    country: "Netherlands",
    countryCode: "NL",
    memberSince: "Jun 2026",
    orderCount: 3,
    productCount: 6,
    totalSpent: 980,
    paymentStatus: "confirmed",
    fulfilmentStatus: "ready",
    lastOrderAt: "2026-07-10",
    attention: false,
  },
  {
    id: "noshoes",
    name: "NoShoesNoService",
    username: "@noshoes",
    initials: "NS",
    country: "France",
    countryCode: "FR",
    memberSince: "Feb 2025",
    orderCount: 2,
    productCount: 4,
    totalSpent: 720,
    paymentStatus: "confirmed",
    fulfilmentStatus: "dispatched",
    lastOrderAt: "2026-07-09",
    attention: false,
  },
  {
    id: "urban-blend",
    name: "Urban Blend",
    username: "@urbanblend",
    initials: "UB",
    country: "United States",
    countryCode: "US",
    memberSince: "Nov 2024",
    orderCount: 6,
    productCount: 14,
    totalSpent: 2_340,
    paymentStatus: "overdue",
    fulfilmentStatus: "blocked",
    lastOrderAt: "2026-07-08",
    attention: true,
  },
  {
    id: "lena-k",
    name: "Lena K.",
    username: "@lenak",
    initials: "LK",
    country: "Ireland",
    countryCode: "IE",
    memberSince: "Apr 2026",
    orderCount: 3,
    productCount: 7,
    totalSpent: 1_105,
    paymentStatus: "confirmed",
    fulfilmentStatus: "packing",
    lastOrderAt: "2026-07-07",
    attention: false,
  },
];

const COUNTRIES = [
  { name: "United Kingdom", code: "GB" },
  { name: "Germany", code: "DE" },
  { name: "Netherlands", code: "NL" },
  { name: "France", code: "FR" },
  { name: "Ireland", code: "IE" },
  { name: "Spain", code: "ES" },
  { name: "United States", code: "US" },
  { name: "Sweden", code: "SE" },
] as const;

const FIRST_NAMES = [
  "Alex",
  "Priya",
  "Tomas",
  "Sofia",
  "Erik",
  "Niamh",
  "Daniel",
  "Camille",
  "Ines",
  "Oliver",
  "Freja",
  "Luca",
] as const;

const LAST_NAMES = ["Brown", "Novak", "Silva"] as const;

const PAYMENT_STATUSES: PaymentStatus[] = [
  "confirmed",
  "pending",
  "overdue",
];

const FULFILMENT_STATUSES: FulfilmentStatus[] = [
  "ready",
  "packing",
  "dispatched",
  "on-hold",
  "blocked",
];

const PRODUCT_NAMES = [
  "BPC-157 10 mg",
  "TB-500 10 mg",
  "GHK-Cu 50 mg",
  "KPV 10 mg",
  "Retatrutide 10 mg",
  "Bacteriostatic Water 10 ml",
] as const;

const dateBefore = (date: string, days: number) => {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() - days);
  return result.toISOString().slice(0, 10);
};

const generatedOrderTotal = (memberIndex: number, orderIndex: number) =>
  135 + (memberIndex % 9) * 28 + orderIndex * 17;

const generatedProductCount = (memberIndex: number, orderCount: number) =>
  Array.from({ length: orderCount }, (_, orderIndex) =>
    (memberIndex + orderIndex) % 3 === 0 ? 2 : 1,
  ).reduce((total, quantity) => total + quantity, 0);

const GENERATED_MEMBERS: MemberRecord[] = Array.from(
  { length: 36 },
  (_, memberIndex) => {
    const firstName = FIRST_NAMES[memberIndex % FIRST_NAMES.length];
    const lastName = LAST_NAMES[Math.floor(memberIndex / FIRST_NAMES.length)];
    const country = COUNTRIES[memberIndex % COUNTRIES.length];
    const orderCount = (memberIndex % 4) + 1;
    const paymentStatus = PAYMENT_STATUSES[memberIndex % PAYMENT_STATUSES.length];
    const fulfilmentStatus =
      FULFILMENT_STATUSES[memberIndex % FULFILMENT_STATUSES.length];
    const totalSpent = Array.from({ length: orderCount }, (_, orderIndex) =>
      generatedOrderTotal(memberIndex, orderIndex),
    ).reduce((total, orderTotal) => total + orderTotal, 0);

    return {
      id: `member-${String(memberIndex + 1).padStart(3, "0")}`,
      name: `${firstName} ${lastName}`,
      username: `@${firstName.toLowerCase()}${lastName.toLowerCase()}${memberIndex + 1}`,
      initials: `${firstName[0]}${lastName[0]}`,
      country: country.name,
      countryCode: country.code,
      memberSince: dateBefore("2025-12-12", memberIndex * 6),
      orderCount,
      productCount: generatedProductCount(memberIndex, orderCount),
      totalSpent,
      paymentStatus,
      fulfilmentStatus,
      lastOrderAt: dateBefore("2026-07-11", memberIndex % 28),
      attention:
        paymentStatus !== "confirmed" ||
        fulfilmentStatus === "on-hold" ||
        fulfilmentStatus === "blocked",
    };
  },
);

export const MEMBERS: MemberRecord[] = [
  ...FEATURED_MEMBERS,
  ...GENERATED_MEMBERS,
];

const JAMES_ORDER_SEEDS = [
  {
    id: "WPR-JR-260204",
    createdAt: "2026-02-04",
    total: 320,
    products: [
      { name: "BPC-157 10 mg", quantity: 2 },
      { name: "Bacteriostatic Water 10 ml", quantity: 1 },
    ],
    fulfilmentStatus: "dispatched" as const,
  },
  {
    id: "WPR-JR-260318",
    createdAt: "2026-03-18",
    total: 385,
    products: [{ name: "Retatrutide 10 mg", quantity: 2 }],
    fulfilmentStatus: "dispatched" as const,
  },
  {
    id: "WPR-JR-260501",
    createdAt: "2026-05-01",
    total: 410,
    products: [{ name: "GHK-Cu 50 mg", quantity: 2 }],
    fulfilmentStatus: "dispatched" as const,
  },
  {
    id: "WPR-JR-260609",
    createdAt: "2026-06-09",
    total: 355,
    products: [
      { name: "TB-500 10 mg", quantity: 2 },
      { name: "Bacteriostatic Water 10 ml", quantity: 1 },
    ],
    fulfilmentStatus: "ready" as const,
  },
  {
    id: "WPR-JR-260712",
    createdAt: "2026-07-12",
    total: 390,
    products: [{ name: "KPV 10 mg", quantity: 1 }],
    fulfilmentStatus: "packing" as const,
  },
];

const createOrdersForMember = (
  member: MemberRecord,
  memberIndex: number,
): OrderRecord[] => {
  if (member.id === "james-reed") {
    return JAMES_ORDER_SEEDS.map((order) => ({
      ...order,
      memberId: member.id,
      paymentStatus: member.paymentStatus,
    }));
  }

  const lastOrderAt = member.lastOrderAt;
  if (lastOrderAt === null) {
    return [];
  }

  const baseTotal = Math.floor(member.totalSpent / member.orderCount);
  const totalRemainder = member.totalSpent % member.orderCount;
  const baseQuantity = Math.floor(member.productCount / member.orderCount);
  const quantityRemainder = member.productCount % member.orderCount;

  return Array.from({ length: member.orderCount }, (_, orderIndex) => {
    const isLatest = orderIndex === member.orderCount - 1;
    const createdAt = dateBefore(
      lastOrderAt,
      (member.orderCount - orderIndex - 1) * 21,
    );

    return {
      id: `WPR-${member.id.toUpperCase()}-${String(orderIndex + 1).padStart(2, "0")}`,
      memberId: member.id,
      createdAt,
      total: baseTotal + (orderIndex < totalRemainder ? 1 : 0),
      products: [
        {
          name: PRODUCT_NAMES[(memberIndex + orderIndex) % PRODUCT_NAMES.length],
          quantity:
            baseQuantity + (orderIndex < quantityRemainder ? 1 : 0),
        },
      ],
      paymentStatus: isLatest ? member.paymentStatus : "confirmed",
      fulfilmentStatus: isLatest ? member.fulfilmentStatus : "dispatched",
    };
  });
};

export const ORDERS: OrderRecord[] = MEMBERS.flatMap(createOrdersForMember);

const FEATURED_ACTIVITY_EVENTS: ActivityEvent[] = [
  {
    id: "activity-james-payment",
    memberId: "james-reed",
    occurredAt: "2026-07-12T09:24:00Z",
    title: "Payment confirmed",
    detail: "Payment for WPR-JR-260712 was reconciled.",
    tone: "success",
  },
  {
    id: "activity-james-packing",
    memberId: "james-reed",
    occurredAt: "2026-07-14T14:10:00Z",
    title: "Packing started",
    detail: "James's latest order moved to the packing bench.",
    tone: "info",
  },
  {
    id: "activity-reeper-payment",
    memberId: "reeper90",
    occurredAt: "2026-07-13T10:05:00Z",
    title: "Payment follow-up needed",
    detail: "The latest transfer is still awaiting confirmation.",
    tone: "warning",
  },
  {
    id: "activity-maya-ready",
    memberId: "maya-chen",
    occurredAt: "2026-07-14T08:42:00Z",
    title: "Order ready",
    detail: "Maya's order passed its final packing check.",
    tone: "success",
  },
  {
    id: "activity-noshoes-dispatched",
    memberId: "noshoes",
    occurredAt: "2026-07-07T16:18:00Z",
    title: "Parcel dispatched",
    detail: "Tracking was issued for the France delivery leg.",
    tone: "success",
  },
  {
    id: "activity-urban-blocked",
    memberId: "urban-blend",
    occurredAt: "2026-07-15T11:32:00Z",
    title: "Fulfilment blocked",
    detail: "Payment is overdue and organiser review is required.",
    tone: "danger",
  },
  {
    id: "activity-lena-packing",
    memberId: "lena-k",
    occurredAt: "2026-07-13T13:50:00Z",
    title: "Packing started",
    detail: "Lena's products were assigned to the Ireland parcel.",
    tone: "info",
  },
];

const GENERATED_ACTIVITY_EVENTS: ActivityEvent[] = GENERATED_MEMBERS.map(
  (member, memberIndex) => ({
    id: `activity-${member.id}-joined`,
    memberId: member.id,
    occurredAt: `${member.memberSince}T09:${String(memberIndex % 60).padStart(2, "0")}:00Z`,
    title: "Joined the group buy",
    detail: `${member.name} joined Winter Peptide Run 2025.`,
    tone: "info",
  }),
);

export const ACTIVITY_EVENTS: ActivityEvent[] = [
  ...FEATURED_ACTIVITY_EVENTS,
  ...GENERATED_ACTIVITY_EVENTS,
];
