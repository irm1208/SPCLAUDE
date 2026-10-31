import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { requireAdmin, getAdminUsername } from "../middleware/require-admin";
import { requireVendorAccount } from "../middleware/vendor-auth";
import { getVendors } from "./config";
import { vendorAccess } from "../lib/vendor-portal-service";
import { VendorPortalError } from "../lib/vendor-portal-model";
import {
  listVendorPayments,
  recordVendorPayment,
  vendorPaymentDashboard,
  voidVendorPayment,
} from "../lib/vendor-payments";
const router = Router();
function handled(fn: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error instanceof VendorPortalError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      if ((error as any)?.name === "RefundMutationBlockedError") {
        res.status(409).json({ error: "An order has an active refund." });
        return;
      }
      console.error(
        "[vendor-payments]",
        error instanceof Error ? error.message : "Request failed",
      );
      res
        .status(500)
        .json({ error: "Could not complete the vendor payment request." });
    }
  };
}
router.get(
  "/admin/vendor-payments",
  handled(async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const vendors = (await getVendors()).map((v) => ({
      id: v.id,
      name: v.name,
    }));
    const vendorId =
      typeof req.query.vendorId === "string" ? req.query.vendorId : undefined;
    if (!vendorId) {
      res.set("Cache-Control", "no-store").json({
        vendors,
        vendorId: null,
        wallets: [],
        orders: [],
        payments: [],
      });
      return;
    }
    if (!vendors.some((v) => v.id === vendorId))
      throw new VendorPortalError("Vendor not found.", 404);
    res
      .set("Cache-Control", "no-store")
      .json({ vendors, ...(await vendorPaymentDashboard(db, vendorId)) });
  }),
);
router.get(
  "/vendor/payments",
  requireVendorAccount,
  handled(async (req, res) => {
    const access = await vendorAccess(
      db,
      req.vendor!.username,
      false,
      req.vendor!.tokenHash,
    );
    res
      .set("Cache-Control", "no-store")
      .json({ payments: await listVendorPayments(db, access.vendorId) });
  }),
);
router.post(
  "/admin/vendor-payments",
  handled(async (req, res) => {
    if (!requireAdmin(req, res)) return;
    if (!(await getVendors()).some((v) => v.id === req.body?.vendorId))
      throw new VendorPortalError("Vendor not found.", 404);
    res.status(201).json({
      payment: await recordVendorPayment(req.body, getAdminUsername(res)),
    });
  }),
);
router.post(
  "/admin/vendor-payments/:id/void",
  handled(async (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({
      payment: await voidVendorPayment(
        String(req.params.id),
        req.body?.reason,
        getAdminUsername(res),
      ),
    });
  }),
);
export default router;
