import { createGzip } from "node:zlib";
import { createWriteStream } from "node:fs";
import { lstat, mkdir, readdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { basename, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const forbiddenDirectories = new Set([".git", "node_modules", "dist", "coverage"]);
const allowedTopLevelDirectories = new Set(["apps", "packages", "examples", "scripts"]);
const allowedTopLevelFiles = new Set([".env.example", ".gitignore", "LICENSE", "README.md", "API.md", "NETWORKS.md", "PRODUCTION.md", "SECURITY.md", "TROUBLESHOOTING.md", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.base.json", "vitest.workspace.ts"]);
const archiveExtensions = new Set([".zip", ".tar", ".tgz", ".gz", ".bz2", ".xz", ".7z"]);
const maximumFileBytes = 1_048_576;
const textExtensions = new Set(["", ".json", ".md", ".mjs", ".cjs", ".js", ".ts", ".tsx", ".css", ".html", ".yaml", ".yml", ".sql", ".txt"]);

const failure = (message) => { throw new Error(`Unsafe source archive: ${message}`); };
const suspicious = [
  ["parent branding", new RegExp(`\\b${["Pe", "ps"].join("")}\\b`, "i")],
  ["parent workspace import", /@workspace\/(?:api-server|db|shipping|api-zod)\b/i],
  ["private key", /-----BEGIN(?: [A-Z]+)* PRIVATE KEY-----/i],
  ["likely secret", /\b(?:sk|pk|rk)_live_[A-Za-z0-9_-]{16,}\b|\b(?:ghp|github_pat|xox[bap])_[A-Za-z0-9_-]{16,}\b|\bAKIA[A-Z0-9]{16}\b/],
  ["real database URL", /\bpostgres(?:ql)?:\/\/(?!user:password@localhost:5432\/crypto_payments)[^\s"'`\\)\]}>,]+/i],
];

async function scanSourceTree(root, skipGeneratedDirectories) {
  const sourceRoot = resolve(root);
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const fullPath = join(directory, entry.name);
      const pathFromRoot = relative(sourceRoot, fullPath);
      if (entry.isSymbolicLink()) failure(`symbolic link ${pathFromRoot}`);
      if (directory === sourceRoot && !allowedTopLevelDirectories.has(entry.name) && !allowedTopLevelFiles.has(entry.name) && !forbiddenDirectories.has(entry.name)) {
        failure(`file or directory outside the archive allowlist: ${pathFromRoot}`);
      }
      if (entry.isDirectory()) {
        if (forbiddenDirectories.has(entry.name)) {
          if (skipGeneratedDirectories) continue;
          failure(`prohibited directory ${pathFromRoot}`);
        }
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile()) failure(`unexpected filesystem entry ${pathFromRoot}`);
      if (entry.name.startsWith(".env") && entry.name !== ".env.example") failure(`environment file ${pathFromRoot}`);
      if (archiveExtensions.has(extname(entry.name))) failure(`nested archive ${pathFromRoot}`);
      const stats = await lstat(fullPath);
      if (stats.size > maximumFileBytes) failure(`large unexpected file ${pathFromRoot}`);
      if (entry.name !== ".env.example" && !textExtensions.has(extname(entry.name))) failure(`unexpected file type ${pathFromRoot}`);
      const text = await readFile(fullPath, "utf8");
      // The boundary scanner necessarily contains the forbidden-pattern literals
      // it checks for; scan every archived source file except that checker itself.
      if (pathFromRoot !== "scripts/assert-standalone.mjs") {
        for (const [label, pattern] of suspicious) if (pattern.test(text)) failure(`${label} in ${pathFromRoot}`);
      }
      if (/(?:from\s*|require\s*\(|import\s*\()\s*["'](?:\.\.\/){2,}/.test(text)) failure(`path traversal import in ${pathFromRoot}`);
      files.push(pathFromRoot);
    }
  }
  await walk(sourceRoot);
  return files.sort();
}

export function assertSafeSourceTree(root) {
  return scanSourceTree(root, false);
}

export async function createSourceArchive(root, output) {
  // Local dependency/build directories are never archive inputs. The exported
  // validator remains strict so tests and CI can reject them where appropriate.
  const files = await scanSourceTree(root, true);
  await mkdir(resolve(output, ".."), { recursive: true });
  const tar = spawn("tar", ["--sort=name", "--mtime=@0", "--owner=0", "--group=0", "--numeric-owner", "-cf", "-", ...files], {
    cwd: root, stdio: ["ignore", "pipe", "pipe"],
  });
  const gzip = createGzip({ mtime: 0 });
  const destination = createWriteStream(output);
  tar.stdout.pipe(gzip).pipe(destination);
  const stderr = [];
  tar.stderr.on("data", (data) => stderr.push(data));
  await new Promise((resolvePromise, reject) => {
    tar.on("error", reject);
    tar.on("close", (code) => code === 0 ? resolvePromise() : reject(new Error(Buffer.concat(stderr).toString() || `tar exited ${code}`)));
    destination.on("error", reject);
  });
  return output;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? fileURLToPath(new URL("../", import.meta.url)));
  const output = resolve(process.argv[3] ?? join(root, "..", "..", "deliverables", "open-crypto-checkout-v1.0.0.tar.gz"));
  await createSourceArchive(root, output);
  console.log(`Created deterministic source archive: ${output}`);
}