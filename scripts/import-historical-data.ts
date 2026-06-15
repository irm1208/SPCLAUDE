import pg from "pg";
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(__dirname, "../../attached_assets");

function readCsv(filename: string): Record<string, string>[] {
  const filePath = path.join(ASSETS_DIR, filename);
  const content = fs.readFileSync(filePath, "utf-8");
  if (!content.trim()) return [];
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
  });
}

function cleanTs(v: string | undefined): string | null {
  if (!v || v === "" || v === "null") return null;
  return v.replace(/^"+|"+$/g, "");
}

function cleanStr(v: string | undefined): string | null {
  if (v === undefined || v === "" || v === "null") return null;
  return v;
}

function cleanBool(v: string | undefined): boolean | null {
  if (v === undefined || v === "" || v === "null") return null;
  return v === "true" || v === "1";
}

function cleanNum(v: string | undefined): string | null {
  if (v === undefined || v === "" || v === "null") return null;
  return v;
}

function cleanInt(v: string | undefined): number | null {
  if (v === undefined || v === "" || v === "null") return null;
  return parseInt(v, 10);
}

function cleanJson(v: string | undefined): object | null {
  if (v === undefined || v === "" || v === "null") return null;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

async function importAccounts() {
  const rows = readCsv("accounts_1775662917181.csv");
  console.log(`Importing ${rows.length} accounts...`);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO accounts (telegram_username, password_hash, email, account_status, telegram_chat_id, telegram_notifications, telegram_link_token, telegram_link_expires_at, health_data_consent, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (telegram_username) DO NOTHING`,
      [
        cleanStr(r.telegram_username),
        cleanStr(r.password_hash),
        cleanStr(r.email),
        cleanStr(r.account_status) ?? "active",
        cleanStr(r.telegram_chat_id),
        cleanJson(r.telegram_notifications),
        cleanStr(r.telegram_link_token),
        cleanTs(r.telegram_link_expires_at),
        cleanBool(r.health_data_consent) ?? false,
        cleanTs(r.created_at),
        cleanTs(r.updated_at),
      ]
    );
  }
  console.log("✓ accounts done");
}

async function importAdminAlerts() {
  const rows = readCsv("admin_alerts_1775662917181.csv");
  console.log(`Importing ${rows.length} admin_alerts...`);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO admin_alerts (id, type, priority, title, message, is_read, link_url, related_entity_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [
        cleanInt(r.id),
        cleanStr(r.type),
        cleanStr(r.priority) ?? "medium",
        cleanStr(r.title),
        cleanStr(r.message),
        cleanBool(r.is_read) ?? false,
        cleanStr(r.link_url),
        cleanStr(r.related_entity_id),
        cleanTs(r.created_at),
      ]
    );
  }
  const maxId = Math.max(...rows.map((r) => parseInt(r.id || "0")));
  if (maxId > 0) {
    await pool.query(`SELECT setval('admin_alerts_id_seq', $1, true)`, [maxId]);
  }
  console.log("✓ admin_alerts done");
}

async function importAuditLogs() {
  const rows = readCsv("audit_logs_1775662917181.csv");
  console.log(`Importing ${rows.length} audit_logs...`);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO audit_logs (id, type, level, action, message, metadata, ip, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO NOTHING`,
      [
        cleanInt(r.id),
        cleanStr(r.type),
        cleanStr(r.level) ?? "info",
        cleanStr(r.action),
        cleanStr(r.message),
        cleanJson(r.metadata),
        cleanStr(r.ip),
        cleanTs(r.created_at),
      ]
    );
  }
  const maxId = Math.max(...rows.map((r) => parseInt(r.id || "0")));
  if (maxId > 0) {
    await pool.query(`SELECT setval('audit_logs_id_seq', $1, true)`, [maxId]);
  }
  console.log("✓ audit_logs done");
}

async function importBloodTestSessions() {
  const rows = readCsv("blood_test_sessions_1775662917181.csv");
  console.log(`Importing ${rows.length} blood_test_sessions...`);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO blood_test_sessions (id, telegram_username, test_date, lab_name, notes, created_at, test_name, measurement_type, medication_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [
        cleanStr(r.id),
        cleanStr(r.telegram_username),
        cleanTs(r.test_date),
        cleanStr(r.lab_name),
        cleanStr(r.notes),
        cleanTs(r.created_at),
        cleanStr(r.test_name),
        cleanStr(r.measurement_type),
        cleanStr(r.medication_notes),
      ]
    );
  }
  console.log("✓ blood_test_sessions done");
}

async function importBloodTestValues() {
  const rows = readCsv("blood_test_values_1775662917181.csv");
  console.log(`Importing ${rows.length} blood_test_values...`);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO blood_test_values (id, session_id, biomarker_name, biomarker_category, value, unit, ref_range_low, ref_range_high)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO NOTHING`,
      [
        cleanStr(r.id),
        cleanStr(r.session_id),
        cleanStr(r.biomarker_name),
        cleanStr(r.biomarker_category),
        cleanNum(r.value),
        cleanStr(r.unit),
        cleanNum(r.ref_range_low),
        cleanNum(r.ref_range_high),
      ]
    );
  }
  console.log("✓ blood_test_values done");
}

async function importDeliveryMethods() {
  const rows = readCsv("delivery_methods_1775662917182.csv");
  console.log(`Importing ${rows.length} delivery_methods...`);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO delivery_methods (id, name, price, active, sort_order, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [
        cleanStr(r.id),
        cleanStr(r.name),
        cleanNum(r.price),
        cleanBool(r.active) ?? true,
        cleanInt(r.sort_order),
        cleanTs(r.created_at),
        cleanTs(r.updated_at),
      ]
    );
  }
  console.log("✓ delivery_methods done");
}

async function importFs3Costs() {
  const rows = readCsv("fs3_costs_1775662917182.csv");
  console.log(`Importing ${rows.length} fs3_costs...`);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO fs3_costs (id, product_name, unit_cost, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO NOTHING`,
      [
        cleanInt(r.id),
        cleanStr(r.product_name),
        cleanNum(r.unit_cost),
        cleanTs(r.created_at),
        cleanTs(r.updated_at),
      ]
    );
  }
  const maxId = Math.max(...rows.map((r) => parseInt(r.id || "0")));
  if (maxId > 0) {
    await pool.query(`SELECT setval('fs3_costs_id_seq', $1, true)`, [maxId]);
  }
  console.log("✓ fs3_costs done");
}

async function importGroupBuys() {
  const rows = readCsv("group_buys_1775662917183.csv");
  console.log(`Importing ${rows.length} group_buys...`);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO group_buys (id, name, description, status, close_date, invite_pin_hash, manufacturer, manufacturer_country, info_cards, currency, sort_order, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO NOTHING`,
      [
        cleanStr(r.id),
        cleanStr(r.name),
        cleanStr(r.description),
        cleanStr(r.status) ?? "draft",
        cleanTs(r.close_date),
        cleanStr(r.invite_pin_hash),
        cleanStr(r.manufacturer),
        cleanStr(r.manufacturer_country),
        cleanStr(r.info_cards),
        cleanStr(r.currency) ?? "GBP",
        cleanInt(r.sort_order),
        cleanTs(r.created_at),
        cleanTs(r.updated_at),
      ]
    );
  }
  console.log("✓ group_buys done");
}

async function importGroupBuyDeliveryMethods() {
  const rows = readCsv("group_buy_delivery_methods_1775662917183.csv");
  console.log(`Importing ${rows.length} group_buy_delivery_methods...`);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO group_buy_delivery_methods (id, group_buy_id, delivery_method_id)
       VALUES ($1,$2,$3)
       ON CONFLICT (id) DO NOTHING`,
      [cleanStr(r.id), cleanStr(r.group_buy_id), cleanStr(r.delivery_method_id)]
    );
  }
  console.log("✓ group_buy_delivery_methods done");
}

async function importGroupBuyProducts() {
  const rows = readCsv("group_buy_products_1775662917183.csv");
  console.log(`Importing ${rows.length} group_buy_products...`);
  let skipped = 0;
  for (const r of rows) {
    const productId = cleanStr(r.product_id);
    const res = await pool.query(`SELECT id FROM products WHERE id = $1`, [productId]);
    if (res.rowCount === 0) {
      skipped++;
      continue;
    }
    await pool.query(
      `INSERT INTO group_buy_products (id, group_buy_id, product_id, price_override, active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [
        cleanStr(r.id),
        cleanStr(r.group_buy_id),
        productId,
        cleanNum(r.price_override),
        cleanBool(r.active) ?? true,
        cleanInt(r.sort_order),
      ]
    );
  }
  if (skipped > 0) console.log(`  (skipped ${skipped} rows with missing product_id)`);
  console.log("✓ group_buy_products done");
}

async function importLabTests() {
  const rows = readCsv("lab_tests_1775662917183.csv");
  console.log(`Importing ${rows.length} lab_tests...`);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO lab_tests (id, janoshik_id, url, peptide_name, mg_amount, supplier, batch_code, purity_pct, endotoxin_eu_mg, sterility_pass, test_date, notes, is_third_party_test, pending, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (id) DO NOTHING`,
      [
        cleanInt(r.id),
        cleanStr(r.janoshik_id),
        cleanStr(r.url),
        cleanStr(r.peptide_name),
        cleanNum(r.mg_amount),
        cleanStr(r.supplier) ?? "Uther",
        cleanStr(r.batch_code),
        cleanNum(r.purity_pct),
        cleanNum(r.endotoxin_eu_mg),
        cleanBool(r.sterility_pass),
        cleanStr(r.test_date),
        cleanStr(r.notes),
        cleanBool(r.is_third_party_test) ?? false,
        cleanBool(r.pending) ?? false,
        cleanTs(r.created_at),
      ]
    );
  }
  const maxId = Math.max(...rows.map((r) => parseInt(r.id || "0")));
  if (maxId > 0) {
    await pool.query(`SELECT setval('lab_tests_id_seq', $1, true)`, [maxId]);
  }
  console.log("✓ lab_tests done");
}

async function importLookupAttempts() {
  const rows = readCsv("lookup_attempts_1775662917183.csv");
  console.log(`Importing ${rows.length} lookup_attempts...`);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO lookup_attempts (id, identifier, failed_attempts, blocked_until, last_attempt_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO NOTHING`,
      [
        cleanStr(r.id),
        cleanStr(r.identifier),
        cleanInt(r.failed_attempts) ?? 0,
        cleanTs(r.blocked_until),
        cleanTs(r.last_attempt_at),
      ]
    );
  }
  console.log("✓ lookup_attempts done");
}

async function importOrders() {
  const rows = readCsv("orders_1775662917183.csv");
  console.log(`Importing ${rows.length} orders...`);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO orders (id, code, telegram_username, delivery_method, delivery_method_id, delivery_price, vendor_shipping, product_subtotal, tip, grand_total, notes, status, admin_notes, admin_message, tracking_number, payment_status, payment_tx_hash, payment_test_amount, test_payment_tx_hash, shipping_name, shipping_address, pin, inpost_qr_code, group_buy_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
       ON CONFLICT (id) DO NOTHING`,
      [
        cleanStr(r.id),
        cleanStr(r.code),
        cleanStr(r.telegram_username),
        cleanStr(r.delivery_method),
        cleanStr(r.delivery_method_id),
        cleanNum(r.delivery_price),
        cleanNum(r.vendor_shipping),
        cleanNum(r.product_subtotal),
        cleanNum(r.tip),
        cleanNum(r.grand_total),
        cleanStr(r.notes),
        cleanStr(r.status) ?? "Submitted",
        cleanStr(r.admin_notes),
        cleanStr(r.admin_message),
        cleanStr(r.tracking_number),
        cleanStr(r.payment_status) ?? "unpaid",
        cleanStr(r.payment_tx_hash),
        cleanNum(r.payment_test_amount),
        cleanStr(r.test_payment_tx_hash),
        cleanStr(r.shipping_name),
        cleanStr(r.shipping_address),
        cleanStr(r.pin) ?? "0000",
        cleanStr(r.inpost_qr_code),
        cleanStr(r.group_buy_id),
        cleanTs(r.created_at),
        cleanTs(r.updated_at),
      ]
    );
  }
  console.log("✓ orders done");
}

async function importOrderLineItems() {
  const rows = readCsv("order_line_items_1775662917183.csv");
  console.log(`Importing ${rows.length} order_line_items...`);
  let skipped = 0;
  for (const r of rows) {
    if (!cleanStr(r.product_id)) { skipped++; continue; }
    await pool.query(
      `INSERT INTO order_line_items (id, order_id, product_id, product_name, quantity, unit_price, line_total, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [
        cleanStr(r.id),
        cleanStr(r.order_id),
        cleanStr(r.product_id),
        cleanStr(r.product_name),
        cleanNum(r.quantity),
        cleanNum(r.unit_price),
        cleanNum(r.line_total),
        cleanTs(r.created_at),
        cleanTs(r.updated_at),
      ]
    );
  }
  if (skipped > 0) console.log(`  (skipped ${skipped} rows with missing product_id)`);
  console.log("✓ order_line_items done");
}

async function importProducts() {
  const rows = readCsv("products_1775662929400.csv");
  console.log(`Importing ${rows.length} products...`);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO products (id, name, price, active, category, sort_order, source_group_buy_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         price = EXCLUDED.price,
         active = EXCLUDED.active,
         category = EXCLUDED.category,
         sort_order = EXCLUDED.sort_order,
         source_group_buy_id = EXCLUDED.source_group_buy_id,
         updated_at = EXCLUDED.updated_at`,
      [
        cleanStr(r.id),
        cleanStr(r.name),
        cleanNum(r.price),
        cleanBool(r.active) ?? true,
        cleanStr(r.category),
        cleanInt(r.sort_order),
        cleanStr(r.source_group_buy_id),
        cleanTs(r.created_at),
        cleanTs(r.updated_at),
      ]
    );
  }
  console.log("✓ products done");
}

async function importSiteConfig() {
  const rows = readCsv("site_config_1775662929401.csv");
  console.log(`Importing ${rows.length} site_config rows...`);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO site_config (key, value, updated_at)
       VALUES ($1,$2,$3)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
      [cleanStr(r.key), cleanStr(r.value), cleanTs(r.updated_at)]
    );
  }
  console.log("✓ site_config done");
}

async function importVialVendors() {
  const rows = readCsv("vial_vendors_1775662929402.csv");
  console.log(`Importing ${rows.length} vial_vendors...`);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO vial_vendors (id, name, tagline, description, contact_telegram, telegram_chat_id, logo_url, ships_to, country, rating, seller_password_hash, wallet_address, revolut_link, paypal_link, active, sort_order, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (id) DO NOTHING`,
      [
        cleanStr(r.id),
        cleanStr(r.name),
        cleanStr(r.tagline),
        cleanStr(r.description),
        cleanStr(r.contact_telegram),
        cleanStr(r.telegram_chat_id),
        cleanStr(r.logo_url),
        cleanStr(r.ships_to),
        cleanStr(r.country),
        cleanNum(r.rating),
        cleanStr(r.seller_password_hash),
        cleanStr(r.wallet_address),
        cleanStr(r.revolut_link),
        cleanStr(r.paypal_link),
        cleanBool(r.active) ?? true,
        cleanInt(r.sort_order),
        cleanTs(r.created_at),
      ]
    );
  }
  console.log("✓ vial_vendors done");
}

async function importVialProducts() {
  const rows = readCsv("vial_products_1775662929402.csv");
  console.log(`Importing ${rows.length} vial_products...`);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO vial_products (id, vendor_id, name, description, category, mg_size, price, currency, stock, manufacturer, batch_number, lab_report_url, image_url, active, sort_order, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (id) DO NOTHING`,
      [
        cleanStr(r.id),
        cleanStr(r.vendor_id),
        cleanStr(r.name),
        cleanStr(r.description),
        cleanStr(r.category),
        cleanNum(r.mg_size),
        cleanNum(r.price),
        cleanStr(r.currency) ?? "GBP",
        cleanInt(r.stock),
        cleanStr(r.manufacturer),
        cleanStr(r.batch_number),
        cleanStr(r.lab_report_url),
        cleanStr(r.image_url),
        cleanBool(r.active) ?? true,
        cleanInt(r.sort_order),
        cleanTs(r.created_at),
        cleanTs(r.updated_at),
      ]
    );
  }
  console.log("✓ vial_products done");
}

async function main() {
  console.log("Starting historical data import...\n");
  try {
    await importAccounts();
    await importAdminAlerts();
    await importAuditLogs();
    await importBloodTestSessions();
    await importBloodTestValues();
    await importDeliveryMethods();
    await importFs3Costs();
    await importGroupBuys();
    await importGroupBuyDeliveryMethods();
    await importGroupBuyProducts();
    await importLabTests();
    await importLookupAttempts();
    await importOrders();
    await importOrderLineItems();
    await importProducts();
    await importSiteConfig();
    await importVialVendors();
    await importVialProducts();
    console.log("\n✅ All imports complete!");
  } catch (err) {
    console.error("Import failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
