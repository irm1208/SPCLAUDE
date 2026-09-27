import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { expect, it } from "vitest";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));

it("preserves AbortSignal names when bundling the storage SDK's fetch dependencies", async () => {
  const buildSource = await readFile(path.join(here, "../build.ts"), "utf8");
  const sdkPath = require.resolve("@replit/object-storage");
  const dependencyPaths = { paths: [path.dirname(sdkPath)] };
  const abortController = require.resolve("abort-controller", dependencyPaths);
  const nodeFetch = require.resolve("node-fetch", dependencyPaths);

  const bundled = await build({
    stdin: {
      contents: `
        const { AbortController } = require(${JSON.stringify(abortController)});
        const { Request } = require(${JSON.stringify(nodeFetch)});
        new Request("https://example.com", { signal: new AbortController().signal });
      `,
      resolveDir: here,
    },
    bundle: true,
    platform: "node",
    format: "cjs",
    minify: true,
    keepNames: /\bkeepNames:\s*true\b/.test(buildSource),
    write: false,
    logLevel: "silent",
  });

  expect(() => new Function("require", bundled.outputFiles[0].text)(require)).not.toThrow();
});