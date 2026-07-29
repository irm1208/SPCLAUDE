import { createEventFactory, createMemoryEventJournal, createPrototypeEventJournal, type EventJournal } from "./events.ts";
import { createApiOrderRepository } from "./api-order-repository.ts";
import { createPrototypeOrderRepository, type OrderRepository } from "./order-repository.ts";
import { SAMPLE_ORDERS } from "./sample-orders.ts";
import type { StorageLike } from "../storage.ts";
import { organiserApi } from "../api/organiser-api.ts";

export interface OrganiserRepositories {
  orders: OrderRepository;
  events: EventJournal;
}

export function createPrototypeOrganiserRepositories({
  groupBuyId,
  storage = window.localStorage,
}: {
  groupBuyId: string;
  storage?: StorageLike;
}): OrganiserRepositories {
  const events = createPrototypeEventJournal({ storage });
  return {
    events,
    orders: createPrototypeOrderRepository({
      groupBuyId,
      storage,
      fallback: SAMPLE_ORDERS,
      journal: events,
      createEvent: createEventFactory(),
    }),
  };
}

export function createApiOrganiserRepositories({
  groupBuyId,
}: {
  groupBuyId: string;
}): OrganiserRepositories {
  const events = createMemoryEventJournal();
  return {
    events,
    orders: createApiOrderRepository({
      groupBuyId,
      client: {
        listOrders: () => organiserApi.orders(groupBuyId),
        updateOrder: (orderId, body) => organiserApi.updateOrder(groupBuyId, orderId, body),
      },
    }),
  };
}
