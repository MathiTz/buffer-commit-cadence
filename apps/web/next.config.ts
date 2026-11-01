import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Opt-in: `CF_DEV=1 pnpm dev` runs next dev against local Cloudflare bindings (the D1 token store).
// Plain `pnpm dev` keeps the sealed local file store, so signing in survives restarts as before.
if (process.env.CF_DEV) initOpenNextCloudflareForDev();

const config: NextConfig = {
  transpilePackages: ["@cadence/buffer-client", "@cadence/core"],
};

export default config;
