import { access, readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const excludedDirectories = new Set([".git", "node_modules", "dist", "coverage"]);
const excludedExtensions = new Set([".zip", ".tar", ".tgz", ".gz", ".bz2", ".xz", ".7z"]);
const requiredFiles = [
  "package.json",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  "vitest.workspace.ts",
];
const forbidden = [
  { label: "parent product name", pattern: /\bsalt\s*(?:&|and)\s*peps\b/i },
  { label: "parent product name", pattern: /\bpeps[-_ ]anonymous\b/i },
  { label: "parent product name", pattern: /\bpeps\b/i },
  { label: "parent workspace import", pattern: /@workspace\/(?:api-server|db|shipping|api-zod)\b/i },
  { label: "parent artifact import", pattern: /artifacts\/(?:api-server|peps-anonymous)\b/i },
  { label: "private key", pattern: /-----BEGIN(?: [A-Z]+)* PRIVATE KEY-----/i },
  { label: "seed phrase", pattern: /\b(?:seed phrase|mnemonic)\s*[:=]\s*\S+/i },
];
const placeholderDatabaseUrl = "postgresql://user:password@localhost:5432/crypto_payments";
const credentialAssignment =
  /\b(?:api[_-]?key|secret|token|password|private[_-]?key)\b\s*=\s*(?!["']?(?:replace-with-[a-z-]+|undefined|null|process\.env\b))["']?([^\s"'`]+)/gi;

async function exists(path) {
  await access(path);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(entries.map(async (entry) => {
    if (excludedDirectories.has(entry.name)) return [];

    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walk(path);
    if (excludedExtensions.has(extname(entry.name))) return [];
    return [path];
  }));

  return paths.flat();
}

for (const requiredFile of requiredFiles) {
  try {
    await exists(join(root, requiredFile));
  } catch {
    throw new Error(`Standalone workspace is incomplete: missing ${requiredFile}`);
  }
}

const files = await walk(root);
let checkedFiles = 0;

for (const file of files) {
  if (file.endsWith("assert-standalone.mjs")) continue;
  if (relative(root, file) === ".env") {
    throw new Error("Standalone workspace must not include a .env file");
  }

  const text = await readFile(file, "utf8").catch(() => "");
  checkedFiles += 1;

  for (const { label, pattern } of forbidden) {
    if (pattern.test(text)) {
      throw new Error(`Forbidden ${label} in ${relative(root, file)}`);
    }
  }

  const databaseUrls = text.matchAll(/(?:^|\n)\s*DATABASE_URL\s*=\s*(\S+)/g);
  for (const match of databaseUrls) {
    if (match[1] !== placeholderDatabaseUrl) {
      throw new Error(`Non-placeholder database URL in ${relative(root, file)}`);
    }
  }

  credentialAssignment.lastIndex = 0;
  const credential = credentialAssignment.exec(text);
  if (credential) {
    throw new Error(`Likely credential assignment in ${relative(root, file)}`);
  }
}

console.log(`Standalone boundary verified across ${checkedFiles} files`);