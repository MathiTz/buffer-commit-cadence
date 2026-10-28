import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@cadence/buffer-client", "@cadence/core"],
};

export default config;
