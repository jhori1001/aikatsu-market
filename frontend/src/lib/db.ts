// Neon（クラウドPostgreSQL）への接続。
//
// DATABASE_URL は backend/.env と GitHub Actions で共有しているものをそのまま使う。
// そちらは SQLAlchemy 用に postgresql+psycopg:// と書かれているので、ここで外す。

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

/** ビルド時に DATABASE_URL が無くても落ちないよう、最初に使うときに作る。 */
function getClient(): NeonQueryFunction<false, false> {
  if (client) return client;

  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error(
      "DATABASE_URL が設定されていません。" +
        "Vercel は Settings > Environment Variables で設定してください。",
    );
  }
  const url = raw
    .replace(/^postgresql\+psycopg:\/\//, "postgresql://")
    .replace(/^postgres:\/\//, "postgresql://");

  client = neon(url);
  return client;
}

/**
 * ドライバは date / timestamp 列を JS の Date オブジェクトのまま返す。
 * 画面側の型はすべて string 前提で作るため、ここで ISO文字列に統一しておく。
 * （Date のまま画面に渡ると React が「オブジェクトを子要素として描画できない」
 * エラーで落ちる）
 */
function normalizeRow<T>(row: T): T {
  if (row === null || typeof row !== "object") return row;
  const out: Record<string, unknown> = { ...(row as Record<string, unknown>) };
  for (const key of Object.keys(out)) {
    const value = out[key];
    if (value instanceof Date) out[key] = value.toISOString();
  }
  return out as T;
}

/**
 * SQLを実行して行の配列を返す。
 *
 * 値は必ず params で渡すこと（文字列連結で組み立てるとSQLインジェクションになる）。
 */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const rows = await getClient().query(text, params);
  return (rows as T[]).map(normalizeRow);
}
