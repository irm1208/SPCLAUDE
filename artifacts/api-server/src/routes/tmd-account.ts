import { Router, type Response } from "express";
import multer from "multer";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, tmdUsersTable, tmdPoolsTable, tmdPoolMembersTable, tmdNotificationsTable } from "@workspace/db";
import { requireTmdUser } from "../middleware/tmd-auth";
import { handled, TmdError, str, optStr, privateUser, publicPool, privateMember, normalisePaymentMethods } from "../lib/tmd-model";
import { membershipsForUser, poolTotals } from "../lib/tmd-pools-service";
import { storeTmdImage, deleteTmdFile } from "../lib/tmd-files";
import { fundingProgress } from "../lib/tmd-pricing";

/** Signed-in user's own profile, settings, pools, contributions and inbox. */
const router = Router();
const noStore = (res: Response) => res.set("Cache-Control", "no-store");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 9 * 1024 * 1024, files: 1, fields: 4 } }).single("file");
const uploadOne = (req: any, res: any, next: any) => upload(req, res, (error: any) => {
  if (!error) return next();
  res.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "Images must be 8 MB or smaller." : "Upload failed. Choose a single image file." });
});

router.get("/tmd/me", requireTmdUser, handled(async (req, res) => {
  const user = req.tmdUser!;
  const [[hosted], [joined], [unread]] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(tmdPoolsTable).where(eq(tmdPoolsTable.organiserId, user.id)),
    db.select({ count: sql<number>`count(*)` }).from(tmdPoolMembersTable).where(and(eq(tmdPoolMembersTable.userId, user.id), inArray(tmdPoolMembersTable.paymentStatus, ["pending", "submitted", "verified"]))),
    db.select({ count: sql<number>`count(*)` }).from(tmdNotificationsTable).where(and(eq(tmdNotificationsTable.userId, user.id), isNull(tmdNotificationsTable.readAt))),
  ]);
  noStore(res).json({ user: privateUser(user), stats: { hosted: Number(hosted?.count ?? 0), joined: Number(joined?.count ?? 0), unread: Number(unread?.count ?? 0) } });
}));

router.patch("/tmd/me", requireTmdUser, handled(async (req, res) => {
  const changes: Record<string, unknown> = { updatedAt: new Date() };
  if (req.body?.displayName !== undefined) { const name = str(req.body.displayName, 60); if (name.length < 2) throw new TmdError("Display name is too short."); changes.displayName = name; }
  if (req.body?.bio !== undefined) changes.bio = optStr(req.body.bio, 600);
  if (req.body?.notificationPrefs && typeof req.body.notificationPrefs === "object") {
    const p = req.body.notificationPrefs, prefs: Record<string, boolean> = {};
    for (const key of ["email", "telegram", "poolUpdates", "results", "chat"]) if (typeof p[key] === "boolean") prefs[key] = p[key];
    changes.notificationPrefs = prefs;
  }
  const [user] = await db.update(tmdUsersTable).set(changes).where(eq(tmdUsersTable.id, req.tmdUser!.id)).returning();
  noStore(res).json({ user: privateUser(user) });
}));

router.put("/tmd/me/payout-methods", requireTmdUser, handled(async (req, res) => {
  const payoutMethods = normalisePaymentMethods(req.body?.paymentMethods ?? req.body);
  const [user] = await db.update(tmdUsersTable).set({ payoutMethods, updatedAt: new Date() }).where(eq(tmdUsersTable.id, req.tmdUser!.id)).returning();
  noStore(res).json({ user: privateUser(user) });
}));

router.post("/tmd/me/avatar", requireTmdUser, uploadOne, handled(async (req, res) => {
  if (!req.file) throw new TmdError("Choose an image.");
  const key = await storeTmdImage(req.file.buffer, "avatar", { maxEdge: 512 });
  const previous = req.tmdUser!.avatarKey;
  const [user] = await db.update(tmdUsersTable).set({ avatarKey: key, updatedAt: new Date() }).where(eq(tmdUsersTable.id, req.tmdUser!.id)).returning();
  await deleteTmdFile(previous);
  noStore(res).json({ user: privateUser(user) });
}));

/** Pools the user hosts, with live funding totals. */
router.get("/tmd/me/pools", requireTmdUser, handled(async (req, res) => {
  const pools = await db.select().from(tmdPoolsTable).where(eq(tmdPoolsTable.organiserId, req.tmdUser!.id)).orderBy(desc(tmdPoolsTable.updatedAt));
  const out = await Promise.all(pools.map(async pool => {
    const totals = await poolTotals(db, pool.id);
    return { ...publicPool(pool), totals, progress: fundingProgress(pool.targetUsd, totals.verifiedUsd) };
  }));
  noStore(res).json({ pools: out });
}));

/** Pools the user has joined, with their own payment state. */
router.get("/tmd/me/contributions", requireTmdUser, handled(async (req, res) => {
  const rows = await membershipsForUser(db, req.tmdUser!.id);
  noStore(res).json({ contributions: rows.map((r: any) => ({ member: privateMember(r.member), pool: publicPool(r.pool) })) });
}));

router.get("/tmd/me/notifications", requireTmdUser, handled(async (req, res) => {
  const rows = await db.select().from(tmdNotificationsTable).where(eq(tmdNotificationsTable.userId, req.tmdUser!.id)).orderBy(desc(tmdNotificationsTable.createdAt)).limit(50);
  noStore(res).json({ notifications: rows });
}));
router.post("/tmd/me/notifications/read", requireTmdUser, handled(async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((x: unknown) => typeof x === "string").slice(0, 100) : null;
  const where = ids ? and(eq(tmdNotificationsTable.userId, req.tmdUser!.id), inArray(tmdNotificationsTable.id, ids)) : eq(tmdNotificationsTable.userId, req.tmdUser!.id);
  await db.update(tmdNotificationsTable).set({ readAt: new Date() }).where(where);
  res.json({ ok: true });
}));

export default router;
