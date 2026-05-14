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
  // eslint configuration removed — Next.js no longer supports `eslint` here.
};

export default nextConfig;
