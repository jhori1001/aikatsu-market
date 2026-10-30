"use client";

import { useMemo, useState } from "react";
import { dayLabel, num, yen } from "@/lib/format";
import type { RealListing } from "@/lib/realPrice";

/**
 * 出品の内訳（カドソバの SalesTable と同じ作り）。
 *
 * 「なぜこの相場になったか」を確かめる表なので、絞り込みと並べ替えができないと
 * 使いものにならない。データは最初にまとめて受け取り、切り替えはブラウザ側だけで行う。
 *
 * 集計に使った出品だけを出す。除外したもの（パラレル版・まとめ売り・別カード等）と
 * その理由は画面に出さない（カドソバと同じ）。
 */

/** 1回に見せる件数。全部出すと読めない */
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

/** 表では状態を2区分に丸める。元の文言はマウスを乗せると出る */
const GRADE_LABEL: Record<string, string> = {
  mint: "美品",
  damaged: "傷あり",
};

const GRADE_TONE: Record<string, string> = {
  damaged: "badge-low",
};

const CONDITION_LABEL: Record<string, string> = {
  new: "新品、未使用",
  used10: "未使用に近い",
  used20: "目立った傷や汚れなし",
  used40: "やや傷や汚れあり",
  used60: "傷や汚れあり",
  used80: "全体的に状態が悪い",
};

const STATUS_LABEL: Record<string, string> = {
  open: "販売中",
  sold: "売却済み",
  withdrawn: "取消",
  unknown: "不明",
};

/** 並べ替えに使う日付。最後に見た日。 */
function timeOf(item: RealListing): number {
  const t = Date.parse(item.lastSeenAt);
  return Number.isNaN(t) ? 0 : t;
}

export function RealSalesTable({ items }: { items: RealListing[] }) {
  const [status, setStatus] = useState("all");
  const [grade, setGrade] = useState("all");
  const [sort, setSort] = useState("date");
  const [shown, setShown] = useState(PAGE);

  const rows = useMemo(() => {
    let list = items;
    if (status !== "all") list = list.filter((i) => i.listingStatus === status);
    if (grade !== "all") list = list.filter((i) => i.conditionGrade === grade);

    const sorted = [...list];
    if (sort === "price_desc") sorted.sort((a, b) => b.price - a.price);
    else if (sort === "price_asc") sorted.sort((a, b) => a.price - b.price);
    else sorted.sort((a, b) => timeOf(b) - timeOf(a));
    return sorted;
  }, [items, status, grade, sort]);

  const visible = rows.slice(0, shown);

  return (
    <>
      <div className="table-filters">
        <div className="filter-row">
          <span className="filter-label">種別</span>
          <div className="segmented tone-status">
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
          <div className="segmented tone-grade">
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
          <div className="segmented tone-sort">
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
                    <span className={`badge ${item.listingStatus === "sold" ? "badge-high" : ""}`}>
                      {STATUS_LABEL[item.listingStatus] ?? item.listingStatus}
                    </span>
                  </td>
                  <td className="nowrap faint">{dayLabel(item.lastSeenAt)}</td>
                  <td>
                    <span
                      className={`badge ${GRADE_TONE[item.conditionGrade ?? ""] ?? ""}`}
                      title={item.itemCondition ? (CONDITION_LABEL[item.itemCondition] ?? item.itemCondition) : undefined}
                    >
                      {GRADE_LABEL[item.conditionGrade ?? ""] ?? "不明"}
                    </span>
                  </td>
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
                    <a
                      className="see-btn"
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${item.title} をYahoo!フリマで見る`}
                    >
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
