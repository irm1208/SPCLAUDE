import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { db } from "@workspace/db";
import { requireVendorAccount } from "../middleware/vendor-auth";
import { vendorAccess } from "../lib/vendor-portal-service";
import { VendorPortalError } from "../lib/vendor-portal-model";
import { getVendorWallets, saveVendorWallets } from "../lib/vendor-wallets";
import { VENDOR_WALLET_OPTIONS } from "../lib/vendor-wallet-input";

export function vendorWalletSetupGate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const path = req.path.toLowerCase().replace(/\/+$/, "");
  if (
    ["/me", "/wallets", "/settings", "/security"].includes(path) ||
    path.startsWith("/auth/") ||
    path.startsWith("/security/")
  ) {
    next();
    return;
  }
  void requireVendorAccount(req, res, () => {
    void getVendorWallets(db, req.vendor!.vendorId!)
      .then((wallets) => {
        if (!wallets.length) {
          res
            .status(403)
            .json({
              error: "vendor_wallet_required",
              message: "Add a payment wallet in Settings before using orders.",
            });
          return;
        }
        next();
      })
      .catch(() => {
        res
          .status(503)
          .json({
            error: "Unable to check vendor wallet setup. Please try again.",
          });
      });
  });
}
const router = Router();
router.get("/vendor/wallets", requireVendorAccount, async (req, res, next) => {
  try {
    const access = await vendorAccess(
      db,
      req.vendor!.username,
      false,
      req.vendor!.tokenHash,
    );
    res
      .set("Cache-Control", "no-store")
      .json({
        wallets: await getVendorWallets(db, access.vendorId),
        options: VENDOR_WALLET_OPTIONS,
      });
  } catch (error) {
    next(error);
  }
});
router.put("/vendor/wallets", requireVendorAccount, async (req, res, next) => {
  try {
    const wallets = await db.transaction(async (tx) => {
      const access = await vendorAccess(
        tx,
        req.vendor!.username,
        true,
        req.vendor!.tokenHash,
      );
      return saveVendorWallets(
        tx,
        access.vendorId,
        req.vendor!.username,
        req.body,
      );
    });
    res
      .set("Cache-Control", "no-store")
      .json({ wallets, options: VENDOR_WALLET_OPTIONS });
  } catch (error) {
    if (error instanceof VendorPortalError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    next(error);
  }
});
export default router;
