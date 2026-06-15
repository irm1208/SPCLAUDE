/**
 * Seed script — parses all Uther Janoshik test URLs and inserts into lab_tests table.
 * Run: npx tsx lib/db/src/seed-lab-tests.ts
 */
import { db, labTestsTable } from "./index";
import { sql } from "drizzle-orm";

// ── Peptide name normalisation map ───────────────────────────────────────────
const PEPTIDE_MAP: Record<string, string | null> = {
  // Skip non-peptides
  "bac_water": null, "3ml_bac_water": null,

  // GHK family
  "ghk": "GHK", "Ghk": "GHK",
  "ghkcu": "GHK-Cu", "Ghkcu": "GHK-Cu", "ghkcu_50mg": "GHK-Cu", "ghkcu_100mg": "GHK-Cu", "ghk_50mgkpv20mg": "GHK + KPV",
  "ahkcu": "AHK-Cu", "Ahkcu": "AHK-Cu", "ahkcu_100mg": "AHK-Cu",

  // BPC-157
  "bpc": "BPC-157", "Bpc": "BPC-157", "bpc_157": "BPC-157", "BPC157": "BPC-157",
  "bpc10mg": "BPC-157", "Bpc10mg": "BPC-157", "bpc20mg": "BPC-157", "bptbf": "BPC-157 + TB4 + Frag",

  // Semax / Selank
  "semax": "Semax", "Semax": "Semax",
  "na_semax": "NA-Semax", "Na_semax": "NA-Semax",
  "selank": "Selank", "Selank": "Selank",
  "na_selank": "NA-Selank", "Na_selank": "NA-Selank", "Na_Selank": "NA-Selank",

  // Ipamorelin
  "ipa": "Ipamorelin",

  // Tesamorelin
  "tesa": "Tesamorelin",

  // Tirzepatide
  "tir": "Tirzepatide", "Tir": "Tirzepatide",
  "tir10mg": "Tirzepatide", "tir20mg": "Tirzepatide", "Tir20mg": "Tirzepatide",
  "tir30mg": "Tirzepatide", "Tir30mg": "Tirzepatide",
  "tir45_mg": "Tirzepatide", "tir45": "Tirzepatide",
  "tir60mg": "Tirzepatide", "Tir60mg": "Tirzepatide",
  "tir100mg": "Tirzepatide",

  // Retatrutide
  "reta": "Retatrutide", "Reta": "Retatrutide", "Retatrutide": "Retatrutide",
  "reta10mg": "Retatrutide", "reta20mg": "Retatrutide", "reta30": "Retatrutide",
  "reta30mg": "Retatrutide", "reta40mg": "Retatrutide",
  "Reta_10mg": "Retatrutide", "reta_10mg": "Retatrutide",
  "reta_20mg": "Retatrutide",

  // MOTS-C
  "motsc": "MOTS-C", "Motsc": "MOTS-C",
  "motsc_40mg": "MOTS-C",

  // TB-500
  "tb_500": "TB-500", "Tb_500": "TB-500", "tb500": "TB-500",
  "tb500_20mg": "TB-500", "tb500_10mg": "TB-500", "TB4": "TB-500",

  // CJC variants
  "cjc_no_dac": "CJC-1295 (no DAC)", "cjc_no_dac10mg": "CJC-1295 (no DAC)",
  "cjc_no_dac_10mg": "CJC-1295 (no DAC)",
  "cjc_dac": "CJC-1295 (with DAC)",
  "cjcipa": "CJC + Ipamorelin", "Cjcipa": "CJC + Ipamorelin",
  "cjcipa_55": "CJC + Ipamorelin", "cjcipa_55mg": "CJC + Ipamorelin",
  "cjcipa_1010": "CJC + Ipamorelin", "Cjcipa_1010": "CJC + Ipamorelin",
  "cjcipa_611": "CJC + Ipamorelin",
  "tesaipa": "Tesamorelin + Ipamorelin", "tesaipa103": "Tesamorelin + Ipamorelin",
  "tesaipacjc": "Tesamorelin + Ipamorelin + CJC", "tesaipa_55": "Tesamorelin + Ipamorelin",
  "tesaipa_633": "Tesamorelin + Ipamorelin + CJC",

  // TB4 combos
  "tbbp": "TB4 + BPC-157", "tbbp_1010": "TB4 + BPC-157", "tbbp_55": "TB4 + BPC-157",
  "tbbp_3030": "TB4 + BPC-157",
  "tbfbp": "TB4 + BPC-157 + Frag", "Tbfbp": "TB4 + BPC-157 + Frag",
  "tb_farg": "TB4 + Frag 176-191", "Tb_farg": "TB4 + Frag 176-191",

  // KPV
  "kpv": "KPV", "Kpv": "KPV", "KPV": "KPV",

  // K-Low
  "klow": "K-Low",

  // PT-141
  "pt141": "PT-141", "Pt141": "PT-141", "pt": "PT-141",

  // LL-37
  "ll37": "LL-37", "LL37": "LL-37",

  // SS-31
  "ss31": "SS-31", "SS31": "SS-31",

  // TA-1
  "ta1": "TA-1", "Ta1": "TA-1",

  // Epitalon
  "epi": "Epitalon", "Epi": "Epitalon",
  "Na_Epi": "NA-Epitalon", "na_epi": "NA-Epitalon",

  // NAD+
  "nad500": "NAD+ 500", "NAD500": "NAD+ 500",

  // GLP-1
  "sema": "Semaglutide", "sema10mg": "Semaglutide", "semaglutide": "Semaglutide",

  // Peptide products
  "glow": "Glow", "glow4096": "Glow",
  "adipotide": "Adipotide", "Adipotide": "Adipotide",
  "fox04": "FOXO4-DRI", "Fox04": "FOXO4-DRI", "fox": "FOXO4-DRI",
  "cartalax": "Cartalax", "Cartalax": "Cartalax",
  "brochogen": "Brochogen", "Brochogen": "Brochogen",
  "cortagen": "Cortagen", "Cortagen": "Cortagen",
  "coremend": "Coremend", "Coremend": "Coremend",
  "snap8": "SNAP-8", "snap": "SNAP-8",
  "thymulin": "Thymulin",
  "thymogen": "Thymogen", "Thymogen": "Thymogen",
  "livagen": "Livagen", "Livagen": "Livagen",
  "pinealon": "Pinealon",
  "abaloparatide": "Abaloparatide", "Abaloparatide": "Abaloparatide", "Abalo": "Abaloparatide",
  "51q": "51Q",
  "ara_290": "ARA-290",
  "176191": "Frag 176-191",
  "hgh": "HGH", "Hgh": "HGH", "Hgh_10iu": "HGH",
  "mt1": "Melanotan 1",
  "mt2": "Melanotan 2", "Mt2": "Melanotan 2",
  "kiss": "Kisspeptin-10",
  "hexarelin": "Hexarelin", "Hexarelin": "Hexarelin",
  "prostamax": "Prostamax",
  "disp": "Disp", "Disp": "Disp",
  "p21": "P21",
  "pnc27": "PNC-27",
  "cag": "CAG",
  "oxy": "Oxytocin",
  "vip": "VIP", "Vip": "VIP",
  "vesilute": "Vesilute",
  "cardiogen": "Cardiogen",
  "chonluten": "Chonluten",
  "igf1": "IGF-1",
  "Pe2228": "PE-2228", "pe2228": "PE-2228",
  "Humuanin10": "Humanin", "humanin": "Humanin",
  "testagen": "Testagen",
  "Semorelin": "Sermorelin", "semo": "Sermorelin",
  "illumineeuro": "Illuminee",
  "ghrp2": "GHRP-2",
  "slu": "SLU-PP-332",
  "Adamax": "Adamax",
  "pancargen": "Pancargen", "Pancargen": "Pancargen",
  "aod": "AOD-9604", "Aod": "AOD-9604", "Aod5mg": "AOD-9604",
  "GHKCU": "GHK-Cu",
  "ipa_10mg": "Ipamorelin",
  "tir_30mg": "Tirzepatide",
};

// ── Parse a single URL ────────────────────────────────────────────────────────
interface ParsedTest {
  janoshikId: string;
  url: string;
  peptideName: string | null;
  mgAmount: number | null;
  batchCode: string | null;
}

function parseJanoshikUrl(rawUrl: string): ParsedTest | null {
  // Normalise to janoshik.com (prefer verify but strip for ID extraction)
  const urlMatch = rawUrl.match(/https?:\/\/(?:verify\.)?janoshik\.com\/tests\/([^/\s]+)/);
  if (!urlMatch) return null;
  const slug = urlMatch[1]; // e.g. "91806-ghk_100mg_HK1001125_KTLJ2S1KCZ7Y"

  // Extract numeric janoshik ID
  const idMatch = slug.match(/^(\d+)-/);
  if (!idMatch) return null;
  const janoshikId = idMatch[1];

  // Prefer verify.janoshik.com URL if available
  const finalUrl = rawUrl.includes("verify.janoshik.com") ? rawUrl : rawUrl;

  // The slug body after the ID prefix
  const body = slug.replace(/^\d+-/, ""); // "ghk_100mg_HK1001125_KTLJ2S1KCZ7Y"
  const parts = body.split("_");
  const firstPart = parts[0];

  // Try direct lookup (longest possible prefix first)
  let peptideName: string | null = null;
  for (let len = Math.min(parts.length, 4); len >= 1; len--) {
    const candidate = parts.slice(0, len).join("_");
    if (PEPTIDE_MAP[candidate] !== undefined) {
      const mapped = PEPTIDE_MAP[candidate];
      if (mapped === null) return null; // skip (bac water etc)
      peptideName = mapped;
      break;
    }
  }
  // Fallback: use raw first part, title-cased
  if (!peptideName) {
    peptideName = firstPart.charAt(0).toUpperCase() + firstPart.slice(1).toLowerCase();
    // Replace underscores with spaces for readability
    peptideName = peptideName.replace(/_/g, " ");
  }

  // Extract mg amount — find first part matching (\d+(?:\.\d+)?)mg
  let mgAmount: number | null = null;
  for (const part of parts) {
    const mgMatch = part.match(/^(\d+(?:\.\d+)?)mg$/i);
    if (mgMatch) {
      mgAmount = parseFloat(mgMatch[1]);
      break;
    }
    // Handle formats like "10mg" embedded in larger part like "bpc10mg"
    const embedded = part.match(/(\d+(?:\.\d+)?)mg/i);
    if (embedded && part !== firstPart) {
      mgAmount = parseFloat(embedded[1]);
      break;
    }
  }
  // Some peptides embed mg in the first part: "bpc10mg" → 10mg
  if (mgAmount === null) {
    const embeddedFirst = firstPart.match(/(\d+(?:\.\d+)?)mg/i);
    if (embeddedFirst) mgAmount = parseFloat(embeddedFirst[1]);
  }

  // Extract batch code — heuristic: an uppercase-ish block before the hash
  // Hash is always at the end and is typically 10-14 uppercase alphanumeric chars
  let batchCode: string | null = null;
  if (parts.length >= 3) {
    // Second-to-last part is often the batch, last is the hash
    const penultimate = parts[parts.length - 2];
    if (/^[A-Z][A-Z0-9]+$/.test(penultimate) && penultimate.length <= 12) {
      batchCode = penultimate;
    }
  }

  return { janoshikId, url: rawUrl, peptideName, mgAmount, batchCode };
}

// ── Raw URL list ──────────────────────────────────────────────────────────────
const RAW_URLS = `
https://janoshik.com/tests/91806-ghk_100mg_HK1001125_KTLJ2S1KCZ7Y
https://janoshik.com/tests/91819-Ghkcu_50mg_HK501126HK5011261_DR8F4EUKM5GA
https://janoshik.com/tests/91820-Livagen_20mg_LIV201126_MJTERTJ7IKZ2
https://janoshik.com/tests/92172-Cortagen_20mg_CORGEN201111_BIHMLJAM1ZNN
https://janoshik.com/tests/92154-Tb_500_10mg_TB4101127_KGZGJN4C41FY
https://janoshik.com/tests/92157-motsc_20mg_MO201127_LLTGHRRR22HW
https://janoshik.com/tests/92167-semax_10mg_SX101110_TS8GT7L5F6PG
https://janoshik.com/tests/92169-bpc_157_10mg_BP101110_KMZTY8DBGSA8
https://janoshik.com/tests/92174-Cartalax_20mg_CALAX201111_97JA3RPCNEY4
https://janoshik.com/tests/92176-ipa_10mg_IP101112_BDNXMZTPPMLN
https://janoshik.com/tests/92171-na_semax_10mg_NASX101111_I9NQCBVVIQ95
https://janoshik.com/tests/92175-tbbp_1010_TB10101112_KPCSWF7GVR7V
https://janoshik.com/tests/91807-Semax_10mg_SX101125_X87K3NXG143D
https://janoshik.com/tests/91803-Bpc_10mg_BP101124_Q86HV84BFYL3
https://janoshik.com/tests/92162-ipa_10mg_IP101127_5GX81BILMQDS
https://janoshik.com/tests/92155-klow_KL801127_V8YSQK9JHQS9
https://janoshik.com/tests/92159-Coremend_CORE451127_GWQGWDB7UD8H
https://janoshik.com/tests/92840-PT141_10mg_PT101128_R9EG3IEJLVF5
https://janoshik.com/tests/92853-kpv_10mg_KP101129_MLDQC7YR6V78
https://janoshik.com/tests/92859-cjc_no_dac10mg_CJND101129_GT3YPNK578YM
https://janoshik.com/tests/92862-Cjcipa_1010_cI10101130_986IXDSZFAE9
https://janoshik.com/tests/92863-cjcipa_55mg_CI551130_TIQ1NU68H4GH
https://janoshik.com/tests/92844-PT141_10mg_PT101128_LDRDKT29QK3A
https://janoshik.com/tests/92847-reta_50mg_RE501128_6BEI9BG1Y9HW
https://janoshik.com/tests/92851-Tir30mg_ZE301129_DWTHLF1M8N8Y
https://janoshik.com/tests/92855-kpv_10mg_KP101129_PLSK1D8LUTKZ
https://janoshik.com/tests/92861-cjc_no_dac10mg_CJND101129_HC1P3CNT6SA9
https://janoshik.com/tests/92867-LL37_5mg_LL51130_D6NA7T5MXE93
https://janoshik.com/tests/92842-PT141_10mg_PT101128_9UDPXQ3WM64T
https://janoshik.com/tests/92857-tesa_10mg_TE101129_GPMYU95ZREI3
https://janoshik.com/tests/92860-cjc_no_dac10mg_CJND101129_SJQVXP3CYISJ
https://janoshik.com/tests/92173-SS31_50mg_SS501111_9RNDSTSMQ175
https://janoshik.com/tests/92846-reta_50mg_RE501128_XFHB4MTD82TV
https://janoshik.com/tests/92850-Tir30mg_ZE301129_DD6W93EDBG34
https://janoshik.com/tests/92873-Na_selank_50mg_NASK501130_TAQ4XNY2BHYT
https://janoshik.com/tests/92879-Na_semax_50mg_NASX501130_81JQ27B6IXNG
https://janoshik.com/tests/92865-LL37_5mg_LL51130_7D29U6J5N9HX
https://janoshik.com/tests/93199-glow_GL701204_R74PCJVXZPNI
https://janoshik.com/tests/93073-Adipotide_10mg_ADI101201_PQ4MVYE3R7TB
https://janoshik.com/tests/93074-Fox04_10mg_FO101201_6FDLSCMUDAHN
https://janoshik.com/tests/93075-Motsc_10mg_MO101201_WNPL1PP762QK
https://janoshik.com/tests/93076-Semax_10mg_SX101204_3AJWDJLYNZUK
https://janoshik.com/tests/93077-tesaipa103_TI1031202_NN876YM37P8E
https://janoshik.com/tests/93072-sema10mg_OZ101201_GUAHMNTXBT7X
https://janoshik.com/tests/93078-reta20mg_RE201202_RIBKBX6GVQCZ
https://janoshik.com/tests/93195-Tir_60mg_ZE601204_NJGRTH1KIG1P
https://janoshik.com/tests/93200-Tir_15mg_ZE151205_UD3E75X1ZY1Y
https://janoshik.com/tests/93203-ghkcu_100mg_HK1001205_YZFZ5K8A2DRC
https://janoshik.com/tests/93355-LL37_5mg_LL51130_DUX1VMEMHUPI
https://janoshik.com/tests/93080-tesa_20mg_TE201202_HV3GH7CWTN9C
https://janoshik.com/tests/93082-bpc20mg_BP201203_MH2FVL5UCUNS
https://janoshik.com/tests/92856-tesa_10mg_TE101129_F7K1JW34SKX2
https://janoshik.com/tests/91147-thymulin_20mg_THYMU201121_ZX96P8SIY4BJ
https://janoshik.com/tests/92848-Tir30mg_ZE301129_XTNZD42V3QDY
https://janoshik.com/tests/93202-tbbp_55_TB551205_2TU9UTH3YKLZ
https://janoshik.com/tests/93081-Brochogen_20mg_BRON201202_5WV2GR4NLNJX
https://janoshik.com/tests/93084-ta1_10mg_TA1101203_2BQ733538HXB
https://janoshik.com/tests/93621-illumineeuro_ILL561202_VUCRIH86X4KT
https://janoshik.com/tests/92164-ahkcu_100mg_AHK1001128_SJMYJPRYA2C1
https://janoshik.com/tests/93803-Tir10mg_ZE101207_38TSA7BA91I8
https://janoshik.com/tests/93201-epi_10mg_EPI101205_YHRVQLU9D2ES
https://janoshik.com/tests/94371-reta_50mg_RE501128_II8X35P3JMGX
https://janoshik.com/tests/92854-kpv_10mg_KP101129_KXNFWKYHGW3Y
https://janoshik.com/tests/94411-reta_20mg_RE201210_HS6QQ8IMVXFT
https://janoshik.com/tests/92872-Na_selank_50mg_NASK501130_37WF8D96K8BG
https://janoshik.com/tests/94373-Na_semax_50mg_NASX501130_IGC2117M2E54
https://janoshik.com/tests/93805-motsc_40mg_MO401207_UGB8BQQ7WNXS
https://janoshik.com/tests/93806-tesa_10mg_TE101207_AMA8L4JR73GQ
https://janoshik.com/tests/93802-SS31_50mg_SS501206_WZR3VR8UKA49
https://janoshik.com/tests/93801-bpc10mg_BP101206_I6VTA8TXYX1J
https://janoshik.com/tests/93807-nad500_NA5001207_YEGKTNZ4G9AL
https://janoshik.com/tests/94407-tir10mg_ZE101209_6NM6U5GZQ2BU
https://janoshik.com/tests/94404-Thymogen_20mg_THYGEN201208_PIK565ZKV8SK
https://janoshik.com/tests/93197-pinealon_20mg_PIN201204_Z4TTET3AP1GH
https://janoshik.com/tests/94405-Cartalax_20mg_CARTA201208_2XP894CSVWA9
https://janoshik.com/tests/94403-tb500_20mg_TB201208_X4F7SBQVJ9SS
https://janoshik.com/tests/94408-Tbfbp_1010_TFB10101209_D87HVRN56PED
https://janoshik.com/tests/94409-Tb_farg_10mg_TBF101209_A2X5D3PTKH1Q
https://janoshik.com/tests/94410-tbbp_1010_TB10101209_BT35G2KRUYPG
https://janoshik.com/tests/94412-reta_20mg_RE201210_WY65VIA2SLC5
https://janoshik.com/tests/94406-Abaloparatide_3mg_ABALO31208_121IG7E2YRLA
https://janoshik.com/tests/94415-nad500_NA5001210_1ZGGS3KLDM5Y
https://janoshik.com/tests/95664-51q_50mg_51Q501212_WFRIDD5B1QGU
https://janoshik.com/tests/95674-reta40mg_RE401214_HU4V8BBKMKFJ
https://janoshik.com/tests/95666-ara_290_16mg_ARA161212_ZJ6BI6UQSUJU
https://janoshik.com/tests/95667-tb500_10mg_TB4101213_TYLU141XVWK3
https://janoshik.com/tests/95673-Ghkcu_50mg_HK501213_HNE7SS23LFD1
https://janoshik.com/tests/95676-motsc_10mg_MO101214_HMEPRTNQ8L45
https://janoshik.com/tests/95679-nad500_NA5001214_MHQCYU67K6PJ
https://janoshik.com/tests/95672-klow_KLO801213_BREGYM7XFL9G
https://janoshik.com/tests/95865-nad500_NA5001216_LJ4TVJEGR91T
https://janoshik.com/tests/95854-176191_5mg_17651216_D157HHEW8QMT
https://janoshik.com/tests/95856-bpc10mg_4006_BP101215_2JCS3G8VMR3U
https://janoshik.com/tests/95859-Selank_10mg_SK101216_GS4FB9AU32KN
https://janoshik.com/tests/95860-ipa_10mg_F6LIKCUDKJ2R
https://janoshik.com/tests/95863-kiss_10mg_KIS101216_8F2JVE7V4EF4
https://janoshik.com/tests/95864-kpv_30mg_KP301216_7PYJKRSJIKT1
https://janoshik.com/tests/95872-Na_semax_10mg_NASX101217_U3LFSC4IBDT7
https://janoshik.com/tests/95873-Mt2_10mg_MT2101217_KX52H9LIXLGI
https://verify.janoshik.com/tests/96275-reta_20mg_RE201210_AHGBLNHSWIXD
https://janoshik.com/tests/95677-ta1_10mg_TA1101214_L47NV69ZZSLU
https://janoshik.com/tests/95855-tesaipacjc_633_TIC6331216_R6IGDCRQQ2U2
https://janoshik.com/tests/95866-tir60mg_ZE601217_K41SB3KZ8J38
https://janoshik.com/tests/96663-reta10mg_RE101218_LB9YREGTRJF4
https://janoshik.com/tests/96668-51q_10mg_51Q101218_Z7JAGRLIPC8K
https://janoshik.com/tests/96642-Hgh_10iu_with_dipolymer_H101218_ETYWQH9HFXBI
https://janoshik.com/tests/96643-Pt141_10mg_Pt101220_GDWSNJUY34LE
https://janoshik.com/tests/96656-tesa_20mg_TE201221_MD1KUHJEBAWJ
https://janoshik.com/tests/96657-kpv_10mg_KP101221_VWAGWNVGLQE5
https://janoshik.com/tests/96671-mt1_10mg_MT1101218_KVWCHK2P3GLS
https://janoshik.com/tests/96673-tesa_10mg_TE101219_5VPW3INZNIZ5
https://janoshik.com/tests/96675-Na_Epi_20mg_NAEP201219_59Y12P962A8P
https://janoshik.com/tests/94413-Epi_50mg_EPI501210_UY6M31CKZD3K
https://janoshik.com/tests/95669-tb500_10mg_TB4101213_FXPDI6F9DEWA
https://janoshik.com/tests/95858-bpc10mg_4006_BP101215_FW7KDSWK7ZJW
https://janoshik.com/tests/95869-tir60mg_ZE601217_FWUW3QNG8YXH
https://janoshik.com/tests/95861-ipa_10mg_7VC5SU82AS58
https://janoshik.com/tests/95670-tb500_10mg_TB4101213_GVQWVR7HF4T7
https://janoshik.com/tests/95857-bpc10mg_4006_BP101215_LISJSJ8UW145
https://janoshik.com/tests/95868-tir60mg_ZE601217_CUVNLYKZ4SLT
https://janoshik.com/tests/93079-snap8_10mg_SN101202_Y4H5VUN1BQE9
https://janoshik.com/tests/96909-tir100mg_ZE1001225_4PZ6U2B96FB1
https://janoshik.com/tests/96966-Reta_100mg_RE1001226_41AIYNUJDHSW
https://janoshik.com/tests/97447-motsc_20mg_MO201211_MIVASVV3GGVZ
https://janoshik.com/tests/96910-Motsc_20mg_MO201225_VGKUNJARK3EB
https://janoshik.com/tests/96911-Epi_10mg_EP101225_FNFX2RR5NA8Q
https://janoshik.com/tests/96967-Reta_10mg_RE101226_GZAQ29LLBB7U
https://janoshik.com/tests/97448-reta_10mg_RE101212_4P6E1UULVR2B
https://janoshik.com/tests/96650-Hexarelin_3mg_HEX31220_IUEDGPRDYQ1A
https://janoshik.com/tests/96654-prostamax20mg_PRO201212_2B7YWKZEZS6S
https://janoshik.com/tests/96644-Pt141_10mg_Pt101220_NTU7BKJY6SQT
https://janoshik.com/tests/96664-reta10mg_RE101218_FHRH9MC7IACS
https://janoshik.com/tests/96961-Epi_10mg_EP101225_BF1FXCLJC8JP
https://janoshik.com/tests/96968-Reta_10mg_RE101226_UI4DQ75Y6SHP
https://janoshik.com/tests/95862-ipa_10mg_IPA101216_ASB4IUA6E9GZ
https://janoshik.com/tests/97409-Bpc_10mg_BP101227_GZBNAHMAFV2Y
https://janoshik.com/tests/96906-Ghkcu_50mg_HK1225_U7JAHB2QKT8L
https://janoshik.com/tests/96907-Ahkcu_50mg_AHK1225_KNEDC5IWXCD9
https://janoshik.com/tests/96971-nad500_NA5001226_L4LBVUYW81ZR
https://janoshik.com/tests/96708-reta_20mg_RE201222_W7CYGQ6SJ7I4
https://janoshik.com/tests/96714-reta30_RE301223_TQAAPIKD316Z
https://janoshik.com/tests/96704-ghk_100mg_HK1001222_5JI1WTWCQL32
https://verify.janoshik.com/tests/97412-Reta_10mg_RE101128_VWY7349BGDJH
https://verify.janoshik.com/tests/97408-Bpc_10mg_BP101227_L4EX74JP7N3H
https://verify.janoshik.com/tests/97411-Na_selank_10mg_NASK101228_FJE2RR9Y56GB
https://janoshik.com/tests/96709-ss31_50mg_SS501223_TFPBULUSEXG6
https://janoshik.com/tests/96712-Motsc_10mg_MO101224_VYC37QQXW69M
https://janoshik.com/tests/96702-nad500_NA5001222NA5001224_CZF7RP1ZEGKT
https://janoshik.com/tests/97445-Disp_5mg_DS51211_FL5R6UK5EUY9
https://janoshik.com/tests/96645-Pt141_10mg_Pt101220_G7IJBB9985VK
https://janoshik.com/tests/96665-reta10mg_RE101218_WK4FCSWU5BHE
https://janoshik.com/tests/96962-Epi_10mg_EP101225_IJPG44JN9X3T
https://janoshik.com/tests/96722-ss31_50mg_SS501223_VJE2QMR8UA1I
https://janoshik.com/tests/96724-Motsc_10mg_MO101224_MUC8R1S9C889
https://janoshik.com/tests/97410-Bpc_10mg_BP101227_3W5JQRNBEF74
https://janoshik.com/tests/98245-motsc_40mg_MO401229_LJAGVXH539ZZ
https://janoshik.com/tests/96721-ss31_50mg_SS501223_SQX13TWLAXZN
https://janoshik.com/tests/96723-Motsc_10mg_MO101224_DIBQPMNX8ETU
https://janoshik.com/tests/98244-motsc_40mg_MO401229_RN98MHYPQR7L
https://verify.janoshik.com/tests/98250-Humuanin10_HUM101231_7C6B2YHPJULB
https://verify.janoshik.com/tests/98242-motsc_40mg_MO401229_2H4LZLWGLT2T
https://verify.janoshik.com/tests/98249-cjcipa_611_CI6111231_T21YSGD8CJT2
https://verify.janoshik.com/tests/98251-vesilute20mg_VESIL201231_N6CB3SCS3AUE
https://verify.janoshik.com/tests/98254-cartalax_20mg_CARTA201231_KGN8LAWBL1SA
https://verify.janoshik.com/tests/98258-disp_10mg_DS101231_JEAQ874VP9FI
https://verify.janoshik.com/tests/98246-tbbp_1010_TB10101229_KT695BAIPXNM
https://verify.janoshik.com/tests/98256-klow_KL801231_LUYQXDSYR1B4
https://verify.janoshik.com/tests/98260-tbbp_3030_TB30300101_G8KMACB2A9TP
https://verify.janoshik.com/tests/98241-reta20mg_RE201229_PUQJ9UQD7AMK
https://verify.janoshik.com/tests/98247-Tir20mg_ZE201230_P7CKQIER5PCL
https://verify.janoshik.com/tests/98259-tir45_mg_ZE450101_1S9ZILT5C2KF
https://verify.janoshik.com/tests/95860-ipa_10mg_IPA101216_F6LIKCUDKJ2R
https://verify.janoshik.com/tests/99271-Pe2228_10mg_PE100102_P5V9B4X68UWF
https://verify.janoshik.com/tests/99272-igf1_1mg_IG10102_AVSZ75NSCXFT
https://verify.janoshik.com/tests/99273-ss31_10mg_SS100103_QPR1W4435BBY
https://verify.janoshik.com/tests/99275-Tb_farg_10mg_TBF100104_PP2978F3SERE
https://verify.janoshik.com/tests/99277-Semorelin_5mg_SR50104_2U5CIHZTPD16
https://verify.janoshik.com/tests/99278-testagen_20mg_TESTA200104_9HU3KN15VCQI
https://verify.janoshik.com/tests/99251-tbbp_55_TB550105_JR5LSVN8VVH7
https://verify.janoshik.com/tests/99246-pnc27_30mg_PN300105_J1URBRJA22HL
https://verify.janoshik.com/tests/99245-bpc20mg_BP200105_J6P73F3H59GE
https://verify.janoshik.com/tests/99248-cag_5mg_CAG50105_X2QUUVJK7FEX
https://verify.janoshik.com/tests/99252-ipa_10mg_IP100106_LDWJLKZ7JKFU
https://verify.janoshik.com/tests/99260-kiss_10mg_KIS100107_3IZJNMT5HKLX
https://verify.janoshik.com/tests/99263-ghkcu_50mg_HK500107_RL4AATZ6BF1D
https://verify.janoshik.com/tests/99564-Hgh_H100106_MCXAIYJTWSFU
https://verify.janoshik.com/tests/99247-tir30mg_ZE300105_KDF5V4HPMG4B
https://janoshik.com/tests/97444-tir_30mg_ZE301211_VWP8NXGCPI4N
https://verify.janoshik.com/tests/99257-reta20mg_RE200107_G2EHN44A2BW8
https://verify.janoshik.com/tests/99572-tb500_10mg_TB4100109_KI6M6AJ7VXU8
https://verify.janoshik.com/tests/99570-ghk_100mg_HK1000108_FTVAPVSDK7RB
https://verify.janoshik.com/tests/99269-reta30mg_RE300102_9769X3CIVFUJ
https://verify.janoshik.com/tests/99571-tesa_10mg_TE100108_MU2PDWXG1CU5
https://verify.janoshik.com/tests/99575-thymogen_20mg_THYGEN200109_X3QKL7ME2WUS
https://verify.janoshik.com/tests/99569-Reta_10mg_RE100108_FTQJVTSFZJ4X
https://verify.janoshik.com/tests/101333-semaglutide_5mg_OZ50112_6N74JUT21X7H
https://verify.janoshik.com/tests/101336-Kpv_30mg_KP300115_NTVUB7IXVGCR
https://verify.janoshik.com/tests/101339-cjc_no_dac_10mg_CJND100113_63Y9945K7MGN
https://verify.janoshik.com/tests/101340-bpc10mg_BP100114_V8VNGNCLWPXU
https://verify.janoshik.com/tests/101341-Ta1_10mg_TA1100114_J6JGMNGYPEAX
https://verify.janoshik.com/tests/101407-glow4096_GLO700110_1FPB9IZ91RNR
https://verify.janoshik.com/tests/101408-Tir30mg_ZE300111_3QRVKYEFYMX1
https://verify.janoshik.com/tests/101405-Reta_50mg_Re500109_7UAKWW9NQVEL
https://verify.janoshik.com/tests/101404-reta_15mg_RE150110_I8UK17SEV8DN
https://verify.janoshik.com/tests/101403-reta_60mg_RE600110_R37FZJKLWEDS
https://verify.janoshik.com/tests/101406-bpc_10mg_BP100110_Z83YN17TBJ7C
https://verify.janoshik.com/tests/101409-tesa_20mg_TE2001111_AK64G35WC8B9
https://verify.janoshik.com/tests/101410-pinealon_20mg_PIN200111_QGZ1HMIIFP68
https://verify.janoshik.com/tests/101779-motsc_40mg_MO400115_QTQPM73397FZ
https://verify.janoshik.com/tests/101780-Epi_50mg_EP500116_HQ3E2YSNQN4R
https://verify.janoshik.com/tests/101784-motsc_20mg_MO200116_AGJKNGXE5I8F
https://verify.janoshik.com/tests/101777-reta20mg_RE200115_YWCYRFLFDXX3
https://verify.janoshik.com/tests/102830-reta40mg_RE400117_SE7P3YMJ6KXJ
https://verify.janoshik.com/tests/102833-Tir60mg_ZE600118_4TXAVRDEQ86D
https://verify.janoshik.com/tests/102831-klow_KLO800117_S6JDQREBGP21
https://verify.janoshik.com/tests/102832-cardiogen_20mg_CARDI200117_AYRUH2ZEHXCK
https://verify.janoshik.com/tests/102834-motsc_10mg_MO100118_5CIEKH9BN7AT
https://janoshik.com/tests/96710-cjcipa_55mg_CI551223_N2EDYBAFN3GL
https://janoshik.com/tests/99250-cag_5mg_CAG50105_FGER99WJNIF5
https://janoshik.com/tests/99258-reta20mg_RE200107_5TB6FFA39ACA
https://janoshik.com/tests/99264-ghkcu_50mg_HK500107_QIW36H7VCR6M
https://janoshik.com/tests/99573-tb500_10mg_TB4100109_WQEJV1689BDT
https://janoshik.com/tests/99255-ipa_10mg_IP100106_HHBK5UMRWB2I
https://janoshik.com/tests/99259-reta20mg_RE200107_VG1ZVM7X9F9M
https://janoshik.com/tests/99262-kiss_10mg_KIS100107_T74H9C13NFMZ
https://janoshik.com/tests/99265-ghkcu_50mg_HK500107_37MV47H5WAN5
https://janoshik.com/tests/99574-tb500_10mg_TB4100109_HV23EVT74QIL
https://janoshik.com/tests/96646-Pt141_10mg_Pt101220_PA9CIPKTYD5C
https://janoshik.com/tests/96964-Epi_10mg_EP101225_VRGHJRPEEW1D
https://janoshik.com/tests/96970-Reta_10mg_RE101226_8TYLUKDWXSV9
https://janoshik.com/tests/96725-Motsc_10mg_MO101224_VWTB72JLFVKL
https://verify.janoshik.com/tests/101343-Kpv_30mg_KP300114_X1HK18DLUVC2
https://verify.janoshik.com/tests/101337-reta10mg_RE100113_19Y9HVNIM6PZ
https://verify.janoshik.com/tests/102842-ss31_50mg_SS500118_QKYJ6XVCD2CQ
https://verify.janoshik.com/tests/102829-176191_5mg_17650116_TLHYRJL6VSGR
https://verify.janoshik.com/tests/101338-nad500_NA5000113_TLKAPXN5TC8Q
https://verify.janoshik.com/tests/101778-nad500_NA5000115_XM94DTKU7QEV
https://verify.janoshik.com/tests/103586-reta20mg_RE200121_JFSZ4D61XL39
https://verify.janoshik.com/tests/97406-tesaipa_55_T_I551227_XUCECDV6TPBM
https://verify.janoshik.com/tests/97407-Vip_10mg_VIP101227_Y1IH1GPTGTJN
https://verify.janoshik.com/tests/104935-bpc10mg_BP100126_4IM6WBKWIV2M
https://verify.janoshik.com/tests/104936-ghk_100mg_HK1000126_D71HZLH8Y7DV
https://verify.janoshik.com/tests/104937-selank_10mg_SK100126_WPYL58VMFEGN
https://verify.janoshik.com/tests/104938-mt1_10mg_MT1100127_7T4ZARLMI52C
https://verify.janoshik.com/tests/104939-bpc_40mg_BP400127_RZ9YQQDCAJ35
https://verify.janoshik.com/tests/104941-mt2_10mg_MT2100127_BE6XXSIPHUZ1
https://verify.janoshik.com/tests/104942-tesa_10mg_TE100128_XE1UA9YM8YII
https://verify.janoshik.com/tests/104943-epi_10mg_EP100128_MJZM99TJZAH2
https://verify.janoshik.com/tests/105245-51q_50mg_51Q500125_FN575IH6PHWX
https://verify.janoshik.com/tests/104933-reta30mg_RE300127_4VSEJMX2C26F
https://verify.janoshik.com/tests/105223-Tir30mg_ZE300122_ZRMI5SDDFPQD
https://verify.janoshik.com/tests/105235-reta10mg_RE100124_J6UN1W5YJP3M
https://verify.janoshik.com/tests/105241-tir100mg_ZE1000125_5JY1MPSNPI45
https://verify.janoshik.com/tests/105225-cjcipa_55_CI550122_A7U1GZSL1HA7
https://verify.janoshik.com/tests/105227-tesa_10mg_TE100121_7TVJ2SG7DFBG
https://verify.janoshik.com/tests/105231-cag_10mg_CAG100122_87J3QTIUU7KQ
https://verify.janoshik.com/tests/105232-cjcipa_1010_CI10100123_TP2Z2L9ZYFHY
https://verify.janoshik.com/tests/105233-pt_10mg_PT100122_ZHLADDB1CFDP
https://verify.janoshik.com/tests/105238-tbbp_1010_tb10100124_SPY39B4VIQ1C
https://verify.janoshik.com/tests/105240-tb500_10mg_TB4100124_Q8KS2LCSNAPG
https://verify.janoshik.com/tests/105242-semax_10mg_SX100125_9DMKBRJNYV47
https://verify.janoshik.com/tests/105243-ghk_50mgkpv20mg_CUKP50200125_CSAP1BTYE625
https://verify.janoshik.com/tests/105229-nad500_NA5000122_GCRZYK49G6XL
https://verify.janoshik.com/tests/101335-Reta_30mg_RE300115_DB66HVNTX25Y
https://verify.janoshik.com/tests/101334-chonluten20mg_CHON200115_JMLTY72VGKA2
https://verify.janoshik.com/tests/101342-Kpv_30mg_KP300114_ZGRLFRWNNCBR
https://verify.janoshik.com/tests/101344-Kpv_30mg_KP300114_RXVGGW2LH6C4
https://verify.janoshik.com/tests/103573-Bpc10mg_BP100119_FC7TRVP77RVH
https://verify.janoshik.com/tests/103574-Bpc10mg_BP100119_QAR845Q34JJH
https://verify.janoshik.com/tests/103575-Bpc10mg_BP100119_UCM3M1AE4I2G
https://verify.janoshik.com/tests/103576-ghk_100mg_HK1000119_TKF9JQ5N4A6C
https://verify.janoshik.com/tests/103577-ghk_100mg_HK1000119_KDK452E36S11
https://verify.janoshik.com/tests/103578-ghk_100mg_HK1000119_LGN97FT3UJEN
https://verify.janoshik.com/tests/103579-fox04_10mg_FOX100119_EC8ZAHC7IP21
https://verify.janoshik.com/tests/103580-ghkcu_50mg_HK500120_3B726IE9U39Y
https://verify.janoshik.com/tests/103581-ghkcu_50mg_HK500120_SCIC85BAIUJ9
https://verify.janoshik.com/tests/103582-ghkcu_50mg_HK500120_9XH8JIBWQ625
https://verify.janoshik.com/tests/103583-kpv_10mg_KP100120_XDJ72KULCPF4
https://verify.janoshik.com/tests/103585-kpv_10mg_KP100120_9NWUH3EVRDDX
https://verify.janoshik.com/tests/103587-reta20mg_RE200121_G8NXYYTGX9M3
https://verify.janoshik.com/tests/103588-reta20mg_RE200121_LALTTM34Z8YZ
https://verify.janoshik.com/tests/105829-reta_10mg_RE100130_L1Z31MIZLB81
https://verify.janoshik.com/tests/105831-p21_10mg_P100130_XZX4T3TSWWJL
https://janoshik.com/tests/105224-Tir30mg_ZE300122_KLB3W7PHH2D4
https://janoshik.com/tests/105226-cjcipa_55_CI550122_V98EA8VHYVPM
https://janoshik.com/tests/105227-tesa_10mg_TE100121_7TVJ2SG7DFBG
https://janoshik.com/tests/105228-tesa_10mg_TE100121_5FN5SC3ECC95
https://janoshik.com/tests/105234-oxy_10mg_OXY100122_KRU5AS3YC459
https://janoshik.com/tests/105235-reta10mg_RE100124_J6UN1W5YJP3M
https://janoshik.com/tests/105236-reta10mg_RE100124_ZUABKWFXB5EX
https://janoshik.com/tests/105238-tbbp_1010_tb10100124_SPY39B4VIQ1C
https://janoshik.com/tests/105239-tbbp_1010_tb10100124_4RHQ6WJ8UKE3
https://janoshik.com/tests/105244-ghk_50mgkpv20mg_CUKP50200125_6NQME5VLBTGW
https://verify.janoshik.com/tests/107266-semo_5mg_SR50202_5U54SA56AFKZ
https://verify.janoshik.com/tests/107267-ghkcu_50mg_HK500203_KX8VWUVNYTPT
https://verify.janoshik.com/tests/107268-tesa_20mg_TE200203_6I5XNBZY2IA1
https://verify.janoshik.com/tests/107269-SS31_10mg_SS100204_TDMVHZB98755
https://verify.janoshik.com/tests/107270-motsc_10mg_MO100204_3AMGUZ35CV73
https://verify.janoshik.com/tests/107264-reta10mg_RE100202_PLXK98Z1SM6R
https://verify.janoshik.com/tests/107265-ara_290_16mg_ARA160202_HKSLYGZBJKK6
https://janoshik.com/tests/98248-ta1_10mg_TA1101230_W3ZE7LLGP9QZ
https://verify.janoshik.com/tests/106891-Retatrutide_3T4VL65K5SHM
https://verify.janoshik.com/tests/106896-Retatrutide_PIHCN3TMNCPJ
https://verify.janoshik.com/tests/106892-Retatrutide_TPDL14K4KB9I
https://verify.janoshik.com/tests/105444-BPC157_25U5NCQCRS88
https://verify.janoshik.com/tests/105447-TB4_ERPXBMHZ5JYX
https://verify.janoshik.com/tests/105450-KPV_GM1H72MATPSM
https://verify.janoshik.com/tests/105453-GHKCU_MZ6A3RFTNPFT
https://janoshik.com/tests/105823-tir10mg_ZE100128_LTRXCFEBXY9B
https://janoshik.com/tests/105824-ipa_10mg_IP100129_MAI8LXM3QL3S
https://janoshik.com/tests/105825-cjc_dac_5mg_CJWD50129_TXU9D2CHULNG
https://janoshik.com/tests/105826-bpc_20mg_BP200129_R6JHHDAVSUZW
https://janoshik.com/tests/105827-reta40mg_RE400130_MI4LPJBR7D2J
https://janoshik.com/tests/105828-tir15mg_ZE150130_93L7FD7851QT
https://janoshik.com/tests/105830-ss31_30mg_SS300130_SN8PK9Q33YLD
https://janoshik.com/tests/107772-51q_10mg_51Q100201_GYG9SFQR6KSE
https://janoshik.com/tests/107769-ta1_10mg_TA1100201_M4P1LM988LDZ
https://janoshik.com/tests/107764-cartalax_20mg_CARTA200131_24B6BNEW5W3A
https://janoshik.com/tests/107768-Aod5mg_AO50201_9HGIH3LBF39R
https://janoshik.com/tests/109551-reta30_RE300205_AKPPKJ4CBN9Z
https://janoshik.com/tests/109552-tir60mg_ZE600204_22JEDZ3H92PM
https://janoshik.com/tests/109558-tir60mg_ZE600207_2TLDUCWKPQMC
https://janoshik.com/tests/109575-reta30mg_RE300208_KY6L73MLP3E4
https://janoshik.com/tests/109553-motsc_40mg_MO400205_3DC3E6GNW8IA
https://janoshik.com/tests/109554-ghk_100mg_HK1000205_4RMM1VAVCBSJ
https://janoshik.com/tests/109555-glow_GL700206_GQX9EDUJLPVB
https://janoshik.com/tests/109556-Livagen_20mg_LIV200206_P6824KQC9UW1
https://janoshik.com/tests/109557-Pancargen_PAN0206_RP4NGVBW57E8
https://janoshik.com/tests/109573-na_semax_10mg_NASX100207_LPU89E8I9YFF
https://janoshik.com/tests/109574-bpc_10mg_BP100207_JMIBIIEAJLXZ
https://janoshik.com/tests/109576-klow_KLO800208_SCQBJAKJK4KB
https://janoshik.com/tests/109577-tesa_10mg_TE100208_QQISCLKUHWSW
https://janoshik.com/tests/107763-bptbf_1010_BPTBF10100131_6UZJFX82JPH4
https://janoshik.com/tests/107766-reta20mg_RE200131_QDN5AQIF6D63
https://verify.janoshik.com/tests/114451-reta20mg_3970_RE200209_9ZBGGBJ6SCF1
https://janoshik.com/tests/114454-51q_50mg_51Q500209_BWPH6ZCYVM6Z
https://janoshik.com/tests/114452-ghrp2_10mg_2019_G2100209_EDS76D9311NW
https://janoshik.com/tests/114461-Motsc_20mg_MO200210_J8G8NRWNRZKE
https://janoshik.com/tests/114467-tb500_10mg_TB4100226_B3QAR9G8V73P
https://janoshik.com/tests/114469-snap_10mg_SN100226_YW8JPIIK5MEN
https://janoshik.com/tests/114471-cjcipa_55_CI550227_ZC9DYD2ALMZE
https://janoshik.com/tests/114453-slu_500mcg3_TSVDSWBZ1XBS
https://janoshik.com/tests/114459-Adamax_10mg_ADAM100210_MENWY1EMG927
https://janoshik.com/tests/114455-NAD500_NA5000209_XQU9Y6T2LHVB
https://janoshik.com/tests/114465-tir30mg_ZE300226_6SS6ZFSWCG1E
https://janoshik.com/tests/122187-NAD500_NA5000306_17QI8WJ33I5H
https://janoshik.com/tests/122180-ghkcu_50mg_HK500304_H5QIAJAM1TFM
https://janoshik.com/tests/122181-bpc_10mg_BP100304_JFQA3LK897QC
https://janoshik.com/tests/122185-Motsc_10mg_MO100305_94Z5WIXEF2YZ
https://janoshik.com/tests/122189-ghk_100mg_HK1000308_WQIM4ERU37M9
https://janoshik.com/tests/122190-tb_500_10mg_TB4100308_AW76QJY1RUNH
https://janoshik.com/tests/122197-Abalo_3mg_ABALO30306_H33XGUHT5SIT
https://janoshik.com/tests/122198-Motsc_20mg_MO200307_2VB6HRL6G3BQ
https://janoshik.com/tests/122199-LL37_LL50307_3BEQAWIKKPEV
https://janoshik.com/tests/122186-reta10mg_RE100306_GAZ8DWRRSCL6
https://janoshik.com/tests/122188-klow_KLO800308_8BCK6CKASBMV
`.trim();

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Parsing URLs...");
  const lines = RAW_URLS.split("\n");
  const seen = new Map<string, ParsedTest>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Extract URL even if there's label text before it
    const urlInLine = trimmed.match(/https?:\/\/[^\s]+/);
    if (!urlInLine) continue;

    const parsed = parseJanoshikUrl(urlInLine[0]);
    if (!parsed) continue;
    if (!parsed.peptideName) continue;

    // Prefer verify.janoshik.com URLs for the same ID
    const existing = seen.get(parsed.janoshikId);
    if (!existing) {
      seen.set(parsed.janoshikId, parsed);
    } else if (parsed.url.includes("verify.janoshik.com") && !existing.url.includes("verify.janoshik.com")) {
      seen.set(parsed.janoshikId, { ...parsed });
    }
  }

  const tests = Array.from(seen.values());
  console.log(`Parsed ${tests.length} unique tests. Inserting...`);

  // Insert in batches of 50
  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < tests.length; i += BATCH) {
    const batch = tests.slice(i, i + BATCH).map(t => ({
      janoshikId: t.janoshikId,
      url: t.url,
      peptideName: t.peptideName!,
      mgAmount: t.mgAmount ?? undefined,
      supplier: "Uther",
      batchCode: t.batchCode ?? undefined,
    }));

    await db.insert(labTestsTable).values(batch).onConflictDoNothing();
    inserted += batch.length;
    console.log(`  Inserted ${inserted}/${tests.length}...`);
  }

  console.log(`Done. ${inserted} tests seeded.`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
