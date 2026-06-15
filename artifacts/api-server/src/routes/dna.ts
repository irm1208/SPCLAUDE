import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { dnaProfilesTable } from "@workspace/db";
import { requireAccount } from "../middleware/account-auth";
import { SNP_MAP, callGenotype } from "@workspace/snp-database";
import type { DnaVariantResult } from "@workspace/db";

const router = Router();

// ─── File parser ──────────────────────────────────────────────────────────────

type RawSnp = { rsid: string; genotype: string };

function parse23AndMe(text: string): { snps: RawSnp[]; format: string } {
  const lines = text.split(/\r?\n/);
  const snps: RawSnp[] = [];
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const parts = line.split("\t");
    if (parts.length < 4) continue;
    const rsid = (parts[0] ?? "").trim().toLowerCase();
    const genotype = (parts[3] ?? "").trim();
    if (rsid.startsWith("rs") && genotype && genotype !== "--") {
      snps.push({ rsid, genotype });
    }
  }
  return { snps, format: "23andme" };
}

function parseMyHeritage(text: string): { snps: RawSnp[]; format: string } {
  const lines = text.split(/\r?\n/);
  const snps: RawSnp[] = [];
  let headerSkipped = false;
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    if (!headerSkipped) {
      headerSkipped = true;
      continue;
    }
    const parts = line.split(",").map(p => p.replace(/^"|"$/g, "").trim());
    const rsid = (parts[0] ?? "").toLowerCase();
    const genotype = parts[3] ?? parts[4] ?? "";
    if (rsid.startsWith("rs") && genotype && genotype !== "--") {
      snps.push({ rsid, genotype });
    }
  }
  return { snps, format: "myheritage" };
}

function detectAndParse(content: string): { snps: RawSnp[]; format: string } {
  const firstRealLine = content.split(/\r?\n/).find(l => l && !l.startsWith("#")) ?? "";
  if (firstRealLine.toLowerCase().includes("rsid") && firstRealLine.includes(",")) {
    return parseMyHeritage(content);
  }
  return parse23AndMe(content);
}

// ─── POST /api/dna/upload ─────────────────────────────────────────────────────

router.post("/dna/upload", requireAccount, async (req, res): Promise<void> => {
  const { content } = req.body as { content?: string };
  if (typeof content !== "string" || content.length < 100) {
    res.status(400).json({ error: "Missing or invalid file content" });
    return;
  }
  if (content.length > 100 * 1024 * 1024) {
    res.status(413).json({ error: "File too large (100 MB max)" });
    return;
  }

  const tg = req.account!.telegramUsername;

  const { snps, format } = detectAndParse(content);

  const findings: DnaVariantResult[] = [];
  for (const { rsid, genotype } of snps) {
    const entry = SNP_MAP.get(rsid);
    if (!entry) continue;
    const result = callGenotype(entry, genotype);
    if (result.riskLevel === "neutral" && result.isHomozygousOther) continue;
    findings.push({
      rsid: entry.rsid,
      gene: entry.gene,
      genotype,
      riskLevel: result.riskLevel,
      category: entry.category,
      name: entry.name,
    });
  }

  await db
    .insert(dnaProfilesTable)
    .values({
      accountId: tg,
      fileFormat: format,
      snpCount: String(snps.length),
      findings,
      uploadedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: dnaProfilesTable.accountId,
      set: {
        fileFormat: format,
        snpCount: String(snps.length),
        findings,
        updatedAt: new Date(),
      },
    });

  res.json({
    ok: true,
    format,
    snpCount: snps.length,
    matchedCount: findings.length,
    findings,
  });
});

// ─── GET /api/dna/profile ─────────────────────────────────────────────────────

router.get("/dna/profile", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const rows = await db
    .select()
    .from(dnaProfilesTable)
    .where(eq(dnaProfilesTable.accountId, tg))
    .limit(1);

  if (rows.length === 0) {
    res.json({ exists: false });
    return;
  }
  const row = rows[0]!;
  res.json({ exists: true, profile: row });
});

// ─── DELETE /api/dna/profile ──────────────────────────────────────────────────

router.delete("/dna/profile", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  await db.delete(dnaProfilesTable).where(eq(dnaProfilesTable.accountId, tg));
  res.json({ ok: true });
});

export default router;
