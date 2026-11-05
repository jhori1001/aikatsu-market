/**
 * カード保護グッズ（Amazonアソシエイト）の紹介リンク。
 *
 * 商品名付きで確認したリンク（amzlinks.in、Amazonアプリの
 * 「アソシエイトリンクをコピー」で作った短縮リンク）。ストアID
 * wanc0968-22 が付いていることを2026-10-02にスクショで確認済み。
 */
export type ProtectionGood = {
  id: string;
  label: string;
  blurb: string;
  href: string;
};

export const PROTECTION_GOODS: ProtectionGood[] = [
  {
    id: "sleeve",
    label: "カードスリーブ",
    blurb: "汚れや擦れからカードを守る",
    href: "https://amzlinks.in/B00drTvv4",
  },
  {
    id: "binder",
    label: "カードバインダー",
    blurb: "まとめて整理・保管できる",
    href: "https://amzlinks.in/B0bCX5Y0Q",
  },
  {
    id: "loader",
    label: "カードローダー",
    blurb: "衝撃や折れからしっかり保護",
    href: "https://amzlinks.in/B06eJeAT3",
  },
];
