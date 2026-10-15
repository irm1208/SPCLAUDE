import { randomUUID } from "node:crypto";
import { Router, type ErrorRequestHandler, type Request, type Response } from "express";
import multer from "multer";
import { and, eq, like } from "drizzle-orm";
import { db, siteConfigTable } from "@workspace/db";
import { requireAdmin } from "../middleware/require-admin";
import { requireWholesale } from "../middleware/require-wholesale";
import { writeLog } from "../lib/audit-log";
import {
  WHOLESALE_UPDATE_PREFIX, WholesaleUpdateValidationError,
  parseWholesaleUpdateInput, readWholesaleUpdate, wholesaleUpdateDto, type WholesaleUpdate,
} from "../lib/wholesale-updates";
import {
  WHOLESALE_IMAGE_LIMIT, storeWholesaleUpdateImage, downloadWholesaleUpdateImage, deleteWholesaleUpdateImage,
} from "../lib/wholesale-update-images";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: WHOLESALE_IMAGE_LIMIT, files: 1, fields: 4, fieldSize: 25_000 },
}).single("image");

// Scope admin authentication to this router's own paths, never its sibling routes.
router.use("/admin/wholesale-updates", (req, res, next) => {
  if (requireAdmin(req, res)) next();
});

async function listUpdates(admin: boolean) {
  const rows = await db.select().from(siteConfigTable).where(like(siteConfigTable.key, `${WHOLESALE_UPDATE_PREFIX}%`));
  return rows.filter(row => row.key.startsWith(WHOLESALE_UPDATE_PREFIX)).map(row => readWholesaleUpdate(row.value))
    .filter(update => admin || update.published)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(update => wholesaleUpdateDto(update, admin));
}

async function findUpdate(id: string) {
  const [row] = await db.select().from(siteConfigTable)
    .where(eq(siteConfigTable.key, `${WHOLESALE_UPDATE_PREFIX}${id}`)).limit(1);
  return row ? { row, record: readWholesaleUpdate(row.value) } : null;
}

async function cleanupImage(key: string | null) {
  if (!key) return;
  try { await deleteWholesaleUpdateImage(key); }
  catch (error) { console.error("[wholesale-updates] Unused image cleanup failed", error); }
}

router.get("/wholesale/updates", requireWholesale, async (_req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ updates: await listUpdates(false) });
});
router.get("/admin/wholesale-updates", async (_req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ updates: await listUpdates(true) });
});

async function imageResponse(req: Request, res: Response, admin: boolean) {
  const found = await findUpdate(String(req.params.id));
  if (!found?.record.imageKey || (!admin && !found.record.published)) {
    res.status(404).json({ error: "Update image not found." });
    return;
  }
  const bytes = await downloadWholesaleUpdateImage(found.record.imageKey);
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.type("image/webp").send(bytes);
}
router.get("/wholesale/updates/:id/image", requireWholesale, (req, res) => imageResponse(req, res, false));
router.get("/admin/wholesale-updates/:id/image", (req, res) => imageResponse(req, res, true));

router.post("/admin/wholesale-updates", upload, async (req, res) => {
  const input = parseWholesaleUpdateInput(req.body);
  const id = randomUUID();
  const now = new Date().toISOString();
  const imageKey = req.file ? await storeWholesaleUpdateImage(req.file.buffer) : null;
  const record: WholesaleUpdate = {
    id, title: input.title, note: input.note, published: input.published,
    imageKey, createdAt: now, updatedAt: now,
  };
  try {
    await db.insert(siteConfigTable).values({ key: `${WHOLESALE_UPDATE_PREFIX}${id}`, value: JSON.stringify(record) });
  } catch (error) { await cleanupImage(imageKey); throw error; }
  writeLog("change", "info", "wholesale_update_created", "Admin created a wholesale page update", { updateId: id, published: record.published }).catch(() => {});
  res.status(201).json({ update: wholesaleUpdateDto(record, true) });
});

router.put("/admin/wholesale-updates/:id", upload, async (req, res) => {
  const input = parseWholesaleUpdateInput(req.body);
  const found = await findUpdate(String(req.params.id));
  if (!found) { res.status(404).json({ error: "Wholesale update not found." }); return; }
  const uploadedKey = req.file ? await storeWholesaleUpdateImage(req.file.buffer) : null;
  const imageKey = uploadedKey ?? (input.removeImage ? null : found.record.imageKey);
  const record: WholesaleUpdate = {
    ...found.record, title: input.title, note: input.note, published: input.published, imageKey, updatedAt: new Date().toISOString(),
  };
  try {
    const changed = await db.update(siteConfigTable).set({ value: JSON.stringify(record) })
      .where(and(eq(siteConfigTable.key, found.row.key), eq(siteConfigTable.value, found.row.value!)))
      .returning({ key: siteConfigTable.key });
    if (!changed.length) {
      await cleanupImage(uploadedKey);
      res.status(409).json({ error: "This update changed in another session. Refresh before saving." });
      return;
    }
  } catch (error) { await cleanupImage(uploadedKey); throw error; }
  if (found.record.imageKey !== imageKey) await cleanupImage(found.record.imageKey);
  writeLog("change", "info", "wholesale_update_edited", "Admin edited a wholesale page update", { updateId: record.id, published: record.published }).catch(() => {});
  res.json({ update: wholesaleUpdateDto(record, true) });
});

router.delete("/admin/wholesale-updates/:id", async (req, res) => {
  const found = await findUpdate(String(req.params.id));
  if (!found) { res.status(404).json({ error: "Wholesale update not found." }); return; }
  const removed = await db.delete(siteConfigTable)
    .where(and(eq(siteConfigTable.key, found.row.key), eq(siteConfigTable.value, found.row.value!)))
    .returning({ key: siteConfigTable.key });
  if (!removed.length) { res.status(409).json({ error: "This update changed in another session. Refresh before deleting." }); return; }
  await cleanupImage(found.record.imageKey);
  writeLog("change", "info", "wholesale_update_deleted", "Admin removed a wholesale page update", { updateId: found.record.id }).catch(() => {});
  res.json({ ok: true });
});

const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof multer.MulterError || error instanceof WholesaleUpdateValidationError) {
    res.status(error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
      error: error instanceof multer.MulterError
        ? error.code === "LIMIT_FILE_SIZE" ? "Images must be 5 MB or smaller." : "Attach one image and check the update fields."
        : error.message,
    });
    return;
  }
  console.error("[wholesale-updates]", error);
  res.status(500).json({ error: "Could not complete the wholesale update request. Please try again." });
};
router.use(["/admin/wholesale-updates", "/wholesale/updates"], handleError);
export default router;
