export interface PeptideGroup {
  canonical: string;
  displayName: string;
  aliases: string[];
  mgSpecific?: boolean;
  dbSearchTerms?: string[];
}

export const PEPTIDE_GROUPS: PeptideGroup[] = [
  {
    canonical: "BPC-157",
    displayName: "BPC-157",
    aliases: [
      "BPC-157", "BPC157", "bpc-157", "bpc157",
      "Body Protective Compound", "BPC 157", "BPC-15",
      "Pentadecapeptide BPC-157",
    ],
    dbSearchTerms: ["BPC-157"],
  },
  {
    canonical: "BPC-157 + TB-500",
    displayName: "BPC-157 + TB-500 Blend",
    aliases: [
      "TB4 + BPC-157", "BPC-157 + TB4", "BPC157 TB4", "TB4+BPC-157",
      "BPC-157 + TB-500", "TB-500 + BPC-157", "BPC157 TB500", "TB500 BPC157",
      "BPC-157, TB-500 (TB4)", "BPC TB blend", "TB BPC blend",
    ],
    dbSearchTerms: ["TB4 + BPC-157", "BPC-157, TB-500 (TB4)"],
  },
  {
    canonical: "BPC-157 + TB4 + Frag",
    displayName: "BPC-157 + TB-500 + Frag Blend",
    aliases: [
      "BPC-157 + TB4 + Frag", "TB4 + BPC-157 + Frag",
      "BPC TB Frag", "TB4 + BPC-157 + Frag 176-191",
      "BPC-157 + TB-500 + Frag", "BPC-157 + TB-500 + Frag 176-191",
    ],
    dbSearchTerms: ["BPC-157 + TB4 + Frag", "TB4 + BPC-157 + Frag"],
  },
  {
    canonical: "TB4 + Frag 176-191",
    displayName: "TB-500 + Frag 176-191 Blend",
    aliases: [
      "TB4 + Frag 176-191", "TB-500 + Frag", "TB4 + Frag",
      "TB500 Frag", "Frag + TB4", "Frag + TB-500",
      "TB-500 + Frag 176-191",
    ],
    dbSearchTerms: ["TB4 + Frag 176-191"],
  },
  {
    canonical: "TB-500",
    displayName: "TB-500",
    aliases: [
      "TB-500", "TB500", "tb-500", "tb500",
      "Thymosin Beta-4", "Thymosin Beta 4", "TB 500",
      "TB4", "TB-4", "tb4", "tb-4",
    ],
    dbSearchTerms: ["TB-500", "TB-500 (TB4)"],
  },
  {
    canonical: "Semaglutide",
    displayName: "Semaglutide",
    aliases: [
      "Semaglutide", "Sema", "Ozempic", "Wegovy", "Rybelsus",
      "Semaglutide 10mg", "Semaglutide 5mg",
    ],
    mgSpecific: true,
  },
  {
    canonical: "Tirzepatide",
    displayName: "Tirzepatide",
    aliases: [
      "Tirzepatide", "Tir10mg", "Tir15mg",
      "Tirzepatide 30mg", "Tirzepatide 60mg",
      "TIR", "tir", "Mounjaro", "Zepbound",
    ],
    mgSpecific: true,
  },
  {
    canonical: "Retatrutide",
    displayName: "Retatrutide",
    aliases: [
      "Retatrutide", "LY3437943", "LY-3437943", "Retatrutide 10mg",
    ],
    mgSpecific: true,
  },
  {
    canonical: "Cagrilintide",
    displayName: "Cagrilintide",
    aliases: [
      "Cagrilintide", "Cagrilintide 5mg", "CagriSema",
    ],
  },
  {
    canonical: "5-Amino-1MQ",
    displayName: "5-Amino-1MQ",
    aliases: [
      "5-Amino-1MQ", "5-Amino 1MQ", "5-amino-1mq", "5amino1mq",
      "51Q", "5-Amino 1Q", "5-amino-1q", "5amino1q", "5-Amino",
      "5-Amino-1-methylquinolinium", "5Amino1MQ", "5 Amino 1MQ",
    ],
    dbSearchTerms: ["5-Amino-1-methylquinolinium", "51Q"],
  },
  {
    canonical: "NAD+",
    displayName: "NAD+",
    aliases: [
      "NAD+", "NAD", "NAD +", "NAD+ 500", "NAD + 500", "NAD+ 500-mg",
      "Nicotinamide adenine dinucleotide",
    ],
  },
  {
    canonical: "GHK-Cu",
    displayName: "GHK-Cu",
    aliases: [
      "GHK-Cu", "GHK-CU", "GHK Cu", "GHK-Copper",
      "Copper peptide", "GHK", "ghkcu", "ghkcopper",
    ],
    mgSpecific: true,
    dbSearchTerms: ["GHK-Cu", "GHK"],
  },
  {
    canonical: "PT-141",
    displayName: "PT-141",
    aliases: [
      "PT-141", "Pt141", "PT141", "Bremelanotide",
      "pt141", "pt-141",
    ],
  },
  {
    canonical: "MOTS-C",
    displayName: "MOTS-C",
    aliases: [
      "MOTS-C", "Mots-C", "MOTSC", "motsc", "MOTS C",
    ],
  },
  {
    canonical: "NA-Epitalon",
    displayName: "N-Acetyl Epitalon",
    aliases: [
      "NA-Epitalon", "N-Acetyl Epitalon", "NAEpitalon",
      "N-Acetyl Epithalon", "NA-Epithalon",
    ],
    dbSearchTerms: ["NA-Epitalon"],
  },
  {
    canonical: "Epitalon",
    displayName: "Epitalon",
    aliases: [
      "Epitalon", "Epithalon", "Epitalone",
      "Epithalamin", "Epitalamin",
    ],
    dbSearchTerms: ["Epitalon", "Epithalon"],
  },
  {
    canonical: "HGH",
    displayName: "HGH",
    aliases: [
      "HGH", "Hgh", "hgh", "Human Growth Hormone",
      "Growth Hormone", "Somatropin",
    ],
  },
  {
    canonical: "Sermorelin",
    displayName: "Sermorelin",
    aliases: [
      "Sermorelin", "SERMORELIN", "SERMORELIN 10MG",
      "GHRH analog", "Sermorelin Acetate",
    ],
  },
  {
    canonical: "Ipamorelin",
    displayName: "Ipamorelin",
    aliases: [
      "Ipamorelin", "ipamorelin", "IPA", "Ipa",
    ],
  },
  {
    canonical: "CJC-1295",
    displayName: "CJC-1295",
    aliases: [
      "CJC-1295", "CJC1295", "cjc-1295", "cjc1295",
      "CJC 1295", "CJC-1295 DAC", "CJC1295 DAC",
    ],
  },
  {
    canonical: "Hexarelin",
    displayName: "Hexarelin",
    aliases: [
      "Hexarelin", "hexarelin", "HEX",
    ],
  },
  {
    canonical: "GHRP-2",
    displayName: "GHRP-2",
    aliases: [
      "GHRP-2", "GHRP2", "ghrp-2", "ghrp2",
      "Growth Hormone Releasing Peptide 2",
    ],
  },
  {
    canonical: "GHRP-6",
    displayName: "GHRP-6",
    aliases: [
      "GHRP-6", "GHRP6", "ghrp-6", "ghrp6",
      "Growth Hormone Releasing Peptide 6",
    ],
  },
  {
    canonical: "Frag 176-191",
    displayName: "Frag 176-191",
    aliases: [
      "Frag 176-191", "Hgh frag 176-191", "HGH Frag 176-191",
      "Fragment 176-191", "Frag176191", "frag176191",
      "HGHfrag176191",
    ],
  },
  {
    canonical: "Survotudide",
    displayName: "Survotudide",
    aliases: ["Survotudide", "Survotudide 10mg"],
  },
  {
    canonical: "Glow",
    displayName: "Glow",
    aliases: ["Glow", "glow"],
  },
  {
    canonical: "K-Low",
    displayName: "K-Low",
    aliases: ["K-Low", "KLow", "K Low", "klow", "k-low"],
    dbSearchTerms: ["K-Low"],
  },
  {
    canonical: "Vesugen",
    displayName: "Vesugen",
    aliases: ["Vesugen", "vesugen"],
  },
  {
    canonical: "NA-Selank",
    displayName: "NA-Selank",
    aliases: [
      "NA-Selank", "N-Acetyl Selank Amidate", "N-Acetyl Selank",
      "NASelank",
    ],
    dbSearchTerms: ["NA-Selank", "N-Acetyl Selank Amidate"],
  },
  {
    canonical: "Selank",
    displayName: "Selank",
    aliases: ["Selank", "selank"],
    dbSearchTerms: ["Selank"],
  },
  {
    canonical: "NA-Semax",
    displayName: "NA-Semax",
    aliases: [
      "NA-Semax", "N-Acetyl Semax Amidate", "N-Acetyl Semax",
      "NASemax",
    ],
    dbSearchTerms: ["NA-Semax", "N-Acetyl Semax Amidate"],
  },
  {
    canonical: "Semax",
    displayName: "Semax",
    aliases: ["Semax", "semax"],
    dbSearchTerms: ["Semax"],
  },
  {
    canonical: "KPV",
    displayName: "KPV",
    aliases: [
      "KPV", "kpv", "Lys-Pro-Val",
    ],
  },
  {
    canonical: "Tesamorelin",
    displayName: "Tesamorelin",
    aliases: [
      "Tesamorelin", "TESAMORELIN", "Egrifta",
    ],
  },
  {
    canonical: "Gonadorelin",
    displayName: "Gonadorelin",
    aliases: [
      "Gonadorelin", "GnRH", "LHRH", "Gonadotropin releasing hormone",
    ],
  },
  {
    canonical: "Melanotan-II",
    displayName: "Melanotan-II",
    aliases: [
      "Melanotan-II", "Melanotan II", "MT-2", "MT2", "Melanotan 2",
      "mt2", "mt-2",
    ],
    dbSearchTerms: ["Melanotan 2", "Melanotan-II", "Melanotan II", "Melanotan 1"],
  },
  {
    canonical: "AOD-9604",
    displayName: "AOD-9604",
    aliases: [
      "AOD-9604", "AOD9604", "aod-9604", "aod9604",
      "Anti-Obesity Drug 9604",
    ],
  },
];

function normKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const _aliasLookup = new Map<string, PeptideGroup>();
for (const group of PEPTIDE_GROUPS) {
  for (const alias of group.aliases) {
    const key = normKey(alias);
    if (!_aliasLookup.has(key)) {
      _aliasLookup.set(key, group);
    }
  }
}

export function getCanonicalGroup(raw: string): PeptideGroup | null {
  return _aliasLookup.get(normKey(raw)) ?? null;
}

export function getPeptideDisplayName(raw: string): string {
  return getCanonicalGroup(raw)?.displayName ?? raw;
}

export function getCanonicalName(raw: string): string {
  return getCanonicalGroup(raw)?.canonical ?? raw;
}

const BLEND_SEPARATORS = /\s*[\/\+\&]\s*|\s+and\s+|\s+blend\s*/i;

export function splitBlendComponents(productName: string): string[] {
  const cleaned = productName
    .replace(/\([^)]*\)/g, "")
    .replace(/\d+(\.\d+)?\s*mg\b/gi, "")
    .replace(/\b(blend|combo|mix|combination|stack|peptide|research|grade|kit|vial|lyophilized|lyophilised)\b/gi, "")
    .trim();

  const parts = cleaned.split(BLEND_SEPARATORS)
    .map(p => p.trim())
    .filter(p => p.length > 1);

  return parts.length > 1 ? parts : [];
}

export function isBlendProduct(productName: string): boolean {
  return splitBlendComponents(productName).length > 1;
}
