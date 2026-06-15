import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    console.log("Starting import...\n");

    // 1. Products (p001-p112 visible; p113-p128 not included in provided data)
    console.log("Importing products...");
    const products: [string, string, string, boolean, string | null, number][] = [
      ["p001","Semaglutide 10mg","55.00",true,null,1],
      ["p002","Tirzepatide 10mg","65.00",true,null,2],
      ["p003","Tirzepatide 15mg","80.00",true,null,3],
      ["p004","Tirzepatide 20mg","85.00",true,null,4],
      ["p005","Tirzepatide 30mg","90.00",true,null,5],
      ["p006","Tirzepatide 45mg","115.00",true,null,6],
      ["p007","Tirzepatide 60mg","135.00",true,null,7],
      ["p008","Tirzepatide 100mg","220.00",true,null,8],
      ["p009","Retatrutide 10mg","95.00",true,null,9],
      ["p010","Retatrutide 20mg","120.00",true,null,10],
      ["p011","Retatrutide 30mg","155.00",true,null,11],
      ["p012","Retatrutide 40mg","165.00",true,null,12],
      ["p013","Retatrutide 50mg","205.00",true,null,13],
      ["p014","Cagrilintide 5mg","90.00",true,null,14],
      ["p015","Cagrilintide 10mg","170.00",true,null,15],
      ["p016","Mazdutide 10mg","160.00",true,null,16],
      ["p017","Survodutide 10mg","170.00",true,null,17],
      ["p018","GAC water 10ml","25.00",true,null,18],
      ["p019","BAC water 10ml","25.00",true,null,19],
      ["p020","GAC water 3ml","15.00",true,null,20],
      ["p021","BAC water 3ml","15.00",true,null,21],
      ["p022","L-Carnitine 500mg×20ml×10vials Water","160.00",true,null,22],
      ["p023","Cyanocobalamin B12 1mg ×10ml×10vials water","60.00",true,null,23],
      ["p024","HGH 10IU","50.00",true,null,24],
      ["p025","IGF-1 LR3 1mg","210.00",true,null,25],
      ["p026","5-Amino-1MQ 50mg","75.00",true,null,26],
      ["p027","5-Amino-1MQ 10mg","55.00",true,null,27],
      ["p028","Adipotide 10mg","165.00",true,null,28],
      ["p029","VIP 10mg","125.00",true,null,29],
      ["p030","BPC 157 10mg","45.00",true,null,30],
      ["p031","BPC 157 40mg","160.00",true,null,31],
      ["p032","TB500 (TB4) 10mg","85.00",true,null,32],
      ["p033","TB500 (TB4) 20mg","165.00",true,null,33],
      ["p034","Abaloparatide 3mg","100.00",true,null,34],
      ["p035","Teriparatide 750mcg","75.00",true,null,35],
      ["p036","Fragment 176-191 5mg","75.00",true,null,36],
      ["p037","PT141 10mg","60.00",true,null,37],
      ["p038","Kisspeptin 10mg","70.00",true,null,38],
      ["p039","Epitalon 10mg","45.00",true,null,39],
      ["p040","Epitalon 50mg","200.00",true,null,40],
      ["p041","N-Acetyl Epitalon 20mg","110.00",true,null,41],
      ["p042","Melanotan II 10mg","40.00",true,null,42],
      ["p043","Melanotan I 10mg","50.00",true,null,43],
      ["p044","CJC-1295 with DAC 5mg","120.00",true,null,44],
      ["p045","CJC-1295 No DAC 10mg","140.00",true,null,45],
      ["p046","Tesa / IPA / CJC No DAC 6/3/3mg","130.00",true,null,46],
      ["p047","GHRP-6 10mg","50.00",true,null,47],
      ["p048","GHRP-2 10mg","50.00",true,null,48],
      ["p049","Tesamorelin 10mg","125.00",true,null,49],
      ["p050","Tesamorelin 20mg","220.00",true,null,50],
      ["p051","Mots-C 10mg","55.00",true,null,51],
      ["p052","Mots-C 20mg","95.00",true,null,52],
      ["p053","Mots-C 40mg","160.00",true,null,53],
      ["p054","SS-31 10mg","75.00",true,null,54],
      ["p055","SS-31 30mg","155.00",true,null,55],
      ["p056","SS-31 50mg","230.00",true,null,56],
      ["p057","Ipamorelin 10mg","80.00",true,null,57],
      ["p058","Thymosin Alpha-1 10mg","125.00",true,null,58],
      ["p059","Thymulin 20mg","100.00",true,null,59],
      ["p060","Adamax 10mg (1032 da)","250.00",true,null,60],
      ["p061","Semax 10mg","55.00",true,null,61],
      ["p062","Selank 10mg","55.00",true,null,62],
      ["p063","Na Semax","70.00",true,null,63],
      ["p064","Na Selank","70.00",true,null,64],
      ["p065","IllumiNeuro (PE10mg+Pinealon 10mg+Na Semax 20mg+Na Selank 8mg)","240.00",true,null,65],
      ["p066","Fox04 10mg","300.00",true,null,66],
      ["p067","Oxytocin 10mg (<99)","60.00",true,null,67],
      ["p068","Snap-8 10mg","40.00",true,null,68],
      ["p069","DSIP 5mg","35.00",true,null,69],
      ["p070","DSIP 10mg","65.00",true,null,70],
      ["p071","BPC 5mg / TB4 5mg Blend","80.00",true,null,71],
      ["p072","BPC 10mg / TB4 10mg Blend","135.00",true,null,72],
      ["p073","CJC No DAC / Ipa 5/5mg","75.00",true,null,73],
      ["p074","CJC 6mg / Ipa 11mg Blend","160.00",true,null,74],
      ["p075","Tesa 5mg / Ipa 5mg Blend","110.00",true,null,75],
      ["p076","Tesa 10mg / Ipa 3mg Blend","165.00",true,null,76],
      ["p077","AHK-CU 100mg","60.00",true,null,77],
      ["p078","GHK-CU 100mg","51.00",true,null,78],
      ["p079","GHK-CU 50mg","40.00",true,null,79],
      ["p080","NAD+ 500mg Buffer pH6-6.5","95.00",true,null,80],
      ["p081","TB500 Frag 10mg","70.00",true,null,81],
      ["p082","PNC 27 30mg (this batch 28mg)","240.00",true,null,82],
      ["p083","LL-37 5mg","85.00",true,null,83],
      ["p084","KPV 10mg","60.00",true,null,84],
      ["p085","KPV 30mg","145.00",true,null,85],
      ["p086","Sermorelin 5mg","70.00",true,null,86],
      ["p087","KPV & GHK-CU Blend","110.00",true,null,87],
      ["p088","GLOW (TB4 10mg + BPC 10mg + GHK 50mg)","135.00",true,null,88],
      ["p089","KLOW (TB 10mg + BPC 10mg + KPV 10mg + GHK 50mg)","160.00",true,null,89],
      ["p090","PE-22-28 10mg","70.00",true,null,90],
      ["p091","Ara-290 16mg","60.00",true,null,91],
      ["p092","Tri-Heal Max (TB4 25mg + BPC 10mg + KPV 10mg)","380.00",true,null,92],
      ["p093","Slup-332 500mcg","60.00",true,null,93],
      ["p094","Bam-15 50mg (USA — no resend)","300.00",true,null,94],
      ["p095","SLU 100mcg / BAM 25mg Blend 60 Tabs","95.00",true,null,95],
      ["p096","HCG 1000 IU GMP 3ml 10vials","40.00",true,null,96],
      ["p097","HCG 2000 IU GMP 3ml 10vials","70.00",true,null,97],
      ["p098","HCG 5000 IU GMP 3ml 10vials","175.00",true,null,98],
      ["p099","Glutathione 600mg GMP 10ml 10vials","45.00",true,null,99],
      ["p100","Glutathione 1500mg GMP 20ml 10vials","85.00",true,null,100],
      ["p101","HMG 75IU × 10vials GMP","75.00",true,null,101],
      ["p102","Cerebrolysin 30mg GMP 10ml 10vials","45.00",true,null,102],
      ["p103","Prostamax 20mg","120.00",true,null,103],
      ["p104","Pinealon 20mg","120.00",true,null,104],
      ["p105","Ovagen 20mg","120.00",true,null,105],
      ["p106","Vesugen 20mg","120.00",true,null,106],
      ["p107","Bronchogen 20mg","120.00",true,null,107],
      ["p108","Vilon 20mg","120.00",true,null,108],
      ["p109","Cartalax 20mg","120.00",true,null,109],
      ["p110","Cortagen 20mg","120.00",true,null,110],
      ["p111","Chonluten 20mg","120.00",true,null,111],
      ["p112","Livagen 20mg","120.00",true,null,112],
    ];
    let prodCount = 0;
    for (const [id, name, price, active, category, sort_order] of products) {
      const res = await client.query(
        `INSERT INTO products (id, name, price, active, category, sort_order, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
         ON CONFLICT (id) DO UPDATE SET name=$2, price=$3, active=$4, category=$5, sort_order=$6, updated_at=NOW()`,
        [id, name, price, active, category, sort_order]
      );
      prodCount += res.rowCount ?? 0;
    }
    console.log(`  -> ${products.length} products upserted`);

    // 2. Site config (upsert — real values should override seed defaults)
    console.log("Importing site_config...");
    const siteConfig: [string, string][] = [
      ["group_buy_end_date", "2026-10-28T23:59:59.000Z"],
      ["notifications", "[]"],
      ["paymentsEnabled", "false"],
      ["track17ApiKey", "B1FBDCCBB51B3388D744CA5BDAC8E0BA"],
      ["walletAddress", "0x3B5670Fe10369082297f29eB6dB950C2db7d3659"],
      ["walletChangeCodeHash", "41071ea6b4245c84275a8d3de474dda11ae560f5466a9fd407525753fe257e5d"],
    ];
    for (const [key, value] of siteConfig) {
      await client.query(
        `INSERT INTO site_config (key, value, updated_at)
         VALUES ($1,$2,NOW())
         ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
        [key, value]
      );
    }
    console.log(`  -> ${siteConfig.length} rows`);

    // 3. Vial vendors
    console.log("Importing vial_vendors...");
    await client.query(
      `INSERT INTO vial_vendors (id, name, tagline, description, contact_telegram, telegram_chat_id, logo_url, ships_to, country, rating, seller_password_hash, wallet_address, revolut_link, paypal_link, active, sort_order, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (id) DO NOTHING`,
      [
        "cf9b8d99-c159-4265-9c8e-249527046501",
        "Test","Test","Purely test","test",
        null,
        "https://verify.janoshik.com/tests/75944-Retatrutide_10mg_26WQNEWELZ5T",
        "Worldwide",null,null,null,null,null,null,
        true,42,
        "2026-03-20T01:53:58.287Z"
      ]
    );
    console.log(`  -> 1 row`);

    // 4. Vial products
    console.log("Importing vial_products...");
    await client.query(
      `INSERT INTO vial_products (id, vendor_id, name, description, category, mg_size, price, currency, stock, manufacturer, batch_number, lab_report_url, image_url, active, sort_order, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (id) DO NOTHING`,
      [
        "621650ad-109d-460f-ad39-0821141d317a",
        "cf9b8d99-c159-4265-9c8e-249527046501",
        "Retatrutide 10mg",null,"Peptides","10",
        "20.00","USDT",5,
        null,"32342",
        "https://verify.janoshik.com/tests/75944-Retatrutide_10mg_26WQNEWELZ5T",
        null,true,null,
        "2026-03-20T01:54:26.919Z","2026-03-20T01:54:26.919Z"
      ]
    );
    console.log(`  -> 1 row`);

    console.log("\nImport complete!");

    // Summary
    const tables = ["products","site_config","vial_vendors","vial_products"];
    console.log("\nFinal row counts:");
    for (const t of tables) {
      const r = await client.query(`SELECT COUNT(*) FROM ${t}`);
      console.log(`  ${t}: ${r.rows[0].count}`);
    }

  } catch (err) {
    console.error("Error:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
