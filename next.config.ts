import fs from "fs";
import path from "path";
import type { NextConfig } from "next";

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "./package.json"), "utf-8")
);
const version = packageJson.version;

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_VERSION: version,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
