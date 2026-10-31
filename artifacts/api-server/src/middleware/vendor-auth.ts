import type { Request, Response, NextFunction } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import { vendorAccountStore, type VendorAccountStore, type VendorAccount } from "../lib/vendor-account-store";

export const VENDOR_SESSION_COOKIE = "peps_vendor_session";
export const vendorTokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const vendorCsrfToken = (token: string) => vendorTokenHash(`vendor-csrf:${token}`);
export function vendorCookieOptions() {
  const preview = process.env.NODE_ENV !== "production" && !!process.env.REPL_ID;
  return { httpOnly: true, secure: process.env.NODE_ENV === "production" || preview, sameSite: preview ? "none" as const : "strict" as const, ...(preview ? { partitioned: true } : {}), path: "/api/vendor" };
}
export function vendorSameOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.get("origin");
  try {
    if (req.get("sec-fetch-site") === "cross-site" || !origin || new URL(origin).host !== req.get("host")?.toLowerCase()) {
      res.status(403).json({ error: "Cross-site vendor requests are not permitted." }); return;
    }
  } catch { res.status(403).json({ error: "Cross-site vendor requests are not permitted." }); return; }
  next();
}
declare global { namespace Express { interface Request { vendor?: { username: string; vendorId: string | null; tokenHash: string; account: VendorAccount; csrfToken: string } } } }
export function createVendorAuthentication(store: VendorAccountStore = vendorAccountStore) {
  const identity = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.[VENDOR_SESSION_COOKIE];
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) { res.status(401).json({ error: "Vendor sign-in required." }); return; }
    try {
      const tokenHash = vendorTokenHash(token);
      const result = await store.getSession(tokenHash, new Date());
      if (!result || result.account.status === "disabled") { res.status(401).json({ error: "Vendor session expired or revoked." }); return; }
      const csrfToken = vendorCsrfToken(token);
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        let allowed = false;
        vendorSameOrigin(req, res, () => { allowed = true; });
        if (!allowed) return;
        const csrf = req.get("x-vendor-csrf");
        if (typeof csrf !== "string" || !/^[a-f0-9]{64}$/.test(csrf) || !timingSafeEqual(Buffer.from(csrf), Buffer.from(csrfToken))) {
          res.status(403).json({ error: "Vendor CSRF validation failed. Refresh and try again." }); return;
        }
      }
      req.vendor = { username: result.account.username, vendorId: result.account.vendorId, tokenHash, account: result.account, csrfToken };
      next();
    } catch { res.status(503).json({ error: "Unable to verify vendor access. Please try again." }); }
  };
  const active = async (req: Request, res: Response, next: NextFunction) => identity(req, res, () => {
    if (req.vendor?.account.status !== "active" || !req.vendor.vendorId) { res.status(403).json({ error: "Your vendor account is awaiting approval and vendor assignment." }); return; }
    next();
  });
  return { identity, active };
}
const authentication = createVendorAuthentication();
export const requireVendorIdentity = authentication.identity;
export const requireVendorAccount = authentication.active;
