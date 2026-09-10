import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { accountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAccount } from "./account-auth";
import { requireAdminForRequest } from "./require-admin";
import { wholesaleSharesTable } from "@workspace/db";
import { writeLog } from "../lib/audit-log";

declare global {
  namespace Express {
    interface Request {
      // Set by requireWholesale once the caller is confirmed to be a wholesale member.
      wholesale?: { telegramUsername: string };
      /** Set only after the admin secret is validated for a share-management action. */
      sharedOrderAdminOverride?: boolean;
    }
  }
}

/**
 * Middleware: requires the caller to be an authenticated account flagged as a
 * wholesale member (accounts.is_wholesale = true). Sets req.wholesale on success.
 */
export async function requireWholesale(req: Request, res: Response, next: NextFunction): Promise<void> {
  // First run account auth (verifies the session cookie + revocation).
  await new Promise<void>((resolve, reject) => {
    requireAccount(req, res, (err?: unknown) => {
      if (err) { reject(err); } else { resolve(); }
    });
  }).catch(() => {
    // requireAccount already sent the response
    return;
  });

  // If account auth already responded (401), stop here.
  if (res.headersSent) return;

  const username = req.account?.telegramUsername;
  if (!username) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const [account] = await db
    .select({ isWholesale: accountsTable.isWholesale })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, username));

  if (!account) {
    res.status(401).json({ error: "Account not found" });
    return;
  }

  if (!account.isWholesale) {
    res.status(403).json({ error: "This area is for wholesale members only." });
    return;
  }

  req.wholesale = { telegramUsername: username };
  next();
}

/**
 * Lets the protected admin workspace invoke the existing creator workflows for
 * one shared order. The handlers still run their normal transactional status,
 * payment, delivery, and fee safeguards; this middleware only establishes the
 * creator identity after the admin secret is verified.
 */
export async function requireWholesaleOrAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  // An admin cookie can coexist with an impersonated account_session in a
  // View-As tab. The cookie alone does not express admin intent: enabled-mode
  // admin requests carry the CSRF header added by AdminAuthController, while
  // disabled-mode requests carry the legacy secret.
  const presentsAdminCredentials = typeof req.headers["x-admin-secret"] === "string" ||
    typeof req.headers["x-admin-csrf"] === "string";
  if (!presentsAdminCredentials) {
    await requireWholesale(req, res, next);
    return;
  }
  if (!await requireAdminForRequest(req, res)) return;

  const shareId = typeof req.params.id === "string" ? req.params.id.trim() : "";
  if (!shareId) {
    res.status(400).json({ error: "Shared order ID is required." });
    return;
  }
  const [share] = await db
    .select({ creatorUsername: wholesaleSharesTable.creatorUsername })
    .from(wholesaleSharesTable)
    .where(eq(wholesaleSharesTable.id, shareId));
  if (!share) {
    res.status(404).json({ error: "Shared order not found" });
    return;
  }
  req.wholesale = { telegramUsername: share.creatorUsername };
  req.sharedOrderAdminOverride = true;
  void writeLog(
    "change",
    "warn",
    "shared_order_admin_override",
    `Admin override for shared order ${shareId}: ${req.method} ${req.path}`,
    { shareId, method: req.method, path: req.path, creatorUsername: share.creatorUsername },
    req.ip,
  );
  next();
}
