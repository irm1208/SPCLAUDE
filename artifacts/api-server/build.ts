import path from "path";
import { fileURLToPath } from "url";
import { build as esbuild } from "esbuild";
import { rm, readFile } from "fs/promises";
import { copySharpRuntimePackages } from "./src/lib/sharp-runtime-packaging.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times without risking some
// packages that are not bundle compatible
const allowlist = [
  "@google/generative-ai",
  "@replit/connectors-sdk",
  "@replit/object-storage",
  "@solana/web3.js",
  "axios",
  "bcryptjs",
  "bs58",
  "connect-pg-simple",
  "cookie-parser",
  "cors",
  "date-fns",
  "dotenv",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "file-type",
  "helmet",
  "http-proxy-middleware",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "sharp",
  "stripe",
  "uuid",
  "ws",
  "exceljs",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  const distDir = path.resolve(__dirname, "dist");
  await rm(distDir, { recursive: true, force: true });

  console.log("building server...");
  const pkgPath = path.resolve(__dirname, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter(
    (dep) =>
      !allowlist.includes(dep) &&
      !(pkg.dependencies?.[dep]?.startsWith("workspace:")),
  );

  await esbuild({
    entryPoints: [path.resolve(__dirname, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: path.resolve(distDir, "index.cjs"),
    define: {
      "process.env.NODE_ENV": '"production"',
      "import.meta.url": "__bundleFileUrl",
    },
    banner: {
      js: 'const __bundleFileUrl = require("node:url").pathToFileURL(__filename).href;',
    },
    minify: true,
    // node-fetch v2 validates signal.constructor.name; esbuild must preserve AbortSignal.
    keepNames: true,
    external: externals,
    logLevel: "info",
  });

  // sharp's JavaScript is bundled above, but its platform-specific native
  // bindings and libvips shared library must accompany the standalone bundle.
  await copySharpRuntimePackages(__dirname, distDir);
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
