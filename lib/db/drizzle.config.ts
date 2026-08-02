import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
import path from "path";

// Drizzle CLI commands run from this workspace package and do not inherit the
// API server's --env-file flag. Load the repository env file for local tooling,
// while allowing explicitly exported variables to take precedence.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
