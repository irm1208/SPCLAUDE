import assert from "node:assert/strict";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { assertSafeSourceTree } from "./source-archive.mjs";

async function fixture(files = {}) {
  const root = await mkdtemp(join(tmpdir(), "open-crypto-checkout-archive-"));
  for (const [name, content] of Object.entries(files)) {
    const path = join(root, name);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, content);
  }
  return root;
}

test("accepts a small allowlisted source tree", async () => {
  const root = await fixture({ "package.json": "{}", "README.md": "# kit", "apps/web/src/main.tsx": "export {}" });
  await assert.doesNotReject(() => assertSafeSourceTree(root));
});

for (const [name, content] of [
  [".env", `DATABASE_URL=${["post", "gres://real-host/prod"].join("")}`],
  ["node_modules/package/index.js", "module.exports = {}"],
  [".git/config", "[core]"],
  ["apps/api/dist/index.js", "compiled"],
  ["coverage/lcov.info", "coverage"],
  ["README.md", ["Pe", "ps"].join("") + " branded integration"],
  ["config.ts", `DATABASE_URL=${["post", "gres://user:password@database.example.com/prod"].join("")}`],
  ["config.ts", `const key = '${["sk", "live_abcdefghijklmnopqrstuv"].join("_")}'`],
  ["unexpected-large.bin", "x".repeat(1_048_577)],
]) {
  test(`rejects prohibited archive content: ${name}`, async () => {
    const root = await fixture({ "package.json": "{}", [name]: content });
    await assert.rejects(() => assertSafeSourceTree(root));
  });
}

test("rejects symbolic links", async () => {
  const root = await fixture({ "package.json": "{}" });
  await symlink(join(root, "package.json"), join(root, "linked-package.json"));
  await assert.rejects(() => assertSafeSourceTree(root));
});

test("rejects traversal imports", async () => {
  const root = await fixture({
    "package.json": "{}",
    "apps/web/src/main.ts": `import escaped from "${["..", "..", "..", "outside"].join("/")}";`,
  });
  await assert.rejects(() => assertSafeSourceTree(root));
});