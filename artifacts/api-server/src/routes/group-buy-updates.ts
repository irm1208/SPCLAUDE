import { Router, type Request, type Response, type NextFunction, type ErrorRequestHandler } from "express";
import multer from "multer";
import { requireAccount } from "../middleware/account-auth";
import { requireAdmin } from "../middleware/require-admin";
import { requireOrganiser } from "../middleware/require-organiser";
import { GroupUpdateError, type UpdateActor } from "../lib/group-buy-updates-model";
import { WholesaleUpdateValidationError } from "../lib/wholesale-updates";
import { WHOLESALE_IMAGE_LIMIT } from "../lib/wholesale-update-images";
import {
  groupBuyUpdates, groupBuyProgressSummaries, setGroupBuyProgress, setGroupBuyMoq,
  saveGroupBuyUpdate, deleteGroupBuyUpdate, groupBuyUpdateImage,
} from "../lib/group-buy-updates";
import { writeLog } from "../lib/audit-log";

const router = Router();
const management = ["/admin/group-buys/:id", "/organiser/group-buys/:id"];
const paths = management.map(path => `${path}/updates`);
const param = (req: Request, name: string) => String(req.params[name] ?? "");
const scope = (req: Request) => req.path.startsWith("/admin/") ? "admin" as const : "organiser" as const;
const actor = (req: Request, manage = false): UpdateActor => manage
  ? scope(req) === "admin" ? { username: "admin", admin: true }
    : { username: req.organiser!.telegramUsername, admin: req.organiser!.isAdmin, adminGbId: req.organiser!.adminGbId }
  : { username: req.account!.telegramUsername };
async function managementAuth(req: Request, res: Response, next: NextFunction) {
  if (scope(req) === "admin") { if (requireAdmin(req, res)) next(); return; }
  await requireOrganiser(req, res, next);
}
const upload = multer({
  storage: multer.memoryStorage(), limits: { fileSize: WHOLESALE_IMAGE_LIMIT, files: 1, fields: 5, fieldSize: 25_000 },
}).single("image");
const noCache = (_req: Request, res: Response, next: NextFunction) => { res.setHeader("Cache-Control", "private, no-store"); next(); };
async function audit(req: Request, action: string, extra: Record<string, unknown> = {}) {
  await writeLog("change", "info", action, "Group-buy progress or announcement updated", {
    groupBuyId: param(req, "id"), actor: actor(req, true).username, ...extra,
  }, req.ip).catch(error => console.error("[group-buy-updates:audit]", error));
}

router.get("/group-buys/progress", requireAccount, noCache, async (req, res) => {
  res.json(await groupBuyProgressSummaries(actor(req).username));
});
router.get("/group-buys/:id/updates", requireAccount, noCache, async (req, res) => {
  res.json(await groupBuyUpdates(param(req, "id"), actor(req), "member"));
});
router.get(paths, managementAuth, noCache, async (req, res) => {
  res.json(await groupBuyUpdates(param(req, "id"), actor(req, true), scope(req)));
});
router.put(management.map(path => `${path}/progress`), managementAuth, noCache, async (req, res) => {
  const result = await setGroupBuyProgress(param(req, "id"), actor(req, true), scope(req), req.body);
  await audit(req, "group_buy_progress_updated", { stage: result.stage });
  res.json(result);
});
router.put(management.map(path => `${path}/moq`), managementAuth, noCache, async (req, res) => {
  const result = await setGroupBuyMoq(param(req, "id"), actor(req, true), scope(req), req.body);
  await audit(req, "group_buy_moq_updated", {
    enabled: result.moq?.enabled, targetKits: result.moq?.targetKits,
    showToMembers: result.moq?.showToMembers,
  });
  res.json(result);
});
router.post(paths, managementAuth, upload, async (req, res) => {
  const result = await saveGroupBuyUpdate(param(req, "id"), null, actor(req, true), scope(req), req.body, req.file?.buffer);
  await audit(req, "group_buy_update_created", { updateId: result.update.id, published: result.update.published });
  res.status(201).json(result);
});
router.put(paths.map(path => `${path}/:updateId`), managementAuth, upload, async (req, res) => {
  const result = await saveGroupBuyUpdate(param(req, "id"), param(req, "updateId"), actor(req, true), scope(req), req.body, req.file?.buffer);
  await audit(req, "group_buy_update_edited", { updateId: result.update.id, published: result.update.published });
  res.json(result);
});
router.delete(paths.map(path => `${path}/:updateId`), managementAuth, async (req, res) => {
  const result = await deleteGroupBuyUpdate(param(req, "id"), param(req, "updateId"), actor(req, true));
  await audit(req, "group_buy_update_deleted", { updateId: param(req, "updateId") });
  res.json(result);
});
async function sendImage(req: Request, res: Response, manage: boolean) {
  const bytes = await groupBuyUpdateImage(param(req, "id"), param(req, "updateId"), actor(req, manage), manage ? scope(req) : "member");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.type("image/webp").send(bytes);
}
router.get("/group-buys/:id/updates/:updateId/image", requireAccount, (req, res) => sendImage(req, res, false));
router.get(paths.map(path => `${path}/:updateId/image`), managementAuth, (req, res) => sendImage(req, res, true));

const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof GroupUpdateError || error instanceof WholesaleUpdateValidationError || error instanceof multer.MulterError) {
    const tooLarge = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
    res.status(tooLarge ? 413 : error instanceof GroupUpdateError ? error.status : 400)
      .json({ error: tooLarge ? "Images must be 5 MB or smaller." : error instanceof multer.MulterError ? "Attach one image and check the update fields." : error.message });
    return;
  }
  console.error("[group-buy-updates]", error);
  res.status(500).json({ error: "Could not complete the group-buy update request. Please try again." });
};
router.use(["/group-buys/progress", "/group-buys/:id/updates", ...paths, ...management.flatMap(path => [`${path}/progress`, `${path}/moq`])], handleError);
export default router;
