import { normalizeOrdersWithIssues, type OrganiserOrder, type OrderNormalizationIssue } from "./order.ts";
import type { EventInput, EventJournal, OrganiserEvent, OrganiserEventType } from "./events.ts";
import { readGb, writeGb, type StorageLike } from "../storage.ts";

export interface OrderChange {
  type: OrganiserEventType;
  actorId: string;
  actorType?: "organiser" | "system";
  summary: string;
  correlationId?: string;
  causationId?: string;
  idempotencyKey?: string;
}

export type OrderRepositoryLoadState = "idle" | "loading" | "ready" | "error";

export interface OrderRepository {
  getSnapshot(): readonly OrganiserOrder[];
  getReadIssues(): readonly OrderNormalizationIssue[];
  getLoadState(): OrderRepositoryLoadState;
  getError(): Error | null;
  subscribe(listener: () => void): () => void;
  load(): Promise<readonly OrganiserOrder[]>;
  replaceOne(order: OrganiserOrder, change: OrderChange): readonly OrganiserOrder[] | Promise<readonly OrganiserOrder[]>;
  updateMany(
    ids: readonly string[],
    update: (order: OrganiserOrder) => OrganiserOrder,
    change: OrderChange,
  ): readonly OrganiserOrder[] | Promise<readonly OrganiserOrder[]>;
}

export function createPrototypeOrderRepository({
  groupBuyId,
  storage,
  fallback,
  journal,
  createEvent,
}: {
  groupBuyId: string;
  storage: StorageLike;
  fallback: readonly OrganiserOrder[];
  journal: EventJournal;
  createEvent: (input: EventInput) => OrganiserEvent;
}): OrderRepository {
  const normalized = normalizeOrdersWithIssues(
    readGb(storage, groupBuyId, "orders", fallback, "orders"),
  );
  let current: readonly OrganiserOrder[] = normalized.orders;
  const readIssues: readonly OrderNormalizationIssue[] = normalized.issues;
  const listeners = new Set<() => void>();

  function commit(next: readonly OrganiserOrder[], entityIds: string[], change: OrderChange) {
    writeGb(storage, groupBuyId, "orders", next, 1);
    journal.append(createEvent({
      groupBuyId,
      type: change.type,
      entityType: "order",
      entityIds,
      actorId: change.actorId,
      actorType: change.actorType,
      summary: change.summary,
      correlationId: change.correlationId,
      causationId: change.causationId,
      idempotencyKey: change.idempotencyKey,
    }));
    current = next;
    listeners.forEach(listener => listener());
    return current;
  }

  return {
    getSnapshot: () => current,
    getReadIssues: () => readIssues,
    getLoadState: () => "ready",
    getError: () => null,
    load: async () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    replaceOne(order, change) {
      const index = current.findIndex(item => item.id === order.id);
      if (index < 0) return current;
      const next = [...current];
      next[index] = order;
      return commit(next, [order.id], change);
    },
    updateMany(ids, update, change) {
      const selected = new Set(ids);
      const changedIds: string[] = [];
      const next = current.map(order => {
        if (!selected.has(order.id)) return order;
        changedIds.push(order.id);
        return update(order);
      });
      return changedIds.length ? commit(next, changedIds, change) : current;
    },
  };
}
