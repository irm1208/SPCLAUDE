import { readGb, writeGb, type StorageLike } from "../storage.ts";

export type OrganiserEventType =
  | "order.updated"
  | "order.product_added"
  | "order.task_linked"
  | "order.bulk_paid"
  | "order.bulk_dispatched"
  | "order.tracking_imported";

export interface OrganiserEvent {
  id: string;
  schemaVersion: 1;
  groupBuyId: string;
  type: OrganiserEventType;
  entityType: "order";
  entityIds: string[];
  actorType: "organiser" | "system";
  actorId: string;
  summary: string;
  occurredAt: string;
  correlationId?: string;
  causationId?: string;
  idempotencyKey?: string;
}

export interface EventInput {
  groupBuyId: string;
  type: OrganiserEventType;
  entityType: "order";
  entityIds: string[];
  actorId: string;
  actorType?: "organiser" | "system";
  summary: string;
  correlationId?: string;
  causationId?: string;
  idempotencyKey?: string;
}

export function createEventFactory(deps: { now?: () => string; id?: () => string } = {}) {
  const now = deps.now ?? (() => new Date().toISOString());
  const id = deps.id ?? (() => crypto.randomUUID());
  return (input: EventInput): OrganiserEvent => ({
    id: id(),
    schemaVersion: 1,
    groupBuyId: input.groupBuyId,
    type: input.type,
    entityType: input.entityType,
    entityIds: [...input.entityIds],
    actorType: input.actorType ?? "organiser",
    actorId: input.actorId,
    summary: input.summary,
    occurredAt: now(),
    correlationId: input.correlationId,
    causationId: input.causationId,
    idempotencyKey: input.idempotencyKey,
  });
}

export interface EventJournal {
  append(event: OrganiserEvent): void;
  list(groupBuyId: string): readonly OrganiserEvent[];
}

export function createMemoryEventJournal(maxEvents = 500): EventJournal {
  const events = new Map<string, OrganiserEvent[]>();
  return {
    append(event) {
      events.set(event.groupBuyId, [event, ...(events.get(event.groupBuyId) ?? [])].slice(0, maxEvents));
    },
    list(groupBuyId) {
      return events.get(groupBuyId) ?? [];
    },
  };
}

export function createPrototypeEventJournal({
  storage,
  maxEvents = 500,
}: {
  storage: StorageLike;
  maxEvents?: number;
}): EventJournal {
  return {
    append(event) {
      const current = readGb<OrganiserEvent[]>(storage, event.groupBuyId, "operationEvents", []);
      writeGb(storage, event.groupBuyId, "operationEvents", [event, ...current].slice(0, maxEvents), 1);
    },
    list(groupBuyId) {
      return readGb<OrganiserEvent[]>(storage, groupBuyId, "operationEvents", []);
    },
  };
}
