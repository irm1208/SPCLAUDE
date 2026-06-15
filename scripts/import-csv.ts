/**
 * CSV Import Script — imports all historical data from attached_assets/ CSV files.
 * Run from Product-Landing-Page/: pnpm exec tsx scripts/import-csv.ts
 */

import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── CSV Parser ────────────────────────────────────────────────────────────────

function parseCSV(content: string): string[][] {
  const records: string[][] = [];
  let i = 0;
  const n = content.length;

  while (i < n) {
    const record: string[] = [];

    while (true) {
      let field = "";

      if (i < n && content[i] === '"') {
        i++;
        while (i < n) {
          if (content[i] === '"') {
            if (i + 1 < n && content[i + 1] === '"') {
              field += '"';
              i += 2;
            } else {
              i++;
              break;
            }
          } else {
            field += content[i++];
          }
        }
      } else {
        while (i < n && content[i] !== ',' && content[i] !== '\r' && content[i] !== '\n') {
          field += content[i++];
        }
      }

      record.push(field);

      if (i >= n) break;
      if (content[i] === '\r' || content[i] === '\n') break;

      i++;

      if (i >= n || content[i] === '\r' || content[i] === '\n') {
        record.push("");
        break;
      }
    }

    if (i < n && content[i] === '\r') i++;
    if (i < n && content[i] === '\n') i++;

    if (record.length > 0) records.push(record);
  }

  return records;
}

function sq(v: string | undefined): string | null {
  if (v === undefined || v === "" || v === null) return null;
  if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
  return v;
}

function nul(v: string | undefined): string | null {
  if (v === undefined) return null;
  return v === "" ? null : v;
}

function bool(v: string | undefined): boolean {
  return v === "true" || v === "1";
}

function num(v: string | undefined): string | null {
  if (v === undefined || v === "") return null;
  return v;
}

function loadCSV(relPath: string): { headers: string[]; rows: string[][] } {
  const absPath = path.resolve(__dirname, "../../attached_assets", relPath);
  if (!fs.existsSync(absPath)) {
    console.warn(`  ⚠ File not found: ${absPath}`);
    return { headers: [], rows: [] };
  }
  const content = fs.readFileSync(absPath, "utf-8");
  const all = parseCSV(content);
  if (all.length === 0) return { headers: [], rows: [] };
  const [headers, ...rows] = all;
  return { headers, rows };
}

async function resetSeq(table: string, col = "id") {
  await pool.query(
    `SELECT setval(pg_get_serial_sequence('${table}', '${col}'), COALESCE((SELECT MAX(${col}) FROM ${table}), 0) + 1, false)`
  );
}

// ─── Import functions ──────────────────────────────────────────────────────────

async function importAccounts() {
  console.log("\n📋 accounts…");
  const { rows } = loadCSV("accounts_1775808394556.csv");
  let n = 0;
  for (const r of rows) {
    // telegram_username, password_hash, email, account_status, telegram_chat_id,
    // telegram_notifications, telegram_link_token, telegram_link_expires_at,
    // health_data_consent, created_at, updated_at
    const [
      username, passwordHash, email, accountStatus, telegramChatId,
      telegramNotifications, telegramLinkToken, telegramLinkExpiresAt,
      healthDataConsent, createdAt, updatedAt
    ] = r;
    const ts = sq(createdAt) ?? new Date().toISOString();
    let notificationsJson: object | null = null;
    if (telegramNotifications && telegramNotifications !== "") {
      try { notificationsJson = JSON.parse(telegramNotifications); } catch { notificationsJson = null; }
    }
    await pool.query(
      `INSERT INTO accounts (
        telegram_username, password_hash, email, account_status, telegram_chat_id,
        telegram_notifications, telegram_link_token, telegram_link_expires_at,
        health_data_consent, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (telegram_username) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         email = EXCLUDED.email,
         account_status = EXCLUDED.account_status,
         telegram_chat_id = EXCLUDED.telegram_chat_id,
         telegram_notifications = EXCLUDED.telegram_notifications,
         telegram_link_token = EXCLUDED.telegram_link_token,
         telegram_link_expires_at = EXCLUDED.telegram_link_expires_at,
         health_data_consent = EXCLUDED.health_data_consent,
         created_at = EXCLUDED.created_at,
         updated_at = EXCLUDED.updated_at`,
      [
        nul(username), nul(passwordHash), nul(email), accountStatus || "active",
        nul(telegramChatId), notificationsJson,
        nul(telegramLinkToken), sq(telegramLinkExpiresAt),
        healthDataConsent === "true", ts, sq(updatedAt) ?? ts
      ]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows processed`);
}

async function importAdminAlerts() {
  console.log("\n📋 admin_alerts…");
  const { rows } = loadCSV("admin_alerts_1775808394556.csv");
  let n = 0;
  for (const r of rows) {
    const [id, type, priority, title, message, isRead, linkUrl, relatedEntityId, createdAt] = r;
    await pool.query(
      `INSERT INTO admin_alerts (id, type, priority, title, message, is_read, link_url, related_entity_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [parseInt(id), type, priority || "medium", title, message, bool(isRead), nul(linkUrl), nul(relatedEntityId), sq(createdAt)]
    );
    n++;
  }
  await resetSeq("admin_alerts");
  console.log(`  ✓ ${n} rows processed`);
}

async function importAuditLogs() {
  console.log("\n📋 audit_logs…");
  const { rows } = loadCSV("audit_logs_1775808394556.csv");
  let n = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    for (const r of chunk) {
      const [id, type, level, action, message, metadata, ip, createdAt] = r;
      await pool.query(
        `INSERT INTO audit_logs (id, type, level, action, message, metadata, ip, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          parseInt(id), type, level || "info", action, message,
          metadata ? JSON.parse(metadata) : null, nul(ip), sq(createdAt),
        ]
      );
      n++;
    }
  }
  await resetSeq("audit_logs");
  console.log(`  ✓ ${n} rows processed`);
}

async function importDeliveryMethods() {
  console.log("\n📋 delivery_methods…");
  const { rows } = loadCSV("delivery_methods_1775808394557.csv");
  let n = 0;
  for (const r of rows) {
    const [id, name, price, active, sortOrder, createdAt, updatedAt] = r;
    await pool.query(
      `INSERT INTO delivery_methods (id, name, price, active, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [id, name, price, bool(active), sortOrder ? parseInt(sortOrder) : null, sq(createdAt), sq(updatedAt)]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows processed`);
}

async function importFs3Costs() {
  console.log("\n📋 fs3_costs…");
  const { rows } = loadCSV("fs3_costs_1775808394557.csv");
  let n = 0;
  for (const r of rows) {
    const [id, productName, unitCost, createdAt, updatedAt] = r;
    await pool.query(
      `INSERT INTO fs3_costs (id, product_name, unit_cost, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [parseInt(id), productName, unitCost, sq(createdAt), sq(updatedAt)]
    );
    n++;
  }
  await resetSeq("fs3_costs");
  console.log(`  ✓ ${n} rows processed`);
}

async function importLabTests() {
  console.log("\n📋 lab_tests…");
  const { rows } = loadCSV("lab_tests_1775808394558.csv");
  let n = 0;
  for (const r of rows) {
    // id, janoshik_id, url, peptide_name, mg_amount, supplier, batch_code,
    // purity_pct, endotoxin_eu_mg, sterility_pass, test_date, notes,
    // is_third_party_test, pending, created_at
    const [
      id, janoshikId, url, peptideName, mgAmount, supplier, batchCode,
      purityPct, endotoxinEuMg, sterilityPass, testDate, notes,
      isThirdPartyTest, pending, createdAt
    ] = r;
    await pool.query(
      `INSERT INTO lab_tests (id, janoshik_id, url, peptide_name, mg_amount, supplier, batch_code,
        purity_pct, endotoxin_eu_mg, sterility_pass, test_date, notes,
        is_third_party_test, pending, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (id) DO NOTHING`,
      [
        parseInt(id), janoshikId, url, peptideName, num(mgAmount),
        supplier || "Uther", nul(batchCode), num(purityPct), num(endotoxinEuMg),
        sterilityPass === "" ? null : bool(sterilityPass),
        nul(testDate), nul(notes),
        isThirdPartyTest === "" ? false : bool(isThirdPartyTest),
        pending === "" ? false : bool(pending),
        sq(createdAt),
      ]
    );
    n++;
  }
  await resetSeq("lab_tests");
  console.log(`  ✓ ${n} rows processed`);
}

async function importLookupAttempts() {
  console.log("\n📋 lookup_attempts…");
  const { rows } = loadCSV("lookup_attempts_1775808394558.csv");
  let n = 0;
  for (const r of rows) {
    const [id, identifier, failedAttempts, blockedUntil, lastAttemptAt] = r;
    await pool.query(
      `INSERT INTO lookup_attempts (id, identifier, failed_attempts, blocked_until, last_attempt_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [id, identifier, parseInt(failedAttempts) || 0, sq(blockedUntil), sq(lastAttemptAt)]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows processed`);
}

async function importGroupBuys() {
  console.log("\n📋 group_buys…");
  const { rows } = loadCSV("group_buys_1775808394558.csv");
  let n = 0;
  for (const r of rows) {
    // id, name, description, status, close_date, invite_pin_hash, manufacturer,
    // manufacturer_country, info_cards, currency, sort_order, created_at, updated_at
    const [
      id, name, description, status, closeDate, invitePinHash, manufacturer,
      manufacturerCountry, infoCards, currency, sortOrder, createdAt, updatedAt
    ] = r;
    await pool.query(
      `INSERT INTO group_buys (id, name, description, status, close_date, invite_pin_hash,
        manufacturer, manufacturer_country, info_cards, currency, sort_order, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         status = EXCLUDED.status,
         close_date = EXCLUDED.close_date,
         updated_at = EXCLUDED.updated_at`,
      [
        id, name, nul(description), status || "draft", sq(closeDate),
        nul(invitePinHash), nul(manufacturer), nul(manufacturerCountry),
        nul(infoCards), currency || "USD",
        sortOrder ? parseInt(sortOrder) : null,
        sq(createdAt), sq(updatedAt)
      ]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows processed`);
}

async function importGroupBuyProducts() {
  console.log("\n📋 group_buy_products…");
  const { rows } = loadCSV("group_buy_products_1775808394558.csv");
  let n = 0;
  for (const r of rows) {
    // id, group_buy_id, product_id, price_override, active, sort_order
    const [id, groupBuyId, productId, priceOverride, active, sortOrder] = r;
    await pool.query(
      `INSERT INTO group_buy_products (id, group_buy_id, product_id, price_override, active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [
        id, groupBuyId, productId, num(priceOverride),
        active === "" ? true : bool(active),
        sortOrder ? parseInt(sortOrder) : null
      ]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows processed`);
}

async function importGroupBuyDeliveryMethods() {
  console.log("\n📋 group_buy_delivery_methods…");
  const { rows } = loadCSV("group_buy_delivery_methods_1775808394557.csv");
  let n = 0;
  for (const r of rows) {
    // id, group_buy_id, delivery_method_id
    const [id, groupBuyId, deliveryMethodId] = r;
    await pool.query(
      `INSERT INTO group_buy_delivery_methods (id, group_buy_id, delivery_method_id)
       VALUES ($1,$2,$3)
       ON CONFLICT (id) DO NOTHING`,
      [id, groupBuyId, deliveryMethodId]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows processed`);
}

async function importOrders() {
  console.log("\n📋 orders…");
  const { rows } = loadCSV("orders_1775808394558.csv");
  let n = 0;
  for (const r of rows) {
    // id,code,telegram_username,delivery_method,delivery_method_id,delivery_price,
    // vendor_shipping,product_subtotal,tip,grand_total,notes,status,admin_notes,
    // admin_message,tracking_number,payment_status,payment_tx_hash,payment_test_amount,
    // test_payment_tx_hash,shipping_name,shipping_address,pin,inpost_qr_code,
    // group_buy_id,created_at,updated_at
    const [
      id, code, telegramUsername, deliveryMethod, deliveryMethodId,
      deliveryPrice, vendorShipping, productSubtotal, tip, grandTotal,
      notes, status, adminNotes, adminMessage, trackingNumber,
      paymentStatus, paymentTxHash, paymentTestAmount, testPaymentTxHash,
      shippingName, shippingAddress, pin, inpostQrCode,
      groupBuyId, createdAt, updatedAt
    ] = r;
    await pool.query(
      `INSERT INTO orders (
        id, code, telegram_username, delivery_method, delivery_method_id,
        delivery_price, vendor_shipping, product_subtotal, tip, grand_total,
        notes, status, admin_notes, admin_message, tracking_number,
        payment_status, payment_tx_hash, payment_test_amount, test_payment_tx_hash,
        shipping_name, shipping_address, pin, inpost_qr_code,
        created_at, updated_at, group_buy_id
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26
      ) ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        admin_notes = EXCLUDED.admin_notes,
        admin_message = EXCLUDED.admin_message,
        tracking_number = EXCLUDED.tracking_number,
        payment_status = EXCLUDED.payment_status,
        payment_tx_hash = EXCLUDED.payment_tx_hash,
        updated_at = EXCLUDED.updated_at`,
      [
        id, code, telegramUsername, deliveryMethod, deliveryMethodId || "",
        deliveryPrice || "0", vendorShipping || "0", productSubtotal, tip || "0", grandTotal,
        nul(notes), status || "Submitted", nul(adminNotes), nul(adminMessage), nul(trackingNumber),
        paymentStatus || "unpaid", nul(paymentTxHash), num(paymentTestAmount), nul(testPaymentTxHash),
        nul(shippingName), nul(shippingAddress), pin || "0000", nul(inpostQrCode),
        sq(createdAt), sq(updatedAt), nul(groupBuyId)
      ]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows processed`);
}

async function importOrderLineItems() {
  console.log("\n📋 order_line_items…");
  const { rows } = loadCSV("order_line_items_1775808394558.csv");
  let n = 0;
  for (const r of rows) {
    const [id, orderId, productId, productName, quantity, unitPrice, lineTotal, createdAt, updatedAt] = r;
    await pool.query(
      `INSERT INTO order_line_items (id, order_id, product_id, product_name, quantity, unit_price, line_total, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [id, orderId, productId || "", productName, quantity, unitPrice, lineTotal, sq(createdAt), sq(updatedAt)]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows processed`);
}

async function importBloodTestSessions() {
  console.log("\n📋 blood_test_sessions…");
  const { rows } = loadCSV("blood_test_sessions_1775808394556.csv");
  let n = 0;
  for (const r of rows) {
    // id, telegram_username, test_date, lab_name, notes, created_at, test_name, measurement_type, medication_notes
    const [id, telegramUsername, testDate, labName, notes, createdAt, testName, measurementType, medicationNotes] = r;
    await pool.query(
      `INSERT INTO blood_test_sessions (id, telegram_username, test_date, lab_name, notes, created_at, test_name, measurement_type, medication_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [
        id, telegramUsername, sq(testDate)?.split("T")[0] ?? testDate,
        nul(labName), nul(notes), sq(createdAt),
        nul(testName), nul(measurementType), nul(medicationNotes)
      ]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows processed`);
}

async function importBloodTestValues() {
  console.log("\n📋 blood_test_values…");
  const { rows } = loadCSV("blood_test_values_1775808394556.csv");
  let n = 0;
  for (const r of rows) {
    // id, session_id, biomarker_name, biomarker_category, value, unit, ref_range_low, ref_range_high
    const [id, sessionId, biomarkerName, biomarkerCategory, value, unit, refRangeLow, refRangeHigh] = r;
    await pool.query(
      `INSERT INTO blood_test_values (id, session_id, biomarker_name, biomarker_category, value, unit, ref_range_low, ref_range_high)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO NOTHING`,
      [id, sessionId, biomarkerName, biomarkerCategory, value, unit, num(refRangeLow), num(refRangeHigh)]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows processed`);
}

async function importProducts() {
  console.log("\n📋 products…");
  const { rows } = loadCSV("products_1775808408010.csv");
  let n = 0;
  for (const r of rows) {
    // id, name, price, active, category, sort_order, source_group_buy_id, created_at, updated_at
    const [id, name, price, active, category, sortOrder, sourceGroupBuyId, createdAt, updatedAt] = r;
    await pool.query(
      `INSERT INTO products (id, name, price, active, category, sort_order, source_group_buy_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         price = EXCLUDED.price,
         active = EXCLUDED.active,
         category = EXCLUDED.category,
         sort_order = EXCLUDED.sort_order,
         updated_at = EXCLUDED.updated_at`,
      [
        id, name, price, bool(active), nul(category),
        sortOrder ? parseInt(sortOrder) : null,
        nul(sourceGroupBuyId), sq(createdAt), sq(updatedAt)
      ]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows processed`);
}

async function importSiteConfig() {
  console.log("\n📋 site_config…");
  const { rows } = loadCSV("site_config_1775808408010.csv");
  let n = 0;
  for (const r of rows) {
    const [key, value, updatedAt] = r;
    await pool.query(
      `INSERT INTO site_config (key, value, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
      [key, nul(value), sq(updatedAt)]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows processed`);
}

async function importVialVendors() {
  console.log("\n📋 vial_vendors…");
  const { rows } = loadCSV("vial_vendors_1775808408011.csv");
  let n = 0;
  for (const r of rows) {
    // id, name, tagline, description, contact_telegram, telegram_chat_id, logo_url,
    // ships_to, country, rating, seller_password_hash, wallet_address, revolut_link,
    // paypal_link, active, sort_order, created_at
    const [
      id, name, tagline, description, contactTelegram, telegramChatId, logoUrl,
      shipsTo, country, rating, sellerPasswordHash, walletAddress, revolutLink,
      paypalLink, active, sortOrder, createdAt
    ] = r;
    await pool.query(
      `INSERT INTO vial_vendors (id, name, tagline, description, contact_telegram, telegram_chat_id, logo_url,
        ships_to, country, rating, seller_password_hash, wallet_address, revolut_link, paypal_link,
        active, sort_order, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (id) DO NOTHING`,
      [
        id, name, nul(tagline), nul(description), nul(contactTelegram), nul(telegramChatId),
        nul(logoUrl), nul(shipsTo), nul(country), num(rating),
        nul(sellerPasswordHash), nul(walletAddress), nul(revolutLink), nul(paypalLink),
        bool(active), sortOrder ? parseInt(sortOrder) : null, sq(createdAt)
      ]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows processed`);
}

async function importVialProducts() {
  console.log("\n📋 vial_products…");
  const { rows } = loadCSV("vial_products_1775808408011.csv");
  let n = 0;
  for (const r of rows) {
    // id, vendor_id, name, description, category, mg_size, price, currency, stock,
    // manufacturer, batch_number, lab_report_url, image_url, active, sort_order,
    // created_at, updated_at
    const [
      id, vendorId, name, description, category, mgSize, price, currency, stock,
      manufacturer, batchNumber, labReportUrl, imageUrl, active, sortOrder,
      createdAt, updatedAt
    ] = r;
    await pool.query(
      `INSERT INTO vial_products (
        id, vendor_id, name, description, category, mg_size, price, currency, stock,
        manufacturer, batch_number, lab_report_url, image_url, active, sort_order,
        created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, price = EXCLUDED.price,
         stock = EXCLUDED.stock, active = EXCLUDED.active, updated_at = EXCLUDED.updated_at`,
      [
        id, nul(vendorId), name, nul(description), nul(category), nul(mgSize),
        price, currency || "USDT", stock ? parseInt(stock) : 0,
        nul(manufacturer), nul(batchNumber), nul(labReportUrl), nul(imageUrl),
        bool(active), sortOrder ? parseInt(sortOrder) : null,
        sq(createdAt), sq(updatedAt)
      ]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows processed`);
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Starting CSV import…");

  try {
    await importDeliveryMethods();
    await importGroupBuys();
    await importProducts();
    await importAccounts();
    await importAdminAlerts();
    await importAuditLogs();
    await importFs3Costs();
    await importLabTests();
    await importLookupAttempts();
    await importGroupBuyProducts();
    await importGroupBuyDeliveryMethods();
    await importOrders();
    await importOrderLineItems();
    await importBloodTestSessions();
    await importBloodTestValues();
    await importSiteConfig();
    await importVialVendors();
    await importVialProducts();

    console.log("\n✅ Import complete!");
  } catch (err) {
    console.error("\n❌ Import failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
