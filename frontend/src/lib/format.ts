export function yen(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString("ja-JP")}円`;
}

export function num(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("ja-JP");
}

export function dayLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" });
}

/** フリマサイトで探すときの検索語。カード名とアイドル名をつなげるだけ。 */
export function searchKeyword(card: {
  name: string | null;
  idol_name: string | null;
  is_parallel?: boolean;
}): string {
  return [card.name ?? "", card.idol_name ?? "", card.is_parallel ? "パラレル" : ""]
    .filter(Boolean)
    .join(" ");
}

/**
 * メルカリの検索結果。アフィリエイトIDが設定されていれば付ける（カドソバと同じ）。
 * メルカリアンバサダーのリンクは afid= を足すだけなので、カードごとに手で作らなくても組み立てられる。
 */
export function mercariSearchUrl(keyword: string, affiliateId = ""): string {
  const url = new URL("https://jp.mercari.com/search");
  url.searchParams.set("keyword", keyword);
  if (affiliateId) url.searchParams.set("afid", affiliateId);
  return url.toString();
}

export function yahooSearchUrl(keyword: string): string {
  return `https://paypayfleamarket.yahoo.co.jp/search/${encodeURIComponent(keyword)}`;
}
