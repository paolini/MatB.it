import fs from "fs";
import path from "path";
import type { NextConfig } from "next";

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "./package.json"), "utf-8")
);
const version = packageJson.version;

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_VERSION: version,
  },
};

export default nextConfig;
