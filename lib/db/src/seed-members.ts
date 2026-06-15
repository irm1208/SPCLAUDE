import { db } from "./index";
import { ordersTable, orderLineItemsTable } from "./schema";
import { randomUUID } from "crypto";

// Product catalog mapping: id → { name, price }
const P: Record<string, { name: string; price: number }> = {
  p009: { name: "Retatrutide 10mg", price: 95 },
  p010: { name: "Retatrutide 20mg", price: 120 },
  p011: { name: "Retatrutide 30mg", price: 155 },
  p012: { name: "Retatrutide 40mg", price: 165 },
  p013: { name: "Retatrutide 50mg", price: 205 },
  p002: { name: "Tirzepatide 10mg", price: 65 },
  p003: { name: "Tirzepatide 15mg", price: 80 },
  p004: { name: "Tirzepatide 20mg", price: 85 },
  p005: { name: "Tirzepatide 30mg", price: 90 },
  p006: { name: "Tirzepatide 45mg", price: 115 },
  p007: { name: "Tirzepatide 60mg", price: 135 },
  p008: { name: "Tirzepatide 100mg", price: 220 },
  p054: { name: "SS-31 10mg", price: 75 },
  p055: { name: "SS-31 30mg", price: 155 },
  p019: { name: "BAC water 10ml", price: 25 },
  p021: { name: "BAC water 3ml", price: 15 },
  p020: { name: "GAC water 3ml", price: 15 },
  p102: { name: "Cerebrolysin 30mg GMP 10ml 10vials", price: 45 },
  p068: { name: "Snap-8 10mg", price: 40 },
  p039: { name: "Epitalon 10mg", price: 45 },
  p026: { name: "5-Amino-1MQ 50mg", price: 75 },
  p061: { name: "Semax 10mg", price: 55 },
  p062: { name: "Selank 10mg", price: 55 },
  p109: { name: "Cartalax 20mg", price: 120 },
  p078: { name: "GHK-CU 100mg", price: 51 },
  p079: { name: "GHK-CU 50mg", price: 40 },
  p119: { name: "GHK-CU 10g Raw", price: 85 },
  p042: { name: "Melanotan II 10mg", price: 40 },
  p036: { name: "Fragment 176-191 5mg", price: 75 },
  p030: { name: "BPC 157 10mg", price: 45 },
  p031: { name: "BPC 157 40mg", price: 160 },
  p123: { name: "BPC 157 500mcg Tablets", price: 55 },
  p089: { name: "KLOW (TB10+BPC10+KPV10+GHK50)", price: 160 },
  p049: { name: "Tesamorelin 10mg", price: 125 },
  p050: { name: "Tesamorelin 20mg", price: 220 },
  p084: { name: "KPV 10mg", price: 60 },
  p085: { name: "KPV 30mg", price: 145 },
  p087: { name: "KPV & GHK-CU Blend", price: 110 },
  p024: { name: "HGH 10IU", price: 50 },
  p080: { name: "NAD+ 500mg", price: 95 },
  p072: { name: "BPC 10mg / TB4 10mg Blend", price: 135 },
  p071: { name: "BPC 5mg / TB4 5mg Blend", price: 80 },
  p014: { name: "Cagrilintide 5mg", price: 90 },
  p126: { name: "Orforglipron 12mg", price: 130 },
  p052: { name: "Mots-C 20mg", price: 95 },
  p053: { name: "Mots-C 40mg", price: 160 },
  p051: { name: "Mots-C 10mg", price: 55 },
  p032: { name: "TB500 (TB4) 10mg", price: 85 },
  p057: { name: "Ipamorelin 10mg", price: 80 },
  p067: { name: "Oxytocin 10mg (<99)", price: 60 },
  p025: { name: "IGF-1 LR3 1mg", price: 210 },
  p091: { name: "Ara-290 16mg", price: 60 },
  p073: { name: "CJC No DAC / Ipa 10/10mg", price: 75 },
  p090: { name: "PE-22-28 10mg", price: 70 },
  p069: { name: "DSIP 5mg", price: 35 },
  p097: { name: "HCG 2000 IU GMP 3ml 10vials", price: 70 },
  p108: { name: "Vilon 20mg", price: 120 },
  p106: { name: "Vesugen 20mg", price: 120 },
  p046: { name: "Tesa / IPA / CJC No DAC 6/3/3mg", price: 130 },
  p076: { name: "Tesa 10mg / Ipa 3mg Blend", price: 165 },
  p017: { name: "Survodutide 10mg", price: 170 },
  p028: { name: "Adipotide 10mg", price: 165 },
  p118: { name: "Vesilute 20mg", price: 120 },
  p110: { name: "Cortagen 20mg", price: 120 },
};

// Delivery options
const ROYAL_MAIL = { id: "dm-royal-mail", name: "Royal Mail", price: 10 };
const INPOST     = { id: "dm-inpost",     name: "InPost",     price: 3  };
const NONE       = { id: "",              name: "",            price: 0  };

type Item = { pid: string; qty: number };

const members: {
  username: string;
  delivery: typeof ROYAL_MAIL | typeof INPOST | typeof NONE;
  items: Item[];
}[] = [
  // Member 1 - @Reeper90 (Epitalon 10mg appears twice → merged to 2×)
  {
    username: "@Reeper90", delivery: ROYAL_MAIL,
    items: [
      { pid: "p011", qty: 1 }, { pid: "p054", qty: 1 }, { pid: "p019", qty: 1 },
      { pid: "p102", qty: 1 }, { pid: "p068", qty: 1 }, { pid: "p039", qty: 2 },
      { pid: "p012", qty: 2 }, { pid: "p004", qty: 1 }, { pid: "p005", qty: 1 },
      { pid: "p026", qty: 1 }, { pid: "p061", qty: 1 }, { pid: "p062", qty: 1 },
    ],
  },
  // Member 2 - mIRCulina (Cartalax 20mg appears twice: 1 + 0.5 → merged to 1.5×)
  {
    username: "mIRCulina", delivery: ROYAL_MAIL,
    items: [
      { pid: "p109", qty: 1.5 }, { pid: "p078", qty: 1 },
    ],
  },
  // Member 3 - UntamedChazy
  {
    username: "UntamedChazy", delivery: ROYAL_MAIL,
    items: [
      { pid: "p012", qty: 2 }, { pid: "p006", qty: 1 }, { pid: "p042", qty: 1 },
      { pid: "p036", qty: 1 }, { pid: "p030", qty: 1 }, { pid: "p079", qty: 1 },
      { pid: "p089", qty: 1 }, { pid: "p049", qty: 1 },
    ],
  },
  // Member 4 - 1poundfish
  {
    username: "1poundfish", delivery: ROYAL_MAIL,
    items: [
      { pid: "p084", qty: 1 }, { pid: "p102", qty: 1 }, { pid: "p024", qty: 2 },
    ],
  },
  // Member 5 - finguk
  {
    username: "finguk", delivery: ROYAL_MAIL,
    items: [{ pid: "p080", qty: 1 }],
  },
  // Member 6 - @slimsimma
  {
    username: "@slimsimma", delivery: NONE,
    items: [
      { pid: "p039", qty: 1 }, { pid: "p005", qty: 1 }, { pid: "p007", qty: 0.5 },
    ],
  },
  // Member 7 - @JohnnyWalker70
  {
    username: "@JohnnyWalker70", delivery: ROYAL_MAIL,
    items: [
      { pid: "p008", qty: 1 }, { pid: "p072", qty: 1 }, { pid: "p012", qty: 1 },
      { pid: "p014", qty: 1 }, { pid: "p126", qty: 1 }, { pid: "p020", qty: 1 },
    ],
  },
  // Member 8 - Prem
  {
    username: "Prem", delivery: NONE,
    items: [
      { pid: "p078", qty: 3 }, { pid: "p012", qty: 2 },
      { pid: "p007", qty: 2 }, { pid: "p087", qty: 1 },
    ],
  },
  // Member 9 - @jakeh1992
  {
    username: "@jakeh1992", delivery: ROYAL_MAIL,
    items: [
      { pid: "p007", qty: 1 }, { pid: "p109", qty: 0.5 },
    ],
  },
  // Member 10 - @Jack3797
  {
    username: "@Jack3797", delivery: NONE,
    items: [
      { pid: "p013", qty: 2 }, { pid: "p014", qty: 1 }, { pid: "p078", qty: 1 },
    ],
  },
  // Member 11 - @J4mes_R
  {
    username: "@J4mes_R", delivery: ROYAL_MAIL,
    items: [
      { pid: "p010", qty: 3 }, { pid: "p006", qty: 1 }, { pid: "p079", qty: 1 },
      { pid: "p049", qty: 0.5 }, { pid: "p089", qty: 0.5 }, { pid: "p110", qty: 0.5 },
    ],
  },
  // Member 12 - @JBonwards
  {
    username: "@JBonwards", delivery: INPOST,
    items: [{ pid: "p010", qty: 1 }],
  },
  // Member 13 - @zebble76
  {
    username: "@zebble76", delivery: ROYAL_MAIL,
    items: [
      { pid: "p062", qty: 1 }, { pid: "p090", qty: 1 }, { pid: "p061", qty: 1 },
    ],
  },
  // Member 14 - @T86102023
  {
    username: "@T86102023", delivery: INPOST,
    items: [{ pid: "p080", qty: 1 }],
  },
  // Member 15 - @OC1313
  {
    username: "@OC1313", delivery: ROYAL_MAIL,
    items: [{ pid: "p076", qty: 1 }],
  },
  // Member 16 - @kenupfront
  {
    username: "@kenupfront", delivery: ROYAL_MAIL,
    items: [
      { pid: "p052", qty: 1 }, { pid: "p072", qty: 3 }, { pid: "p011", qty: 3 },
      { pid: "p053", qty: 1 }, { pid: "p051", qty: 1 }, { pid: "p032", qty: 1 },
      { pid: "p057", qty: 1 }, { pid: "p042", qty: 1 }, { pid: "p067", qty: 1 },
      { pid: "p025", qty: 1 }, { pid: "p078", qty: 1 }, { pid: "p049", qty: 1 },
      { pid: "p030", qty: 1 },
    ],
  },
  // Member 17 - Scott
  {
    username: "Scott", delivery: ROYAL_MAIL,
    items: [{ pid: "p011", qty: 2 }],
  },
  // Member 18 - Scottish_Basdurt
  {
    username: "Scottish_Basdurt", delivery: ROYAL_MAIL,
    items: [
      { pid: "p050", qty: 1 }, { pid: "p046", qty: 2 },
    ],
  },
  // Member 19 - Pink ladybug
  {
    username: "Pink ladybug", delivery: ROYAL_MAIL,
    items: [
      { pid: "p007", qty: 1 }, { pid: "p003", qty: 1 }, { pid: "p042", qty: 1 },
      { pid: "p010", qty: 4 }, { pid: "p014", qty: 0.5 }, { pid: "p011", qty: 1 },
      { pid: "p089", qty: 0.5 }, { pid: "p085", qty: 0.5 }, { pid: "p021", qty: 3 },
      { pid: "p024", qty: 3 },
    ],
  },
  // Member 20 - OJ
  {
    username: "OJ", delivery: ROYAL_MAIL,
    items: [
      { pid: "p009", qty: 1 }, { pid: "p071", qty: 1 }, { pid: "p019", qty: 3 },
    ],
  },
  // Member 21 - @HAGRIDV99
  {
    username: "@HAGRIDV99", delivery: ROYAL_MAIL,
    items: [
      { pid: "p007", qty: 1 }, { pid: "p024", qty: 1 },
    ],
  },
  // Member 22 - Mand
  {
    username: "Mand", delivery: ROYAL_MAIL,
    items: [
      { pid: "p007", qty: 0.5 }, { pid: "p024", qty: 1 }, { pid: "p031", qty: 1 },
      { pid: "p091", qty: 2 }, { pid: "p055", qty: 1 }, { pid: "p078", qty: 1 },
      { pid: "p053", qty: 1 }, { pid: "p026", qty: 1 }, { pid: "p085", qty: 0.5 },
      { pid: "p110", qty: 0.5 }, { pid: "p123", qty: 1 }, { pid: "p013", qty: 1 },
    ],
  },
  // Member 23 - @JB Adipo
  {
    username: "@JB Adipo", delivery: INPOST,
    items: [
      { pid: "p073", qty: 1 }, { pid: "p026", qty: 5 },
    ],
  },
  // Member 24 - @ADev81
  {
    username: "@ADev81", delivery: ROYAL_MAIL,
    items: [
      { pid: "p012", qty: 1 }, { pid: "p007", qty: 1 }, { pid: "p019", qty: 1 },
    ],
  },
  // Member 25 - Fergus
  {
    username: "Fergus", delivery: ROYAL_MAIL,
    items: [
      { pid: "p097", qty: 2 }, { pid: "p108", qty: 1 },
      { pid: "p024", qty: 2 }, { pid: "p106", qty: 1 },
    ],
  },
  // Member 26 - mick🇬🇧
  {
    username: "mick🇬🇧", delivery: ROYAL_MAIL,
    items: [
      { pid: "p002", qty: 1 }, { pid: "p008", qty: 1 }, { pid: "p061", qty: 0.5 },
      { pid: "p042", qty: 0.5 }, { pid: "p062", qty: 0.5 }, { pid: "p090", qty: 0.5 },
      { pid: "p019", qty: 2 },
    ],
  },
  // Member 27 - @S S C
  {
    username: "@S S C", delivery: INPOST,
    items: [
      { pid: "p030", qty: 1 }, { pid: "p049", qty: 1 }, { pid: "p078", qty: 1 },
      { pid: "p055", qty: 0.5 }, { pid: "p052", qty: 0.5 }, { pid: "p080", qty: 1 },
      { pid: "p024", qty: 1 },
    ],
  },
  // Member 28 - @John Blair
  {
    username: "@John Blair", delivery: INPOST,
    items: [
      { pid: "p055", qty: 0.5 }, { pid: "p052", qty: 0.5 },
    ],
  },
  // Member 29 - @noshoesnoservice
  {
    username: "@noshoesnoservice", delivery: INPOST,
    items: [
      { pid: "p007", qty: 1 }, { pid: "p019", qty: 1 },
    ],
  },
  // Member 30 - @josie_uk
  {
    username: "@josie_uk", delivery: ROYAL_MAIL,
    items: [
      { pid: "p109", qty: 1 }, { pid: "p030", qty: 1 }, { pid: "p051", qty: 1 },
    ],
  },
  // Member 31 - @Nemo
  {
    username: "@Nemo", delivery: NONE,
    items: [
      { pid: "p078", qty: 1 }, { pid: "p097", qty: 1 },
    ],
  },
  // Member 32 - @NeverEvenSeenIt
  {
    username: "@NeverEvenSeenIt", delivery: ROYAL_MAIL,
    items: [{ pid: "p089", qty: 1 }],
  },
  // Member 33 - Lizzie2391
  {
    username: "Lizzie2391", delivery: ROYAL_MAIL,
    items: [{ pid: "p007", qty: 1 }],
  },
  // Member 34 - @Jayjo8
  {
    username: "@Jayjo8", delivery: ROYAL_MAIL,
    items: [
      { pid: "p042", qty: 1 }, { pid: "p012", qty: 2 }, { pid: "p028", qty: 1 },
      { pid: "p078", qty: 1 }, { pid: "p118", qty: 1 }, { pid: "p039", qty: 1 },
    ],
  },
  // Member 35 - @hotlinerider
  {
    username: "@hotlinerider", delivery: ROYAL_MAIL,
    items: [
      { pid: "p007", qty: 3 }, { pid: "p017", qty: 1 },
    ],
  },
  // Member 36 - @Zii
  {
    username: "@Zii", delivery: ROYAL_MAIL,
    items: [{ pid: "p078", qty: 1 }],
  },
  // Member 37 - FBX2000
  {
    username: "FBX2000", delivery: NONE,
    items: [{ pid: "p119", qty: 1 }],
  },
  // Member 38 - @K_andL
  {
    username: "@K_andL", delivery: ROYAL_MAIL,
    items: [
      { pid: "p019", qty: 1 }, { pid: "p024", qty: 1 },
    ],
  },
  // Member 39 - @vasendak
  {
    username: "@vasendak", delivery: ROYAL_MAIL,
    items: [
      { pid: "p052", qty: 1 }, { pid: "p069", qty: 1 }, { pid: "p090", qty: 0.5 },
    ],
  },
  // Member 40 - Shaida Ali
  {
    username: "Shaida Ali", delivery: ROYAL_MAIL,
    items: [
      { pid: "p050", qty: 1 }, { pid: "p089", qty: 1 }, { pid: "p078", qty: 1 },
    ],
  },
  // Member 41 skipped (empty order, no username)
  // Member 42 - Leonidas
  {
    username: "Leonidas", delivery: ROYAL_MAIL,
    items: [
      { pid: "p007", qty: 2 }, { pid: "p012", qty: 1 },
    ],
  },
  // Member 43 - Clarke
  {
    username: "Clarke", delivery: NONE,
    items: [{ pid: "p090", qty: 0.5 }],
  },
];

async function seed() {
  console.log("Clearing existing orders...");
  await db.delete(orderLineItemsTable);
  await db.delete(ordersTable);
  console.log("Done clearing.");

  console.log(`Seeding ${members.length} orders...`);

  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    const orderId = randomUUID();
    // code numbering: skip member 41 so members 42+ are offset
    const memberNum = i < 40 ? i + 1 : i + 2;
    const code = String(memberNum).padStart(4, "0");

    const lineItems = m.items.map(item => {
      const product = P[item.pid];
      if (!product) throw new Error(`Unknown product id: ${item.pid}`);
      const lineTotal = parseFloat((item.qty * product.price).toFixed(2));
      return {
        id: randomUUID(),
        orderId,
        productId: item.pid,
        productName: product.name,
        quantity: item.qty.toFixed(2),
        unitPrice: product.price.toFixed(2),
        lineTotal: lineTotal.toFixed(2),
      };
    });

    const productSubtotal = parseFloat(
      lineItems.reduce((s, li) => s + parseFloat(li.lineTotal), 0).toFixed(2)
    );
    const grandTotal = parseFloat((productSubtotal + m.delivery.price).toFixed(2));

    await db.insert(ordersTable).values({
      id: orderId,
      code,
      telegramUsername: m.username,
      deliveryMethod: m.delivery.name,
      deliveryMethodId: m.delivery.id,
      deliveryPrice: m.delivery.price.toFixed(2),
      vendorShipping: "0",
      productSubtotal: productSubtotal.toFixed(2),
      tip: "0",
      grandTotal: grandTotal.toFixed(2),
      pin: "0000",
      status: "Submitted",
      paymentStatus: "unpaid",
      notes: null,
    });

    if (lineItems.length > 0) {
      await db.insert(orderLineItemsTable).values(lineItems);
    }

    console.log(`  ✓ order seeded — ${m.delivery.name || "No delivery"} — $${grandTotal}`);
  }

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
