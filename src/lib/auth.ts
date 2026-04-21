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
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `https://${url}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

/**
 * Build trusted origins list:
 * - always includes localhost for dev
 * - includes VERCEL_URL if available (preview & production deployments)
 * - includes BETTER_AUTH_URL if set manually
 */
function getTrustedOrigins(): string[] {
  const origins = ["http://localhost:3000"];

  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.BETTER_AUTH_URL) {
    const url = process.env.BETTER_AUTH_URL;
    origins.push(url.startsWith("http") ? url : `https://${url}`);
  }

  return origins;
}

export const auth = betterAuth({
  baseURL: getBaseURL(),
  trustedOrigins: getTrustedOrigins(),
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
});
