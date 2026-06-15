import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexPath = resolve(__dirname, "../api-zod/src/index.ts");
const content = readFileSync(indexPath, "utf8");

// Orval generates both api.ts (Zod validators) and types/ (TypeScript interfaces)
// with the same export names (e.g. AdminAddLabTestBody). Re-exporting both causes
// TS2308 ambiguity. Zod validators already carry full type information via z.infer<>,
// so the types/ barrel is redundant and we simply drop it.
const fixed = content
  .replace(/^export \* from ".\/generated\/types";\n?/m, "")
  .replace(/^export type \* from ".\/generated\/types";\n?/m, "");

if (fixed !== content) {
  writeFileSync(indexPath, fixed);
  console.log("postprocess: removed redundant types barrel from api-zod/src/index.ts");
} else {
  console.log("postprocess: api-zod/src/index.ts already correct");
}
