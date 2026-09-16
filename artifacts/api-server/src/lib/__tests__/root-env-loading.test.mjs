import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const apiServerPackagePath = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../package.json",
);
const frontendPackagePath = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../peps-anonymous/package.json",
);
const startScriptPath = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../../start.sh",
);

async function readScripts(packagePath) {
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  return packageJson.scripts ?? {};
}

test("the API development script loads the root env file", async () => {
  const scripts = await readScripts(apiServerPackagePath);

  assert.match(scripts.dev, /node --env-file=\.\.\/\.\.\/\.env/);
});

test("the development launcher pins the API port separately from the frontend port", async () => {
  const startScript = await readFile(startScriptPath, "utf8");

  assert.match(startScript, /export API_PORT="\$\{API_PORT:-8080\}"/);
});

for (const scriptName of ["dev", "build", "serve"]) {
  test(`the frontend ${scriptName} script loads the root env file`, async () => {
    const scripts = await readScripts(frontendPackagePath);

    assert.match(scripts[scriptName], /node --env-file=\.\.\/\.\.\/\.env/);
  });
}
