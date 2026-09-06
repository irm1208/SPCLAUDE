import { access, readFile, readdir } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { escapesStandaloneRoot } from "./standalone-boundary-utils.mjs";

const root = resolve(process.argv[2] ?? fileURLToPath(new URL("../", import.meta.url)));
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
const databaseUrl = /\bpostgres(?:ql)?:\/\/[^\s"'`\\)\]}>,]+/gi;
const jwt = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{6,}\b/g;
const assignment = /(?:\b(?:const|let|var)\s+)?["']?([A-Za-z_$][\w$-]*)["']?\s*(?::|=)\s*([^,\n;}\]]+)/g;
const secretLikeValue = /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9_-]{16,}\b|\b(?:ghp|github_pat|xox[bap])_[A-Za-z0-9_-]{16,}\b|\bAKIA[A-Z0-9]{16}\b/g;

function isPlaceholder(value) {
  const normalized = value.trim().replace(/^["']|["']$/g, "");
  return /^(?:replace-with-[a-z0-9-]+|<[^>\n]+>|process\.env(?:\.[A-Z0-9_]+|\[[^\]]+\])|undefined|null)$/i.test(normalized);
}

function isSensitiveName(name) {
  const normalized = name.replace(/[_-]/g, "").toLowerCase();
  return /(?:apikey|secret|password|privatekey|seed|mnemonic)/.test(normalized)
    || /^(?:access|api|auth|bearer)token$/.test(normalized)
    || normalized.endsWith("merchantkey")
    || normalized.endsWith("webhookkey");
}

async function exists(path) {
  await access(path);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(entries.map(async (entry) => {
    if (entry.isSymbolicLink()) {
      throw new Error(`Symbolic links are not allowed: ${join(directory, entry.name)}`);
    }
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
  const fileName = basename(file);
  if (fileName.startsWith(".env") && fileName !== ".env.example") {
    throw new Error(`Standalone workspace must not include ${relative(root, file)}`);
  }

  const text = await readFile(file, "utf8").catch(() => "");
  checkedFiles += 1;

  for (const { label, pattern } of forbidden) {
    if (pattern.test(text)) {
      throw new Error(`Forbidden ${label} in ${relative(root, file)}`);
    }
  }

  const databaseUrls = text.matchAll(databaseUrl);
  for (const match of databaseUrls) {
    if (match[0] !== placeholderDatabaseUrl) {
      throw new Error(`Non-placeholder database URL in ${relative(root, file)}`);
    }
  }

  if (jwt.test(text)) {
    throw new Error(`JWT-shaped value in ${relative(root, file)}`);
  }

  if (secretLikeValue.test(text)) {
    throw new Error(`Secret-like high-entropy value in ${relative(root, file)}`);
  }

  assignment.lastIndex = 0;
  for (const match of text.matchAll(assignment)) {
    if (isSensitiveName(match[1]) && !isPlaceholder(match[2])) {
      throw new Error(`Likely credential assignment in ${relative(root, file)}`);
    }
  }

  for (const match of text.matchAll(/(["'`])(\.\.?[\\/][^"'`]*)\1/g)) {
    const path = resolve(dirname(file), match[2].replaceAll("\\", "/"));
    const pathFromRoot = relative(root, path);
    if (escapesStandaloneRoot(pathFromRoot)) {
      throw new Error(`Path escapes standalone workspace in ${relative(root, file)}`);
    }
  }

  for (const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(|\brequire\s*\()\s*(["'`])([^"'`]+)\1/g)) {
    const specifier = match[2].replaceAll("\\", "/");
    if (specifier.startsWith("/") || /^[A-Za-z]:\//.test(specifier)) {
      throw new Error(`Absolute import path in ${relative(root, file)}`);
    }
  }
}

console.log(`Standalone boundary verified across ${checkedFiles} files`);