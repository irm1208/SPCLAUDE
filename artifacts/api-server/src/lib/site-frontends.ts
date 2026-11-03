import express, { type RequestHandler } from "express";
import fs from "node:fs";
import path from "node:path";
import { isTestmedaddyHost, siteDocument } from "./site-domain-policy";

// Only connected Testmedaddy routes receive a successful SPA document.
// Keep this list aligned with Testmedaddy's App.tsx when enabling a new page.
const testingPages = new Set(["/", "/explore", "/how-it-works", "/login", "/signup", "/dashboard", "/host/new", "/settings"]);
function isTestingPage(url: string): boolean {
  const pathname = url.length > 1 ? url.replace(/\/$/, "") : url;
  return testingPages.has(pathname) || /^\/(?:p\/[^/]+|host\/[^/]+(?:\/edit)?)$/.test(pathname);
}

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
        if (isTestmedaddyHost(req.headers.host ?? "") && !isTestingPage(req.path)) {
          res.status(404);
          res.setHeader("X-Robots-Tag", "noindex");
        }
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
