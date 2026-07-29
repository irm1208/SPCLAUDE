import type { OrderChange, OrderRepository, OrderRepositoryLoadState } from "./order-repository.ts";
import type { OrganiserOrder, OrderStatus } from "./order.ts";

export interface ApiOrderClient {
  listOrders(): Promise<OrganiserOrder[]>;
  updateOrder(orderId: string, body: Record<string, unknown>): Promise<unknown>;
}

function statusPatch(status: OrderStatus): Record<string, unknown> {
  if (status === "paid") return { paymentStatus: "confirmed" };
  if (status === "pending") return { paymentStatus: "unpaid" };
  if (status === "processing") return { status: "Processing" };
  if (status === "shipped" || status === "dispatched") return { status: "Shipped" };
  if (status === "delivered") return { status: "Completed" };
  return { status: "Cancelled" };
}

function editableProductsChanged(previous: OrganiserOrder, next: OrganiserOrder): boolean {
  if (previous.products.length !== next.products.length) return true;
  return previous.products.some((product, index) => {
    const candidate = next.products[index];
    return !candidate
      || product.id !== candidate.id
      || product.productId !== candidate.productId
      || product.quantity !== candidate.quantity;
  });
}

export function toApiOrderPatch(
  previous: OrganiserOrder,
  next: OrganiserOrder,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (previous.status !== next.status) Object.assign(patch, statusPatch(next.status));
  if (previous.internalNotes !== next.internalNotes) patch.adminNotes = next.internalNotes ?? null;
  if (previous.trackingNumber !== next.trackingNumber) patch.trackingNumber = next.trackingNumber ?? null;
  if (previous.paymentProof?.value !== next.paymentProof?.value) patch.paymentTxHash = next.paymentProof?.value ?? null;
  if (editableProductsChanged(previous, next)) {
    patch.lineItemUpdates = next.products.map(product => ({
      id: product.id,
      productId: product.productId,
      quantity: product.quantity,
    }));
  }
  return patch;
}

export function createApiOrderRepository({
  groupBuyId: _groupBuyId,
  client,
}: {
  groupBuyId: string;
  client: ApiOrderClient;
}): OrderRepository {
  let current: readonly OrganiserOrder[] = [];
  let loadState: OrderRepositoryLoadState = "idle";
  let error: Error | null = null;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());

  async function refresh(showLoading: boolean): Promise<readonly OrganiserOrder[]> {
    if (showLoading) {
      loadState = "loading";
      error = null;
      notify();
    }
    try {
      const orders = await client.listOrders();
      current = orders;
      loadState = "ready";
      error = null;
      notify();
      return current;
    } catch (cause) {
      error = cause instanceof Error ? cause : new Error("Failed to load orders");
      loadState = "error";
      notify();
      throw error;
    }
  }

  async function persistChanges(
    changes: Array<{ previous: OrganiserOrder; next: OrganiserOrder }>,
  ): Promise<readonly OrganiserOrder[]> {
    try {
      await Promise.all(changes.map(({ previous, next }) => {
        const patch = toApiOrderPatch(previous, next);
        return Object.keys(patch).length > 0
          ? client.updateOrder(next.id, patch)
          : Promise.resolve();
      }));
      return changes.length > 0 ? refresh(false) : current;
    } catch (cause) {
      error = cause instanceof Error ? cause : new Error("Failed to update orders");
      loadState = "error";
      notify();
      throw error;
    }
  }

  return {
    getSnapshot: () => current,
    getReadIssues: () => [],
    getLoadState: () => loadState,
    getError: () => error,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    load: () => refresh(true),
    async replaceOne(order, _change: OrderChange) {
      const previous = current.find(item => item.id === order.id);
      return previous ? persistChanges([{ previous, next: order }]) : current;
    },
    async updateMany(ids, update, _change: OrderChange) {
      const selected = new Set(ids);
      const changes = current
        .filter(order => selected.has(order.id))
        .map(previous => ({ previous, next: update(previous) }));
      return persistChanges(changes);
    },
  };
}
