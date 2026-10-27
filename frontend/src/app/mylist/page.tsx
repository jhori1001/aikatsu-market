import type { Metadata } from "next";
import { getCards } from "@/lib/cards";
import { ErrorBox } from "@/components/ErrorBox";
import { MyListView } from "@/components/MyListView";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `すきなカード｜${SITE.name}`,
  description: "登録したすきなカードの一覧です。",
  robots: { index: false, follow: false },
};

export default async function MyListPage() {
  let cards;
  try {
    const res = await getCards({ per_page: 200 });
    cards = res.items;
  } catch (error) {
    return (
      <>
        <h1 className="page-title">すきなカード</h1>
        <ErrorBox error={error instanceof Error ? error.message : String(error)} />
      </>
    );
  }

  return (
    <>
      <h1 className="page-title">すきなカード</h1>
      <MyListView cards={cards} />
      <div className="home-note">
        登録した内容は、この端末のブラウザの中だけに保存しています。当サイトのサーバーには送っていません。
        ブラウザの履歴やサイトデータを消すと、一緒に消えます。別の端末には引き継がれません。
      </div>
    </>
  );
}
