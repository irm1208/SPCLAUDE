import { timingSafeEqual } from "crypto";
import type { Request, Response } from "express";
import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";
import { and, gte, eq, sql } from "drizzle-orm";

// ── In-memory fast path + DB-backed persistence ────────────────────────────────
// In-memory map is fast for the common case.
// Each failure is persisted to the audit log so that across server restarts,
// accumulated failures are not lost (attackers can't just wait for a restart).

interface AttemptRecord {
  count: number;
  blockedUntil: number;
}

const attempts = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 30;
const BLOCK_MS = 15 * 60 * 1000; // 15 minutes

function getIp(req: Request): string {
  return (req.ip ?? req.socket?.remoteAddress ?? "unknown") as string;
}

function logFailureToDB(ip: string): void {
  db.insert(auditLogsTable).values({
    type: "login",
    level: "warn",
    action: "admin_auth_fail",
    message: `Failed admin auth attempt from ${ip}`,
    metadata: { ip },
    ip,
  }).catch(() => {});
}

// Check DB for accumulated failures — used to restore state after a restart.
// Fire-and-forget: called in the background, updates in-memory state for next request.
function syncBlockFromDB(ip: string, current: AttemptRecord): void {
  const windowStart = new Date(Date.now() - BLOCK_MS);
  db.select({ count: sql<number>`count(*)::int` })
    .from(auditLogsTable)
    .where(and(
      eq(auditLogsTable.action, "admin_auth_fail"),
      eq(auditLogsTable.ip, ip),
      gte(auditLogsTable.createdAt, windowStart),
    ))
    .then(([row]) => {
      const total = row?.count ?? 0;
      if (total >= MAX_ATTEMPTS && current.blockedUntil <= Date.now()) {
        current.blockedUntil = Date.now() + BLOCK_MS;
        current.count = total;
        attempts.set(ip, current);
      }
    })
    .catch(() => {});
}

export function requireAdmin(req: Request, res: Response): boolean {
  const secret = process.env["ADMIN_SECRET"];
  if (!secret) {
    res.status(503).json({ error: "Admin not configured" });
    return false;
  }

  const ip = getIp(req);
  const now = Date.now();

  const rec = attempts.get(ip);
  if (rec && rec.blockedUntil > now) {
    const wait = Math.ceil((rec.blockedUntil - now) / 1000);
    res.status(429).json({ error: `Too many failed attempts. Try again in ${wait}s.` });
    return false;
  }

  const provided = req.headers["x-admin-secret"];
  if (!provided || typeof provided !== "string") {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  let authed = false;
  try {
    const bufA = Buffer.from(provided, "utf8");
    const bufB = Buffer.from(secret, "utf8");
    if (bufA.length === bufB.length) {
      authed = timingSafeEqual(bufA, bufB);
    } else {
      timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    }
  } catch {
    authed = false;
  }

  if (!authed) {
    const current = attempts.get(ip) ?? { count: 0, blockedUntil: 0 };
    current.count += 1;

    // Persist failure to DB for restart-resistant brute-force protection
    logFailureToDB(ip);

    // If in-memory count is still low, do an async DB sync to catch post-restart accumulated failures
    if (current.count < MAX_ATTEMPTS) {
      syncBlockFromDB(ip, current);
    }

    if (current.count >= MAX_ATTEMPTS) {
      current.blockedUntil = now + BLOCK_MS;
    }
    attempts.set(ip, current);
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  attempts.delete(ip);

  // Stamp the acting admin identity onto request locals for downstream use (e.g. audit logs).
  // Uses ADMIN_USERNAME env var if set; falls back to "admin" for single-secret setups.
  res.locals["adminUsername"] = process.env["ADMIN_USERNAME"] ?? "admin";

  return true;
}

/** Returns the authenticated admin username stamped by requireAdmin. */
export function getAdminUsername(res: Response): string {
  return (res.locals?.["adminUsername"] as string | undefined) ?? "admin";
}
