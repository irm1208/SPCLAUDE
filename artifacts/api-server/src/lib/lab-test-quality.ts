import { sql, type SQL } from "drizzle-orm";

// Match canonical HGH aliases after removing a trailing certificate dose.
// HGH fragments and blends must still use the normal threshold.
const HGH_ALIASES = ["hgh", "humangrowthhormone", "growthhormone", "somatropin"];

export function labTestPurityThresholdSql(peptideName: SQL): SQL<number> {
  return sql<number>`case when regexp_replace(
    regexp_replace(lower(${peptideName}), '[[:space:]]*[(]?[0-9]+([.][0-9]+)?[[:space:]]*(iu|mg|mcg|µg|μg)[[:space:]]*[)]?[[:space:]]*$', '', 'g'),
    '[^a-z0-9]', '', 'g')
    in (${sql.join(HGH_ALIASES.map(alias => sql`${alias}`), sql`, `)})
    then 95 else 98 end`;
}
