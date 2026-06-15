/**
 * Bulk import script — second batch of tables.
 * Safe to re-run: ON CONFLICT DO NOTHING throughout.
 * Serial PK sequences reset after each serial table.
 * Dependency order: products → orders → line_items → pool → tickets → rest.
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

// ── helpers ──────────────────────────────────────────────────────────────────

async function bulkInsert(client, table, cols, rows) {
  if (!rows.length) return { inserted: 0, skipped: 0 };
  const BATCH = 300;
  let inserted = 0, skipped = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const placeholders = batch.map((_, ri) =>
      "(" + cols.map((_, ci) => "$" + (ri * cols.length + ci + 1)).join(",") + ")"
    ).join(",");
    const values = batch.flatMap(r => cols.map(c => r[c] ?? null));
    const res = await client.query(
      `INSERT INTO ${table} (${cols.join(",")}) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
      values
    );
    inserted += res.rowCount ?? 0;
    skipped  += batch.length - (res.rowCount ?? 0);
  }
  return { inserted, skipped };
}

async function safeInsert(client, table, cols, rows, valFn) {
  let inserted = 0, skipped = 0, failed = 0;
  for (let i = 0; i < rows.length; i++) {
    await client.query(`SAVEPOINT sp${i}`);
    try {
      const vals = valFn(rows[i]);
      const ph = vals.map((_, j) => "$" + (j + 1)).join(",");
      const res = await client.query(
        `INSERT INTO ${table} (${cols.join(",")}) VALUES (${ph}) ON CONFLICT DO NOTHING`, vals
      );
      await client.query(`RELEASE SAVEPOINT sp${i}`);
      (res.rowCount ?? 0) > 0 ? inserted++ : skipped++;
    } catch (e) {
      await client.query(`ROLLBACK TO SAVEPOINT sp${i}`);
      await client.query(`RELEASE SAVEPOINT sp${i}`);
      failed++;
      console.warn(`    ✗ ${table}[${i}]: ${e.message.split("\n")[0]}`);
    }
  }
  return { inserted, skipped, failed };
}

async function resetSeq(client, table, seq) {
  await client.query(`SELECT setval('${seq}', COALESCE((SELECT MAX(id) FROM ${table}), 1))`);
}

function j(v) { return v == null ? null : JSON.stringify(v); }
function log(name, r) {
  const p = [`${r.inserted ?? 0} inserted`, `${r.skipped ?? 0} skipped`];
  if (r.failed) p.push(`${r.failed} failed`);
  console.log(`  ${name}: ${p.join(", ")}`);
}

// ── main ─────────────────────────────────────────────────────────────────────
const client = await pool.connect();
try {

  // ── 1. products ────────────────────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("products_1778334125030.json");
    const r = await bulkInsert(client, "products",
      ["id","name","vendor","price","active","category","sort_order",
       "source_group_buy_id","organiser_id","mg_size","unit_count",
       "wholesale_enabled","wholesale_price","half_kit_enabled",
       "stock","low_stock_threshold","weight_grams","created_at","updated_at"],
      rows.map(row => ({
        id: row.id, name: row.name, vendor: row.vendor ?? "Uther",
        price: row.price, active: row.active ?? true, category: row.category,
        sort_order: row.sort_order, source_group_buy_id: row.source_group_buy_id,
        organiser_id: row.organiser_id, mg_size: row.mg_size,
        unit_count: row.unit_count, wholesale_enabled: row.wholesale_enabled ?? true,
        wholesale_price: row.wholesale_price, half_kit_enabled: row.half_kit_enabled ?? true,
        stock: row.stock, low_stock_threshold: row.low_stock_threshold,
        weight_grams: row.weight_grams, created_at: row.created_at, updated_at: row.updated_at,
      }))
    );
    await client.query("COMMIT");
    log("products", r);
  }

  // ── 2. test_catalog ────────────────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("test_catalog_1778334125032.json");
    const r = await bulkInsert(client, "test_catalog",
      ["id","code","name","lab_name","description","default_price_usd","unit_label",
       "sort_order","active","category","analysis_section","created_at"],
      rows.map(row => ({
        id: row.id, code: row.code, name: row.name, lab_name: row.lab_name,
        description: row.description, default_price_usd: row.default_price_usd ?? "0",
        unit_label: row.unit_label ?? "test", sort_order: row.sort_order ?? 0,
        active: row.active ?? true, category: row.category ?? "analysis",
        analysis_section: row.analysis_section, created_at: row.created_at,
      }))
    );
    await client.query("COMMIT");
    log("test_catalog", r);
  }

  // ── 3. testing_pools ───────────────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("testing_pools_1778334125032.json");
    const r = await bulkInsert(client, "testing_pools",
      ["id","slug","leader_username","title","description","compound_name","manufacturer",
       "batch_number","status","voting_mode","target_amount_usd","results_password_hash",
       "payout_wallet_address","payout_currency","payout_network","result_notes",
       "result_pdf_url","result_posted_at","payment_methods","contributor_named_report_enabled",
       "stop_on_funded","fixed_opt_in_fee_usd","group_buy_id","cap_color","mg_size",
       "manufacturing_date","approval_status","rejection_reason","hidden_from_list",
       "allow_vial_contribution","page_message","image_url","named_report_cap",
       "created_at","updated_at"],
      rows.map(row => ({
        id: row.id, slug: row.slug, leader_username: row.leader_username,
        title: row.title, description: row.description, compound_name: row.compound_name,
        manufacturer: row.manufacturer, batch_number: row.batch_number,
        status: row.status ?? "draft", voting_mode: row.voting_mode ?? "leader_decides",
        target_amount_usd: row.target_amount_usd ?? "0",
        results_password_hash: row.results_password_hash,
        payout_wallet_address: row.payout_wallet_address,
        payout_currency: row.payout_currency, payout_network: row.payout_network,
        result_notes: row.result_notes, result_pdf_url: row.result_pdf_url,
        result_posted_at: row.result_posted_at, payment_methods: j(row.payment_methods),
        contributor_named_report_enabled: row.contributor_named_report_enabled ?? false,
        stop_on_funded: row.stop_on_funded ?? false,
        fixed_opt_in_fee_usd: row.fixed_opt_in_fee_usd, group_buy_id: row.group_buy_id,
        cap_color: row.cap_color, mg_size: row.mg_size,
        manufacturing_date: row.manufacturing_date,
        approval_status: row.approval_status ?? "approved",
        rejection_reason: row.rejection_reason,
        hidden_from_list: row.hidden_from_list ?? false,
        allow_vial_contribution: row.allow_vial_contribution ?? false,
        page_message: row.page_message, image_url: row.image_url,
        named_report_cap: row.named_report_cap,
        created_at: row.created_at, updated_at: row.updated_at,
      }))
    );
    await client.query("COMMIT");
    log("testing_pools", r);
  }

  // ── 4. pool_tests ──────────────────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("pool_tests_1778334125030.json");
    const r = await safeInsert(client, "pool_tests",
      ["id","pool_id","catalog_id","code","name","unit_price_usd","quantity",
       "votes","selected","contribution_status","janoshik_url"],
      rows,
      row => [
        row.id, row.pool_id, row.catalog_id ?? null, row.code, row.name,
        row.unit_price_usd ?? "0", row.quantity ?? 1, row.votes ?? 0,
        row.selected ?? true, row.contribution_status ?? "active", row.janoshik_url ?? null,
      ]
    );
    await client.query("COMMIT");
    log("pool_tests", r);
  }

  // ── 5. pool_participants ───────────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("pool_participants_1778334125030.json");
    const r = await safeInsert(client, "pool_participants",
      ["id","pool_id","account_username","account_id","contact_email","contact_telegram",
       "display_name","amount_usd","payment_status","payment_method","payment_tx_hash",
       "payment_screenshot_url","payment_currency","payment_network","payment_submitted_at",
       "payment_verified_at","named_report_opt_in","named_report_name","can_provide_vial",
       "is_public","vote_test_ids","notes","created_at"],
      rows,
      row => [
        row.id, row.pool_id, row.account_username ?? null, row.account_id ?? null,
        row.contact_email ?? null, row.contact_telegram ?? null, row.display_name ?? null,
        row.amount_usd, row.payment_status ?? "pending", row.payment_method ?? null,
        row.payment_tx_hash ?? null, row.payment_screenshot_url ?? null,
        row.payment_currency ?? null, row.payment_network ?? null,
        row.payment_submitted_at ?? null, row.payment_verified_at ?? null,
        row.named_report_opt_in ?? false, row.named_report_name ?? null,
        row.can_provide_vial ?? false, row.is_public ?? false,
        j(row.vote_test_ids), row.notes ?? null, row.created_at,
      ]
    );
    await client.query("COMMIT");
    log("pool_participants", r);
  }

  // ── 6. site_config ─────────────────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("site_config_1778334125032.json");
    const r = await bulkInsert(client, "site_config",
      ["key","value","updated_at"],
      rows.map(row => ({
        key: row.key,
        value: typeof row.value === "string" ? row.value : JSON.stringify(row.value),
        updated_at: row.updated_at,
      }))
    );
    await client.query("COMMIT");
    log("site_config", r);
  }

  // ── 7. revoked_tokens ──────────────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("revoked_tokens_1778334125031.json");
    const r = await bulkInsert(client, "revoked_tokens",
      ["jti","expires_at","revoked_at"],
      rows.map(row => ({
        jti: row.jti, expires_at: row.expires_at, revoked_at: row.revoked_at,
      }))
    );
    await client.query("COMMIT");
    log("revoked_tokens", r);
  }

  // ── 8. lookup_attempts ─────────────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("lookup_attempts_1778334125029.json");
    const r = await bulkInsert(client, "lookup_attempts",
      ["id","identifier","failed_attempts","blocked_until","last_attempt_at"],
      rows.map(row => ({
        id: row.id, identifier: row.identifier,
        failed_attempts: row.failed_attempts ?? 0,
        blocked_until: row.blocked_until ?? null,
        last_attempt_at: row.last_attempt_at,
      }))
    );
    await client.query("COMMIT");
    log("lookup_attempts", r);
  }

  // ── 9. rule_acceptances ────────────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("rule_acceptances_1778334125032.json");
    const r = await safeInsert(client, "rule_acceptances",
      ["id","account_id","version","accepted_at"],
      rows,
      row => [row.id, row.account_id, row.version, row.accepted_at]
    );
    await client.query("COMMIT");
    log("rule_acceptances", r);
  }

  // ── 10. tickets (FK: accounts) ────────────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("tickets_1778334125033.json");
    const r = await safeInsert(client, "tickets",
      ["id","account_username","category","subject","status","customer_unread",
       "group_buy_id","issue_type","created_at","updated_at"],
      rows,
      row => [
        row.id, row.account_username, row.category, row.subject,
        row.status ?? "open", row.customer_unread ?? false,
        row.group_buy_id ?? null, row.issue_type ?? null,
        row.created_at, row.updated_at,
      ]
    );
    await client.query("COMMIT");
    log("tickets", r);
  }

  // ── 11. ticket_messages (serial PK, FK: tickets) ──────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("ticket_messages_1778334125032.json");
    const r = await safeInsert(client, "ticket_messages",
      ["id","ticket_id","author_role","author_username","body","created_at"],
      rows,
      row => [row.id, row.ticket_id, row.author_role, row.author_username, row.body, row.created_at]
    );
    await resetSeq(client, "ticket_messages", "ticket_messages_id_seq");
    await client.query("COMMIT");
    log("ticket_messages", r);
  }

  // ── 12. ticket_telegram_messages (serial PK, FK: tickets) ────────────────
  {
    await client.query("BEGIN");
    const rows = load("ticket_telegram_messages_1778334125033.json");
    const r = await safeInsert(client, "ticket_telegram_messages",
      ["id","telegram_message_id","chat_id","ticket_id","created_at"],
      rows,
      row => [row.id, row.telegram_message_id, row.chat_id, row.ticket_id, row.created_at]
    );
    await resetSeq(client, "ticket_telegram_messages", "ticket_telegram_messages_id_seq");
    await client.query("COMMIT");
    log("ticket_telegram_messages", r);
  }

  // ── 13. orders (savepoints — country_leg_id FK may be missing) ─────────────
  {
    await client.query("BEGIN");
    const rows = load("orders_1778334125030.json");
    const r = await safeInsert(client, "orders",
      ["id","code","telegram_username","delivery_method","delivery_method_id",
       "delivery_price","vendor_shipping","product_subtotal","tip","grand_total",
       "notes","status","admin_notes","admin_message","tracking_number",
       "payment_status","payment_tx_hash","payment_test_amount","test_payment_tx_hash",
       "shipping_name","shipping_phone","shipping_email","shipping_address","pin",
       "inpost_qr_code","royal_mail_qr_code","qr_posted","qr_codes",
       "group_buy_id","testing_contribution","test_vote","refund_status","refund_reason",
       "refunded_at","payment_confirmed_at","payment_rejection_reason","payment_screenshot",
       "payment_usd_amount","shipping_country","country_leg_id","reshipper_username",
       "shipping_city","ip_address","shipping_postcode","shipping_carrier",
       "carrier_service_ref","quoted_weight_grams","order_type","coupon_code",
       "coupon_discount","credits_applied","direct_shipping_requested","direct_shipping_cost",
       "amount_due","balance_screenshot","balance_tx_hash","balance_payment_status",
       "balance_confirmed_at","created_at","updated_at","deleted_at","deleted_by",
       "routing_type","legacy_mode","batch_locked","batch_locked_at","reshipper_hub_country"],
      rows,
      row => [
        row.id, row.code, row.telegram_username,
        row.delivery_method, row.delivery_method_id ?? "",
        row.delivery_price ?? "0", row.vendor_shipping ?? "0",
        row.product_subtotal, row.tip ?? "0",
        row.grand_total, row.notes ?? null, row.status ?? "Submitted",
        row.admin_notes ?? null, row.admin_message ?? null,
        row.tracking_number ?? null, row.payment_status ?? "unpaid",
        row.payment_tx_hash ?? null, row.payment_test_amount ?? null,
        row.test_payment_tx_hash ?? null, row.shipping_name ?? null,
        row.shipping_phone ?? null, row.shipping_email ?? null,
        row.shipping_address ?? null, row.pin ?? "0000",
        row.inpost_qr_code ?? null, row.royal_mail_qr_code ?? null,
        row.qr_posted ?? false, j(row.qr_codes),
        row.group_buy_id ?? null, row.testing_contribution ?? "0",
        row.test_vote ?? null, row.refund_status ?? null,
        row.refund_reason ?? null, row.refunded_at ?? null,
        row.payment_confirmed_at ?? null,
        row.payment_rejection_reason ?? null,
        row.payment_screenshot ?? null,
        row.payment_usd_amount ?? null, row.shipping_country ?? null,
        row.country_leg_id ?? null, row.reshipper_username ?? null,
        row.shipping_city ?? null, row.ip_address ?? null,
        row.shipping_postcode ?? null, row.shipping_carrier ?? null,
        row.carrier_service_ref ?? null,
        row.quoted_weight_grams ?? null, row.order_type ?? null,
        row.coupon_code ?? null, row.coupon_discount ?? "0",
        row.credits_applied ?? 0,
        row.direct_shipping_requested ?? false,
        row.direct_shipping_cost ?? null,
        row.amount_due ?? "0", row.balance_screenshot ?? null,
        row.balance_tx_hash ?? null, row.balance_payment_status ?? null,
        row.balance_confirmed_at ?? null,
        row.created_at, row.updated_at,
        row.deleted_at ?? null, row.deleted_by ?? null,
        row.routing_type ?? null, row.legacy_mode ?? false,
        row.batch_locked ?? false, row.batch_locked_at ?? null,
        row.reshipper_hub_country ?? null,
      ]
    );
    await client.query("COMMIT");
    log("orders", r);
  }

  // ── 14. order_line_items (FK: orders) ────────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("order_line_items_1778334125030.json");
    const r = await safeInsert(client, "order_line_items",
      ["id","order_id","product_id","product_name","quantity","unit_price","line_total","is_oos","created_at","updated_at"],
      rows,
      row => [
        row.id, row.order_id, row.product_id, row.product_name,
        row.quantity, row.unit_price, row.line_total, row.is_oos ?? false,
        row.created_at, row.updated_at,
      ]
    );
    await client.query("COMMIT");
    log("order_line_items", r);
  }

  // ── 15. qiyunle_mappings (FK: products) ───────────────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("qiyunle_mappings_1778334125031.json");
    const r = await safeInsert(client, "qiyunle_mappings",
      ["id","product_id","qiyunle_code","qiyunle_goods_id","qiyunle_name","manufacturer","batch_stock","created_at"],
      rows,
      row => [
        row.id, row.product_id, row.qiyunle_code, row.qiyunle_goods_id ?? null,
        row.qiyunle_name ?? null, row.manufacturer ?? "Uther",
        row.batch_stock ?? null, row.created_at,
      ]
    );
    await client.query("COMMIT");
    log("qiyunle_mappings", r);
  }

  // ── 16. lab_tests (serial PK, unique janoshik_id) ─────────────────────────
  {
    await client.query("BEGIN");
    const rows = load("lab_tests_1778334125029.json");
    const r = await bulkInsert(client, "lab_tests",
      ["id","janoshik_id","url","peptide_name","mg_amount","nominal_dose","mass_unit",
       "supplier","batch_code","lab_name","test_type","product_category",
       "purity_pct","endotoxin_eu_mg","sterility_pass","test_date","notes",
       "heavy_metal_as","heavy_metal_cd","heavy_metal_pb","heavy_metal_hg",
       "is_third_party_test","pending","submitted_by","organiser_id","group_buy_id",
       "blend_components","ai_extracted","ai_extracted_at","created_at"],
      rows.map(row => ({
        id: row.id, janoshik_id: row.janoshik_id, url: row.url,
        peptide_name: row.peptide_name, mg_amount: row.mg_amount,
        nominal_dose: row.nominal_dose, mass_unit: row.mass_unit ?? "mg",
        supplier: row.supplier ?? "Uther", batch_code: row.batch_code,
        lab_name: row.lab_name ?? "Janoshik", test_type: row.test_type,
        product_category: row.product_category, purity_pct: row.purity_pct,
        endotoxin_eu_mg: row.endotoxin_eu_mg, sterility_pass: row.sterility_pass,
        test_date: row.test_date, notes: row.notes,
        heavy_metal_as: row.heavy_metal_as, heavy_metal_cd: row.heavy_metal_cd,
        heavy_metal_pb: row.heavy_metal_pb, heavy_metal_hg: row.heavy_metal_hg,
        is_third_party_test: row.is_third_party_test ?? false,
        pending: row.pending ?? false, submitted_by: row.submitted_by,
        organiser_id: row.organiser_id, group_buy_id: row.group_buy_id,
        blend_components: row.blend_components,
        ai_extracted: row.ai_extracted ?? false, ai_extracted_at: row.ai_extracted_at,
        created_at: row.created_at,
      }))
    );
    await resetSeq(client, "lab_tests", "lab_tests_id_seq");
    await client.query("COMMIT");
    log("lab_tests", r);
  }

  // ── 17. organiser_audit_log (serial PK, FK: accounts) ────────────────────
  {
    await client.query("BEGIN");
    const rows = load("organiser_audit_log_1778334125030.json");
    const r = await safeInsert(client, "organiser_audit_log",
      ["id","timestamp","admin_username","organiser_username","action_type","previous_value","new_value"],
      rows,
      row => [row.id, row.timestamp, row.admin_username, row.organiser_username, row.action_type, row.previous_value ?? null, row.new_value ?? null]
    );
    await resetSeq(client, "organiser_audit_log", "organiser_audit_log_id_seq");
    await client.query("COMMIT");
    log("organiser_audit_log", r);
  }

  // ── 18. plotter_cycles (serial PK, unique telegram_username, FK: accounts) ─
  {
    await client.query("BEGIN");
    const rows = load("plotter_cycles_1778334125030.json");
    const r = await safeInsert(client, "plotter_cycles",
      ["id","telegram_username","entries_json","total_weeks","updated_at"],
      rows,
      row => [row.id, row.telegram_username, row.entries_json ?? "[]", row.total_weeks ?? 16, row.updated_at]
    );
    await resetSeq(client, "plotter_cycles", "plotter_cycles_id_seq");
    await client.query("COMMIT");
    log("plotter_cycles", r);
  }

  // ── 19. telegram_message_logs (serial PK, no FK deps) ────────────────────
  {
    await client.query("BEGIN");
    const rows = load("telegram_message_logs_1778334125032.json");
    const r = await bulkInsert(client, "telegram_message_logs",
      ["id","recipient_type","recipient_username","recipient_chat_id","message_text","sent_at","delivered","error_message"],
      rows.map(row => ({
        id: row.id, recipient_type: row.recipient_type,
        recipient_username: row.recipient_username, recipient_chat_id: row.recipient_chat_id,
        message_text: row.message_text, sent_at: row.sent_at,
        delivered: row.delivered ?? false, error_message: row.error_message,
      }))
    );
    await resetSeq(client, "telegram_message_logs", "telegram_message_logs_id_seq");
    await client.query("COMMIT");
    log("telegram_message_logs", r);
  }

  console.log("\nAll done.");
} catch (err) {
  try { await client.query("ROLLBACK"); } catch (_) {}
  console.error("Fatal error — rolled back:", err.message, err.stack?.split("\n")[1]);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
