import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { HeaderSearch } from "@/components/HeaderSearch";
import { MyListLink } from "@/components/MyListLink";
import { SITE } from "@/lib/site";

const DESCRIPTION = `『${SITE.game}』の収録カードを画像つきで一覧できる図鑑サイトです。`;
const TITLE = `${SITE.game} カード図鑑｜${SITE.name}`;

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
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#fff6fa",
};

const NAV: { href: string; label: string }[] = [{ href: "/cards", label: "カード図鑑" }];

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
              アイカツ<span>図鑑</span>
            </Link>
            <nav className="site-nav">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
              <MyListLink />
            </nav>
            <HeaderSearch />
          </div>
        </header>

        <main>{children}</main>

        <Footer />
      </body>
    </html>
  );
}
