import type {
  DeskState,
  DispatchOrder,
  DispatchRecord,
  DispatchStage,
  FulfilmentRow,
  MissingItem,
  ParcelItem,
} from "./types.ts";

export type { DeskState } from "./types.ts";

export function getReachableStages(state: DeskState): DispatchStage[] {
  if (state.selectedParcelIds.length === 0) return ["receive"];
  if (!state.fulfilment || state.selectedOrderIds.length === 0) return ["receive", "prepare"];
  return ["receive", "prepare", "dispatch"];
}

export function selectParcels(state: DeskState, parcelIds: string[]): DeskState {
  return {
    ...state,
    stage: "receive",
    selectedParcelIds: parcelIds,
    fulfilment: null,
    selectedOrderIds: [],
  };
}

export function getAvailableInventory(state: DeskState): Map<string, ParcelItem> {
  const selected = new Set(state.selectedParcelIds);
  const inventory = new Map<string, ParcelItem>();

  for (const parcel of state.parcels.filter(parcel => selected.has(parcel.id))) {
    for (const item of parcel.items) {
      const available = Math.max(0, item.quantity - item.dispatchedQuantity);
      const current = inventory.get(item.productId);
      inventory.set(item.productId, {
        ...item,
        quantity: (current?.quantity ?? 0) + available,
        dispatchedQuantity: 0,
      });
    }
  }

  return inventory;
}

export function computeFulfilment(state: DeskState): DeskState {
  const inventory = getAvailableInventory(state);
  const rows: FulfilmentRow[] = state.orders.map(order => {
    const missingItems: MissingItem[] = order.items.flatMap(item => {
      const available = inventory.get(item.productId)?.quantity ?? 0;
      return available < item.quantity ? [{ ...item, available }] : [];
    });
    const ready = missingItems.length === 0;

    if (ready) {
      for (const item of order.items) {
        const stock = inventory.get(item.productId)!;
        inventory.set(item.productId, { ...stock, quantity: stock.quantity - item.quantity });
      }
    }

    return { order, ready, missingItems };
  });

  return {
    ...state,
    stage: "prepare",
    fulfilment: rows,
    selectedOrderIds: rows.filter(row => row.ready).map(row => row.order.id),
  };
}

export function selectParcelsAndCompute(state: DeskState, parcelIds: string[]): DeskState {
  const selected = selectParcels(state, parcelIds);
  return parcelIds.length === 0 ? selected : computeFulfilment(selected);
}

export function getReadyCount(state: DeskState): number {
  return state.fulfilment?.filter(row => row.ready).length ?? 0;
}

export function getReminderEligibleOrders(orders: DispatchOrder[]): DispatchOrder[] {
  return orders.filter(order => order.qrState === "reminder_needed");
}

export function confirmDispatch(
  state: DeskState,
  dispatchedAt: string,
  reminderSentAtByOrder: Record<string, string> = {},
): DeskState {
  if (!state.fulfilment || state.selectedOrderIds.length === 0) {
    throw new Error("Select at least one ready order before dispatching");
  }

  const selected = new Set(state.selectedOrderIds);
  const selectedParcels = new Set(state.selectedParcelIds);
  const dispatchedOrders = state.fulfilment
    .filter(row => row.ready && selected.has(row.order.id))
    .map(row => row.order);

  if (dispatchedOrders.length === 0) {
    throw new Error("Select at least one ready order before dispatching");
  }

  const dispatchedIds = new Set(dispatchedOrders.map(order => order.id));
  const parcels = state.parcels.map(parcel => ({
    ...parcel,
    items: parcel.items.map(item => ({ ...item })),
  }));

  for (const order of dispatchedOrders) {
    for (const orderItem of order.items) {
      let remaining = orderItem.quantity;
      for (const parcel of parcels.filter(parcel => selectedParcels.has(parcel.id))) {
        const item = parcel.items.find(candidate => candidate.productId === orderItem.productId);
        if (!item || remaining === 0) continue;
        const available = item.quantity - item.dispatchedQuantity;
        const used = Math.min(available, remaining);
        item.dispatchedQuantity += used;
        remaining -= used;
      }
    }
  }

  const records: DispatchRecord[] = dispatchedOrders.map(order => ({
    ...order,
    dispatchedAt,
    parcelIds: [...state.selectedParcelIds],
    reminderSentAt: reminderSentAtByOrder[order.id],
    dispatchPhotos: [],
  }));

  return {
    ...state,
    stage: "receive",
    parcels,
    orders: state.orders.filter(order => !dispatchedIds.has(order.id)),
    selectedParcelIds: [],
    fulfilment: null,
    selectedOrderIds: [],
    log: [...records, ...state.log],
  };
}

export function restoreDispatch(state: DeskState, orderId: string): DeskState {
  const record = state.log.find(candidate => candidate.id === orderId);
  if (!record) throw new Error("Dispatch record not found");

  const sourceParcels = new Set(record.parcelIds);
  const parcels = state.parcels.map(parcel => ({
    ...parcel,
    items: parcel.items.map(item => ({ ...item })),
  }));

  for (const orderItem of record.items) {
    let remaining = orderItem.quantity;
    for (const parcel of [...parcels].reverse().filter(parcel => sourceParcels.has(parcel.id))) {
      const item = parcel.items.find(candidate => candidate.productId === orderItem.productId);
      if (!item || remaining === 0) continue;
      const restored = Math.min(item.dispatchedQuantity, remaining);
      item.dispatchedQuantity -= restored;
      remaining -= restored;
    }
  }

  const { dispatchedAt: _dispatchedAt, parcelIds: _parcelIds, reminderSentAt: _reminderSentAt, dispatchPhotos: _dispatchPhotos, ...order } = record;
  return {
    ...state,
    parcels,
    orders: [order, ...state.orders],
    log: state.log.filter(candidate => candidate.id !== orderId),
  };
}
