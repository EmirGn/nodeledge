import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// The app runs in two layouts (mirroring topic.ts): the standalone published
// repo where the app is the repo root with topics/ inside it, and the local
// monorepo where the app lives in web/ next to ../topics. Both need drizzle/
// (boot-time migrations) and the topics dir traced into the serverless
// bundle, since they are read from disk at request time.
const standalone = fs.existsSync(path.join(process.cwd(), "topics"));

const nextConfig: NextConfig = {
  ...(standalone
    ? {}
    : { outputFileTracingRoot: path.join(process.cwd(), "..") }),
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*", standalone ? "./topics/**/*" : "../topics/**/*"],
  },
};

export default nextConfig;
