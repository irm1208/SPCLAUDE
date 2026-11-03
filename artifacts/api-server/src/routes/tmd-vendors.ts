import { Router, type Request, type Response } from "express";
import { randomUUID, timingSafeEqual } from "node:crypto";
import multer from "multer";
import { and, desc, eq, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";
import {
  db, tmdVendorsTable, tmdBatchesTable, tmdPhotosTable, tmdPoolsTable, tmdPoolItemsTable, tmdResultsTable, tmdUsersTable, tmdPoolMembersTable,
} from "@workspace/db";
import { requireTmdUser, optionalTmdUser } from "../middleware/tmd-auth";
import { handled, TmdError, str, optStr, slugify, shortId, publicVendor, publicBatch, publicPool, publicUser } from "../lib/tmd-model";
import { storeTmdImage, deleteTmdFile, downloadTmdFile } from "../lib/tmd-files";
import { poolTotals } from "../lib/tmd-pools-service";
import { fundingProgress, memberShare } from "../lib/tmd-pricing";

/**
 * Vendors, batches and photos. Every vendor has its own page with tabs: active pools,
 * published results, batches and photos. Any signed-in user can add a vendor or a batch;
 * the registry is community-maintained and admins can later verify or merge entries.
 */
const router = Router();
const noStore = (res: Response) => res.set("Cache-Control", "no-store");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 9 * 1024 * 1024, files: 1, fields: 6 } }).single("file");
export const uploadOne = (req: Request, res: Response, next: () => void) => upload(req, res, (error: any) => {
  if (!error) return next();
  res.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "Files must be 8 MB or smaller." : "Upload failed. Choose a single file." });
});

const WEBSITE_RE = /^https?:\/\/[^\s]{3,200}$/i;
const publicPhoto = (p: any) => ({ id: p.id, key: p.storageKey, kind: p.kind, caption: p.caption, batchId: p.batchId, poolId: p.poolId, vendorId: p.vendorId, createdAt: p.createdAt });

async function vendorBySlugOrId(value: string) {
  const [vendor] = await db.select().from(tmdVendorsTable).where(or(eq(tmdVendorsTable.slug, value), eq(tmdVendorsTable.id, value)));
  if (!vendor) throw new TmdError("Vendor not found.", 404);
  return vendor;
}
function canEditVendor(req: Request, vendor: { createdBy: string | null; claimedBy: string | null }) {
  const user = req.tmdUser;
  return !!user && (user.role === "admin" || vendor.claimedBy === user.id || (!vendor.claimedBy && vendor.createdBy === user.id));
}

/* ---- Public ------------------------------------------------------------------ */
router.get("/tmd/vendors", handled(async (req, res) => {
  const q = str(req.query.q, 80);
  const vendors = await db.select().from(tmdVendorsTable).where(q ? ilike(tmdVendorsTable.name, `%${q.replace(/[%_]/g, "")}%`) : undefined).orderBy(tmdVendorsTable.name).limit(200);
  const ids = vendors.map(v => v.id);
  const [batchCounts, poolCounts, resultCounts] = ids.length ? await Promise.all([
    db.select({ vendorId: tmdBatchesTable.vendorId, count: sql<number>`count(*)` }).from(tmdBatchesTable).where(inArray(tmdBatchesTable.vendorId, ids)).groupBy(tmdBatchesTable.vendorId),
    db.select({ vendorId: tmdBatchesTable.vendorId, count: sql<number>`count(distinct ${tmdPoolsTable.id})` }).from(tmdPoolItemsTable)
      .innerJoin(tmdBatchesTable, eq(tmdBatchesTable.id, tmdPoolItemsTable.batchId)).innerJoin(tmdPoolsTable, eq(tmdPoolsTable.id, tmdPoolItemsTable.poolId))
      .where(and(inArray(tmdBatchesTable.vendorId, ids), inArray(tmdPoolsTable.status, ["open", "funded", "at_lab"]), eq(tmdPoolsTable.visibility, "public"))).groupBy(tmdBatchesTable.vendorId),
    db.select({ vendorId: tmdBatchesTable.vendorId, count: sql<number>`count(*)`, passed: sql<number>`count(*) filter (where ${tmdResultsTable.passed} = true)`, avgPurity: sql<string | null>`avg(${tmdResultsTable.purityPct})` })
      .from(tmdResultsTable).innerJoin(tmdPoolItemsTable, eq(tmdPoolItemsTable.id, tmdResultsTable.poolItemId)).innerJoin(tmdBatchesTable, eq(tmdBatchesTable.id, tmdPoolItemsTable.batchId))
      .innerJoin(tmdPoolsTable, eq(tmdPoolsTable.id, tmdResultsTable.poolId))
      .where(and(inArray(tmdBatchesTable.vendorId, ids), eq(tmdPoolsTable.resultsVisibility, "public"), isNotNull(tmdPoolsTable.resultsPublishedAt))).groupBy(tmdBatchesTable.vendorId),
  ]) : [[], [], []];
  const by = (rows: any[]) => new Map(rows.map(r => [r.vendorId, r]));
  const b = by(batchCounts), p = by(poolCounts), r = by(resultCounts);
  res.json({ vendors: vendors.map(v => ({
    ...publicVendor(v), batches: Number(b.get(v.id)?.count ?? 0), activePools: Number(p.get(v.id)?.count ?? 0),
    results: Number(r.get(v.id)?.count ?? 0), passed: Number(r.get(v.id)?.passed ?? 0), avgPurity: r.get(v.id)?.avgPurity != null ? Number(Number(r.get(v.id)!.avgPurity).toFixed(2)) : null,
  })) });
}));

router.get("/tmd/vendors/:slug", optionalTmdUser, handled(async (req, res) => {
  const vendor = await vendorBySlugOrId(String(req.params.slug));
  const batches = await db.select().from(tmdBatchesTable).where(eq(tmdBatchesTable.vendorId, vendor.id)).orderBy(desc(tmdBatchesTable.createdAt));
  const batchIds = batches.map(b => b.id);
  const photos = await db.select().from(tmdPhotosTable).where(batchIds.length ? or(eq(tmdPhotosTable.vendorId, vendor.id), inArray(tmdPhotosTable.batchId, batchIds)) : eq(tmdPhotosTable.vendorId, vendor.id)).orderBy(desc(tmdPhotosTable.createdAt)).limit(300);
  const itemRows = batchIds.length ? await db.select({ item: tmdPoolItemsTable, pool: tmdPoolsTable, organiser: tmdUsersTable }).from(tmdPoolItemsTable)
    .innerJoin(tmdPoolsTable, eq(tmdPoolsTable.id, tmdPoolItemsTable.poolId)).innerJoin(tmdUsersTable, eq(tmdUsersTable.id, tmdPoolsTable.organiserId))
    .where(and(inArray(tmdPoolItemsTable.batchId, batchIds), eq(tmdPoolsTable.visibility, "public"), sql`${tmdPoolsTable.status} not in ('draft','cancelled')`)) : [];
  const poolMap = new Map<string, any>();
  for (const row of itemRows) {
    if (!poolMap.has(row.pool.id)) poolMap.set(row.pool.id, { ...publicPool(row.pool), organiser: publicUser(row.organiser), items: [] as any[] });
    poolMap.get(row.pool.id).items.push({ id: row.item.id, batchId: row.item.batchId, testType: row.item.testType, lab: row.item.lab, priceUsd: row.item.priceUsd, quantity: row.item.quantity });
  }
  const pools = await Promise.all([...poolMap.values()].map(async pool => { const totals = await poolTotals(db, pool.id); return { ...pool, totals, progress: fundingProgress(pool.targetUsd, totals.verifiedUsd), shareUsd: memberShare(pool) }; }));
  const results = batchIds.length ? await db.select({ result: tmdResultsTable, item: tmdPoolItemsTable, pool: tmdPoolsTable }).from(tmdResultsTable)
    .innerJoin(tmdPoolItemsTable, eq(tmdPoolItemsTable.id, tmdResultsTable.poolItemId)).innerJoin(tmdPoolsTable, eq(tmdPoolsTable.id, tmdResultsTable.poolId))
    .where(and(inArray(tmdPoolItemsTable.batchId, batchIds), eq(tmdPoolsTable.resultsVisibility, "public"), isNotNull(tmdPoolsTable.resultsPublishedAt))).orderBy(desc(tmdPoolsTable.resultsPublishedAt)) : [];
  noStore(res).json({
    vendor: publicVendor(vendor), canEdit: canEditVendor(req, vendor),
    batches: batches.map(b => ({ ...publicBatch(b), photos: photos.filter(p => p.batchId === b.id).map(publicPhoto) })),
    photos: photos.map(publicPhoto),
    pools: pools.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    results: results.map(r => ({
      id: r.result.id, poolId: r.pool.id, poolSlug: r.pool.slug, poolTitle: r.pool.title, publishedAt: r.pool.resultsPublishedAt, batchId: r.item.batchId, testType: r.item.testType, lab: r.item.lab ?? r.pool.labName,
      summary: r.result.summary, purityPct: r.result.purityPct, quantityMg: r.result.quantityMg, endotoxin: r.result.endotoxin, sterility: r.result.sterility, heavyMetals: r.result.heavyMetals, passed: r.result.passed, reportKey: r.result.reportKey, labVerifyUrl: r.result.labVerifyUrl,
    })),
  });
}));

router.get("/tmd/batches/:id", handled(async (req, res) => {
  const [batch] = await db.select().from(tmdBatchesTable).where(eq(tmdBatchesTable.id, String(req.params.id)));
  if (!batch) throw new TmdError("Batch not found.", 404);
  const [vendor] = await db.select().from(tmdVendorsTable).where(eq(tmdVendorsTable.id, batch.vendorId));
  const photos = await db.select().from(tmdPhotosTable).where(eq(tmdPhotosTable.batchId, batch.id)).orderBy(desc(tmdPhotosTable.createdAt));
  res.json({ batch: publicBatch(batch), vendor: vendor ? publicVendor(vendor) : null, photos: photos.map(publicPhoto) });
}));

/* ---- Signed-in contributors ----------------------------------------------------- */
router.post("/tmd/vendors", requireTmdUser, handled(async (req, res) => {
  const name = str(req.body?.name, 80);
  if (name.length < 2) throw new TmdError("Enter the vendor's name.");
  const website = optStr(req.body?.website, 200);
  if (website && !WEBSITE_RE.test(website)) throw new TmdError("Website must start with http:// or https://");
  const base = slugify(name);
  const [existing] = await db.select().from(tmdVendorsTable).where(sql`lower(${tmdVendorsTable.name}) = ${name.toLowerCase()}`);
  if (existing) { res.status(200).json({ vendor: publicVendor(existing), existing: true }); return; }
  let vendor: any = null;
  for (const slug of [base, `${base}-${shortId(2)}`, `${base}-${shortId(3)}`]) {
    [vendor] = await db.insert(tmdVendorsTable).values({ id: randomUUID(), slug, name, website, country: optStr(req.body?.country, 60), description: optStr(req.body?.description, 1000), createdBy: req.tmdUser!.id }).onConflictDoNothing().returning();
    if (vendor) break;
  }
  if (!vendor) throw new TmdError("Could not create the vendor. Try a slightly different name.", 409);
  res.status(201).json({ vendor: publicVendor(vendor) });
}));

router.patch("/tmd/vendors/:id", requireTmdUser, handled(async (req, res) => {
  const vendor = await vendorBySlugOrId(String(req.params.id));
  if (!canEditVendor(req, vendor)) throw new TmdError("Only the person who added this vendor, or the vendor themself, can edit it.", 403);
  const changes: Record<string, unknown> = { updatedAt: new Date() };
  if (req.body?.name !== undefined) { const name = str(req.body.name, 80); if (name.length < 2) throw new TmdError("Enter the vendor's name."); changes.name = name; }
  if (req.body?.website !== undefined) { const website = optStr(req.body.website, 200); if (website && !WEBSITE_RE.test(website)) throw new TmdError("Website must start with http:// or https://"); changes.website = website; }
  if (req.body?.country !== undefined) changes.country = optStr(req.body.country, 60);
  if (req.body?.description !== undefined) changes.description = optStr(req.body.description, 1000);
  if (req.body?.verified !== undefined && req.tmdUser!.role === "admin") changes.verified = req.body.verified === true;
  const [updated] = await db.update(tmdVendorsTable).set(changes).where(eq(tmdVendorsTable.id, vendor.id)).returning();
  res.json({ vendor: publicVendor(updated) });
}));

router.post("/tmd/vendors/:id/logo", requireTmdUser, uploadOne, handled(async (req, res) => {
  const vendor = await vendorBySlugOrId(String(req.params.id));
  if (!canEditVendor(req, vendor)) throw new TmdError("You cannot edit this vendor.", 403);
  if (!req.file) throw new TmdError("Choose an image.");
  const key = await storeTmdImage(req.file.buffer, "vendor", { maxEdge: 600 });
  const [updated] = await db.update(tmdVendorsTable).set({ logoKey: key, updatedAt: new Date() }).where(eq(tmdVendorsTable.id, vendor.id)).returning();
  await deleteTmdFile(vendor.logoKey);
  res.json({ vendor: publicVendor(updated) });
}));

router.post("/tmd/vendors/:id/batches", requireTmdUser, handled(async (req, res) => {
  const vendor = await vendorBySlugOrId(String(req.params.id));
  const compound = str(req.body?.compound, 80), batchNumber = str(req.body?.batchNumber, 80);
  if (compound.length < 2) throw new TmdError("Enter the compound (for example BPC-157).");
  if (!batchNumber) throw new TmdError("Enter the batch or lot number printed on the vial.");
  const values = { id: randomUUID(), vendorId: vendor.id, compound, batchNumber, mg: optStr(req.body?.mg, 20), capColour: optStr(req.body?.capColour, 30), manufacturedOn: optStr(req.body?.manufacturedOn, 30), notes: optStr(req.body?.notes, 600), createdBy: req.tmdUser!.id };
  const [batch] = await db.insert(tmdBatchesTable).values(values).onConflictDoNothing().returning();
  if (!batch) {
    const [existing] = await db.select().from(tmdBatchesTable).where(and(eq(tmdBatchesTable.vendorId, vendor.id), eq(tmdBatchesTable.compound, compound), eq(tmdBatchesTable.batchNumber, batchNumber)));
    res.json({ batch: publicBatch(existing!), existing: true }); return;
  }
  res.status(201).json({ batch: publicBatch(batch) });
}));

router.post("/tmd/batches/:id/photos", requireTmdUser, uploadOne, handled(async (req, res) => {
  const [batch] = await db.select().from(tmdBatchesTable).where(eq(tmdBatchesTable.id, String(req.params.id)));
  if (!batch) throw new TmdError("Batch not found.", 404);
  if (!req.file) throw new TmdError("Choose an image.");
  const kind = ["batch", "vial", "packaging", "lab", "custody"].includes(req.body?.kind) ? req.body.kind : "batch";
  const key = await storeTmdImage(req.file.buffer, "batch");
  const [photo] = await db.insert(tmdPhotosTable).values({ id: randomUUID(), storageKey: key, batchId: batch.id, vendorId: batch.vendorId, kind, caption: optStr(req.body?.caption, 200), uploadedBy: req.tmdUser!.id }).returning();
  res.status(201).json({ photo: publicPhoto(photo) });
}));

router.delete("/tmd/photos/:id", requireTmdUser, handled(async (req, res) => {
  const [photo] = await db.select().from(tmdPhotosTable).where(eq(tmdPhotosTable.id, String(req.params.id)));
  if (!photo) throw new TmdError("Photo not found.", 404);
  let allowed = photo.uploadedBy === req.tmdUser!.id || req.tmdUser!.role === "admin";
  if (!allowed && photo.poolId) { const [pool] = await db.select({ organiserId: tmdPoolsTable.organiserId }).from(tmdPoolsTable).where(eq(tmdPoolsTable.id, photo.poolId)); allowed = pool?.organiserId === req.tmdUser!.id; }
  if (!allowed) throw new TmdError("You cannot remove this photo.", 403);
  await db.delete(tmdPhotosTable).where(eq(tmdPhotosTable.id, photo.id));
  await deleteTmdFile(photo.storageKey);
  res.json({ ok: true });
}));

/* ---- Files -------------------------------------------------------------------- */
const PUBLIC_NAMESPACES = new Set(["batch", "pool", "vendor", "avatar", "custody", "report"]);
router.get("/tmd/files/:namespace/:file", optionalTmdUser, handled(async (req, res) => {
  const namespace = String(req.params.namespace), key = `tmd/${namespace}/${String(req.params.file)}`;
  if (namespace === "screenshot") {
    // Payment screenshots are private: organiser of the pool, or the member who uploaded it (session or claim token).
    const [member] = await db.select({ member: tmdPoolMembersTable, organiserId: tmdPoolsTable.organiserId }).from(tmdPoolMembersTable).innerJoin(tmdPoolsTable, eq(tmdPoolsTable.id, tmdPoolMembersTable.poolId)).where(eq(tmdPoolMembersTable.screenshotKey, key));
    if (!member) throw new TmdError("File not found.", 404);
    const claim = str(req.query.claim, 128);
    const claimOk = claim.length === member.member.claimToken.length && timingSafeEqual(Buffer.from(claim), Buffer.from(member.member.claimToken));
    const userOk = !!req.tmdUser && (req.tmdUser.id === member.organiserId || req.tmdUser.id === member.member.userId || req.tmdUser.role === "admin");
    if (!claimOk && !userOk) throw new TmdError("File not found.", 404);
    res.setHeader("Cache-Control", "private, no-store");
  } else if (!PUBLIC_NAMESPACES.has(namespace)) {
    throw new TmdError("File not found.", 404);
  } else {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  }
  const file = await downloadTmdFile(key);
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (file.contentType === "application/pdf") res.setHeader("Content-Disposition", "inline; filename=\"lab-report.pdf\"");
  res.type(file.contentType).send(file.bytes);
}));

export default router;
