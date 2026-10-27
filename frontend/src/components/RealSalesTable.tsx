"use client";

import { useMemo, useState } from "react";
import { dayLabel, num, yen } from "@/lib/format";
import type { RealListing } from "@/lib/realPrice";

const PAGE = 10;
const SORT: [string, string][] = [
  ["date", "新しい順"],
  ["price_desc", "価格が高い順"],
  ["price_asc", "価格が安い順"],
];

/** 実際のYahoo!フリマの出品一覧（ER・PRのみ）。状態(美品/傷あり)は記録していないため出さない。 */
export function RealSalesTable({ items }: { items: RealListing[] }) {
  const [sort, setSort] = useState("date");
  const [shown, setShown] = useState(PAGE);

  const rows = useMemo(() => {
    const sorted = [...items];
    if (sort === "price_desc") sorted.sort((a, b) => b.price - a.price);
    else if (sort === "price_asc") sorted.sort((a, b) => a.price - b.price);
    else sorted.sort((a, b) => Date.parse(b.firstSeenAt) - Date.parse(a.firstSeenAt));
    return sorted;
  }, [items, sort]);

  const visible = rows.slice(0, shown);

  return (
    <>
      <div className="table-filters">
        <div className="filter-row wide">
          <span className="filter-label">並び順</span>
          <div className="segmented">
            {SORT.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={value === sort ? "active" : ""}
                onClick={() => setSort(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-foot">
          <span className="filter-count">{num(rows.length)}件</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty">この カードの出品はまだ見つかっていません。</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>日付</th>
                <th className="num">価格</th>
                <th className="col-title">商品タイトル</th>
                <th className="col-link" />
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id}>
                  <td className="nowrap faint">{dayLabel(item.firstSeenAt)}</td>
                  <td className="num">
                    <strong>{yen(item.price)}</strong>
                  </td>
                  <td className="col-title title-cell">
                    <a className="title-link" href={item.url} target="_blank" rel="noreferrer">
                      {item.title}
                      <span className="title-link-mark" aria-hidden="true">
                        ↗
                      </span>
                    </a>
                  </td>
                  <td className="col-link">
                    <a className="see-btn" href={item.url} target="_blank" rel="noreferrer">
                      フリマで見る
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > visible.length ? (
        <button type="button" className="more-btn" onClick={() => setShown(shown + PAGE)}>
          さらに{Math.min(PAGE, rows.length - visible.length)}件を見る
          <span className="faint">（残り {num(rows.length - visible.length)}件）</span>
        </button>
      ) : null}
    </>
  );
}
