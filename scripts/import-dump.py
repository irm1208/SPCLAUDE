#!/usr/bin/env python3
"""
Parse a pg_dump SQL file and import COPY blocks into PostgreSQL.
- For empty tables: runs COPY directly (fast)
- For non-empty tables: converts COPY rows to INSERT ON CONFLICT DO NOTHING
"""
import os
import sys
import re
import subprocess

DATABASE_URL = os.environ["DATABASE_URL"]
DUMP_FILE = sys.argv[1] if len(sys.argv) > 1 else "attached_assets/peps_dump_1780602374343.sql"

# Tables to skip entirely (already imported via JSON, no point re-doing)
SKIP_TABLES = set()  # we'll handle conflicts gracefully

# Tables that are currently empty in DB (from our check)
EMPTY_TABLES = {
    "blocked_ips", "blood_test_sessions", "blood_test_values",
    "bt_conversations", "bt_knowledge_cache", "compound_logs",
    "coupon_codes", "coupon_redemptions", "custom_couriers",
    "dna_profiles", "feedback", "fs3_submissions", "gb_parcel_optins",
    "gb_testing_votes", "health_insight_logs", "invite_codes",
    "order_dispatch_images", "order_messages", "order_notes",
    "package_sizes", "pool_messages", "pool_test_results", "postage",
    "routing_history", "scheduled_announcements", "shipments",
    "tracking_links", "vial_discount_codes", "vial_manufacturers",
    "gb_testing_votes",
}

def run_copy_block(table, columns, rows_text):
    """Run a COPY block for an empty table via psql stdin."""
    sql = f"COPY public.{table} ({columns}) FROM STDIN;\n{rows_text}\\.\n"
    result = subprocess.run(
        ["psql", DATABASE_URL, "--quiet", "--no-psqlrc"],
        input=sql, capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"  COPY error for {table}: {result.stderr[:200]}")
        return False
    return True

def tab_to_py(val):
    """Convert a pg COPY tab-delimited value to Python."""
    if val == r"\N":
        return None
    # Unescape tab/newline/backslash
    val = val.replace(r"\t", "\t").replace(r"\n", "\n").replace(r"\\", "\\")
    return val

def quote_pg(val):
    """Quote a Python value for a PostgreSQL literal."""
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    # Escape single quotes
    s = str(val).replace("'", "''").replace("\\", "\\\\")
    return f"'{s}'"

def run_insert_block(table, col_names, rows_text):
    """Convert COPY rows to INSERT ... ON CONFLICT DO NOTHING."""
    lines = [l for l in rows_text.strip().split("\n") if l]
    if not lines:
        return True
    cols_quoted = ", ".join(f'"{c}"' for c in col_names)
    insert_lines = []
    for line in lines:
        fields = line.split("\t")
        if len(fields) != len(col_names):
            continue
        values = ", ".join(quote_pg(tab_to_py(f)) for f in fields)
        insert_lines.append(f"INSERT INTO public.\"{table}\" ({cols_quoted}) VALUES ({values}) ON CONFLICT DO NOTHING;")
    
    if not insert_lines:
        return True

    # Run in batches of 500
    batch_size = 500
    for i in range(0, len(insert_lines), batch_size):
        batch = "\n".join(insert_lines[i:i+batch_size])
        sql = f"SET session_replication_role = replica;\n{batch}\nSET session_replication_role = DEFAULT;\n"
        result = subprocess.run(
            ["psql", DATABASE_URL, "--quiet", "--no-psqlrc"],
            input=sql, capture_output=True, text=True
        )
        if result.returncode != 0 and "ERROR" in result.stderr:
            print(f"  Insert error in {table}: {result.stderr[:300]}")
    return True

def main():
    print(f"Reading {DUMP_FILE}...")
    with open(DUMP_FILE, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    # Find all COPY blocks: COPY public.table (cols) FROM stdin;\n<data>\n\.
    pattern = re.compile(
        r"COPY public\.(\w+)\s+\(([^)]+)\)\s+FROM stdin;\n(.*?)\n\\\.",
        re.DOTALL
    )

    matches = list(pattern.finditer(content))
    print(f"Found {len(matches)} COPY blocks in public schema\n")

    total_rows = 0
    for m in matches:
        table = m.group(1)
        columns_str = m.group(2)
        rows_text = m.group(3)

        col_names = [c.strip() for c in columns_str.split(",")]
        row_count = len([l for l in rows_text.strip().split("\n") if l]) if rows_text.strip() else 0

        if table in SKIP_TABLES:
            print(f"  – {table}: skipped")
            continue

        if row_count == 0:
            print(f"  – {table}: 0 rows in dump, skipping")
            continue

        print(f"  → {table}: {row_count} rows ", end="", flush=True)

        if table in EMPTY_TABLES:
            ok = run_copy_block(table, columns_str.strip(), rows_text)
            print("✓ (COPY)" if ok else "✗ (failed)")
        else:
            run_insert_block(table, col_names, rows_text)
            print("✓ (INSERT ON CONFLICT DO NOTHING)")

        total_rows += row_count

    print(f"\nDone. Processed {total_rows:,} rows across {len(matches)} tables.")

if __name__ == "__main__":
    main()
