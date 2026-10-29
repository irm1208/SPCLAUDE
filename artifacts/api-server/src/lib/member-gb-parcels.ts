import { maskLocation, memberEventDate, memberEventDescription } from "./parcel-event-privacy";

// Creator identity, country and product overlap are never destination evidence.
export const parcelUsernameKey = (value: string | null | undefined) =>
  (value ?? "").trim().replace(/^@/, "").toLowerCase();

export function parcelDestination(value: unknown, authorised: string[]): string | null | undefined {
  if (value === undefined) return undefined; // PATCH omission preserves the saved assignment
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("Choose a destination reshipper from this group buy.");
  const found = authorised.find(name => parcelUsernameKey(name) === parcelUsernameKey(value));
  if (!found) throw new Error("The destination reshipper is not assigned to this group buy.");
  return found;
}

export type MemberParcelOrder = {
  id: string; reshipperUsername?: string | null; routingType?: string | null;
  countryLegId?: string | null;
  directShippingRequested?: boolean | null; trackingNumber?: string | null;
  trackingNumbers?: unknown; status?: string; createdAt?: unknown;
};
type MemberLine = { orderId: string; productName: string; quantity: unknown };
type Parcel = {
  id: string; label: string; reshipperUsername?: string | null; trackingNumber: string;
  status: string; items: { name: string; qty: number; productId?: string }[] | null;
  cachedEvents?: unknown; lastChecked?: unknown; createdAt?: unknown;
};
const productKey = (value: string) => value.trim().toLowerCase();
const publicStatuses = new Set(["pending", "in_transit", "out_for_delivery", "attempted", "delivered", "exception", "expired"]);
const isDirect = (order: MemberParcelOrder) => !parcelUsernameKey(order.reshipperUsername)
  && order.routingType !== "reshipper" && order.directShippingRequested === true;

export function projectMemberParcels(
  parcels: Parcel[], orders: MemberParcelOrder[], lines: MemberLine[], groupReshippers: string[],
) {
  const known = new Set(groupReshippers.map(parcelUsernameKey));
  const result = [];
  for (const parcel of parcels) {
    // Only exact, canonical username labels are a supported historical convention.
    const destination = parcelUsernameKey(parcel.reshipperUsername)
      || (known.has(parcelUsernameKey(parcel.label)) ? parcelUsernameKey(parcel.label) : "");
    if (!destination || !known.has(destination)) continue;
    const orderIds = new Set(orders.filter(order =>
      parcelUsernameKey(order.reshipperUsername) === destination).map(order => order.id));
    const quantities = new Map<string, number>();
    for (const line of lines) {
      if (!orderIds.has(line.orderId)) continue;
      const key = productKey(line.productName);
      quantities.set(key, (quantities.get(key) ?? 0) + Number(line.quantity));
    }
    const items = (parcel.items ?? []).filter(item => quantities.has(productKey(item.name)))
      .map(item => ({ name: item.name, qty: quantities.get(productKey(item.name))! }));
    if (!items.length) continue;
    result.push({
      id: parcel.id, label: parcel.label, carrier: "",
      maskedTrackingNumber: "•".repeat(10), status: publicStatuses.has(parcel.status) ? parcel.status : "pending", items,
      events: (Array.isArray(parcel.cachedEvents) ? parcel.cachedEvents : []).map(raw => {
        const event = raw && typeof raw === "object" ? raw : {};
        return {
          date: memberEventDate(event.date),
          status: memberEventDescription(event.status),
          location: maskLocation(String(event.location ?? "")),
        };
      }), trackingUrl: null as string | null,
      lastChecked: parcel.lastChecked ?? null, createdAt: parcel.createdAt,
    });
  }
  // Direct delivery is member-owned order tracking, never an unassigned shared manifest.
  for (const order of orders.filter(isDirect)) {
    const numbers = Array.isArray(order.trackingNumbers) && order.trackingNumbers.length
      ? order.trackingNumbers.filter((n): n is string => typeof n === "string" && Boolean(n.trim()))
      : order.trackingNumber ? [order.trackingNumber] : [];
    numbers.forEach((number, index) => result.push({
      id: `order-${order.id}-${index}`, label: numbers.length > 1 ? `Your Parcel ${index + 1}` : "Your Parcel",
      carrier: "", maskedTrackingNumber: number,
      status: order.status === "Delivered" ? "delivered"
        : ["Shipped", "Completed"].includes(order.status ?? "") ? "in_transit" : "pending",
      items: lines.filter(line => line.orderId === order.id)
        .map(line => ({ name: line.productName, qty: Number(line.quantity) })),
      events: [], trackingUrl: `https://t.17track.net/en#nums=${encodeURIComponent(number)}`,
      lastChecked: null, createdAt: order.createdAt,
    }));
  }
  return result;
}
