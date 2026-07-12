import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Two directories are read from disk at request time and must be traced
  // into the serverless bundle: drizzle/ (migrations applied on boot) and
  // ../topics (the shared demo package). Tracing from the repo root lets
  // ../topics resolve on Vercel, where the app root is web/.
  outputFileTracingRoot: path.join(process.cwd(), ".."),
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*", "../topics/**/*"],
  },
};

export default nextConfig;
