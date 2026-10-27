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
export function searchKeyword(card: { name: string | null; idol_name: string | null }): string {
  return [card.name ?? "", card.idol_name ?? ""].filter(Boolean).join(" ");
}

export function mercariSearchUrl(keyword: string): string {
  const url = new URL("https://jp.mercari.com/search");
  url.searchParams.set("keyword", keyword);
  return url.toString();
}

export function yahooSearchUrl(keyword: string): string {
  return `https://paypayfleamarket.yahoo.co.jp/search/${encodeURIComponent(keyword)}`;
}
