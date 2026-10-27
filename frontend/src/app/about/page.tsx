import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `このサイトについて｜${SITE.name}`,
  description: `${SITE.name}の運営について、データの取得元について。`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <article className="doc">
      <h1>このサイトについて</h1>

      <dl className="doc-kv">
        <dt>サイト名</dt>
        <dd>{SITE.name}</dd>

        <dt>運営者</dt>
        <dd>{SITE.owner}</dd>

        <dt>お問い合わせ</dt>
        <dd>
          {SITE.email ? (
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          ) : (
            <span className="doc-pending">準備中</span>
          )}
        </dd>
      </dl>

      <h2>当サイトについて</h2>
      <p>
        『{SITE.game}』の収録カードを画像つきで一覧できる、個人運営の非公式ファンサイトです。
        カードの売買は行っていません。
      </p>
      <p>
        公式サイト：
        <a href={SITE.officialUrl} target="_blank" rel="noreferrer">
          {SITE.officialUrl}
        </a>
      </p>

      <h2>データの取得元</h2>
      <p>掲載しているカード画像・情報は、次の公開情報をもとにしています。</p>
      <ul>
        {SITE.sources.map((source) => (
          <li key={source.name}>
            <strong>{source.name}</strong> … {source.what}
          </li>
        ))}
      </ul>
      <p>
        カード名・アイドル名は公式サイトの文字情報として存在しないため、カード画像から
        目視で読み取って登録しています。誤りがある場合があります。
      </p>

      <h2>非公式サイトです</h2>
      <p>
        当サイトは個人が趣味で運営しているもので、カードの発行元・制作元・販売店その他の権利者とは
        一切関係ありません。各社へのお問い合わせはご遠慮ください。
      </p>
    </article>
  );
}
