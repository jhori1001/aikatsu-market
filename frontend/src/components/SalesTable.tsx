"use client";

import { useMemo, useState } from "react";
import { dayLabel, num, yen, yahooSearchUrl } from "@/lib/format";
import type { FakeListing } from "@/lib/fakePrice";

const PAGE = 10;

const STATUS: [string, string][] = [
  ["all", "すべて"],
  ["sold", "売却済み"],
  ["open", "販売中"],
];

const GRADE: [string, string][] = [
  ["all", "すべて"],
  ["mint", "美品"],
  ["damaged", "傷あり"],
];

const SORT: [string, string][] = [
  ["date", "新しい順"],
  ["price_desc", "価格が高い順"],
  ["price_asc", "価格が安い順"],
];

const STATUS_LABEL: Record<string, string> = { open: "販売中", sold: "売却済み" };
const GRADE_LABEL: Record<string, string> = { mint: "美品", damaged: "傷あり" };
const GRADE_TONE: Record<string, string> = { damaged: "badge-low" };

/** カドソバのSalesTableと同じ構成（種別・状態・並び順で絞り込める表）。サンプルデータ。 */
export function SalesTable({ items, keyword }: { items: FakeListing[]; keyword: string }) {
  const [status, setStatus] = useState("all");
  const [grade, setGrade] = useState("all");
  const [sort, setSort] = useState("date");
  const [shown, setShown] = useState(PAGE);

  const rows = useMemo(() => {
    let list = items;
    if (status !== "all") list = list.filter((i) => i.listing_status === status);
    if (grade !== "all") list = list.filter((i) => i.condition_grade === grade);
    const sorted = [...list];
    if (sort === "price_desc") sorted.sort((a, b) => b.price - a.price);
    else if (sort === "price_asc") sorted.sort((a, b) => a.price - b.price);
    else sorted.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    return sorted;
  }, [items, status, grade, sort]);

  const visible = rows.slice(0, shown);

  return (
    <>
      <div className="table-filters">
        <div className="filter-row">
          <span className="filter-label">種別</span>
          <div className="segmented">
            {STATUS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={value === status ? "active" : ""}
                onClick={() => {
                  setStatus(value);
                  setShown(PAGE);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-row">
          <span className="filter-label">状態</span>
          <div className="segmented">
            {GRADE.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={value === grade ? "active" : ""}
                onClick={() => {
                  setGrade(value);
                  setShown(PAGE);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

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
        <div className="empty">この条件に合う出品はありません。</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>種別</th>
                <th>日付</th>
                <th>状態</th>
                <th className="num">価格</th>
                <th className="col-title">商品タイトル</th>
                <th className="col-link" />
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className={`badge ${item.listing_status === "sold" ? "badge-high" : ""}`}>
                      {STATUS_LABEL[item.listing_status]}
                    </span>
                  </td>
                  <td className="nowrap faint">{dayLabel(item.date)}</td>
                  <td>
                    <span className={`badge ${GRADE_TONE[item.condition_grade] ?? ""}`}>
                      {GRADE_LABEL[item.condition_grade]}
                    </span>
                  </td>
                  <td className="num">
                    <strong>{yen(item.price)}</strong>
                  </td>
                  <td className="col-title title-cell">{item.title}</td>
                  <td className="col-link">
                    <a
                      className="see-btn"
                      href={yahooSearchUrl(keyword)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${item.title} をフリマで探す`}
                    >
                      フリマで探す
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

      <p className="sample-note">※ この表はサンプルデータです。実際の出品・取引ではありません。</p>
    </>
  );
}
