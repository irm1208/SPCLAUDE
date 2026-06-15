/**
 * Bulk import script — imports all exported tables into the DB.
 * Safe to re-run: uses ON CONFLICT DO NOTHING for all inserts.
 * Serial PK sequences are bumped to max(id) after each table.
 * Dependency order is respected.
 */
import pg from "pg";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ASSETS = resolve(__dirname, "../../attached_assets");
const load = (f) => JSON.parse(readFileSync(resolve(ASSETS, f), "utf8"));

// ── helpers ─────────────────────────────────────────────────────────────────

/** Insert rows with a single multi-values query — fastest for large tables.
 *  conflictTarget: SQL fragment for ON CONFLICT (...) — pass null to use ON CONFLICT DO NOTHING
 *  which catches all unique constraint violations. */
async function bulkInsert(client, table, cols, rows, conflictTarget) {
  if (!rows.length) return { inserted: 0, skipped: 0 };
  const BATCH = 500;
  let inserted = 0, skipped = 0;
  const conflictClause = conflictTarget
    ? `ON CONFLICT (${conflictTarget}) DO NOTHING`
    : `ON CONFLICT DO NOTHING`;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const placeholders = batch.map((_, ri) =>
      "(" + cols.map((_, ci) => "$" + (ri * cols.length + ci + 1)).join(",") + ")"
    ).join(",");
    const values = batch.flatMap(r => cols.map(c => r[c] ?? null));
    const sql = `INSERT INTO ${table} (${cols.join(",")}) VALUES ${placeholders} ${conflictClause}`;
    const res = await client.query(sql, values);
    inserted += res.rowCount ?? 0;
    skipped  += batch.length - (res.rowCount ?? 0);
  }
  return { inserted, skipped };
}

/** Insert rows one-at-a-time with savepoints — for tables with FK constraints
 *  where some rows may legitimately fail (missing FK target).
 *  conflictTarget: pass null to catch all unique violations. */
async function safeInsert(client, table, cols, rows, conflictTarget, valFn) {
  let inserted = 0, skipped = 0, failed = 0;
  const conflictClause = conflictTarget
    ? `ON CONFLICT (${conflictTarget}) DO NOTHING`
    : `ON CONFLICT DO NOTHING`;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const vals = valFn(row);
    await client.query(`SAVEPOINT sp${i}`);
    try {
      const placeholders = vals.map((_, j) => "$" + (j + 1)).join(",");
      const res = await client.query(
        `INSERT INTO ${table} (${cols.join(",")}) VALUES (${placeholders}) ${conflictClause}`,
        vals
      );
      await client.query(`RELEASE SAVEPOINT sp${i}`);
      if ((res.rowCount ?? 0) > 0) inserted++; else skipped++;
    } catch (e) {
      await client.query(`ROLLBACK TO SAVEPOINT sp${i}`);
      await client.query(`RELEASE SAVEPOINT sp${i}`);
      failed++;
      console.warn(`    ✗ ${table} row ${i} (${JSON.stringify(row).slice(0,80)}): ${e.message.split("\n")[0]}`);
    }
  }
  return { inserted, skipped, failed };
}

/** Reset a serial sequence to max(id) so future inserts don't collide. */
async function resetSeq(client, table, seqName) {
  await client.query(`SELECT setval('${seqName}', COALESCE((SELECT MAX(id) FROM ${table}), 1))`);
}

function j(v) { return v == null ? null : JSON.stringify(v); }
function log(name, r) {
  const parts = [`${r.inserted ?? 0} inserted`, `${r.skipped ?? 0} skipped`];
  if (r.failed) parts.push(`${r.failed} failed`);
  console.log(`  ${name}: ${parts.join(", ")}`);
}

// ── main ────────────────────────────────────────────────────────────────────
const client = await pool.connect();
try {
  // ── 1. group_buys ─────────────────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("group_buys_1778334009334.json");
    const cols = [
      "id","name","description","status","close_date","invite_pin","invite_pin_hash",
      "test_order_pin","manufacturer","manufacturer_country","info_cards","currency",
      "sort_order","lab_test_supplier","testing_enabled","vendor_shipping_enabled",
      "vendor_shipping_message","vendor_shipping_amount","vendor_shipping_mode",
      "vendor_shipping_equal_pct","vendor_shipping_kits","payment_message_enabled",
      "payment_message","payments_enabled","payments_test_mode","payments_test_usernames",
      "member_limit","min_members","max_kits_per_customer","max_kits_total",
      "min_kits_per_person","hidden_from_list","forced_usernames","shipping_options",
      "organiser_id","approval_status","organiser_payments","allowed_countries",
      "excluded_countries","pnl_costs","admin_fee_enabled","admin_fee_amount",
      "admin_fee_label","admin_fee_countries","shared_shipping_countries",
      "allow_half_kits","allow_order_addons","allow_edit_order_when_closed",
      "allow_edit_address_when_closed","allow_delete_order_when_closed",
      "show_stock_view","qr_upload_inpost_enabled","qr_upload_royal_mail_enabled",
      "qr_upload_message","qr_upload_couriers","order_page_message","payment_banner",
      "reshipper_invite_code","country_legs_enabled","allow_extra_orders",
      "organiser_order_edit_enabled","organiser_can_edit_status",
      "organiser_can_edit_payment_status","organiser_can_edit_tracking",
      "organiser_can_edit_notes","organiser_can_edit_tx_id","organiser_can_edit_quantities",
      "organiser_can_mark_oos","organiser_rules","qr_viewer_usernames","leg_viewer_access",
      "created_at","updated_at"
    ];
    const r = await bulkInsert(client, "group_buys", cols,
      rows.map(row => ({
        id: row.id, name: row.name, description: row.description,
        status: row.status, close_date: row.close_date, invite_pin: row.invite_pin,
        invite_pin_hash: row.invite_pin_hash, test_order_pin: row.test_order_pin,
        manufacturer: row.manufacturer, manufacturer_country: row.manufacturer_country,
        info_cards: row.info_cards, currency: row.currency, sort_order: row.sort_order,
        lab_test_supplier: row.lab_test_supplier, testing_enabled: row.testing_enabled ?? false,
        vendor_shipping_enabled: row.vendor_shipping_enabled ?? false,
        vendor_shipping_message: row.vendor_shipping_message,
        vendor_shipping_amount: row.vendor_shipping_amount,
        vendor_shipping_mode: row.vendor_shipping_mode ?? "equal",
        vendor_shipping_equal_pct: row.vendor_shipping_equal_pct ?? 100,
        vendor_shipping_kits: row.vendor_shipping_kits,
        payment_message_enabled: row.payment_message_enabled ?? false,
        payment_message: row.payment_message, payments_enabled: row.payments_enabled ?? true,
        payments_test_mode: row.payments_test_mode ?? false,
        payments_test_usernames: j(row.payments_test_usernames),
        member_limit: row.member_limit, min_members: row.min_members,
        max_kits_per_customer: row.max_kits_per_customer, max_kits_total: row.max_kits_total,
        min_kits_per_person: row.min_kits_per_person, hidden_from_list: row.hidden_from_list ?? false,
        forced_usernames: j(row.forced_usernames), shipping_options: row.shipping_options,
        organiser_id: row.organiser_id, approval_status: row.approval_status,
        organiser_payments: j(row.organiser_payments), allowed_countries: j(row.allowed_countries),
        excluded_countries: j(row.excluded_countries), pnl_costs: j(row.pnl_costs),
        admin_fee_enabled: row.admin_fee_enabled ?? false,
        admin_fee_amount: row.admin_fee_amount, admin_fee_label: row.admin_fee_label,
        admin_fee_countries: row.admin_fee_countries, shared_shipping_countries: row.shared_shipping_countries,
        allow_half_kits: row.allow_half_kits ?? true, allow_order_addons: row.allow_order_addons ?? true,
        allow_edit_order_when_closed: row.allow_edit_order_when_closed ?? true,
        allow_edit_address_when_closed: row.allow_edit_address_when_closed ?? true,
        allow_delete_order_when_closed: row.allow_delete_order_when_closed ?? true,
        show_stock_view: row.show_stock_view ?? true,
        qr_upload_inpost_enabled: row.qr_upload_inpost_enabled ?? false,
        qr_upload_royal_mail_enabled: row.qr_upload_royal_mail_enabled ?? false,
        qr_upload_message: row.qr_upload_message, qr_upload_couriers: j(row.qr_upload_couriers),
        order_page_message: row.order_page_message, payment_banner: row.payment_banner,
        reshipper_invite_code: row.reshipper_invite_code, country_legs_enabled: row.country_legs_enabled ?? false,
        allow_extra_orders: row.allow_extra_orders ?? false,
        organiser_order_edit_enabled: row.organiser_order_edit_enabled ?? false,
        organiser_can_edit_status: row.organiser_can_edit_status ?? true,
        organiser_can_edit_payment_status: row.organiser_can_edit_payment_status ?? true,
        organiser_can_edit_tracking: row.organiser_can_edit_tracking ?? true,
        organiser_can_edit_notes: row.organiser_can_edit_notes ?? true,
        organiser_can_edit_tx_id: row.organiser_can_edit_tx_id ?? false,
        organiser_can_edit_quantities: row.organiser_can_edit_quantities ?? false,
        organiser_can_mark_oos: row.organiser_can_mark_oos ?? true,
        organiser_rules: j(row.organiser_rules), qr_viewer_usernames: j(row.qr_viewer_usernames),
        leg_viewer_access: j(row.leg_viewer_access),
        created_at: row.created_at, updated_at: row.updated_at,
      })),
      "id"
    );
    await client.query("COMMIT");
    log("group_buys", r);
  }

  // ── 2. gb_country_legs ────────────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("gb_country_legs_1778334009332.json");
    const r = await bulkInsert(client, "gb_country_legs",
      ["id","gb_id","country_code","country_name","invite_enabled","invite_code",
       "status","sort_order","message","country_note","vendor_shipping_cost",
       "vendor_package_count","direct_shipping_enabled","wholesale_vendor_id",
       "kit_count_excluded_order_ids","created_at"],
      rows.map(row => ({
        id: row.id, gb_id: row.gb_id, country_code: row.country_code,
        country_name: row.country_name, invite_enabled: row.invite_enabled ?? false,
        invite_code: row.invite_code, status: row.status ?? "active",
        sort_order: row.sort_order ?? 0, message: row.message, country_note: row.country_note,
        vendor_shipping_cost: row.vendor_shipping_cost,
        vendor_package_count: row.vendor_package_count,
        direct_shipping_enabled: row.direct_shipping_enabled ?? false,
        wholesale_vendor_id: row.wholesale_vendor_id,
        kit_count_excluded_order_ids: j(row.kit_count_excluded_order_ids),
        created_at: row.created_at,
      })),
      null  // catches both PK and unique(gb_id, country_code) violations
    );
    await client.query("COMMIT");
    log("gb_country_legs", r);
  }

  // ── 3. delivery_methods ───────────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("delivery_methods_1778334009332.json");
    const r = await bulkInsert(client, "delivery_methods",
      ["id","name","price","active","sort_order","info_enabled","info_text","created_at","updated_at"],
      rows.map(row => ({
        id: row.id, name: row.name, price: row.price ?? "0.00",
        active: row.active ?? true, sort_order: row.sort_order,
        info_enabled: row.info_enabled ?? false, info_text: row.info_text,
        created_at: row.created_at, updated_at: row.updated_at,
      })),
      "id"
    );
    await client.query("COMMIT");
    log("delivery_methods", r);
  }

  // ── 4. group_buy_delivery_methods ─────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("group_buy_delivery_methods_1778334009334.json");
    const r = await bulkInsert(client, "group_buy_delivery_methods",
      ["id","group_buy_id","delivery_method_id"],
      rows.map(row => ({ id: row.id, group_buy_id: row.group_buy_id, delivery_method_id: row.delivery_method_id })),
      null  // catches both PK and unique(group_buy_id, delivery_method_id)
    );
    await client.query("COMMIT");
    log("group_buy_delivery_methods", r);
  }

  // ── 5. group_buy_products (savepoints — product FK may be missing) ─────────
  {
    await client.query("BEGIN");
    const rows = load("group_buy_products_1778334009334.json");
    const r = await safeInsert(client, "group_buy_products",
      ["id","group_buy_id","product_id","price_override","active","sort_order"],
      rows,
      null,  // catches both PK and unique(group_buy_id, product_id)
      row => [row.id, row.group_buy_id, row.product_id, row.price_override ?? null, row.active ?? true, row.sort_order ?? null]
    );
    await client.query("COMMIT");
    log("group_buy_products", r);
  }

  // ── 6. gb_reshippers ──────────────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("gb_reshippers_1778334009333.json");
    const r = await safeInsert(client, "gb_reshippers",
      ["id","gb_id","reshipper_username","country","enabled_payment_methods",
       "reshipper_payment_details","created_at","enabled","payment_target",
       "reshipper_fee_enabled","reshipper_fee_type","reshipper_fee_amount",
       "allow_payments","allow_vendor_shipping_split"],
      rows,
      null,  // catches both PK and unique(gb_id, reshipper_username)
      row => [
        row.id, row.gb_id, row.reshipper_username, row.country,
        j(row.enabled_payment_methods), j(row.reshipper_payment_details),
        row.created_at, row.enabled ?? true, row.payment_target ?? "admin",
        row.reshipper_fee_enabled ?? false, row.reshipper_fee_type ?? "fixed",
        row.reshipper_fee_amount ?? null, row.allow_payments ?? false,
        row.allow_vendor_shipping_split ?? true,
      ]
    );
    await client.query("COMMIT");
    log("gb_reshippers", r);
  }

  // ── 7. gb_parcels ─────────────────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("gb_parcels_1778334009333.json");
    const r = await bulkInsert(client, "gb_parcels",
      ["id","group_buy_id","label","carrier","tracking_number","status","status_code",
       "items","cached_events","notes","tracking_url","tracking_params","last_checked","created_at","updated_at"],
      rows.map(row => ({
        id: row.id, group_buy_id: row.group_buy_id, label: row.label,
        carrier: row.carrier ?? "Auto", tracking_number: row.tracking_number,
        status: row.status ?? "pending", status_code: row.status_code ?? 0,
        items: j(row.items ?? []), cached_events: j(row.cached_events ?? []),
        notes: row.notes, tracking_url: row.tracking_url,
        tracking_params: j(row.tracking_params), last_checked: row.last_checked,
        created_at: row.created_at, updated_at: row.updated_at,
      })),
      "id"
    );
    await client.query("COMMIT");
    log("gb_parcels", r);
  }

  // ── 8. gb_testing_rounds ──────────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("gb_testing_rounds_1778334009333.json");
    const r = await bulkInsert(client, "gb_testing_rounds",
      ["id","group_buy_id","contribution_amount","any_contribution","janoshik_payment_url",
       "status","vote_options","test_options","result_notes","result_pdf_url",
       "result_posted_at","created_at","updated_at"],
      rows.map(row => ({
        id: row.id, group_buy_id: row.group_buy_id,
        contribution_amount: row.contribution_amount ?? "15",
        any_contribution: row.any_contribution ?? false,
        janoshik_payment_url: row.janoshik_payment_url,
        status: row.status ?? "active", vote_options: j(row.vote_options),
        test_options: j(row.test_options), result_notes: row.result_notes,
        result_pdf_url: row.result_pdf_url, result_posted_at: row.result_posted_at,
        created_at: row.created_at, updated_at: row.updated_at,
      })),
      "id"
    );
    await client.query("COMMIT");
    log("gb_testing_rounds", r);
  }

  // ── 9. gb_waitlist ────────────────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("gb_waitlist_1778334009333.json");
    const r = await safeInsert(client, "gb_waitlist",
      ["id","group_buy_id","account_id","joined_at","notified_at"],
      rows,
      null,  // catches both PK and unique(group_buy_id, account_id)
      row => [row.id, row.group_buy_id, row.account_id, row.joined_at, row.notified_at ?? null]
    );
    await client.query("COMMIT");
    log("gb_waitlist", r);
  }

  // ── 10. intl_parcel_sizes ─────────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("intl_parcel_sizes_1778334009334.json");
    const r = await bulkInsert(client, "intl_parcel_sizes",
      ["id","group_buy_id","name","weight_kg","length_cm","width_cm","height_cm","qty_label","sort_order","active","notes"],
      rows.map(row => ({
        id: row.id, group_buy_id: row.group_buy_id, name: row.name,
        weight_kg: row.weight_kg, length_cm: row.length_cm, width_cm: row.width_cm,
        height_cm: row.height_cm, qty_label: row.qty_label,
        sort_order: row.sort_order ?? 0, active: row.active ?? true, notes: row.notes,
      })),
      "id"
    );
    await client.query("COMMIT");
    log("intl_parcel_sizes", r);
  }

  // ── 11. intl_shipping_rates ───────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("intl_shipping_rates_1778334009335.json");
    const r = await bulkInsert(client, "intl_shipping_rates",
      ["id","group_buy_id","parcel_size_id","country","region","carrier",
       "price_gbp","price_usd","price_eur","active","sort_order"],
      rows.map(row => ({
        id: row.id, group_buy_id: row.group_buy_id, parcel_size_id: row.parcel_size_id,
        country: row.country, region: row.region, carrier: row.carrier,
        price_gbp: row.price_gbp, price_usd: row.price_usd, price_eur: row.price_eur,
        active: row.active ?? true, sort_order: row.sort_order ?? 0,
      })),
      "id"
    );
    await client.query("COMMIT");
    log("intl_shipping_rates", r);
  }

  // ── 12. customers ─────────────────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("customers_1778334009331.json");
    const r = await bulkInsert(client, "customers",
      ["telegram_username","full_name","email","phone","address","account_status","notes","tags","created_at","updated_at"],
      rows.map(row => ({
        telegram_username: row.telegram_username, full_name: row.full_name,
        email: row.email, phone: row.phone, address: row.address,
        account_status: row.account_status ?? "active", notes: row.notes,
        tags: j(row.tags ?? []), created_at: row.created_at, updated_at: row.updated_at,
      })),
      "telegram_username"
    );
    await client.query("COMMIT");
    log("customers", r);
  }

  // ── 13. glp1_logs ─────────────────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("glp1_logs_1778334009334.json");
    const r = await safeInsert(client, "glp1_logs",
      ["id","telegram_username","logged_date","compound_name","dose_mg","weight_kg",
       "weight_unit","notes","injection_site","side_effects","calories","protein_g","water_ml","created_at"],
      rows,
      "id",
      row => [
        row.id, row.telegram_username, row.logged_date, row.compound_name,
        row.dose_mg, row.weight_kg, row.weight_unit ?? "kg", row.notes,
        row.injection_site, row.side_effects, row.calories, row.protein_g,
        row.water_ml, row.created_at,
      ]
    );
    await client.query("COMMIT");
    log("glp1_logs", r);
  }

  // ── 14. customer_activity_logs ────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("customer_activity_logs_1778334009331.json");
    const r = await safeInsert(client, "customer_activity_logs",
      ["id","telegram_username","event_category","event_type","entity_id",
       "actor_username","actor_type","metadata","created_at"],
      rows,
      "id",
      row => [
        row.id, row.telegram_username, row.event_category, row.event_type,
        row.entity_id, row.actor_username, row.actor_type ?? "customer",
        j(row.metadata), row.created_at,
      ]
    );
    await client.query("COMMIT");
    log("customer_activity_logs", r);
  }

  // ── 15. geo_ip_cache ──────────────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("geo_ip_cache_1778334009334.json");
    const r = await bulkInsert(client, "geo_ip_cache",
      ["ip","country","city","region","isp","org","lat","lon","is_proxy","is_hosting","expires_at","created_at"],
      rows.map(row => ({
        ip: row.ip, country: row.country, city: row.city, region: row.region,
        isp: row.isp, org: row.org, lat: row.lat, lon: row.lon,
        is_proxy: row.is_proxy, is_hosting: row.is_hosting,
        expires_at: row.expires_at, created_at: row.created_at,
      })),
      "ip"
    );
    await client.query("COMMIT");
    log("geo_ip_cache", r);
  }

  // ── 16. batch_code_prefixes (serial PK) ───────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("batch_code_prefixes_1778334009330.json");
    const r = await bulkInsert(client, "batch_code_prefixes",
      ["id","prefix","compound_name","nominal_dose","created_at","updated_at"],
      rows.map(row => ({
        id: row.id, prefix: row.prefix, compound_name: row.compound_name,
        nominal_dose: row.nominal_dose ?? "", created_at: row.created_at, updated_at: row.updated_at,
      })),
      "id"
    );
    await resetSeq(client, "batch_code_prefixes", "batch_code_prefixes_id_seq");
    await client.query("COMMIT");
    log("batch_code_prefixes", r);
  }

  // ── 17. fs3_costs (serial PK, unique product_name) ────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("fs3_costs_1778334009332.json");
    const r = await bulkInsert(client, "fs3_costs",
      ["id","product_name","unit_cost","created_at","updated_at"],
      rows.map(row => ({
        id: row.id, product_name: row.product_name, unit_cost: row.unit_cost,
        created_at: row.created_at, updated_at: row.updated_at,
      })),
      "id"
    );
    await resetSeq(client, "fs3_costs", "fs3_costs_id_seq");
    await client.query("COMMIT");
    log("fs3_costs", r);
  }

  // ── 18. credit_transactions (serial PK) ───────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("credit_transactions_1778334009331.json");
    const r = await safeInsert(client, "credit_transactions",
      ["id","account_username","amount","reason","order_id","admin_username","created_at"],
      rows,
      "id",
      row => [row.id, row.account_username, row.amount, row.reason, row.order_id ?? null, row.admin_username ?? null, row.created_at]
    );
    if (!r.failed) await resetSeq(client, "credit_transactions", "credit_transactions_id_seq");
    await client.query("COMMIT");
    log("credit_transactions", r);
  }

  // ── 19. admin_alerts (serial PK, 2227 rows) ───────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("admin_alerts_1778334009329.json");
    const r = await bulkInsert(client, "admin_alerts",
      ["id","type","priority","title","message","is_read","link_url","related_entity_id","created_at"],
      rows.map(row => ({
        id: row.id, type: row.type, priority: row.priority ?? "medium",
        title: row.title, message: row.message, is_read: row.is_read ?? false,
        link_url: row.link_url, related_entity_id: row.related_entity_id,
        created_at: row.created_at,
      })),
      "id"
    );
    await resetSeq(client, "admin_alerts", "admin_alerts_id_seq");
    await client.query("COMMIT");
    log("admin_alerts", r);
  }

  // ── 20. audit_logs (serial PK, 9836 rows) ─────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("audit_logs_1778334009330.json");
    const r = await bulkInsert(client, "audit_logs",
      ["id","type","level","action","message","metadata","ip","created_at"],
      rows.map(row => ({
        id: row.id, type: row.type, level: row.level ?? "info",
        action: row.action, message: row.message,
        metadata: j(row.metadata), ip: row.ip, created_at: row.created_at,
      })),
      "id"
    );
    await resetSeq(client, "audit_logs", "audit_logs_id_seq");
    await client.query("COMMIT");
    log("audit_logs", r);
  }

  console.log("\nAll done.");
} catch (err) {
  try { await client.query("ROLLBACK"); } catch (_) {}
  console.error("Fatal error — rolled back:", err);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
