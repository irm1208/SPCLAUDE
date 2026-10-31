import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

type Executor = { execute: (query: any) => Promise<any> };
const rows = async (tx: Executor, query: any): Promise<any[]> => (await tx.execute(query)).rows;

/** All writers share a dedicated namespace mutex, independent of numeric order codes. */
export async function ensureAdditionReferences(tx: Executor, parentId: string, requiredIds: string[] = []) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('addition-display-references'))`);
  const [parent] = await rows(tx, sql`SELECT id, code FROM orders
    WHERE id = ${parentId} AND deleted_at IS NULL AND addition_of_order_id IS NULL`);
  if (!parent || !parent.code || /^ADD-/i.test(parent.code)) return;
  const [counter] = await rows(tx, sql`SELECT COALESCE(MAX(substring(addition_display_reference FROM '-A([0-9]+)$')::bigint), 0) AS ordinal
    FROM orders WHERE addition_of_order_id = ${parentId}`);
  const eligible = sql`p.id = ${parentId} AND c.group_buy_id = p.group_buy_id
    AND lower(ltrim(c.telegram_username, '@')) = lower(ltrim(p.telegram_username, '@'))
    AND c.addition_display_reference IS NULL`;
  const children = await rows(tx, sql`SELECT c.id FROM orders c JOIN orders p ON p.id = c.addition_of_order_id
    WHERE ${eligible} ORDER BY c.created_at, c.id LIMIT 1000`);
  // Always cover the authorised rows requested by this response/new submission, even in a large historical family.
  const required = requiredIds.length ? await rows(tx, sql`SELECT c.id
    FROM orders c JOIN orders p ON p.id = c.addition_of_order_id
    WHERE ${eligible} AND c.id IN (${sql.join(requiredIds.map(id => sql`${id}`), sql`, `)})
    ORDER BY c.created_at, c.id`) : [];
  let ordinal = Number(counter.ordinal);
  for (const child of new Map([...children, ...required].map(child => [child.id, child])).values()) {
    let reference: string;
    // Includes cancelled/deleted siblings, and never reuses an existing alias.
    do {
      reference = `${parent.code}-A${++ordinal}`;
    } while ((await rows(tx, sql`SELECT id FROM orders
      WHERE addition_display_reference = ${reference} OR code = ${reference} LIMIT 1`)).length);
    await tx.execute(sql`UPDATE orders SET addition_display_reference = ${reference}
      WHERE id = ${child.id} AND addition_display_reference IS NULL`);
  }
}

/** Call only with orders already authorised by the route. Parent ownership/group are rechecked in SQL. */
export async function withAdditionReferences<T extends { id: string; code?: unknown }>(orders: T[]): Promise<Array<T & {
  displayReference: string;
  isAddition: boolean;
  additionParent: { id: string; reference: string } | null;
}>> {
  if (!orders.length) return [];
  const ids = orders.map(o => o.id);
  const additions = await rows(db, sql`SELECT id, addition_of_order_id AS parent_id, addition_display_reference AS reference
    FROM orders WHERE id IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})
      AND addition_of_order_id IS NOT NULL`);
  const missingParents = [...new Set(additions.filter(o => !o.reference).map(o => String(o.parent_id)))].sort();
  // Bounded, idempotent application repair for historical orders; no production migration script.
  for (const parentId of missingParents) {
    await db.transaction(tx => ensureAdditionReferences(tx, parentId,
      additions.filter(o => o.parent_id === parentId && !o.reference).map(o => o.id)));
  }
  const metadata = additions.length ? await rows(db, sql`SELECT c.id, c.addition_display_reference AS reference,
      p.id AS parent_id, p.code AS parent_reference
    FROM orders c JOIN orders p ON p.id = c.addition_of_order_id
    WHERE c.id IN (${sql.join(additions.map(o => sql`${o.id}`), sql`, `)})
      AND c.group_buy_id = p.group_buy_id AND p.deleted_at IS NULL AND p.addition_of_order_id IS NULL
      AND lower(ltrim(c.telegram_username, '@')) = lower(ltrim(p.telegram_username, '@'))`) : [];
  const byId = new Map(metadata.map(o => [o.id, o]));
  const additionIds = new Set(additions.map(o => o.id));
  return orders.map(order => {
    const info = byId.get(order.id);
    const isAddition = additionIds.has(order.id) || /^ADD-/i.test(String(order.code ?? ""));
    return { ...order, isAddition,
      displayReference: info?.reference || (isAddition ? "Addition" : String(order.code ?? "")),
      additionParent: info && !/^ADD-/i.test(String(info.parent_reference ?? ""))
        ? { id: info.parent_id, reference: info.parent_reference } : null,
    };
  });
}

export async function additionReferenceFields(order: { id: string; code?: unknown }) {
  const [enriched] = await withAdditionReferences([order]);
  const { displayReference, isAddition, additionParent } = enriched;
  return { displayReference, isAddition, additionParent };
}
