import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatedApiPath = resolve(__dirname, "../api-zod/src/generated/api.ts");
const generatedApi = readFileSync(generatedApiPath, "utf8");
const zod3CompatibleApi = generatedApi
  .replace(/\bzod\.int\(\)/g, "zod.number().int()")
  .replace(/\bzod\.url\(\)/g, "zod.string().url()");

if (zod3CompatibleApi !== generatedApi) {
  writeFileSync(generatedApiPath, zod3CompatibleApi);
  console.log("postprocess: converted root validators to Zod 3-compatible schemas");
}

const generatedTypesIndexPath = resolve(__dirname, "../api-zod/src/generated/types/index.ts");
const generatedTypesIndex = readFileSync(generatedTypesIndexPath, "utf8");
const uniqueGeneratedTypesIndex = generatedTypesIndex.replace(
  /^export \* from ['"]\.\/(?:adminAddLabTestBody|adminUpdateLabTestBody|adminUpdateTicketStatusBody)['"];?\n?/gm,
  "",
);

if (uniqueGeneratedTypesIndex !== generatedTypesIndex) {
  writeFileSync(generatedTypesIndexPath, uniqueGeneratedTypesIndex);
  console.log("postprocess: removed types already exported as Zod schemas");
}

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
