import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { vendorAuditTable, vendorOrderIssuesTable, vendorSettingsTable, vendorSubmissionsTable } from "@workspace/db";
import { VendorPortalError } from "./vendor-portal-model";
import { getVendors } from "../routes/config";

type Executor = any;
// Same audit row shape as vendor-portal-service, written here to avoid a circular import (the service imports the closed-vendor guard).
async function auditVendor(tx: Executor, actor: string, action: string, submissionId: string | null, details: Record<string, unknown> = {}) {
  await tx.insert(vendorAuditTable).values({ id: randomUUID(), actor, action, submissionId, details });
}

/* ---------------------------------------------------------------------------
 * Vendor settings: holiday mode and fulfilment defaults
 * ------------------------------------------------------------------------- */
export interface VendorSettingsInput {
  closedFrom: Date | null; closedUntil: Date | null; closedNote: string | null;
  handlingDays: number | null; defaultCarrier: string | null;
}
const MAX_CLOSURE_DAYS = 120;

function optionalText(value: unknown, label: string, max: number): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new VendorPortalError(`${label} must be text.`);
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length > max) throw new VendorPortalError(`${label} must be ${max} characters or fewer.`);
  return text || null;
}
function optionalDate(value: unknown, label: string): Date | null {
  if (value == null || value === "") return null;
  const date = new Date(typeof value === "string" || typeof value === "number" ? value : NaN);
  if (isNaN(date.getTime())) throw new VendorPortalError(`${label} is not a valid date.`);
  return date;
}
/** Pure validation of a settings payload. Clears the closure when `closedUntil` is absent. */
export function settingsInput(body: unknown, now = new Date()): VendorSettingsInput {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const closedUntil = optionalDate(b.closedUntil, "Closed until");
  let closedFrom = optionalDate(b.closedFrom, "Closed from");
  if (closedUntil) {
    if (closedUntil.getTime() <= now.getTime()) throw new VendorPortalError("Closed until must be in the future.");
    if (closedUntil.getTime() - now.getTime() > MAX_CLOSURE_DAYS * 86_400_000) throw new VendorPortalError(`Closures are limited to ${MAX_CLOSURE_DAYS} days. Contact Peps Anonymous for longer breaks.`);
    if (!closedFrom) closedFrom = now;
    if (closedFrom.getTime() >= closedUntil.getTime()) throw new VendorPortalError("Closed from must be before closed until.");
  } else closedFrom = null;
  let handlingDays: number | null = null;
  if (b.handlingDays != null && b.handlingDays !== "") {
    handlingDays = Number(b.handlingDays);
    if (!Number.isInteger(handlingDays) || handlingDays < 0 || handlingDays > 30) throw new VendorPortalError("Handling time must be a whole number of days between 0 and 30.");
  }
  return {
    closedFrom, closedUntil,
    closedNote: closedUntil ? optionalText(b.closedNote, "Closure note", 200) : null,
    handlingDays, defaultCarrier: optionalText(b.defaultCarrier, "Default carrier", 60),
  };
}
export function isClosedAt(s: { closedFrom?: Date | string | null; closedUntil?: Date | string | null } | null | undefined, at = new Date()): boolean {
  if (!s?.closedUntil) return false;
  const until = new Date(s.closedUntil).getTime(), from = s.closedFrom ? new Date(s.closedFrom).getTime() : -Infinity;
  return at.getTime() >= from && at.getTime() < until;
}
export function publicSettings(row: any, vendorId: string, now = new Date()) {
  return {
    vendorId,
    closedFrom: row?.closedFrom ?? null, closedUntil: row?.closedUntil ?? null, closedNote: row?.closedNote ?? null,
    handlingDays: row?.handlingDays ?? null, defaultCarrier: row?.defaultCarrier ?? null,
    closedNow: isClosedAt(row, now), updatedAt: row?.updatedAt ?? null, updatedBy: row?.updatedBy ?? null,
  };
}
export async function vendorSettings(tx: Executor, vendorId: string) {
  const [row] = await tx.select().from(vendorSettingsTable).where(eq(vendorSettingsTable.vendorId, vendorId));
  return row ?? null;
}
export async function saveVendorSettings(tx: Executor, vendorId: string, actor: string, input: VendorSettingsInput) {
  const values = { ...input, updatedBy: actor, updatedAt: new Date() };
  const [row] = await tx.insert(vendorSettingsTable).values({ vendorId, ...values })
    .onConflictDoUpdate({ target: vendorSettingsTable.vendorId, set: values }).returning();
  await auditVendor(tx, actor, "settings_updated", null, {
    vendorId, closedFrom: input.closedFrom?.toISOString() ?? null, closedUntil: input.closedUntil?.toISOString() ?? null,
    handlingDays: input.handlingDays, defaultCarrier: input.defaultCarrier,
  });
  return row;
}
export async function allVendorSettings(tx: Executor) {
  const vendors = await getVendors();
  const rows = await tx.select().from(vendorSettingsTable);
  return vendors.map(v => ({ vendorName: v.name, ...publicSettings(rows.find((r: any) => r.vendorId === v.id), v.id) }));
}

/** Thrown by automatic routing when the vendor has paused new orders; callers treat it as "try later", not a failure. */
export class VendorClosedError extends VendorPortalError {
  constructor(public vendorId: string, public closedUntil: Date) {
    super(`Vendor is closed until ${closedUntil.toISOString().slice(0, 10)}; the order will be routed when they reopen.`, 409);
  }
}
export async function assertVendorOpen(tx: Executor, vendorId: string, at = new Date()) {
  const row = await vendorSettings(tx, vendorId);
  if (isClosedAt(row, at)) throw new VendorClosedError(vendorId, new Date(row.closedUntil));
}

/* ---------------------------------------------------------------------------
 * Order problem reports
 * ------------------------------------------------------------------------- */
export const ISSUE_TYPES = {
  out_of_stock: "Out of stock",
  partial_stock: "Only part of the order is in stock",
  address_problem: "Address is incomplete or invalid",
  cannot_ship: "Cannot ship to this destination",
  damaged: "Parcel damaged, lost or returned",
  other: "Something else",
} as const;
export type IssueType = keyof typeof ISSUE_TYPES;

export function issueInput(body: unknown): { type: IssueType; note: string | null } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const type = typeof b.type === "string" ? b.type : "";
  if (!(type in ISSUE_TYPES)) throw new VendorPortalError("Choose what the problem is.");
  const note = optionalText(b.note, "Details", 1000);
  if (type === "other" && !note) throw new VendorPortalError("Describe the problem so Peps Anonymous can help.");
  return { type: type as IssueType, note };
}
export function publicIssue(row: any) {
  return {
    id: row.id, submissionId: row.submissionId, vendorId: row.vendorId, type: row.type as IssueType,
    label: ISSUE_TYPES[row.type as IssueType] ?? row.type, note: row.note ?? null, reportedBy: row.reportedBy,
    createdAt: row.createdAt, resolvedAt: row.resolvedAt ?? null, resolvedBy: row.resolvedBy ?? null, resolution: row.resolution ?? null,
    open: !row.resolvedAt, ...(row.reference ? { reference: row.reference } : {}),
  };
}
export async function reportOrderIssue(tx: Executor, access: { vendorId: string; username: string }, submissionId: string, input: { type: IssueType; note: string | null }) {
  const [submission] = await tx.select({ id: vendorSubmissionsTable.id, reference: vendorSubmissionsTable.reference })
    .from(vendorSubmissionsTable).where(and(eq(vendorSubmissionsTable.id, submissionId), eq(vendorSubmissionsTable.vendorId, access.vendorId))).for("update");
  if (!submission) throw new VendorPortalError("Order not found.", 404);
  const [open] = await tx.select({ id: vendorOrderIssuesTable.id }).from(vendorOrderIssuesTable)
    .where(and(eq(vendorOrderIssuesTable.submissionId, submissionId), isNull(vendorOrderIssuesTable.resolvedAt)));
  if (open) throw new VendorPortalError("A problem is already open on this order. Peps Anonymous will respond to it.", 409);
  const [row] = await tx.insert(vendorOrderIssuesTable).values({
    id: randomUUID(), submissionId, vendorId: access.vendorId, type: input.type, note: input.note, reportedBy: access.username,
  }).returning();
  await auditVendor(tx, access.username, "issue_reported", submissionId, { issueId: row.id, type: input.type, vendorId: access.vendorId });
  return { ...row, reference: submission.reference };
}
export async function resolveOrderIssue(tx: Executor, actor: string, issueId: string, resolution: unknown) {
  const note = optionalText(resolution, "Resolution", 1000);
  const [row] = await tx.select().from(vendorOrderIssuesTable).where(eq(vendorOrderIssuesTable.id, issueId)).for("update");
  if (!row) throw new VendorPortalError("Problem report not found.", 404);
  if (row.resolvedAt) throw new VendorPortalError("This problem has already been resolved.", 409);
  const [updated] = await tx.update(vendorOrderIssuesTable).set({ resolvedAt: new Date(), resolvedBy: actor, resolution: note })
    .where(eq(vendorOrderIssuesTable.id, issueId)).returning();
  await auditVendor(tx, actor, "issue_resolved", row.submissionId, { issueId, vendorId: row.vendorId, resolution: note });
  return updated;
}
/** Open problems plus anything resolved in the last two weeks, so vendors see the answer. */
export async function vendorIssues(tx: Executor, vendorId: string) {
  return tx.select({ issue: vendorOrderIssuesTable, reference: vendorSubmissionsTable.reference }).from(vendorOrderIssuesTable)
    .innerJoin(vendorSubmissionsTable, eq(vendorSubmissionsTable.id, vendorOrderIssuesTable.submissionId))
    .where(and(eq(vendorOrderIssuesTable.vendorId, vendorId),
      sql`(${vendorOrderIssuesTable.resolvedAt} IS NULL OR ${vendorOrderIssuesTable.resolvedAt} > now() - interval '14 days')`))
    .orderBy(desc(vendorOrderIssuesTable.createdAt)).limit(200)
    .then((rows: any[]) => rows.map(r => publicIssue({ ...r.issue, reference: r.reference })));
}
export async function adminIssues(tx: Executor) {
  return tx.select({ issue: vendorOrderIssuesTable, reference: vendorSubmissionsTable.reference }).from(vendorOrderIssuesTable)
    .innerJoin(vendorSubmissionsTable, eq(vendorSubmissionsTable.id, vendorOrderIssuesTable.submissionId))
    .orderBy(sql`${vendorOrderIssuesTable.resolvedAt} IS NOT NULL`, desc(vendorOrderIssuesTable.createdAt)).limit(300)
    .then((rows: any[]) => rows.map(r => publicIssue({ ...r.issue, reference: r.reference })));
}
