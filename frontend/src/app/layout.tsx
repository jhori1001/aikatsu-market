import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { HeaderSearch } from "@/components/HeaderSearch";
import { MyListLink } from "@/components/MyListLink";
import { SITE, asset } from "@/lib/site";

// 検索結果に出る説明文。日輪（「…最新相場情報。高騰・下落ランキング、取引件数などを…」）と同じ形の
// アイカツ版（2026-11-05、ユーザー指示）。アイカツの相場は1日1回の更新なので「リアルタイム」とは書かない
const DESCRIPTION =
  `『${SITE.game}』（アイカツ）の最新相場情報。値動きのグラフ、パラレルの高額ランキング、`
  + "フリマとショップの価格などを毎日更新で確認できます。";
// 題名の先頭はゲームの正式名称にする（日輪と同じ。検索する人は「カドソバ」を知らない）
const TITLE = `${SITE.game} カード相場・価格推移｜${SITE.name}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: TITLE, template: `%s` },
  description: DESCRIPTION,
  robots: SITE.isPublic ? undefined : { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "ja_JP",
    url: SITE.url,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/hero-banner.webp", width: 2000, height: 750, alt: SITE.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/hero-banner.webp"],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  // ブラウザの上の帯の色。ヘッダー（白）と合わせる。ピンクだとスマホの上側が透けて見えていた
  // （2026-11-05、ユーザー指摘「上側透けてるから直してくれ」。カドソバも白）
  themeColor: "#ffffff",
};

const NAV: { href: string; label: string }[] = [{ href: "/cards", label: "カード" }];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: SITE.name,
              url: SITE.url,
              inLanguage: "ja",
              description: DESCRIPTION,
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${SITE.url}/cards?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <header className="site-header">
          <div className="site-header-inner">
            <Link href="/" className="brand">
              カド<span>ソバ</span>
            </Link>
            <nav className="site-nav">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
              <MyListLink />
            </nav>
            {/* 相手のサイト（カドソバ＝日輪とアイカツ）へのバナー。マイリストの横に小さなボタンの大きさで
                置く（2026-11-05、ユーザー指示）。相手のサイトの道なので next/link ではなく <a> */}
            <a className="sister-btn" href="https://kadosoba.com/" aria-label="バトスラ（日輪）の相場はこちら">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset("/sister/nichirin-banner-800.webp?v=2")} width={800} height={200} alt="バトスラ（日輪）の相場はこちら" decoding="async" />
            </a>

            <HeaderSearch />
          </div>
        </header>

        <main>{children}</main>

        <Footer />
      </body>
    </html>
  );
}
