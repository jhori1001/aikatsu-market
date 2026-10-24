import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `このサイトについて｜${SITE.name}`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <h1 className="page-title">このサイトについて</h1>
      <p className="page-sub">非公式のファンサイトです。</p>
      <div className="notice">
        <p style={{ margin: 0 }}>
          『{SITE.game}』の収録カードを画像つきで一覧できる個人運営の図鑑サイトです。
          公式（<a href={SITE.officialUrl}>{SITE.officialUrl}</a>）とは関係ありません。
        </p>
      </div>
    </>
  );
}
