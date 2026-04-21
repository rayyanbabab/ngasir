import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

/**
 * Resolves the base URL automatically:
 * 1. BETTER_AUTH_URL (manual override, must include https://)
 * 2. VERCEL_URL (auto-injected by Vercel, always add https://)
 * 3. Fallback to localhost for local dev
 */
function getBaseURL(): string {
  if (process.env.BETTER_AUTH_URL) {
    const url = process.env.BETTER_AUTH_URL;
    // Ensure it has a protocol prefix
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `https://${url}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export const auth = betterAuth({
  baseURL: getBaseURL(),
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
});
