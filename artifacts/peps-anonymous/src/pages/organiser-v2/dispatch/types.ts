export type DispatchStage = "receive" | "prepare" | "dispatch";
export type DispatchView = "desk" | "log";
export type ScopeType = "all" | "reshipper" | "country";
export type QrState = "uploaded" | "reminder_needed" | "not_required";

export interface ParcelItem {
  productId: string;
  name: string;
  quantity: number;
  dispatchedQuantity: number;
}

export interface DeliveredParcel {
  id: string;
  label: string;
  trackingNumber: string;
  carrier: string;
  status: "delivered";
  receivedAt: string;
  reshipper?: string;
  country?: string;
  items: ParcelItem[];
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
}

export interface DispatchOrder {
  id: string;
  code: string;
  memberName: string;
  telegramUsername: string;
  deliveryMethod: string;
  shippingCountry: string;
  qrState: QrState;
  items: OrderItem[];
}

export interface MissingItem extends OrderItem {
  available: number;
}

export interface FulfilmentRow {
  order: DispatchOrder;
  ready: boolean;
  missingItems: MissingItem[];
}

export interface DispatchRecord extends DispatchOrder {
  dispatchedAt: string;
  parcelIds: string[];
  reminderSentAt?: string;
  dispatchPhotos: string[];
}

export interface DeskState {
  stage: DispatchStage;
  view: DispatchView;
  scopeType: ScopeType;
  scopeId: string;
  parcels: DeliveredParcel[];
  orders: DispatchOrder[];
  selectedParcelIds: string[];
  fulfilment: FulfilmentRow[] | null;
  selectedOrderIds: string[];
  log: DispatchRecord[];
}
