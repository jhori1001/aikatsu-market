import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { SITE, PAGES } from "@/lib/site";

const DESCRIPTION = `『${SITE.game}』の収録カードを一覧できる図鑑サイトです。`;
const TITLE = `${SITE.game} カード図鑑｜${SITE.name}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: TITLE, template: `%s` },
  description: DESCRIPTION,
  // ドメイン・公開範囲が確定するまでは検索結果に出さない
  robots: SITE.isPublic ? undefined : { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "ja_JP",
    url: SITE.url,
    title: TITLE,
    description: DESCRIPTION,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

const NAV: { href: string; label: string }[] = [{ href: "/cards", label: "カード図鑑" }];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <Link href="/" className="brand">
              アイカツ<span>図鑑</span>
            </Link>
            <nav className="site-nav">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="site-footer">
          <div className="site-footer-inner">
            <nav className="footer-nav">
              {PAGES.map((p) => (
                <Link key={p.href} href={p.href}>
                  {p.label}
                </Link>
              ))}
            </nav>
            {SITE.rights.map((r) => (
              <p key={r} className="footer-rights">
                {r}
              </p>
            ))}
          </div>
        </footer>
      </body>
    </html>
  );
}
