/**
 * レアリティの短い記号(code_suffix)を画面表示用に変換する。
 *
 * card.rarity には収集時点でフルの日本語名（例: "プレミアムレア"）が
 * 入っているが、一覧タイルの小さいバッジには短い記号のほうが収まりがいい
 * ので、code_suffix（"PR" "R" "N" "ER"）を見出しに使う。
 */

export const RARITY_SHORT_LABEL: Record<string, string> = {
  PR: "PR",
  ER: "ER",
  R: "R",
  N: "N",
};

export const RARITY_FULL_LABEL: Record<string, string> = {
  PR: "プレミアムレア",
  ER: "アンコールレア",
  R: "レア",
  N: "ノーマル",
};

/** 一覧タイルの角バッジ・badge共通のCSSクラス修飾子 */
export function rarityClass(suffix: string | null): string {
  switch (suffix) {
    case "PR":
      return "pr";
    case "ER":
      return "er";
    case "R":
      return "r";
    case "N":
      return "n";
    default:
      return "";
  }
}

/** PR・ERを「きらめくレア」として扱う（ホームの特集に使う） */
export function isSparkleRarity(suffix: string | null): boolean {
  return suffix === "PR" || suffix === "ER";
}
