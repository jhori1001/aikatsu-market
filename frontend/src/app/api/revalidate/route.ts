import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";

/**
 * 作り置きのページを捨てて、作り直させる。
 *
 *   POST /api/revalidate   ヘッダー x-revalidate-key: <鍵>
 *
 * 公開ページは毎日の更新のあとに1回だけ作り、あとは作り置きを出す
 * （カドソバ＝nichirin-market の F2 と同じ、2026-11-05）。DBの中身を変える
 * ワークフローの最後にこれを呼び、続けて全ページを1回ずつ開いて作り直させる
 * （backend/app/jobs/revalidate_site.py）。
 *
 * 鍵は、DBのパスワードから作る（"aikatsu-revalidate:" + パスワード の SHA-256）。
 * DATABASE_URL は Vercel と GitHub の Secrets の両方に既にあるので、
 * 新しい秘密を増やさずに済む。接続先の書き方（postgresql+psycopg:// か、
 * pooler の有無）は両者で違うことがあるので、パスワードだけを使う。
 * 誰でも呼べると、作り直しを連打されてDBが起こされ続けるため、鍵が無ければ断る。
 *
 * アイカツは問い合わせ結果を unstable_cache で使い回していないので、
 * カドソバの revalidateTag は要らない（ページの作り直しだけで新しい値になる）。
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function expectedKey(): string | null {
  const raw = process.env.DATABASE_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw.replace(/^[a-z0-9+.-]+:\/\//i, "postgresql://"));
    const password = decodeURIComponent(url.password);
    if (!password) return null;
    return createHash("sha256").update(`aikatsu-revalidate:${password}`).digest("hex");
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const expected = expectedKey();
  const given = request.headers.get("x-revalidate-key") ?? "";
  if (
    !expected ||
    given.length !== expected.length ||
    !timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  ) {
    return new Response("forbidden", { status: 403 });
  }

  // 全ページ（ルートの下すべて）を作り直し待ちにする。次に開かれたときに作り直される
  revalidatePath("/", "layout");

  return Response.json({ ok: true, at: new Date().toISOString() });
}
