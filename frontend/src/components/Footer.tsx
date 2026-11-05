import Link from "next/link";
import { PAGES, SITE } from "@/lib/site";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <nav className="footer-nav">
          {PAGES.map((page) => (
            <Link key={page.href} href={page.href}>
              {page.label}
            </Link>
          ))}
        </nav>

        {/* 姉妹サイト（カドソバ＝日輪。同じ kadosoba.com のトップ）。このサイトは basePath=/aikatsu
            なので、next/link にすると /aikatsu が付いてしまう。<a> で直に書く */}
        <p className="footer-sister">
          <a href="https://kadosoba.com/">鬼滅の刃 日輪バトルスラッシュ（バトスラ）の相場</a>
        </p>

        <p className="footer-note">
          当サイトは個人が運営する非公式のファンサイトです。「{SITE.game}」の発行元・制作元、
          その他の権利者とは一切関係ありません。
        </p>

        <p className="footer-rights">
          {SITE.rights.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>

        <p className="footer-copy">
          © {new Date().getFullYear()} {SITE.name}
        </p>
      </div>
    </footer>
  );
}
