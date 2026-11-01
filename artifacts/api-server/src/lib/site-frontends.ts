import express, { type RequestHandler } from "express";
import fs from "node:fs";
import path from "node:path";
import { isTestmedaddyHost, siteDocument } from "./site-domain-policy";

/** Each hostname gets its own document, assets and SPA fallback. Never share fallbacks. */
export function siteFrontends(roots: { main: string; testing: string }): RequestHandler {
  function frontend(root: string): RequestHandler {
    const index = path.join(root, "index.html");
    const document = fs.existsSync(index) ? fs.readFileSync(index, "utf8") : null;
    const files = express.static(root, { index: false, redirect: false });
    return (req, res, next) => {
      if (!["GET", "HEAD"].includes(req.method) || /^\/api(?:\/|$)/i.test(req.path)) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      if (document === null) {
        res.status(503).send("This website is temporarily unavailable.");
        return;
      }
      files(req, res, error => {
        if (error) { next(error); return; }
        // Missing assets must not become an HTML document from either application.
        if (req.path.startsWith("/assets/") || /\.(?:js|css|map|svg|png|jpe?g|gif|webp|ico|woff2?|ttf|wasm|webmanifest)$/i.test(req.path)) {
          res.sendStatus(404);
          return;
        }
        res.setHeader("Cache-Control", "no-cache");
        res.type("html").send(siteDocument(document, req.headers.host ?? ""));
      });
    };
  }
  const main = frontend(roots.main);
  const testing = frontend(roots.testing);
  return (req, res, next) => (
    isTestmedaddyHost(req.headers.host ?? "") ? testing : main
  )(req, res, next);
}
