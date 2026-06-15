/**
 * Seed script — populates the database with products, delivery methods.
 * Run with: pnpm --filter @workspace/scripts run seed
 *
 * ─────────────────────────────────────────────────────────────
 * CONFIGURE DELIVERY METHOD PRICES HERE
 * Change prices to match what you charge for each delivery type.
 * ─────────────────────────────────────────────────────────────
 */
import { db, productsTable, deliveryMethodsTable } from "@workspace/db";

// ─────────────────────────────────────────────────────────────
// DELIVERY METHODS — edit prices here
// ─────────────────────────────────────────────────────────────
const DELIVERY_METHODS = [
  { id: "dm-royal-mail", name: "Royal Mail", price: "10.00", active: true, sortOrder: 1 },
  { id: "dm-inpost", name: "InPost", price: "3.00", active: true, sortOrder: 2 },
  // International removed — only Royal Mail and InPost are offered
];

// ─────────────────────────────────────────────────────────────
// PRODUCTS — imported from CSV
// Prices are as supplied. Currency display is controlled in frontend.
// ─────────────────────────────────────────────────────────────
const PRODUCTS = [
  { id: "p001", name: "Semaglutide 10mg", price: "55.00", active: true, sortOrder: 1 },
  { id: "p002", name: "Tirzepatide 10mg", price: "65.00", active: true, sortOrder: 2 },
  { id: "p003", name: "Tirzepatide 15mg", price: "80.00", active: true, sortOrder: 3 },
  { id: "p004", name: "Tirzepatide 20mg", price: "85.00", active: true, sortOrder: 4 },
  { id: "p005", name: "Tirzepatide 30mg", price: "90.00", active: true, sortOrder: 5 },
  { id: "p006", name: "Tirzepatide 45mg", price: "115.00", active: true, sortOrder: 6 },
  { id: "p007", name: "Tirzepatide 60mg", price: "135.00", active: true, sortOrder: 7 },
  { id: "p008", name: "Tirzepatide 100mg", price: "220.00", active: true, sortOrder: 8 },
  { id: "p009", name: "Retatrutide 10mg", price: "95.00", active: true, sortOrder: 9 },
  { id: "p010", name: "Retatrutide 20mg", price: "120.00", active: true, sortOrder: 10 },
  { id: "p011", name: "Retatrutide 30mg", price: "155.00", active: true, sortOrder: 11 },
  { id: "p012", name: "Retatrutide 40mg", price: "165.00", active: true, sortOrder: 12 },
  { id: "p013", name: "Retatrutide 50mg", price: "205.00", active: true, sortOrder: 13 },
  { id: "p127", name: "Retatrutide 100mg", price: "380.00", active: true, sortOrder: 14 },
  { id: "p014", name: "Cagrilintide 5mg", price: "90.00", active: true, sortOrder: 15 },
  { id: "p015", name: "Cagrilintide 10mg", price: "170.00", active: true, sortOrder: 16 },
  { id: "p016", name: "Mazdutide 10mg", price: "160.00", active: true, sortOrder: 17 },
  { id: "p017", name: "Survodutide 10mg", price: "170.00", active: true, sortOrder: 18 },
  { id: "p018", name: "GAC water 10ml", price: "25.00", active: true, sortOrder: 19 },
  { id: "p019", name: "BAC water 10ml", price: "25.00", active: true, sortOrder: 20 },
  { id: "p020", name: "GAC water 3ml", price: "15.00", active: true, sortOrder: 21 },
  { id: "p021", name: "BAC water 3ml", price: "15.00", active: true, sortOrder: 22 },
  { id: "p022", name: "L-Carnitine 500mg×20ml×10vials Water", price: "160.00", active: true, sortOrder: 23 },
  { id: "p023", name: "Cyanocobalamin B12 1mg ×10ml×10vials water", price: "60.00", active: true, sortOrder: 24 },
  { id: "p024", name: "HGH 10IU", price: "50.00", active: true, sortOrder: 25 },
  { id: "p025", name: "IGF-1 LR3 1mg", price: "210.00", active: true, sortOrder: 26 },
  { id: "p026", name: "5-Amino-1MQ 50mg", price: "75.00", active: true, sortOrder: 27 },
  { id: "p027", name: "5-Amino-1MQ 10mg", price: "55.00", active: true, sortOrder: 28 },
  { id: "p028", name: "Adipotide 10mg", price: "165.00", active: true, sortOrder: 29 },
  { id: "p029", name: "VIP 10mg", price: "125.00", active: true, sortOrder: 30 },
  { id: "p030", name: "BPC 157 10mg", price: "45.00", active: true, sortOrder: 31 },
  { id: "p031", name: "BPC 157 40mg", price: "160.00", active: true, sortOrder: 32 },
  { id: "p032", name: "TB500 (TB4) 10mg", price: "85.00", active: true, sortOrder: 33 },
  { id: "p033", name: "TB500 (TB4) 20mg", price: "165.00", active: true, sortOrder: 34 },
  { id: "p034", name: "Abaloparatide 3mg", price: "100.00", active: true, sortOrder: 35 },
  { id: "p035", name: "Teriparatide 750mcg", price: "75.00", active: true, sortOrder: 36 },
  { id: "p036", name: "Fragment 176-191 5mg", price: "75.00", active: true, sortOrder: 37 },
  { id: "p037", name: "PT141 10mg", price: "60.00", active: true, sortOrder: 38 },
  { id: "p038", name: "Kisspeptin 10mg", price: "70.00", active: true, sortOrder: 39 },
  { id: "p039", name: "Epitalon 10mg", price: "45.00", active: true, sortOrder: 40 },
  { id: "p040", name: "Epitalon 50mg", price: "200.00", active: true, sortOrder: 41 },
  { id: "p041", name: "N-Acetyl Epitalon 20mg", price: "110.00", active: true, sortOrder: 42 },
  { id: "p042", name: "Melanotan II 10mg", price: "40.00", active: true, sortOrder: 43 },
  { id: "p043", name: "Melanotan I 10mg", price: "50.00", active: true, sortOrder: 44 },
  { id: "p044", name: "CJC-1295 with DAC 5mg", price: "120.00", active: true, sortOrder: 45 },
  { id: "p045", name: "CJC-1295 No DAC 10mg", price: "140.00", active: true, sortOrder: 46 },
  { id: "p046", name: "Tesa / IPA / CJC No DAC 6/3/3mg", price: "130.00", active: true, sortOrder: 47 },
  { id: "p047", name: "GHRP-6 10mg", price: "50.00", active: true, sortOrder: 48 },
  { id: "p048", name: "GHRP-2 10mg", price: "50.00", active: true, sortOrder: 49 },
  { id: "p049", name: "Tesamorelin 10mg", price: "125.00", active: true, sortOrder: 50 },
  { id: "p050", name: "Tesamorelin 20mg", price: "220.00", active: true, sortOrder: 51 },
  { id: "p051", name: "Mots-C 10mg", price: "55.00", active: true, sortOrder: 52 },
  { id: "p052", name: "Mots-C 20mg", price: "95.00", active: true, sortOrder: 53 },
  { id: "p053", name: "Mots-C 40mg", price: "160.00", active: true, sortOrder: 54 },
  { id: "p054", name: "SS-31 10mg", price: "75.00", active: true, sortOrder: 55 },
  { id: "p055", name: "SS-31 30mg", price: "155.00", active: true, sortOrder: 56 },
  { id: "p056", name: "SS-31 50mg", price: "230.00", active: true, sortOrder: 57 },
  { id: "p057", name: "Ipamorelin 10mg", price: "80.00", active: true, sortOrder: 58 },
  { id: "p058", name: "Thymosin Alpha-1 10mg", price: "125.00", active: true, sortOrder: 59 },
  { id: "p059", name: "Thymulin 20mg", price: "100.00", active: true, sortOrder: 60 },
  { id: "p060", name: "Adamax 10mg (1032 da)", price: "250.00", active: true, sortOrder: 61 },
  { id: "p061", name: "Semax 10mg", price: "55.00", active: true, sortOrder: 62 },
  { id: "p062", name: "Selank 10mg", price: "55.00", active: true, sortOrder: 63 },
  { id: "p063", name: "Na Semax", price: "70.00", active: true, sortOrder: 64 },
  { id: "p064", name: "Na Selank", price: "70.00", active: true, sortOrder: 65 },
  { id: "p065", name: "IllumiNeuro (PE10mg+Pinealon 10mg+Na Semax 20mg+Na Selank 8mg)", price: "240.00", active: true, sortOrder: 66 },
  { id: "p066", name: "Fox04 10mg", price: "300.00", active: true, sortOrder: 67 },
  { id: "p067", name: "Oxytocin 10mg (<99)", price: "60.00", active: true, sortOrder: 68 },
  { id: "p068", name: "Snap-8 10mg", price: "40.00", active: true, sortOrder: 69 },
  { id: "p069", name: "DSIP 5mg", price: "35.00", active: true, sortOrder: 70 },
  { id: "p070", name: "DSIP 10mg", price: "65.00", active: true, sortOrder: 71 },
  { id: "p071", name: "BPC 5mg / TB4 5mg Blend", price: "80.00", active: true, sortOrder: 72 },
  { id: "p072", name: "BPC 10mg / TB4 10mg Blend", price: "135.00", active: true, sortOrder: 73 },
  { id: "p073", name: "CJC No DAC / Ipa 5/5mg", price: "75.00", active: true, sortOrder: 74 },
  { id: "p128", name: "CJC No DAC / Ipa 10/10mg", price: "165.00", active: true, sortOrder: 75 },
  { id: "p074", name: "CJC 6mg / Ipa 11mg Blend", price: "160.00", active: true, sortOrder: 75 },
  { id: "p075", name: "Tesa 5mg / Ipa 5mg Blend", price: "110.00", active: true, sortOrder: 76 },
  { id: "p076", name: "Tesa 10mg / Ipa 3mg Blend", price: "165.00", active: true, sortOrder: 77 },
  { id: "p077", name: "AHK-CU 100mg", price: "60.00", active: true, sortOrder: 78 },
  { id: "p078", name: "GHK-CU 100mg", price: "51.00", active: true, sortOrder: 79 },
  { id: "p079", name: "GHK-CU 50mg", price: "40.00", active: true, sortOrder: 80 },
  { id: "p080", name: "NAD+ 500mg Buffer pH6-6.5", price: "95.00", active: true, sortOrder: 81 },
  { id: "p081", name: "TB500 Frag 10mg", price: "70.00", active: true, sortOrder: 82 },
  { id: "p082", name: "PNC 27 30mg (this batch 28mg)", price: "240.00", active: true, sortOrder: 83 },
  { id: "p083", name: "LL-37 5mg", price: "85.00", active: true, sortOrder: 84 },
  { id: "p084", name: "KPV 10mg", price: "60.00", active: true, sortOrder: 85 },
  { id: "p085", name: "KPV 30mg", price: "145.00", active: true, sortOrder: 86 },
  { id: "p086", name: "Sermorelin 5mg", price: "70.00", active: true, sortOrder: 87 },
  { id: "p087", name: "KPV & GHK-CU Blend", price: "110.00", active: true, sortOrder: 88 },
  { id: "p088", name: "GLOW (TB4 10mg + BPC 10mg + GHK 50mg)", price: "135.00", active: true, sortOrder: 89 },
  { id: "p089", name: "KLOW (TB 10mg + BPC 10mg + KPV 10mg + GHK 50mg)", price: "160.00", active: true, sortOrder: 90 },
  { id: "p090", name: "PE-22-28 10mg", price: "70.00", active: true, sortOrder: 91 },
  { id: "p091", name: "Ara-290 16mg", price: "60.00", active: true, sortOrder: 92 },
  { id: "p092", name: "Tri-Heal Max (TB4 25mg + BPC 10mg + KPV 10mg)", price: "380.00", active: true, sortOrder: 93 },
  { id: "p093", name: "Slup-332 500mcg", price: "60.00", active: true, sortOrder: 94 },
  { id: "p094", name: "Bam-15 50mg (USA — no resend)", price: "300.00", active: true, sortOrder: 95 },
  { id: "p095", name: "SLU 100mcg / BAM 25mg Blend 60 Tabs", price: "95.00", active: true, sortOrder: 96 },
  { id: "p096", name: "HCG 1000 IU GMP 3ml 10vials", price: "40.00", active: true, sortOrder: 97 },
  { id: "p097", name: "HCG 2000 IU GMP 3ml 10vials", price: "70.00", active: true, sortOrder: 98 },
  { id: "p098", name: "HCG 5000 IU GMP 3ml 10vials", price: "175.00", active: true, sortOrder: 99 },
  { id: "p099", name: "Glutathione 600mg GMP 10ml 10vials", price: "45.00", active: true, sortOrder: 100 },
  { id: "p100", name: "Glutathione 1500mg GMP 20ml 10vials", price: "85.00", active: true, sortOrder: 101 },
  { id: "p101", name: "HMG 75IU × 10vials GMP", price: "75.00", active: true, sortOrder: 102 },
  { id: "p102", name: "Cerebrolysin 30mg GMP 10ml 10vials", price: "45.00", active: true, sortOrder: 103 },
  { id: "p103", name: "Prostamax 20mg", price: "120.00", active: true, sortOrder: 104 },
  { id: "p104", name: "Pinealon 20mg", price: "120.00", active: true, sortOrder: 105 },
  { id: "p105", name: "Ovagen 20mg", price: "120.00", active: true, sortOrder: 106 },
  { id: "p106", name: "Vesugen 20mg", price: "120.00", active: true, sortOrder: 107 },
  { id: "p107", name: "Bronchogen 20mg", price: "120.00", active: true, sortOrder: 108 },
  { id: "p108", name: "Vilon 20mg", price: "120.00", active: true, sortOrder: 109 },
  { id: "p109", name: "Cartalax 20mg", price: "120.00", active: true, sortOrder: 110 },
  { id: "p110", name: "Cortagen 20mg", price: "120.00", active: true, sortOrder: 111 },
  { id: "p111", name: "Chonluten 20mg", price: "120.00", active: true, sortOrder: 112 },
  { id: "p112", name: "Livagen 20mg", price: "120.00", active: true, sortOrder: 113 },
  { id: "p113", name: "Testagen 20mg", price: "120.00", active: true, sortOrder: 114 },
  { id: "p114", name: "Cardiogen 20mg", price: "120.00", active: true, sortOrder: 115 },
  { id: "p115", name: "Pancragon 20mg", price: "120.00", active: true, sortOrder: 116 },
  { id: "p116", name: "Thymogen 20mg", price: "120.00", active: true, sortOrder: 117 },
  { id: "p117", name: "Crystagen 20mg", price: "120.00", active: true, sortOrder: 118 },
  { id: "p118", name: "Vesilute 20mg", price: "120.00", active: true, sortOrder: 119 },
  { id: "p119", name: "GHK-CU 10g Raw", price: "85.00", active: true, sortOrder: 120 },
  { id: "p120", name: "AHK-CU 10g Raw", price: "175.00", active: true, sortOrder: 121 },
  { id: "p121", name: "SNAP-8 1g", price: "95.00", active: true, sortOrder: 122 },
  { id: "p122", name: "SNAP-8 10g", price: "785.00", active: true, sortOrder: 123 },
  { id: "p123", name: "BPC 157 500mcg Tablets", price: "55.00", active: true, sortOrder: 124 },
  { id: "p124", name: "KPV 500mcg Tablets", price: "55.00", active: true, sortOrder: 125 },
  { id: "p125", name: "Humanin [Purity not Guaranteed]", price: "155.00", active: true, sortOrder: 126 },
  { id: "p126", name: "Orforglipron 12mg", price: "130.00", active: true, sortOrder: 127 },
];

async function seed() {
  console.log("Seeding delivery methods...");
  for (const dm of DELIVERY_METHODS) {
    await db.insert(deliveryMethodsTable).values(dm)
      .onConflictDoUpdate({
        target: deliveryMethodsTable.id,
        set: { name: dm.name, price: dm.price, active: dm.active, sortOrder: dm.sortOrder },
      });
    console.log(`  ✓ ${dm.name} (£${dm.price})`);
  }

  console.log(`\nSeeding ${PRODUCTS.length} products...`);
  for (const product of PRODUCTS) {
    await db.insert(productsTable).values(product)
      .onConflictDoUpdate({
        target: productsTable.id,
        set: { name: product.name, price: product.price, active: product.active, sortOrder: product.sortOrder },
      });
    process.stdout.write(`  ✓ ${product.name}\n`);
  }

  console.log("\n✅ Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
