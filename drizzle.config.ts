import { defineConfig } from "drizzle-kit";

// @libsql/client supports both:
//   file:./ngasir.db            → local SQLite (dev)
//   libsql://xxx.turso.io       → Turso remote (production)
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./ngasir.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
