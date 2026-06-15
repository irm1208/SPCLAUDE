export interface BatchPrefix {
  prefix: string;
  compound: string;
  dose: string;
}

export const BATCH_PREFIXES: BatchPrefix[] = [
  { prefix: "51Q10",   compound: "5-Amino-1-methylquinolinium", dose: "10mg" },
  { prefix: "51Q50",   compound: "5-Amino-1-methylquinolinium", dose: "50mg" },
  { prefix: "A05",     compound: "AOD-9604",                    dose: "5mg" },
  { prefix: "ARA16",   compound: "ARA-290",                     dose: "16mg" },
  { prefix: "AR16",    compound: "ARA-290",                     dose: "16mg" },
  { prefix: "BP10",    compound: "BPC-157",                     dose: "10mg" },
  { prefix: "BP20",    compound: "BPC-157",                     dose: "20mg" },
  { prefix: "CAG10",   compound: "Cagrilintide",                dose: "10mg" },
  { prefix: "CAG5",    compound: "Cagrilintide",                dose: "5mg" },
  { prefix: "CI1010",  compound: "CJC DAC/Ipamorelin",          dose: "10/10mg" },
  { prefix: "CJD5",    compound: "CJC-1295 DAC",                dose: "5mg" },
  { prefix: "CJND",    compound: "CJC no DAC/Ipamorelin",       dose: "5/5mg" },
  { prefix: "DS10",    compound: "DSIP",                        dose: "10mg" },
  { prefix: "DS5",     compound: "DSIP",                        dose: "5mg" },
  { prefix: "EP10",    compound: "Epithalon",                   dose: "10mg" },
  { prefix: "EP50",    compound: "Epithalon",                   dose: "50mg" },
  { prefix: "FOX10",   compound: "Fox-04",                      dose: "10mg" },
  { prefix: "G210",    compound: "GHRP-2",                      dose: "10mg" },
  { prefix: "G610",    compound: "GHRP-6",                      dose: "10mg" },
  { prefix: "GLO80",   compound: "GLOW blend",                  dose: "80mg" },
  { prefix: "H10",     compound: "Human Growth Hormone",        dose: "10mg" },
  { prefix: "HK/KP50/20", compound: "GHK-Cu/KPV",              dose: "50/20mg" },
  { prefix: "HK100",   compound: "GHK-Cu",                      dose: "100mg" },
  { prefix: "HK50",    compound: "GHK-Cu",                      dose: "50mg" },
  { prefix: "IG1",     compound: "IGF-1 LR3",                   dose: "1mg" },
  { prefix: "ILLUM",   compound: "illumineeuro",                dose: "" },
  { prefix: "IP10",    compound: "Ipamorelin",                  dose: "10mg" },
  { prefix: "KL080",   compound: "GHK-Cu/BPC-157/TB-500/KPV",  dose: "80mg" },
  { prefix: "KLO80",   compound: "KLOW blend",                  dose: "80mg" },
  { prefix: "KP10",    compound: "KPV",                         dose: "10mg" },
  { prefix: "KP30",    compound: "KPV",                         dose: "30mg" },
  { prefix: "M010",    compound: "MOTS-C",                      dose: "10mg" },
  { prefix: "M040",    compound: "MOTS-C",                      dose: "40mg" },
  { prefix: "MO10",    compound: "MOTS-C",                      dose: "10mg" },
  { prefix: "MO20",    compound: "MOTS-C",                      dose: "20mg" },
  { prefix: "MT1",     compound: "Melanotan I",                 dose: "10mg" },
  { prefix: "MT210",   compound: "Melanotan 2",                 dose: "10mg" },
  { prefix: "MT2",     compound: "Melanotan II",                dose: "10mg" },
  { prefix: "NA500",   compound: "NAD+",                        dose: "500mg" },
  { prefix: "NASK10",  compound: "N-Acetyl Selank Amidate",     dose: "10mg" },
  { prefix: "NASK50",  compound: "N-Acetyl Selank",             dose: "50mg" },
  { prefix: "NASX10",  compound: "N-Acetyl Semax",              dose: "10mg" },
  { prefix: "NASX50",  compound: "N-Acetyl Semax",              dose: "50mg" },
  { prefix: "OZ10",    compound: "Semaglutide",                 dose: "10mg" },
  { prefix: "OZ20",    compound: "Semaglutide",                 dose: "20mg" },
  { prefix: "OZ5",     compound: "Semaglutide",                 dose: "5mg" },
  { prefix: "PE10",    compound: "PE-22-28",                    dose: "10mg" },
  { prefix: "PT10",    compound: "PT-141",                      dose: "10mg" },
  { prefix: "RE10",    compound: "Retatrutide",                 dose: "10mg" },
  { prefix: "RE100",   compound: "Retatrutide",                 dose: "100mg" },
  { prefix: "RE20",    compound: "Retatrutide",                 dose: "20mg" },
  { prefix: "RE30",    compound: "Retatrutide",                 dose: "30mg" },
  { prefix: "RE40",    compound: "Retatrutide",                 dose: "40mg" },
  { prefix: "RE50",    compound: "Retatrutide",                 dose: "50mg" },
  { prefix: "RE60",    compound: "Retatrutide",                 dose: "60mg" },
  { prefix: "SK10",    compound: "Selank",                      dose: "10mg" },
  { prefix: "SN10",    compound: "Snap-8",                      dose: "10mg" },
  { prefix: "SR5",     compound: "Sermorelin",                  dose: "5mg" },
  { prefix: "SS10",    compound: "SS-31",                       dose: "10mg" },
  { prefix: "SS30",    compound: "SS-31",                       dose: "30mg" },
  { prefix: "SS50",    compound: "Elamipretide",                dose: "50mg" },
  { prefix: "SUR10",   compound: "Survotide",                   dose: "10mg" },
  { prefix: "SX10",    compound: "Semax",                       dose: "10mg" },
  { prefix: "T/155",   compound: "Tesamorelin/Ipamorelin",      dose: "15/5mg" },
  { prefix: "T/B1010", compound: "BPC-157/TB-500",              dose: "10/10mg" },
  { prefix: "T/B55",   compound: "BPC-157/TB-500",              dose: "5/5mg" },
  { prefix: "TA110",   compound: "Thymosin Alpha-1",            dose: "10mg" },
  { prefix: "TB10",    compound: "TB-500",                      dose: "10mg" },
  { prefix: "TB20",    compound: "TB-500",                      dose: "20mg" },
  { prefix: "TB410",   compound: "TB-500 Fragment",             dose: "10mg" },
  { prefix: "TBF10",   compound: "TB-500 Fragment",             dose: "10mg" },
  { prefix: "TE10",    compound: "Tesamorelin",                 dose: "10mg" },
  { prefix: "TE20",    compound: "Tesamorelin",                 dose: "20mg" },
  { prefix: "VIP",     compound: "VIP",                         dose: "10mg" },
  { prefix: "ZE100",   compound: "Tirzepatide",                 dose: "100mg" },
  { prefix: "ZE10",    compound: "Tirzepatide",                 dose: "10mg" },
  { prefix: "ZE15",    compound: "Tirzepatide",                 dose: "15mg" },
  { prefix: "ZE20",    compound: "Tirzepatide",                 dose: "20mg" },
  { prefix: "ZE30",    compound: "Tirzepatide",                 dose: "30mg" },
  { prefix: "ZE45",    compound: "Tirzepatide",                 dose: "45mg" },
  { prefix: "ZE60",    compound: "Tirzepatide",                 dose: "60mg" },
];

const SORTED_PREFIXES = [...BATCH_PREFIXES].sort((a, b) => b.prefix.length - a.prefix.length);

export function lookupBatchPrefix(batchNumber: string): BatchPrefix | null {
  const upper = batchNumber.toUpperCase();
  for (const entry of SORTED_PREFIXES) {
    if (upper.startsWith(entry.prefix.toUpperCase())) return entry;
  }
  return null;
}

// Brand-name / abbreviation aliases: maps alternate product name tokens → canonical compound tokens
// This lets product names like "Sema", "Ozempic", "Zepbound" etc. match the right prefix entry.
const COMPOUND_ALIASES: Record<string, string[]> = {
  sema:         ["semaglutide"],
  ozempic:      ["semaglutide"],
  wegovy:       ["semaglutide"],
  rybelsus:     ["semaglutide"],
  tirz:         ["tirzepatide"],
  mounjaro:     ["tirzepatide"],
  zepbound:     ["tirzepatide"],
  retatrutide:  ["retatrutide"],
  cag:          ["cagrilintide"],
  cagrili:      ["cagrilintide"],
  ipamorelin:   ["ipamorelin"],
  ipa:          ["ipamorelin"],
  sermorelin:   ["sermorelin"],
  tesamorelin:  ["tesamorelin"],
  ghk:          ["ghk"],
  bpc:          ["bpc"],
  tb500:        ["tb"],
  melanotan:    ["mt"],
  mt1:          ["mt"],
  mt2:          ["mt"],
  foxo4:        ["foxo"],
  fox:          ["foxo"],
  epithalon:    ["epithalon"],
  epit:         ["epithalon"],
  dsip:         ["dsip"],
  selank:       ["selank"],
  semax:        ["semax"],
  snap:         ["snap"],
  kpv:          ["kpv"],
  ll37:         ["ll37"],
  vip:          ["vip"],
  aod:          ["aod"],
  igf:          ["igf"],
  hgh:          ["hgh"],
  hcg:          ["hcg"],
  kisspeptin:   ["kisspeptin"],
  kiss:         ["kisspeptin"],
  pentadeca:    ["pentadeca"],
  pda:          ["pentadeca"],
  nask:         ["nasal"],
  nasx:         ["nasal"],
};

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9]/g, " ").split(/\s+/).filter(Boolean);
}

export function findMatchingPeptide(entry: BatchPrefix, peptideNames: string[]): string | null {
  const compoundTokens = tokenize(entry.compound);
  const doseNorm = entry.dose.toLowerCase().replace(/\s/g, "");

  let bestName: string | null = null;
  let bestScore = 0;

  for (const name of peptideNames) {
    const nameLower = name.toLowerCase();
    const nameTokens = tokenize(name);

    // Expand name tokens through alias map so e.g. "Ozempic" → ["semaglutide"]
    const expandedNameTokens = new Set<string>(nameTokens);
    for (const nt of nameTokens) {
      const aliased = COMPOUND_ALIASES[nt];
      if (aliased) aliased.forEach(a => expandedNameTokens.add(a));
    }

    const tokenMatches = compoundTokens.filter(ct =>
      // Direct: product name contains compound token
      expandedNameTokens.has(ct) ||
      nameLower.includes(ct) ||
      // Prefix: a name token is a prefix of the compound token (min 4 chars, e.g. "sema" ⊂ "semaglutide")
      nameTokens.some(nt => nt.length >= 4 && ct.startsWith(nt)) ||
      // Prefix reverse: compound token is a prefix of a name token (e.g. "ghk" ⊂ "ghkcu")
      nameTokens.some(nt => ct.length >= 3 && nt.startsWith(ct))
    ).length;

    if (tokenMatches === 0) continue;

    const hasDose = doseNorm ? nameLower.replace(/\s/g, "").includes(doseNorm) : true;
    const score = tokenMatches * 10 + (hasDose ? 5 : 0);

    if (score > bestScore) {
      bestScore = score;
      bestName = name;
    }
  }

  return bestScore >= 10 ? bestName : null;
}
