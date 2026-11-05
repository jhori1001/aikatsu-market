/**
 * サイトの基本情報。固定ページとヘッダーで共通して使う。
 *
 * サイト名・ドメインはまだ決めていない（2026-10-24時点）。決まるまでは
 * isPublic を false にして検索エンジンには出さない。
 */

export const SITE = {
  name: "カドソバ",
  tagline: "フリマの出品データでわかる、アイカツ！アンコールのカード相場",
  game: "アイカツ！アンコール",
  /** バナーの大きな見出し用（「アイカツ！アンコール最新相場」） */
  gameShort: "アイカツ！アンコール",
  officialUrl: "https://dcd.aikatsu.com/encore/",
  owner: "個人運営",
  email: "",
  /** ドメイン・公開範囲が未確定のうちは false のまま */
  isPublic: false,
  url: "https://example.com",
  /**
   * カード保護グッズ（Amazonアソシエイト）紹介セクションを出すかどうか。
   * 2026-11-05 ユーザー指示「日輪と同じ場所配置で置いて」により公開（リンクは日輪と同じ）。
   */
  showProtectionGoods: true,
  sources: [{ name: "アイカツ！アンコール公式カードリスト", what: "カード画像" }],
  /** 正式な著作権表記は未確認。公開前に権利者表記を確認して埋める */
  rights: ["非公式のファンサイトです。権利は各権利者に帰属します。"],
} as const;

export const PAGES = [
  { href: "/about", label: "このサイトについて" },
] as const;
