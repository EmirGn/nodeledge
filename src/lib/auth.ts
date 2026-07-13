import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, schema } from "@/lib/db";

// Behind Vercel's proxy the origin derived from the incoming request doesn't
// match the public URL the browser sends, so logins fail with "invalid
// origin" unless the deployment's own URLs are trusted explicitly. Locally
// none of these env vars exist and the request-derived localhost origin works.
const vercelOrigins = [
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
  process.env.VERCEL_BRANCH_URL,
  process.env.VERCEL_URL,
]
  .filter((h): h is string => Boolean(h))
  .map((h) => `https://${h}`);

export const auth = betterAuth({
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (vercelOrigins.length ? vercelOrigins[0] : undefined),
  trustedOrigins: vercelOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
});
