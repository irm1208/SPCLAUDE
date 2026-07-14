import { createEventFactory, createPrototypeEventJournal, type EventJournal } from "./events.ts";
import { createPrototypeOrderRepository, type OrderRepository } from "./order-repository.ts";
import { SAMPLE_ORDERS } from "./sample-orders.ts";
import type { StorageLike } from "../storage.ts";

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
