import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ホームディレクトリなど上位に別の package-lock.json があると
  // Next がワークスペースルートを誤検出するため、明示しておく
  outputFileTracingRoot: here,
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
