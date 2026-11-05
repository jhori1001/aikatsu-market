import type { MetadataRoute } from "next";
import { getAllCardCodes } from "@/lib/cards";
import { PAGES, SITE } from "@/lib/site";

/**
 * サイトマップ（kadosoba.com/aikatsu/sitemap.xml）。カード1枚ずつのページまで検索エンジンに知らせる。
 * カドソバ（日輪）のサイトマップと同じ作り。kadosoba.com/robots.txt（日輪が出している）から
 * このサイトマップを案内している。
 *
 * ページと同じく、毎日の更新のあとに /api/revalidate が作り直す（それまでは作り置き）。
 * DBが落ちていれば例外のまま（前の作り置きを残す）。
 */
export const dynamic = "force-static";
export const revalidate = false;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const fixed: MetadataRoute.Sitemap = [
    { url: SITE.url, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE.url}/cards`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...PAGES.map((page) => ({
      url: `${SITE.url}${page.href}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
  const codes = await getAllCardCodes();
  const cards: MetadataRoute.Sitemap = codes.map((code) => ({
    url: `${SITE.url}/cards/${encodeURIComponent(code)}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));
  return [...fixed, ...cards];
}
