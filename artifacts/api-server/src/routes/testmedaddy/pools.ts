import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Router } from "express";
import type { Pool, PoolClient } from "pg";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { fail, ownUser, parsePoolInput, poolCosts, type PoolInput } from "../../lib/testmedaddy-core";
import { requireUser } from "./auth";
import { transaction } from "./db";

type Row = Record<string, any>;
const poolSelect = `SELECT p.*,u.handle AS organiser_handle,u.display_name AS organiser_name,
 u.bio AS organiser_bio,u.created_at AS organiser_created_at FROM tmd_pools p JOIN tmd_users u ON u.id=p.organiser_id`;
function memberView(row: Row, privateAccess = false) {
  return {
    id: row.id, displayName: row.anonymous && !privateAccess ? "Anonymous" : row.display_name,
    anonymous: row.anonymous, paymentStatus: "unpaid", amountUsd: row.amount_usd,
    joinedAt: new Date(row.joined_at).toISOString(), verifiedAt: null,
    ...(privateAccess ? { userId: row.user_id } : {}),
  };
}
function poolView(row: Row, members: Row[]) {
  const data = row.document as PoolInput, costs = poolCosts(data);
  const { share, ...breakdown } = costs;
  return {
    id: row.id, slug: row.slug, organiserId: row.organiser_id, title: data.title, description: data.description ?? null,
    status: row.status, visibility: row.visibility, inviteOnly: row.visibility === "invite", resultsVisibility: "public",
    labName: data.labName ?? null, splitMode: data.splitMode, fixedShareUsd: data.fixedShareUsd == null ? null : Number(data.fixedShareUsd).toFixed(2),
    shippingUsd: data.shippingUsd.toFixed(2), organiserTipUsd: data.organiserTipUsd.toFixed(2), platformFeePct: "0.00",
    targetUsd: costs.target.toFixed(2), minMembers: data.minMembers, maxMembers: data.maxMembers ?? null,
    deadlineAt: data.deadlineAt ?? null, paymentMethods: {}, coverPhotoKey: null, hasResults: false,
    resultsPublishedAt: null, fundedAt: null, createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString(),
    telegram: { linked: false, title: null },
    organiser: { id: row.organiser_id, handle: row.organiser_handle, displayName: row.organiser_name, bio: row.organiser_bio, avatarKey: null, createdAt: new Date(row.organiser_created_at).toISOString() },
    items: data.items.map((item, i) => ({ ...item, id: `${row.id}-test-${i}`, poolId: row.id, batchId: null, priceUsd: item.priceUsd.toFixed(2), lab: item.lab ?? null, labOrderUrl: item.labOrderUrl ?? null, position: i, batch: null, vendor: null })),
    totals: { verifiedUsd: 0, submittedUsd: 0, memberCount: members.length, verifiedMemberCount: 0 },
    progress: { target: costs.target, verified: 0, remaining: costs.target, pct: 0, funded: false },
    shareUsd: share, breakdown,
  };
}
async function rowByKey(client: Pool | PoolClient, key: string, lock = false): Promise<Row> {
  const { rows } = await client.query(`${poolSelect} WHERE p.id=$1 OR p.slug=$1${lock ? " FOR UPDATE OF p" : ""}`, [key]);
  if (!rows[0]) fail(404, "Pool not found.");
  return rows[0];
}
async function membersFor(client: Pool | PoolClient, poolId: string) {
  return (await client.query("SELECT * FROM tmd_members WHERE pool_id=$1 ORDER BY joined_at,id", [poolId])).rows;
}
async function view(client: Pool | PoolClient, row: Row, userId?: string) {
  const members = await membersFor(client, row.id), isOrganiser = row.organiser_id === userId;
  const own = members.find(member => member.user_id === userId);
  return {
    pool: poolView(row, members),
    members: members.map(member => memberView(member, isOrganiser || member.user_id === userId)),
    photos: [], results: null, resultsLocked: true, announcements: [],
    viewer: { isOrganiser, membership: own ? memberView(own, true) : null, signedIn: !!userId },
  };
}
async function canRead(client: Pool | PoolClient, row: Row, userId: string | undefined, code: unknown) {
  if (row.organiser_id === userId) return;
  if (row.status === "draft") fail(404, "Pool not found.");
  if (row.visibility !== "invite") return;
  if (userId && (await client.query("SELECT id FROM tmd_members WHERE pool_id=$1 AND user_id=$2", [row.id, userId])).rows.length) return;
  if (typeof code !== "string" || code.length > 100 || !row.access_code_hash || !await bcrypt.compare(code, row.access_code_hash))
    fail(401, "Enter the organiser's access code to view this pool.");
}
function owner(row: Row, userId: string) { if (row.organiser_id !== userId) fail(404, "Pool not found."); }
function stored(input: PoolInput) {
  const { accessCode: _code, ...data } = input;
  return JSON.stringify(data);
}
async function listViews(database: Pool, rows: Row[]) {
  if (!rows.length) return [];
  const members = (await database.query("SELECT * FROM tmd_members WHERE pool_id=ANY($1::text[])", [rows.map(row => row.id)])).rows;
  return rows.map(row => poolView(row, members.filter(member => member.pool_id === row.id)));
}
export function mountPools(router: Router, database: Pool) {
  const accessLimiter = rateLimit({ windowMs: 60000, limit: 60, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "Too many pool requests. Try again shortly." } });
  router.get("/me", requireUser, async (_req, res) => {
    const user = res.locals.tmd;
    const { rows } = await database.query(
      `SELECT (SELECT count(*)::int FROM tmd_pools WHERE organiser_id=$1) AS hosting,
       (SELECT count(*)::int FROM tmd_members WHERE user_id=$1) AS joined`, [user.id]);
    res.json({ user: ownUser(user), stats: { ...rows[0], unreadNotifications: 0, verifiedUsd: 0, submittedUsd: 0 } });
  });
  router.get("/me/pools", requireUser, async (_req, res) => {
    const { rows } = await database.query(`${poolSelect} WHERE p.organiser_id=$1 ORDER BY p.updated_at DESC`, [res.locals.tmd.id]);
    res.json({ pools: await listViews(database, rows) });
  });
  router.get("/me/contributions", requireUser, async (_req, res) => {
    const members = (await database.query("SELECT * FROM tmd_members WHERE user_id=$1 ORDER BY joined_at DESC", [res.locals.tmd.id])).rows;
    if (!members.length) { res.json({ contributions: [] }); return; }
    const { rows } = await database.query(`${poolSelect} WHERE p.id=ANY($1::text[])`, [members.map(member => member.pool_id)]);
    const pools = await listViews(database, rows);
    res.json({ contributions: members.map(member => ({ member: memberView(member, true), pool: pools.find(pool => pool.id === member.pool_id) })) });
  });
  router.get("/pools", async (req, res) => {
    const query = z.object({ q: z.string().max(120).default(""), status: z.enum(["", "all", "open", "closed", "cancelled", "draft", "funded", "sent_to_lab", "results_received"]).default("all") }).parse(req.query);
    const { rows } = await database.query(
      `${poolSelect} WHERE p.visibility='public' AND p.status<>'draft'
       AND ($1='' OR $1='all' OR p.status=$1) AND (p.document->>'title' ILIKE $2 OR p.document->>'description' ILIKE $2)
       ORDER BY p.created_at DESC LIMIT 101`, [query.status, `%${query.q}%`]);
    res.json({ pools: await listViews(database, rows.slice(0, 100)), hasMore: rows.length > 100 });
  });
  router.get("/pools/manage/:id", requireUser, async (req, res) => {
    const row = await rowByKey(database, String(req.params.id));
    owner(row, res.locals.tmd.id);
    res.json(await view(database, row, res.locals.tmd.id));
  });
  router.get("/pools/:slug", accessLimiter, async (req, res) => {
    const row = await rowByKey(database, String(req.params.slug));
    await canRead(database, row, res.locals.tmd?.id, req.get("x-tmd-access-code"));
    res.json(await view(database, row, res.locals.tmd?.id));
  });
  router.post("/pools", async (req, res) => {
    const input = parsePoolInput(req.body);
    if (input.visibility === "invite" && !input.accessCode) fail(400, "Set an access code for an invite-only pool.");
    const id = randomUUID(), slug = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 45).replace(/^-|-$/g, "") || "pool"}-${randomBytes(8).toString("hex")}`;
    const hash = input.accessCode ? await bcrypt.hash(input.accessCode, 12) : null;
    await database.query("INSERT INTO tmd_pools(id,slug,organiser_id,visibility,access_code_hash,document) VALUES($1,$2,$3,$4,$5,$6::jsonb)", [id, slug, res.locals.tmd.id, input.visibility, hash, stored(input)]);
    res.status(201).json(await view(database, await rowByKey(database, id), res.locals.tmd.id));
  });
  router.patch("/pools/:id", async (req, res) => {
    const input = parsePoolInput(req.body);
    const hash = input.accessCode ? await bcrypt.hash(input.accessCode, 12) : undefined;
    const result = await transaction(database, async client => {
      const row = await rowByKey(client, String(req.params.id), true);
      owner(row, res.locals.tmd.id);
      if (row.status === "cancelled") fail(409, "Cancelled pools cannot be edited.");
      if (input.visibility === "invite" && !hash && !row.access_code_hash) fail(400, "Set an access code for an invite-only pool.");
      const count = (await membersFor(client, row.id)).length;
      if (input.maxMembers != null && input.maxMembers < count) fail(409, "Maximum members cannot be below the current membership.");
      await client.query("UPDATE tmd_pools SET visibility=$1,access_code_hash=$2,document=$3::jsonb,updated_at=now() WHERE id=$4", [input.visibility, hash ?? row.access_code_hash, stored(input), row.id]);
      // These are explicitly non-payable estimates, not payment records.
      await client.query("UPDATE tmd_members SET amount_usd=$1 WHERE pool_id=$2", [poolCosts(input).share.toFixed(2), row.id]);
      return view(client, await rowByKey(client, row.id), res.locals.tmd.id);
    });
    res.json(result);
  });
  router.post("/pools/:id/status", async (req, res) => {
    const { status } = z.object({ status: z.enum(["open", "closed", "cancelled"]) }).strict().parse(req.body);
    const result = await transaction(database, async client => {
      const row = await rowByKey(client, String(req.params.id), true);
      owner(row, res.locals.tmd.id);
      if (row.status !== status) {
        const allowed: Record<string, string[]> = { draft: ["open", "cancelled"], open: ["closed", "cancelled"], closed: ["open", "cancelled"], cancelled: [] };
        if (!allowed[row.status]?.includes(status)) fail(409, "This pool cannot move to that status.");
        if (status === "open" && row.document.deadlineAt && new Date(row.document.deadlineAt).getTime() <= Date.now()) fail(409, "Set a future joining deadline before opening this pool.");
        const changed = await client.query("UPDATE tmd_pools SET status=$1,updated_at=now() WHERE id=$2 RETURNING updated_at", [status, row.id]);
        row.status = status;
        row.updated_at = changed.rows[0].updated_at;
      }
      return view(client, row, res.locals.tmd.id);
    });
    res.json(result);
  });
  router.post("/pools/:slug/join", accessLimiter, async (req, res) => {
    const input = z.object({ anonymous: z.boolean().default(false), displayName: z.string().trim().min(1).max(60).optional() }).strict().parse(req.body ?? {});
    const result = await transaction(database, async client => {
      const row = await rowByKey(client, String(req.params.slug), true), user = res.locals.tmd;
      await canRead(client, row, user.id, req.get("x-tmd-access-code"));
      if (row.organiser_id === user.id) fail(409, "You already host this pool.");
      const members = await membersFor(client, row.id);
      const existing = members.find(member => member.user_id === user.id);
      if (existing) return memberView(existing, true);
      if (row.status !== "open") fail(409, "This pool is not open for joining.");
      if (row.document.deadlineAt && new Date(row.document.deadlineAt).getTime() <= Date.now()) fail(409, "The joining deadline has passed.");
      if (row.document.maxMembers != null && members.length >= row.document.maxMembers) fail(409, "This pool has reached its member limit.");
      const { rows } = await client.query(
        "INSERT INTO tmd_members(id,pool_id,user_id,display_name,anonymous,amount_usd) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
        [randomUUID(), row.id, user.id, input.displayName ?? user.display_name, input.anonymous, poolCosts(row.document).share.toFixed(2)]);
      return memberView(rows[0], true);
    });
    res.json(result);
  });
  router.post("/members/:id/leave", async (req, res) => {
    await transaction(database, async client => {
      const { rows } = await client.query("SELECT pool_id FROM tmd_members WHERE id=$1 AND user_id=$2", [String(req.params.id), res.locals.tmd.id]);
      if (!rows[0]) fail(404, "Membership not found.");
      await rowByKey(client, rows[0].pool_id, true);
      await client.query("DELETE FROM tmd_members WHERE id=$1 AND user_id=$2", [String(req.params.id), res.locals.tmd.id]);
    });
    res.json({ ok: true });
  });
}
