import { Router } from "express";
import cookieParser from "cookie-parser";
import type { Pool } from "pg";
import { ZodError } from "zod";
import { pool } from "@workspace/db";
import { TmdError, FEATURES } from "../../lib/testmedaddy-core";
import { mountAuth, protectMutations, sessionMiddleware } from "./auth";
import { mountPools } from "./pools";

export function createTestmedaddyRouter(database: Pool = pool) {
  const router = Router();
  router.use((_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
  router.get("/capabilities", (_req, res) => res.json(FEATURES));
  router.use(cookieParser(), sessionMiddleware(database), protectMutations);
  mountAuth(router, database);
  mountPools(router, database);
  router.use((_req, res) => res.status(404).json({ error: "This feature is not available in the Testmedaddy core release." }));
  router.use((error: any, _req: any, res: any, _next: any) => {
    if (error instanceof TmdError) { res.status(error.status).json({ error: error.message }); return; }
    if (error instanceof ZodError) { res.status(400).json({ error: error.issues[0]?.message ?? "Invalid request." }); return; }
    if (error?.code === "23505") { res.status(409).json({ error: "That email, handle or membership already exists." }); return; }
    console.error("[testmedaddy] Request failed:", error?.code ?? error?.name ?? "unknown");
    res.status(503).json({ error: "Testmedaddy is temporarily unavailable. Please try again." });
  });
  return router;
}
export default createTestmedaddyRouter();
