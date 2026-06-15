import pg from "pg";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log("🚀 Importing vial data…");

  await pool.query(`
    INSERT INTO vial_vendors (
      id, name, tagline, description, contact_telegram, telegram_chat_id,
      logo_url, ships_to, country, rating, seller_password_hash,
      wallet_address, revolut_link, paypal_link, active, sort_order, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    ON CONFLICT (id) DO NOTHING`,
    [
      'cf9b8d99-c159-4265-9c8e-249527046501',
      'Test', 'Test', 'Purely test', 'test', null,
      'https://verify.janoshik.com/tests/75944-Retatrutide_10mg_26WQNEWELZ5T',
      'Worldwide', null, null, null, null, null, null,
      true, 42, '2026-03-20T01:53:58.287Z'
    ]
  );
  console.log("✓ vial_vendors: 1 row");

  await pool.query(`
    INSERT INTO vial_products (
      id, vendor_id, name, description, category, mg_size, price, currency,
      stock, manufacturer, batch_number, lab_report_url, image_url,
      active, sort_order, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    ON CONFLICT (id) DO NOTHING`,
    [
      '621650ad-109d-460f-ad39-0821141d317a',
      'cf9b8d99-c159-4265-9c8e-249527046501',
      'Retatrutide 10mg', null, 'Peptides', '10', '20.00', 'USDT',
      5, null, '32342',
      'https://verify.janoshik.com/tests/75944-Retatrutide_10mg_26WQNEWELZ5T',
      null, true, null,
      '2026-03-20T01:54:26.919Z', '2026-03-20T01:54:26.919Z'
    ]
  );
  console.log("✓ vial_products: 1 row");

  await pool.end();
  console.log("\n✅ Done!");
}

main().catch(e => { console.error(e); process.exit(1); });
