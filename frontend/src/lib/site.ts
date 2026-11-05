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
  /** 運営者名。カドソバ（日輪）と同じ */
  owner: "カドソバ",
  /** 問い合わせ先。カドソバ（日輪）と同じアドレス。空にすると画面に「準備中」と出す */
  email: "wanc0968@gmail.com",
  /** ドメイン・公開範囲が未確定のうちは false のまま */
  isPublic: false,
  /** 公開URL。OGPと canonical に使う（kadosoba.com の中の /aikatsu。next.config の basePath と同じ） */
  url: "https://kadosoba.com/aikatsu",
  /**
   * カード保護グッズ（Amazonアソシエイト）紹介セクションを出すかどうか。
   * 2026-11-05 ユーザー指示「日輪と同じ場所配置で置いて」により公開（リンクは日輪と同じ）。
   */
  showProtectionGoods: true,
  /** データの取得元。このサイトについて・プライバシーポリシーで参照する */
  sources: [
    { name: "アイカツ！アンコール公式カードリスト", what: "カード画像" },
    { name: "Yahoo!フリマ", what: "販売中の出品価格" },
    { name: "フルアヘッド アイドル館", what: "ショップの販売価格" },
  ],
  /** 正式な著作権表記は未確認。公開前に権利者表記を確認して埋める */
  rights: ["非公式のファンサイトです。権利は各権利者に帰属します。"],
} as const;

/**
 * public/ の画像や /img/cards/〜 のように、直に書く道の前に basePath（/aikatsu）を付ける。
 * next/link と router は自動で付くので、これは <img src> や <source srcSet> 用。
 */
export function asset(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
}

export const PAGES = [
  { href: "/about", label: "このサイトについて" },
  { href: "/terms", label: "利用規約" },
  { href: "/privacy", label: "プライバシーポリシー" },
] as const;
