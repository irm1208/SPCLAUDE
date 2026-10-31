import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, copyFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// Build first, then run API_BUNDLE_SMOKE_TESTS=1 vitest run this file.
describe.skipIf(process.env.API_BUNDLE_SMOKE_TESTS !== "1")("standalone production API bundle", () => {
  const apiDir = fileURLToPath(new URL("../../", import.meta.url));
  const distDir = path.join(apiDir, "dist");

  it("bundles crypto dependencies instead of relying on workspace node_modules", async () => {
    const source = await readFile(path.join(distDir, "index.cjs"), "utf8");
    expect(/require\(["']bech32["']\)/.test(source), "bech32 must be bundled").toBe(false);
    expect(/require\(["']@noble\/hashes(?:\/[^"']*)?["']\)/.test(source), "@noble/hashes must be bundled").toBe(false);
  });

  it("loads every startup import outside the workspace without contacting a database", async () => {
    const isolated = await mkdtemp(path.join(tmpdir(), "api-bundle-smoke-"));
    try {
      await copyFile(path.join(distDir, "index.cjs"), path.join(isolated, "index.cjs"));
      // The only external packages allowed are the explicitly packaged native assets.
      await symlink(path.join(distDir, "vendor"), path.join(isolated, "vendor"), "dir");
      const result = spawnSync(process.execPath, [path.join(isolated, "index.cjs")], {
        cwd: isolated,
        env: {
          PATH: process.env.PATH,
          NODE_ENV: "production",
          NODE_PATH: path.join(isolated, "vendor"),
          DATABASE_URL: "postgresql://fixture:fixture@127.0.0.1:1/fixture",
          // Deliberately omit PORT/API_PORT: stop after imports, before DB bootstrap.
        },
        encoding: "utf8",
        timeout: 15000,
      });
      expect(result.error).toBeUndefined();
      expect(result.stderr).not.toContain("MODULE_NOT_FOUND");
      expect(result.stderr).toContain("API_PORT (or PORT) environment variable is required");
      expect(result.status).toBe(1);
    } finally {
      await rm(isolated, { recursive: true, force: true });
    }
  });
});
