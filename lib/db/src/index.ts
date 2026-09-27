import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// pg emits errors from idle connections on the pool itself. Without a listener,
// a transient database disconnect becomes an uncaught exception and stops the API.
pool.on("error", (error) => {
  console.error("[db] Idle database connection error:", error.message);
});
export const db = drizzle(pool, { schema });

export * from "./schema";
