import assert from "node:assert/strict";
import { cp, mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { spawnSync } from "node:child_process";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const scanner = join(scriptsDirectory, "assert-standalone.mjs");

async function createFixture(file, contents) {
  const root = await mkdtemp(join(tmpdir(), "crypto-boundary-"));
  await mkdir(join(root, "scripts"));
  await cp(scanner, join(root, "scripts", "assert-standalone.mjs"));
  await Promise.all([
    writeFile(join(root, "package.json"), "{}"),
    writeFile(join(root, "pnpm-workspace.yaml"), "packages: []\n"),
    writeFile(join(root, "tsconfig.base.json"), "{}"),
    writeFile(join(root, "vitest.workspace.ts"), "export default [];\n"),
  ]);
  await mkdir(dirname(join(root, file)), { recursive: true });
  await writeFile(join(root, file), contents);
  return root;
}

async function expectRejected(name, file, contents) {
  const root = await createFixture(file, contents);
  try {
    const result = spawnSync(process.execPath, [join(root, "scripts", "assert-standalone.mjs")], {
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0, `${name} was accepted:\n${result.stdout}${result.stderr}`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

for (const envFile of [".env", ".env.local", ".env.production"]) {
  test(`rejects ${envFile}`, async () => {
    await expectRejected(envFile, envFile, "VALUE=replace-with-placeholder\n");
  });
}

test("rejects PostgreSQL URLs in JavaScript, JSON, and dotenv", async () => {
  const url = ["post", "gresql://merchant:actual-password@db.example/payments"].join("");
  for (const [file, contents] of [
    ["src/config.js", `export const connection = "${url}";\n`],
    ["config.json", JSON.stringify({ connection: url })],
    ["settings.env.example", `CONNECTION=${url}\n`],
  ]) {
    await expectRejected(file, file, contents);
  }
});

test("rejects JSON credentials, JWTs, and assignment credentials", async () => {
  const jwt = [
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
    "eyJzdWIiOiJtZXJjaGFudCJ9",
    "signature-value",
  ].join(".");
  const credentialProperty = ["api", "Key"].join("");
  await expectRejected(
    "JSON credential",
    "config.json",
    JSON.stringify({ [credentialProperty]: "live-value" }),
  );
  await expectRejected("JWT", "src/config.js", `export default "${jwt}";\n`);
  await expectRejected(
    "secret assignment",
    "src/config.js",
    `const ${["webhook", "Secret"].join("")} = "actual-value";\n`,
  );
});

test("allows public token metadata and rejects credential-bearing token values", async () => {
  const publicMetadata = [
    'export const asset = { token: "USDC", tokenAddress: "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", mint: "ExampleMintAddress" };',
    'const registryToken = "USDT";',
  ].join("\n");
  const acceptedRoot = await createFixture("src/networks.js", publicMetadata);
  try {
    const accepted = spawnSync(process.execPath, [join(acceptedRoot, "scripts", "assert-standalone.mjs")], {
      encoding: "utf8",
    });
    assert.equal(accepted.status, 0, accepted.stderr);
  } finally {
    await rm(acceptedRoot, { recursive: true, force: true });
  }

  for (const name of [["access", "Token"].join(""), ["api", "Token"].join(""), ["auth", "Token"].join("")]) {
    await expectRejected(name, "src/config.js", `const ${name} = "actual-value";\n`);
  }
});

test("rejects secret-like high-entropy values", async () => {
  const value = ["sk", "live", "a1b2c3d4e5f6g7h8i9j0k1l2"].join("_");
  await expectRejected("secret-like value", "src/config.js", `export default "${value}";\n`);
});

test("rejects seed, mnemonic, and private-key assignments", async () => {
  for (const name of ["seed", "mnemonic", ["private", "Key"].join("")]) {
    await expectRejected(name, "src/config.js", `const ${name} = "actual-value";\n`);
  }
});

test("rejects relative paths that resolve outside the artifact", async () => {
  const outside = ["..", "..", "outside.js"].join("/");
  await expectRejected("escaping relative import", "src/config.js", `import outside from "${outside}";\n`);
  await expectRejected("escaping relative JSON path", "src/config.json", `{"extends":"${outside}"}`);
});

test("rejects Windows separators, absolute imports, backtick imports, and symlinks", async () => {
  const windowsOutside = ["..", "..", "outside.js"].join("\\");
  const absolute = ["C:", "outside.js"].join("\\");
  const outside = ["..", "..", "outside.js"].join("/");
  const quote = String.fromCharCode(96);
  await expectRejected("Windows path", "src/config.js", `import outside from "${windowsOutside}";\n`);
  await expectRejected("absolute path", "src/config.js", `const outside = require("${absolute}");\n`);
  await expectRejected(
    "backtick import",
    "src/config.js",
    `const outside = import(${quote}${outside}${quote});\n`,
  );

  const root = await createFixture("src/config.js", "export default {};\n");
  try {
    await symlink(join(tmpdir(), "outside"), join(root, "linked-file"));
    const result = spawnSync(process.execPath, [join(root, "scripts", "assert-standalone.mjs")], {
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0, `symlink was accepted:\n${result.stdout}${result.stderr}`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("allows documented inert placeholders and paths that stay inside the artifact", async () => {
  const root = await createFixture(
    "src/config.js",
    [
      'import config from "../vitest.workspace.ts";',
      'const apiKey = "replace-with-a-new-random-value";',
      'const connection = "postgresql://user:password@localhost:5432/crypto_payments";',
      "export { config, apiKey, connection };",
    ].join("\n"),
  );
  try {
    const result = spawnSync(process.execPath, [join(root, "scripts", "assert-standalone.mjs")], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});