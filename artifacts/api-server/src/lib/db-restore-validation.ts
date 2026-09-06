import type { DisposablePostgres } from "./disposable-postgres";

const CORE_TABLES = ["accounts", "orders", "order_line_items", "products", "audit_logs"] as const;

export interface RestoreValidationResult {
  tableCount: number;
  aggregateRowCount: number;
  checks: Array<{ name: string; passed: boolean; detail?: string }>;
}

interface ForeignKeyDescription {
  childSchema: string;
  childTable: string;
  childColumns: string[];
  parentSchema: string;
  parentTable: string;
  parentColumns: string[];
  matchType: "f" | "p" | "s";
}

interface SequenceDescription {
  tableSchema: string;
  tableName: string;
  columnName: string;
  sequenceSchema: string;
  sequenceName: string;
}

function quoteIdentifier(identifier: string): string {
  if (identifier.includes("\0")) throw new Error("PostgreSQL catalog returned an invalid identifier");
  return `"${identifier.replaceAll('"', '""')}"`;
}

function qualified(schema: string, relation: string): string {
  return `${quoteIdentifier(schema)}.${quoteIdentifier(relation)}`;
}

function quoteLiteral(value: string): string {
  if (value.includes("\0")) throw new Error("PostgreSQL catalog returned an invalid relation name");
  return `'${value.replaceAll("'", "''")}'`;
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count === 1 ? singular : pluralForm;
}

async function readOnlyQuery(target: DisposablePostgres, sql: string): Promise<string> {
  return (await target.executePsql(`BEGIN; SET TRANSACTION READ ONLY; ${sql}; COMMIT`)).trim();
}

async function readJson<T>(target: DisposablePostgres, sql: string): Promise<T> {
  const output = await readOnlyQuery(target, sql);
  if (!output) throw new Error("Restore validation query returned no result");
  return JSON.parse(output) as T;
}

export async function validateRestoredDatabase(target: DisposablePostgres): Promise<RestoreValidationResult> {
  const tables = await readJson<string[]>(
    target,
    `SELECT COALESCE(json_agg(t.table_name ORDER BY t.table_name), '[]'::json)
       FROM information_schema.tables t
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'`,
  );
  const availableTables = new Set(tables);
  const missingTables = CORE_TABLES.filter((table) => !availableTables.has(table));

  const checks: RestoreValidationResult["checks"] = [{
    name: "core_tables",
    passed: missingTables.length === 0,
    ...(missingTables.length > 0 ? { detail: `Missing core tables: ${missingTables.join(", ")}` } : {}),
  }];

  const transactionIsReadOnly = await readOnlyQuery(
    target,
    "SELECT current_setting('transaction_read_only')",
  );
  checks.push({
    name: "read_only_transaction",
    passed: transactionIsReadOnly === "on",
    ...(transactionIsReadOnly === "on" ? {} : { detail: "Representative validation transaction was not read-only" }),
  });

  const foreignKeys = await readJson<ForeignKeyDescription[]>(
    target,
    `SELECT COALESCE(json_agg(json_build_object(
         'childSchema', child_ns.nspname,
         'childTable', child.relname,
         'childColumns', (SELECT json_agg(a.attname ORDER BY key.ord)
                            FROM unnest(con.conkey) WITH ORDINALITY key(attnum, ord)
                            JOIN pg_catalog.pg_attribute a
                              ON a.attrelid = con.conrelid AND a.attnum = key.attnum),
         'parentSchema', parent_ns.nspname,
         'parentTable', parent.relname,
         'parentColumns', (SELECT json_agg(a.attname ORDER BY key.ord)
                             FROM unnest(con.confkey) WITH ORDINALITY key(attnum, ord)
                             JOIN pg_catalog.pg_attribute a
                               ON a.attrelid = con.confrelid AND a.attnum = key.attnum),
         'matchType', con.confmatchtype
       ) ORDER BY con.oid), '[]'::json)
       FROM pg_catalog.pg_constraint con
       JOIN pg_catalog.pg_class child ON child.oid = con.conrelid
       JOIN pg_catalog.pg_namespace child_ns ON child_ns.oid = child.relnamespace
       JOIN pg_catalog.pg_class parent ON parent.oid = con.confrelid
       JOIN pg_catalog.pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
      WHERE con.contype = 'f'
        AND child_ns.nspname NOT IN ('pg_catalog', 'information_schema')`,
  );

  let violatingForeignKeys = 0;
  for (const foreignKey of foreignKeys) {
    if (foreignKey.childColumns.length !== foreignKey.parentColumns.length) {
      throw new Error("PostgreSQL catalog returned inconsistent foreign key metadata");
    }
    const child = qualified(foreignKey.childSchema, foreignKey.childTable);
    const parent = qualified(foreignKey.parentSchema, foreignKey.parentTable);
    const allNonNull = foreignKey.childColumns
      .map((column) => `child.${quoteIdentifier(column)} IS NOT NULL`)
      .join(" AND ");
    const anyNonNull = foreignKey.childColumns
      .map((column) => `child.${quoteIdentifier(column)} IS NOT NULL`)
      .join(" OR ");
    const anyNull = foreignKey.childColumns
      .map((column) => `child.${quoteIdentifier(column)} IS NULL`)
      .join(" OR ");
    const exactMatch = foreignKey.childColumns
      .map((column, index) => `parent.${quoteIdentifier(foreignKey.parentColumns[index]!)} = child.${quoteIdentifier(column)}`)
      .join(" AND ");
    const partialMatch = foreignKey.childColumns
      .map((column, index) => `(child.${quoteIdentifier(column)} IS NULL OR parent.${quoteIdentifier(foreignKey.parentColumns[index]!)} = child.${quoteIdentifier(column)})`)
      .join(" AND ");
    const violationPredicate = foreignKey.matchType === "s"
      ? `(${allNonNull}) AND NOT EXISTS (SELECT 1 FROM ${parent} parent WHERE ${exactMatch})`
      : foreignKey.matchType === "f"
        ? `((${anyNull}) AND (${anyNonNull})) OR ((${allNonNull}) AND NOT EXISTS (SELECT 1 FROM ${parent} parent WHERE ${exactMatch}))`
        : foreignKey.matchType === "p"
          ? `(${anyNonNull}) AND NOT EXISTS (SELECT 1 FROM ${parent} parent WHERE ${partialMatch})`
          : "true";
    const violated = await readOnlyQuery(
      target,
      `SELECT EXISTS (
         SELECT 1 FROM ${child} child
          WHERE ${violationPredicate}
       )`,
    );
    if (violated === "t") violatingForeignKeys += 1;
  }
  checks.push({
    name: "foreign_keys",
    passed: violatingForeignKeys === 0,
    ...(violatingForeignKeys > 0
      ? { detail: `${violatingForeignKeys} foreign key ${plural(violatingForeignKeys, "constraint")} has violating rows` }
      : {}),
  });

  const notValidCount = Number(await readOnlyQuery(
    target,
    `SELECT count(*)
       FROM pg_catalog.pg_constraint con
       JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
       JOIN pg_catalog.pg_namespace ns ON ns.oid = rel.relnamespace
      WHERE NOT con.convalidated
        AND con.contype IN ('c', 'f')
        AND ns.nspname NOT IN ('pg_catalog', 'information_schema')`,
  ));
  checks.push({
    name: "validated_constraints",
    passed: notValidCount === 0,
    ...(notValidCount > 0
      ? { detail: `${notValidCount} ${plural(notValidCount, "constraint")} ${notValidCount === 1 ? "is" : "are"} marked NOT VALID` }
      : {}),
  });

  const sequences = await readJson<SequenceDescription[]>(
    target,
    `SELECT COALESCE(json_agg(json_build_object(
         'tableSchema', table_ns.nspname,
         'tableName', tbl.relname,
         'columnName', attr.attname,
         'sequenceSchema', sequence_ns.nspname,
         'sequenceName', seq.relname
       ) ORDER BY seq.oid), '[]'::json)
       FROM pg_catalog.pg_class seq
       JOIN pg_catalog.pg_namespace sequence_ns ON sequence_ns.oid = seq.relnamespace
       JOIN pg_catalog.pg_depend dep ON dep.objid = seq.oid AND dep.classid = 'pg_class'::regclass
       JOIN pg_catalog.pg_class tbl ON tbl.oid = dep.refobjid
       JOIN pg_catalog.pg_namespace table_ns ON table_ns.oid = tbl.relnamespace
       JOIN pg_catalog.pg_attribute attr
         ON attr.attrelid = tbl.oid AND attr.attnum = dep.refobjsubid
      WHERE seq.relkind = 'S'
        AND dep.deptype IN ('a', 'i')
        AND table_ns.nspname NOT IN ('pg_catalog', 'information_schema')`,
  );

  let behindSequences = 0;
  for (const sequence of sequences) {
    const table = qualified(sequence.tableSchema, sequence.tableName);
    const ownedSequence = qualified(sequence.sequenceSchema, sequence.sequenceName);
    const column = quoteIdentifier(sequence.columnName);
    const sequenceRegclass = quoteLiteral(qualified(sequence.sequenceSchema, sequence.sequenceName));
    const behind = await readOnlyQuery(
      target,
      `WITH sequence_state AS (
         SELECT last_value::numeric AS last_value, is_called FROM ${ownedSequence}
       ), sequence_metadata AS (
         SELECT seqincrement::numeric AS increment_by, seqmin::numeric AS min_value,
                seqmax::numeric AS max_value, seqcycle AS cycle
           FROM pg_catalog.pg_sequence
          WHERE seqrelid = to_regclass(${sequenceRegclass})
       ), next_value AS (
         SELECT CASE
           WHEN NOT sequence_state.is_called THEN sequence_state.last_value
           WHEN sequence_metadata.increment_by > 0
             AND sequence_state.last_value >= sequence_metadata.max_value
             THEN CASE WHEN sequence_metadata.cycle THEN sequence_metadata.min_value END
           WHEN sequence_metadata.increment_by < 0
             AND sequence_state.last_value <= sequence_metadata.min_value
             THEN CASE WHEN sequence_metadata.cycle THEN sequence_metadata.max_value END
           ELSE sequence_state.last_value + sequence_metadata.increment_by
         END AS value,
         sequence_metadata.increment_by,
         sequence_state.is_called
           AND NOT sequence_metadata.cycle
           AND (
             (sequence_metadata.increment_by > 0 AND sequence_state.last_value >= sequence_metadata.max_value)
             OR (sequence_metadata.increment_by < 0 AND sequence_state.last_value <= sequence_metadata.min_value)
           ) AS exhausted,
         sequence_state.is_called
           AND sequence_metadata.cycle
           AND (
             (sequence_metadata.increment_by > 0 AND sequence_state.last_value >= sequence_metadata.max_value)
             OR (sequence_metadata.increment_by < 0 AND sequence_state.last_value <= sequence_metadata.min_value)
           ) AS wrapped
         FROM sequence_state CROSS JOIN sequence_metadata
       )
       SELECT COALESCE(
         EXISTS (SELECT 1 FROM next_value WHERE exhausted)
         OR
         EXISTS (
           SELECT 1 FROM ${table} stored CROSS JOIN next_value
            WHERE next_value.value IS NOT NULL
              AND stored.${column}::numeric = next_value.value
         )
         OR EXISTS (
           SELECT 1 FROM next_value
            WHERE next_value.value IS NOT NULL
              AND NOT next_value.wrapped
              AND (
                (next_value.increment_by > 0
                  AND next_value.value <= (SELECT max(${column})::numeric FROM ${table}))
                OR (next_value.increment_by < 0
                  AND next_value.value >= (SELECT min(${column})::numeric FROM ${table}))
              )
         ),
         false)`,
    );
    if (behind === "t") behindSequences += 1;
  }
  checks.push({
    name: "owned_sequences",
    passed: behindSequences === 0,
    ...(behindSequences > 0
      ? { detail: `${behindSequences} owned ${plural(behindSequences, "sequence")} ${behindSequences === 1 ? "is behind its" : "are behind their"} stored IDs` }
      : {}),
  });

  let aggregateRowCount = 0;
  for (const table of CORE_TABLES) {
    if (availableTables.has(table)) {
      aggregateRowCount += Number(await readOnlyQuery(
        target,
        `SELECT count(*) FROM ${qualified("public", table)}`,
      ));
    }
  }
  checks.push({
    name: "plausible_row_count",
    passed: aggregateRowCount > 0,
    ...(aggregateRowCount === 0 ? { detail: "Core tables contain no rows" } : {}),
  });

  return { tableCount: tables.length, aggregateRowCount, checks };
}