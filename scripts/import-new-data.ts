/**
 * Import script for the latest CSV exports (timestamp suffix _1775493274*).
 * Run from Product-Landing-Page/: pnpm exec tsx scripts/import-new-data.ts
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

// ─── CSV Parser ─────────────────────────────────────────────────────────────

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

function loadCSV(filename: string): { headers: string[]; rows: string[][] } {
  const absPath = path.resolve(__dirname, "../../attached_assets", filename);
  if (!fs.existsSync(absPath)) {
    console.warn(`  ⚠ File not found: ${absPath}`);
    return { headers: [], rows: [] };
  }
  const content = fs.readFileSync(absPath, "utf-8").trim();
  if (!content) return { headers: [], rows: [] };
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

// ─── Import functions ────────────────────────────────────────────────────────

async function importAccounts() {
  console.log("\n📋 accounts…");
  // telegram_username,password_hash,email,account_status,telegram_chat_id,
  // telegram_notifications,telegram_link_token,telegram_link_expires_at,
  // health_data_consent,created_at,updated_at
  const { rows } = loadCSV("accounts_1775493274258.csv");
  let n = 0;
  for (const r of rows) {
    const [
      telegramUsername, passwordHash, email, accountStatus,
      telegramChatId, telegramNotifications, telegramLinkToken,
      telegramLinkExpiresAt, healthDataConsent, createdAt, updatedAt
    ] = r;
    let notificationsJson: object | null = null;
    try {
      notificationsJson = telegramNotifications ? JSON.parse(telegramNotifications) : null;
    } catch { notificationsJson = null; }
    await pool.query(
      `INSERT INTO accounts (
        telegram_username, password_hash, email, account_status,
        telegram_chat_id, telegram_notifications, telegram_link_token,
        telegram_link_expires_at, health_data_consent, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (telegram_username) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        email = EXCLUDED.email,
        account_status = EXCLUDED.account_status,
        telegram_chat_id = EXCLUDED.telegram_chat_id,
        telegram_notifications = EXCLUDED.telegram_notifications,
        health_data_consent = EXCLUDED.health_data_consent,
        updated_at = EXCLUDED.updated_at`,
      [
        nul(telegramUsername), nul(passwordHash), nul(email), accountStatus || "active",
        nul(telegramChatId), notificationsJson, nul(telegramLinkToken),
        sq(telegramLinkExpiresAt), bool(healthDataConsent), sq(createdAt), sq(updatedAt)
      ]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows`);
}

async function importAdminAlerts() {
  console.log("\n📋 admin_alerts…");
  // id,type,priority,title,message,is_read,link_url,related_entity_id,created_at
  const { rows } = loadCSV("admin_alerts_1775493274258.csv");
  let n = 0;
  for (const r of rows) {
    const [id, type, priority, title, message, isRead, linkUrl, relatedEntityId, createdAt] = r;
    await pool.query(
      `INSERT INTO admin_alerts (id, type, priority, title, message, is_read, link_url, related_entity_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [parseInt(id), type, priority || "medium", title, message, bool(isRead), nul(linkUrl), nul(relatedEntityId), sq(createdAt)]
    );
    n++;
  }
  await resetSeq("admin_alerts");
  console.log(`  ✓ ${n} rows`);
}

async function importAuditLogs() {
  console.log("\n📋 audit_logs…");
  // id,type,level,action,message,metadata,ip,created_at
  const { rows } = loadCSV("audit_logs_1775493274258.csv");
  let n = 0;
  for (const r of rows) {
    const [id, type, level, action, message, metadata, ip, createdAt] = r;
    let metaJson: object | null = null;
    try { metaJson = metadata ? JSON.parse(metadata) : null; } catch { metaJson = null; }
    await pool.query(
      `INSERT INTO audit_logs (id, type, level, action, message, metadata, ip, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO NOTHING`,
      [parseInt(id), type, level || "info", action, message, metaJson, nul(ip), sq(createdAt)]
    );
    n++;
  }
  await resetSeq("audit_logs");
  console.log(`  ✓ ${n} rows`);
}

async function importBloodTestSessions() {
  console.log("\n📋 blood_test_sessions…");
  // id,telegram_username,test_date,lab_name,notes,created_at
  const { rows } = loadCSV("blood_test_sessions_1775493274259.csv");
  let n = 0;
  for (const r of rows) {
    const [id, telegramUsername, testDate, labName, notes, createdAt] = r;
    const dateVal = sq(testDate);
    const datePart = dateVal ? dateVal.split("T")[0] : null;
    await pool.query(
      `INSERT INTO blood_test_sessions (id, telegram_username, test_date, lab_name, notes, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [id, telegramUsername, datePart, nul(labName), nul(notes), sq(createdAt)]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows`);
}

async function importBloodTestValues() {
  console.log("\n📋 blood_test_values…");
  // id,session_id,biomarker_name,biomarker_category,value,unit,ref_range_low,ref_range_high
  const { rows } = loadCSV("blood_test_values_1775493274259.csv");
  let n = 0;
  for (const r of rows) {
    const [id, sessionId, biomarkerName, biomarkerCategory, value, unit, refRangeLow, refRangeHigh] = r;
    await pool.query(
      `INSERT INTO blood_test_values (id, session_id, biomarker_name, biomarker_category, value, unit, ref_range_low, ref_range_high)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO NOTHING`,
      [id, sessionId, biomarkerName, biomarkerCategory, value, unit, num(refRangeLow), num(refRangeHigh)]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows`);
}

async function importDeliveryMethods() {
  console.log("\n📋 delivery_methods…");
  // id,name,price,active,sort_order,created_at,updated_at
  const { rows } = loadCSV("delivery_methods_1775493274261.csv");
  let n = 0;
  for (const r of rows) {
    const [id, name, price, active, sortOrder, createdAt, updatedAt] = r;
    await pool.query(
      `INSERT INTO delivery_methods (id, name, price, active, sort_order, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, price = EXCLUDED.price,
         active = EXCLUDED.active, sort_order = EXCLUDED.sort_order,
         updated_at = EXCLUDED.updated_at`,
      [id, name, price, bool(active), sortOrder ? parseInt(sortOrder) : null, sq(createdAt), sq(updatedAt)]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows`);
}

async function importFs3Costs() {
  console.log("\n📋 fs3_costs…");
  // id,product_name,unit_cost,created_at,updated_at
  const { rows } = loadCSV("fs3_costs_1775493274262.csv");
  let n = 0;
  for (const r of rows) {
    const [id, productName, unitCost, createdAt, updatedAt] = r;
    await pool.query(
      `INSERT INTO fs3_costs (id, product_name, unit_cost, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO NOTHING`,
      [parseInt(id), productName, unitCost, sq(createdAt), sq(updatedAt)]
    );
    n++;
  }
  await resetSeq("fs3_costs");
  console.log(`  ✓ ${n} rows`);
}

async function importGroupBuys() {
  console.log("\n📋 group_buys…");
  // id,name,description,status,close_date,invite_pin_hash,manufacturer,
  // manufacturer_country,info_cards,currency,sort_order,created_at,updated_at
  const { rows } = loadCSV("group_buys_1775493274263.csv");
  let n = 0;
  for (const r of rows) {
    const [
      id, name, description, status, closeDate, invitePinHash,
      manufacturer, manufacturerCountry, infoCards, currency,
      sortOrder, createdAt, updatedAt
    ] = r;
    await pool.query(
      `INSERT INTO group_buys (
        id, name, description, status, close_date, invite_pin_hash,
        manufacturer, manufacturer_country, info_cards, currency,
        sort_order, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, description = EXCLUDED.description,
        status = EXCLUDED.status, close_date = EXCLUDED.close_date,
        updated_at = EXCLUDED.updated_at`,
      [
        id, name, nul(description), status || "draft", sq(closeDate), nul(invitePinHash),
        nul(manufacturer), nul(manufacturerCountry), nul(infoCards),
        currency || "GBP", sortOrder ? parseInt(sortOrder) : null,
        sq(createdAt), sq(updatedAt)
      ]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows`);
}

async function importGroupBuyDeliveryMethods() {
  console.log("\n📋 group_buy_delivery_methods…");
  // id,group_buy_id,delivery_method_id
  const { rows } = loadCSV("group_buy_delivery_methods_1775493274262.csv");
  let n = 0;
  for (const r of rows) {
    const [id, groupBuyId, deliveryMethodId] = r;
    await pool.query(
      `INSERT INTO group_buy_delivery_methods (id, group_buy_id, delivery_method_id)
       VALUES ($1,$2,$3)
       ON CONFLICT (id) DO NOTHING`,
      [id, groupBuyId, deliveryMethodId]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows`);
}

async function importGroupBuyProducts() {
  console.log("\n📋 group_buy_products…");
  // id,group_buy_id,product_id,price_override,active,sort_order
  const { rows } = loadCSV("group_buy_products_1775493274263.csv");
  const { rows: productRows } = await pool.query(`SELECT id FROM products`);
  const validProductIds = new Set(productRows.map((r: { id: string }) => r.id));

  let n = 0, skipped = 0;
  for (const r of rows) {
    const [id, groupBuyId, productId, priceOverride, active, sortOrder] = r;
    if (!validProductIds.has(productId)) {
      skipped++;
      continue;
    }
    await pool.query(
      `INSERT INTO group_buy_products (id, group_buy_id, product_id, price_override, active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [id, groupBuyId, productId, num(priceOverride), bool(active !== "" ? active : "true"), sortOrder ? parseInt(sortOrder) : null]
    );
    n++;
  }
  if (skipped > 0) console.log(`  ⚠ Skipped ${skipped} rows with unknown product IDs`);
  console.log(`  ✓ ${n} rows`);
}

async function importLabTests() {
  console.log("\n📋 lab_tests…");
  // id,janoshik_id,url,peptide_name,mg_amount,supplier,batch_code,
  // purity_pct,endotoxin_eu_mg,sterility_pass,test_date,notes,
  // is_third_party_test,pending,created_at
  const { rows } = loadCSV("lab_tests_1775493274263.csv");
  let n = 0;
  for (const r of rows) {
    const [
      id, janoshikId, url, peptideName, mgAmount, supplier, batchCode,
      purityPct, endotoxinEuMg, sterilityPass, testDate, notes,
      isThirdPartyTest, pending, createdAt
    ] = r;
    await pool.query(
      `INSERT INTO lab_tests (
        id, janoshik_id, url, peptide_name, mg_amount, supplier, batch_code,
        purity_pct, endotoxin_eu_mg, sterility_pass, test_date, notes,
        is_third_party_test, pending, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (id) DO NOTHING`,
      [
        parseInt(id), janoshikId, url, peptideName, num(mgAmount),
        supplier || "Uther", nul(batchCode),
        num(purityPct), num(endotoxinEuMg),
        sterilityPass === "" ? null : bool(sterilityPass),
        nul(testDate), nul(notes),
        isThirdPartyTest === "" ? false : bool(isThirdPartyTest),
        pending === "" ? false : bool(pending),
        sq(createdAt)
      ]
    );
    n++;
  }
  await resetSeq("lab_tests");
  console.log(`  ✓ ${n} rows`);
}

async function importLookupAttempts() {
  console.log("\n📋 lookup_attempts…");
  // id,identifier,failed_attempts,blocked_until,last_attempt_at
  const { rows } = loadCSV("lookup_attempts_1775493274263.csv");
  let n = 0;
  for (const r of rows) {
    const [id, identifier, failedAttempts, blockedUntil, lastAttemptAt] = r;
    await pool.query(
      `INSERT INTO lookup_attempts (id, identifier, failed_attempts, blocked_until, last_attempt_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO NOTHING`,
      [id, identifier, parseInt(failedAttempts) || 0, sq(blockedUntil), sq(lastAttemptAt)]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows`);
}

async function importOrders() {
  console.log("\n📋 orders…");
  // id,code,telegram_username,delivery_method,delivery_method_id,delivery_price,
  // vendor_shipping,product_subtotal,tip,grand_total,notes,status,admin_notes,
  // admin_message,tracking_number,payment_status,payment_tx_hash,payment_test_amount,
  // test_payment_tx_hash,shipping_name,shipping_address,pin,inpost_qr_code,
  // group_buy_id,created_at,updated_at
  const { rows } = loadCSV("orders_1775493274264.csv");
  let n = 0;
  for (const r of rows) {
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
        group_buy_id, created_at, updated_at
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
        nul(groupBuyId), sq(createdAt), sq(updatedAt)
      ]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows`);
}

async function importOrderLineItems() {
  console.log("\n📋 order_line_items…");
  // id,order_id,product_id,product_name,quantity,unit_price,line_total,created_at,updated_at
  const { rows } = loadCSV("order_line_items_1775493274264.csv");
  let n = 0;
  for (const r of rows) {
    const [id, orderId, productId, productName, quantity, unitPrice, lineTotal, createdAt, updatedAt] = r;
    await pool.query(
      `INSERT INTO order_line_items (id, order_id, product_id, product_name, quantity, unit_price, line_total, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [id, orderId, productId || "", productName, quantity, unitPrice, lineTotal, sq(createdAt), sq(updatedAt)]
    );
    n++;
  }
  console.log(`  ✓ ${n} rows`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Starting import of new CSV data…\n");
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
    console.log("\n✅ Import complete!");
  } catch (err) {
    console.error("\n❌ Import failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
