export const UTHER_BATCH_CODES: Record<string, string> = {
  // Semaglutide
  "OZ5":"Semaglutide 5mg","OZ10":"Semaglutide 10mg","OZ20":"Semaglutide 20mg",
  // Tirzepatide
  "ZE10":"Tirzepatide 10mg","ZE15":"Tirzepatide 15mg","ZE20":"Tirzepatide 20mg",
  "ZE30":"Tirzepatide 30mg","ZE45":"Tirzepatide 45mg","ZE60":"Tirzepatide 60mg","ZE100":"Tirzepatide 100mg",
  // Retatrutide
  "RE10":"Retatrutide 10mg","RE20":"Retatrutide 20mg","RE30":"Retatrutide 30mg",
  "RE40":"Retatrutide 40mg","RE50":"Retatrutide 50mg","RE60":"Retatrutide 60mg",
  // Cagrilintide
  "CAG5":"Cagrilintide 5mg","CAG10":"Cagrilintide 10mg",
  // 5-Amino-1MQ
  "51Q50":"5-Amino-1MQ 50mg","51Q10":"5-Amino-1MQ 10mg",
  // BPC-157 / TB-500 blends
  "T/B55":"BPC-157/TB-500 5/5mg","T/B1010":"BPC-157/TB-500 10/10mg",
  // BPC-157
  "BP10":"BPC-157 10mg","BP20":"BPC-157 20mg",
  // TB-500
  "TB10":"TB-500 10mg","TB20":"TB-500 20mg","TB410":"TB-500 (TB4) 10mg","TBF10":"TB-500 Fragment 10mg",
  // GHK-Cu
  "HK100":"GHK-Cu 100mg","HK50":"GHK-Cu 50mg","HK/KP50/20":"GHK-Cu/KPV 50/20mg",
  // KPV
  "KP10":"KPV 10mg","KP30":"KPV 30mg",
  // SS-31
  "SS10":"SS-31 10mg","SS30":"SS-31 30mg","SS50":"SS-31 (Elamipretide) 50mg",
  // MOTS-C
  "MO10":"MOTS-C 10mg","MO20":"MOTS-C 20mg","M010":"MOTS-C 10mg","M040":"MOTS-C 40mg",
  // PE-22-28
  "PE10":"PE-22-28 10mg",
  // N-Acetyl Semax / Selank
  "NASX10":"N-Acetyl Semax 10mg","NASX50":"N-Acetyl Semax 50mg",
  "NASK10":"N-Acetyl Selank 10mg","NASK50":"N-Acetyl Selank 50mg",
  // Selank / Semax
  "SK10":"Selank 10mg","SX10":"Semax 10mg",
  // Melanotan
  "MT1":"Melanotan I 10mg","MT2":"Melanotan II 10mg","MT210":"Melanotan 2 10mg",
  // Thymosin Alpha-1
  "TA110":"Thymosin Alpha-1 10mg",
  // CJC
  "CJND":"CJC no DAC/Ipamorelin 5/5mg","CI1010":"CJC DAC/Ipamorelin 10/10mg","CJD5":"CJC-1295 DAC 5mg",
  // Tesamorelin
  "TE10":"Tesamorelin 10mg","TE20":"Tesamorelin 20mg","T/155":"Tesamorelin/Ipamorelin 15/5mg",
  // HGH
  "H10":"HGH 10iu",
  // Ipamorelin
  "IP10":"Ipamorelin 10mg",
  // Sermorelin
  "SR5":"Sermorelin 5mg",
  // GHRP
  "G210":"GHRP-2 10mg","G610":"GHRP-6 10mg",
  // IGF-1
  "IG1":"IGF-1 LR3 1mg",
  // AOD-9604
  "A05":"AOD-9604 5mg",
  // Survotide
  "SUR10":"Survotide 10mg",
  // Misc peptides
  "PT10":"PT-141 10mg","SN10":"Snap-8 10mg","VIP":"VIP 10mg","FOX10":"Fox-04 10mg",
  // NAD+
  "NA500":"NAD+ 500mg",
  // Epithalon
  "EP10":"Epithalon 10mg","EP50":"Epithalon 50mg",
  // ARA-290
  "AR16":"ARA-290 16mg","ARA16":"ARA-290 16mg",
  // DSIP
  "DS5":"DSIP 5mg","DS10":"DSIP 10mg",
  // Blends
  "KL080":"GHK-Cu/BPC-157/TB-500/KPV 80mg","KLO80":"KLOW blend 80mg","GLO80":"GLOW blend 80mg",
  // illumineeuro
  "ILLUM":"illumineeuro",
};

export function resolveUtherName(
  supplier: string,
  batchCode: string | null | undefined,
  fallback: string,
): string {
  if (!batchCode) return fallback;
  if (supplier.trim().toUpperCase() !== "UTHER") return fallback;
  return UTHER_BATCH_CODES[batchCode.trim().toUpperCase()] ?? fallback;
}
