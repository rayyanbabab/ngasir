import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";

/**
 * Resolves the base URL:
 * 1. BETTER_AUTH_URL  — set this manually in Vercel env vars (recommended)
 * 2. VERCEL_PROJECT_PRODUCTION_URL — auto-injected by Vercel (production domain)
 * 3. VERCEL_URL — auto-injected by Vercel (per-deployment URL)
 * 4. localhost fallback
 */
function getBaseURL(): string {
  const candidates = [
    process.env.BETTER_AUTH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];

  for (const raw of candidates) {
    const url = raw?.trim();
    if (!url) continue;
    return url.startsWith("http") ? url : `https://${url}`;
  }

  return "http://localhost:3000";
}

/**
 * Build a list of ALL trusted origins so BetterAuth accepts requests
 * from any of our known domains (production alias, preview, localhost).
 */
function getTrustedOrigins(): string[] {
  const origins = new Set<string>(["http://localhost:3000"]);

  const envVars = [
    process.env.BETTER_AUTH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];

  for (const raw of envVars) {
    const url = raw?.trim();
    if (!url) continue;
    origins.add(url.startsWith("http") ? url : `https://${url}`);
  }

  return Array.from(origins);
}

export const auth = betterAuth({
  baseURL: getBaseURL(),
  trustedOrigins: getTrustedOrigins(),
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()],
});
