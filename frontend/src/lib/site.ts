/**
 * サイトの基本情報。固定ページとヘッダーで共通して使う。
 *
 * サイト名・ドメインはまだ決めていない（2026-10-24時点）。決まるまでは
 * isPublic を false にして検索エンジンには出さない。
 */

export const SITE = {
  name: "アイカツ図鑑",
  tagline: "アイカツ！アンコールの収録カード図鑑",
  game: "アイカツ！アンコール",
  officialUrl: "https://dcd.aikatsu.com/encore/",
  owner: "個人運営",
  email: "",
  /** ドメイン・公開範囲が未確定のうちは false のまま */
  isPublic: false,
  url: "https://example.com",
  sources: [{ name: "アイカツ！アンコール公式カードリスト", what: "カード画像" }],
  /** 正式な著作権表記は未確認。公開前に権利者表記を確認して埋める */
  rights: ["非公式のファンサイトです。権利は各権利者に帰属します。"],
} as const;

export const PAGES = [
  { href: "/about", label: "このサイトについて" },
] as const;
