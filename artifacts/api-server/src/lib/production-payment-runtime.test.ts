import { mkdtemp, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { expect, it } from "vitest";

it("loads blockchain payment dependencies without workspace node_modules", async () => {
  const apiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const source = await readFile(path.join(apiDir, "build.ts"), "utf8");
  const bundled = [...(source.match(/const allowlist = \[([\s\S]*?)\];/)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map(m => m[1]);
  const pkg = JSON.parse(await readFile(path.join(apiDir, "package.json"), "utf8"));
  const external = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.devDependencies)]
    .filter(dep => !bundled.includes(dep) && !pkg.dependencies[dep]?.startsWith("workspace:"));
  const dir = await mkdtemp(path.join(os.tmpdir(), "payment-runtime-"));
  try {
    const outfile = path.join(dir, "payment.cjs");
    await build({
      stdin: { contents: `
        const { PublicKey, Transaction } = require("@solana/web3.js");
        const bs58 = require("bs58").default;
        const { verifySolanaStablecoinPayment } = require("./src/lib/solana-payment-verify.ts");
        const bytes = new Uint8Array(32);
        const key = new PublicKey(bytes);
        if (new PublicKey(bs58.encode(bytes)).toBase58() !== key.toBase58()) throw new Error("Key mismatch");
        if (typeof verifySolanaStablecoinPayment !== "function") throw new Error("Verifier unavailable");
        if (!new Transaction()) throw new Error("Transaction unavailable");
        console.log("payment-runtime-ok");
      `, resolveDir: apiDir },
      outfile, bundle: true, platform: "node", format: "cjs",
      minify: true, keepNames: true, external, logLevel: "silent",
    });
    const runtime = spawnSync(process.execPath, [outfile], {
      cwd: dir, encoding: "utf8", timeout: 10000,
      env: { ...process.env, NODE_PATH: "", NODE_OPTIONS: "" },
    });
    expect(runtime.status, runtime.stderr).toBe(0);
    expect(runtime.stdout).toContain("payment-runtime-ok");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
