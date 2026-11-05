import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * サイトは kadosoba.com/aikatsu で出す（2026-11-05、ユーザー指示「kadosoba/aikatsu って感じにしたい」）。
 * kadosoba.com は日輪（nichirin-market）の Vercel プロジェクトにつながっていて、そこの vercel.json が
 * /aikatsu 以下をこのサイト（aikatsu-market.vercel.app/aikatsu/〜）へ回す。
 * next/link・router は自動でこれを付けるが、<img src> などに直に書いた道は付かないので
 * lib/site.ts の asset() を通す（NEXT_PUBLIC_BASE_PATH で同じ値を渡す）。
 */
const basePath = "/aikatsu";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // ホームディレクトリなど上位に別の package-lock.json があると
  // Next がワークスペースルートを誤検出するため、明示しておく
  outputFileTracingRoot: here,
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
