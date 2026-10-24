import { query } from "@/lib/db";

/**
 * カード画像を配る。
 *
 *   /img/cards/{official_code}/front-thumb.webp
 *   /img/cards/{official_code}/back-large.webp
 *
 * 見に来た人のブラウザには公式(dcd.aikatsu.com)のサーバーを直接叩かせない。
 */

export const runtime = "nodejs";

// official_code の例: "E1-01_PR"
const KEY_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const FILE_PATTERN = /^(front|back)-(thumb|large)\.webp$/;

const CACHE_CONTROL = "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string; file: string }> },
) {
  const { key, file } = await params;
  const match = FILE_PATTERN.exec(file);
  if (!KEY_PATTERN.test(key) || !match) {
    return new Response("not found", { status: 404 });
  }
  const [, side, variant] = match;

  const rows = await query<{ b64: string; sha256: string; content_type: string }>(
    `select encode(i.data, 'base64') as b64, i.sha256, i.content_type
       from card_images i
       join cards c on c.id = i.card_pk
      where c.official_code = $1 and i.side = $2 and i.variant = $3`,
    [key, side, variant],
  );
  const row = rows[0];
  if (!row) {
    return new Response("not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const etag = `"${row.sha256}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": CACHE_CONTROL } });
  }

  const body = Buffer.from(row.b64, "base64");
  return new Response(body, {
    headers: {
      "Content-Type": row.content_type,
      "Content-Length": String(body.length),
      "Cache-Control": CACHE_CONTROL,
      ETag: etag,
    },
  });
}
