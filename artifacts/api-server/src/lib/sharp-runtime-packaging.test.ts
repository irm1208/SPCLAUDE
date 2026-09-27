import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { afterAll, describe, expect, it } from "vitest";
import { copySharpRuntimePackages } from "./sharp-runtime-packaging";

const require = createRequire(import.meta.url);
const apiServerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tempDirs: string[] = [];

afterAll(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("production sharp packaging", () => {
  it("bundles sharp and includes native runtime files needed by the compiled CJS output", async () => {
    const buildSource = await readFile(path.join(apiServerDir, "build.ts"), "utf8");
    const allowlist = buildSource.match(/const allowlist = \[([\s\S]*?)\];/)?.[1] ?? "";
    expect(allowlist).toContain('"sharp"');
    const productionRunner = await readFile(path.join(apiServerDir, "../../scripts/start-prod.sh"), "utf8");
    const artifactConfig = await readFile(path.join(apiServerDir, ".replit-artifact/artifact.toml"), "utf8");
    expect(productionRunner).toContain("dist/vendor");
    expect(artifactConfig).toContain('NODE_PATH = "artifacts/api-server/dist/vendor"');

    const outputDir = await mkdtemp(path.join(os.tmpdir(), "api-sharp-bundle-"));
    tempDirs.push(outputDir);
    const outfile = path.join(outputDir, "index.cjs");
    const result = await build({
      entryPoints: [path.join(path.dirname(fileURLToPath(import.meta.url)), "lab-cert-storage.ts")],
      bundle: true,
      platform: "node",
      format: "cjs",
      outfile,
      minify: true,
      keepNames: true,
      define: {
        "process.env.NODE_ENV": '"production"',
        "import.meta.url": "__bundleFileUrl",
      },
      banner: { js: 'const __bundleFileUrl = require("node:url").pathToFileURL(__filename).href;' },
      logLevel: "silent",
    });
    await copySharpRuntimePackages(apiServerDir, outputDir);

    const compiled = await readFile(outfile, "utf8");
    expect(compiled).not.toMatch(/(?:import|require)\(["']sharp["']\)/);
    expect(result.errors).toHaveLength(0);

    const sharp = require("sharp") as typeof import("sharp").default;
    const png = await sharp({
      create: { width: 1200, height: 1200, channels: 3, background: "#f00" },
    }).png().toBuffer();
    const runtime = spawnSync(
      process.execPath,
      [
        "-e",
        `const { prepareCertificateForStorage } = require(process.argv[1]);
         prepareCertificateForStorage(Buffer.from(process.argv[2], "base64"))
           .then((result) => console.log(JSON.stringify({
             changed: result.changed, mime: result.mime,
             magic: result.bytes.toString("ascii", 8, 12),
           })))
           .catch((error) => { console.error(error); process.exitCode = 1; });`,
        outfile,
        png.toString("base64"),
      ],
      {
        encoding: "utf8",
        env: { ...process.env, NODE_PATH: path.join(outputDir, "vendor") },
      },
    );
    expect(runtime.status, runtime.stderr).toBe(0);
    expect(JSON.parse(runtime.stdout)).toEqual({ changed: true, mime: "image/webp", magic: "WEBP" });
  });
});