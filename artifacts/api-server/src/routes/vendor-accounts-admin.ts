import { Router } from "express";
import bcrypt from "bcryptjs";
import { vendorAccountStore, publicVendorAccount } from "../lib/vendor-account-store";
import { getVendors } from "./config";
import { requireAdmin, getAdminUsername } from "../middleware/require-admin";
import { validVendorPassword, vendorUsername, validVendorUsername, vendorDisplayNameInput } from "../lib/vendor-account-input";
import { db } from "@workspace/db";
import { auditVendor } from "../lib/vendor-portal-service";

const router = Router();
router.get("/admin/vendor-accounts", async (req, res, next) => {
  if (!requireAdmin(req, res)) return;
  try { res.set("Cache-Control", "no-store").json({ accounts: (await vendorAccountStore.listAccounts()).map(publicVendorAccount), vendors: (await getVendors()).map(v => ({ id: v.id, name: v.name })) }); }
  catch (error) { next(error); }
});
router.post("/admin/vendor-accounts", async (req, res, next) => {
  if (!requireAdmin(req, res)) return;
  try {
    const username = vendorUsername(req.body?.username), password = req.body?.password, vendorId = req.body?.vendorId;
    if (!validVendorUsername(username) || !validVendorPassword(password)) { res.status(400).json({ error: "Enter a vendor username (3–50 letters, digits, dots, dashes or underscores) and a password of at least 12 characters. If your password is very long, shorten it." }); return; }
    if (typeof vendorId !== "string" || !(await getVendors()).some(v => v.id === vendorId)) { res.status(400).json({ error: "Select a configured vendor." }); return; }
    const companyName = typeof req.body.companyName === "string" ? req.body.companyName.trim() : "";
    const contactName = typeof req.body.contactName === "string" ? req.body.contactName.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim() : "";
    if (companyName.length > 200 || contactName.length > 200 || email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) { res.status(400).json({ error: "Check the company, contact name and optional email." }); return; }
    const displayName = vendorDisplayNameInput(req.body?.displayName);
    const now = new Date(), actor = getAdminUsername(res);
    const account = await vendorAccountStore.createAccount({ username, passwordHash: await bcrypt.hash(password, 12), vendorId, displayName, status: "active", companyName, contactName, email: email || null, createdBy: actor, createdAt: now, updatedAt: now });
    if (!account) { res.status(409).json({ error: "That vendor username is unavailable." }); return; }
    await auditVendor(db, actor, "vendor_account_created", null, { username, vendorId, displayName });
    res.status(201).json({ account: publicVendorAccount(account) });
  } catch (error) { next(error); }
});
router.put("/admin/vendor-accounts/:username", async (req, res, next) => {
  if (!requireAdmin(req, res)) return;
  try {
    const username = vendorUsername(req.params.username), { status, vendorId, password } = req.body ?? {};
    if (!["pending", "active", "disabled"].includes(status) || (vendorId !== null && typeof vendorId !== "string")) { res.status(400).json({ error: "Provide a valid status and vendor assignment." }); return; }
    if ((status === "active" && !vendorId) || (vendorId !== null && !(await getVendors()).some(v => v.id === vendorId))) { res.status(400).json({ error: "Select a configured vendor before activating this account." }); return; }
    if (password !== undefined && !validVendorPassword(password)) { res.status(400).json({ error: "Use at least 12 characters for the new password. If your password is very long, shorten it." }); return; }
    const nameChange = req.body.displayName !== undefined ? { displayName: vendorDisplayNameInput(req.body.displayName) } : {};
    const account = await vendorAccountStore.updateAccount(username, { status, vendorId, ...nameChange, ...(password !== undefined ? { passwordHash: await bcrypt.hash(password, 12) } : {}) });
    if (!account) { res.status(404).json({ error: "Vendor account not found." }); return; }
    await auditVendor(db, getAdminUsername(res), password !== undefined ? "vendor_password_reset" : "vendor_account_updated", null, { username, vendorId, status, ...nameChange });
    res.json({ account: publicVendorAccount(account) });
  } catch (error) { next(error); }
});
export default router;
