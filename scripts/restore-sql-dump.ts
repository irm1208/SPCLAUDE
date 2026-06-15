import pg from "pg";
import fs from "fs";
import path from "path";
import readline from "readline";

const { Pool } = pg;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set");

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

const DUMP_FILE = path.resolve(
  import.meta.dirname,
  "../../attached_assets/backup_1779732371866.sql"
);

// FK-safe insertion order for public schema tables
// Tables listed earlier have no deps on tables listed later
const FK_ORDER: string[] = [
  "public.site_config",
  "public.products",
  "public.delivery_methods",
  "public.test_catalog",
  "public.batch_code_prefixes",
  "public.fs3_costs",
  "public.audit_logs",
  "public.admin_alerts",
  "public.geo_ip_cache",
  "public.group_buys",
  "public.accounts",
  "public.customers",
  "public.gb_country_legs",
  "public.account_group_buys",
  "public.gb_waitlist",
  "public.group_buy_products",
  "public.group_buy_delivery_methods",
  "public.gb_parcels",
  "public.gb_reshippers",
  "public.gb_testing_rounds",
  "public.orders",
  "public.order_messages",
  "public.order_notes",
  "public.order_line_items",
  "public.lookup_attempts",
  "public.organiser_audit_log",
  "public.testing_pools",
  "public.pool_tests",
  "public.pool_participants",
  "public.pool_messages",
  "public.pool_test_results",
  "public.lab_tests",
  "public.tickets",
  "public.ticket_messages",
  "public.ticket_telegram_messages",
  "public.qiyunle_mappings",
  "public.revoked_tokens",
  "public.rule_acceptances",
  "public.telegram_message_logs",
  "public.plotter_cycles",
  "public.glp1_logs",
  "public.customer_activity_logs",
  "public.credit_transactions",
  "public.intl_parcel_sizes",
  "public.intl_shipping_rates",
  "public.vial_vendors",
  "public.vial_products",
  "public.vial_discount_codes",
  "public.vial_orders",
  "public.vial_order_items",
  "public.vial_manufacturers",
  "public.blood_test_sessions",
  "public.blood_test_values",
  "public.bt_conversations",
  "public.compound_logs",
  "public.coupon_codes",
  "public.coupon_redemptions",
  "public.blocked_ips",
  "public.custom_couriers",
  "public.feedback",
  "public.health_insight_logs",
  "public.inventory_turnover_log",
  "public.invite_codes",
  "public.package_sizes",
  "public.postage",
  "public.scheduled_announcements",
  "public.shipments",
  "public.tracking_links",
  "public.gb_testing_votes",
];

function sortKey(table: string): number {
  const idx = FK_ORDER.indexOf(table);
  return idx === -1 ? 9999 : idx;
}

// Correctly unescape a COPY TEXT value in a single pass
function unescapeCopyValue(v: string): string {
  return v.replace(/\\(.)/g, (_, c: string) => {
    if (c === "t") return "\t";
    if (c === "n") return "\n";
    if (c === "r") return "\r";
    if (c === "\\") return "\\";
    return c; // unknown escape — keep as-is
  });
}

function parseCopyLine(line: string): (string | null)[] {
  return line.split("\t").map((v) =>
    v === "\\N" ? null : unescapeCopyValue(v)
  );
}

interface CopyBlock {
  table: string;
  columns: string[];
  rows: (string | null)[][];
}

async function importBlock(block: CopyBlock): Promise<{ inserted: number; errors: number }> {
  if (block.rows.length === 0) return { inserted: 0, errors: 0 };

  const client = await pool.connect();
  let inserted = 0;
  let errors = 0;

  const colList = block.columns.map((c) => `"${c}"`).join(", ");
  const placeholders = block.columns.map((_, i) => `$${i + 1}`).join(", ");
  const sql = `INSERT INTO ${block.table} (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

  const BATCH = 200;
  try {
    for (let i = 0; i < block.rows.length; i += BATCH) {
      const batch = block.rows.slice(i, i + BATCH);
      await client.query("BEGIN");
      for (const row of batch) {
        try {
          const result = await client.query(sql, row);
          inserted += result.rowCount ?? 0;
        } catch (err: unknown) {
          errors++;
          if (errors <= 3) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`  [warn] ${block.table}: ${msg}`);
          }
        }
      }
      await client.query("COMMIT");
    }
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  return { inserted, errors };
}

async function main() {
  console.log("=== SQL Dump Restore ===\n");

  // Phase 1: Parse all COPY blocks from dump
  const blocks = new Map<string, CopyBlock>();

  const fileStream = fs.createReadStream(DUMP_FILE);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let currentTable = "";
  let currentColumns: string[] = [];
  let currentRows: (string | null)[][] = [];
  let inCopy = false;

  const saveBlock = () => {
    if (!currentTable || currentRows.length === 0) return;
    if (blocks.has(currentTable)) {
      blocks.get(currentTable)!.rows.push(...currentRows);
    } else {
      blocks.set(currentTable, { table: currentTable, columns: currentColumns, rows: [...currentRows] });
    }
    currentRows = [];
  };

  for await (const line of rl) {
    if (line.startsWith("COPY ") && line.includes(" FROM stdin;")) {
      const match = line.match(/^COPY\s+(\S+)\s+\(([^)]+)\)\s+FROM stdin;/);
      if (match) {
        saveBlock();
        currentTable = match[1];
        currentColumns = match[2].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        currentRows = [];
        inCopy = true;
      }
    } else if (inCopy && line === "\\.") {
      inCopy = false;
    } else if (inCopy) {
      currentRows.push(parseCopyLine(line));
    }
  }
  saveBlock();

  console.log(`Parsed ${blocks.size} COPY blocks from dump\n`);

  // Phase 2: Insert in FK-safe order
  const sorted = [...blocks.values()].sort((a, b) => sortKey(a.table) - sortKey(b.table));

  let totalInserted = 0;
  let totalErrors = 0;

  for (const block of sorted) {
    process.stdout.write(`→ ${block.table} (${block.rows.length} rows) ... `);
    const { inserted, errors } = await importBlock(block);
    console.log(`inserted=${inserted} errors=${errors}`);
    totalInserted += inserted;
    totalErrors += errors;
  }

  console.log(`\n=== Done ===`);
  console.log(`Total inserted: ${totalInserted}`);
  console.log(`Total errors: ${totalErrors}`);

  await pool.end();
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
