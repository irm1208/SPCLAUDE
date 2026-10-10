import { sql, type SQL } from "drizzle-orm";

// Match the site's canonical HGH aliases exactly; HGH fragments are not HGH.
const HGH_ALIASES = ["hgh", "humangrowthhormone", "growthhormone", "somatropin"];

export function labTestPurityThresholdSql(peptideName: SQL): SQL<number> {
  return sql<number>`case when regexp_replace(lower(${peptideName}), '[^a-z0-9]', '', 'g')
    in (${sql.join(HGH_ALIASES.map(alias => sql`${alias}`), sql`, `)})
    then 95 else 98 end`;
}
