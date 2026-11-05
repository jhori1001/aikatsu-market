import type { Metadata } from "next";
import { getAllCards } from "@/lib/cards";
import { MyListView } from "@/components/MyListView";
import { SITE } from "@/lib/site";

// 毎日の更新のあとに1回だけ作り、あとは作り置きを出す（カドソバの F2 と同じ、2026-11-05）。
// 作り直しは /api/revalidate が行う。見に来た人やロボットが来てもDB（Neon）は起きない。
export const dynamic = "force-static";
export const revalidate = false;

export const metadata: Metadata = {
  title: `マイリスト｜${SITE.name}`,
  description: "マイリストに登録したカードの一覧です。",
  robots: { index: false, follow: false },
};

export default async function MyListPage() {
  // DBが落ちていれば例外のまま（前の作り置きを残す）
  const cards = await getAllCards();

  return (
    <>
      <h1 className="page-title">マイリスト</h1>
      <MyListView cards={cards} />
      <div className="home-note">
        登録した内容は、この端末のブラウザの中だけに保存しています。当サイトのサーバーには送っていません。
        ブラウザの履歴やサイトデータを消すと、一緒に消えます。別の端末には引き継がれません。
      </div>
    </>
  );
}
