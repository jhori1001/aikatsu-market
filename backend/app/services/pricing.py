"""相場計算アルゴリズム（設計書 11章）。

外れ値除去は IQR 法 + 中央値レシオガードの二段構え。
係数はすべて引数（＝app_settings 由来）で受け取り、ハードコードしない。
DBに依存しない純粋関数なので単体テストできる。
"""

from __future__ import annotations

import dataclasses
import statistics

# サンプルがこれ未満のときは IQR が不安定なので外れ値除去をしない
MIN_SAMPLES_FOR_OUTLIER_REMOVAL = 4


@dataclasses.dataclass(frozen=True)
class PricingConfig:
    iqr_multiplier: float = 1.5
    # 中央値からこの倍率を超えて離れた価格は落とす。実データでは
    # 同じカード・同じ状態で 0.22〜3.5倍の開きがあり、その大半は
    # まとめ売りや強気すぎる値付けだった。
    median_lower_ratio: float = 0.5
    median_upper_ratio: float = 2.0
    target_samples: int = 30
    max_scan_items: int = 120

    # 相場を「いつの成約から出すか」。
    # 期間を切らずに直近N件で出すと、取引の少ないカードでは数か月前の成約が
    # ずっと混ざり続け、値上がりしてもグラフが動かなくなる。
    #
    # 検索からカード番号を外して取得件数が30倍になり（新規 約176件/日）、
    # 3週間でも1枚あたり十分な件数が入るようになった。
    # fallback を同じ値にして期間を広げない（広げると古い成約が戻る）。
    window_days: int = 21
    window_days_fallback: int = 21
    min_samples_window: int = 5
    min_samples_publish: int = 3

    # 販売中の平均だけの下限（成約の平均とは別枠）。
    # ユーザー指示（2026-09-25）: 出品が1〜2件でも、無いよりは出す。
    # min_samples_publish（成約向け）を下げると、まとめ売り混入時の
    # 「300円のカードが1,222円」のような誤りが成約側にも及ぶため、
    # 販売中の平均だけ別のしきい値にする。
    min_samples_publish_asking: int = 1

    # 中央値から極端に離れた価格を、外れ値除去の前に落とすための倍率。
    # IQR法は「外れ値が少数である」ことを前提にしているので、
    # 高額カードとの抱き合わせが何件も混ざると基準そのものが持ち上がり、
    # 除去が効かなくなる（実測: SRの採用に49,500円が残り、中央値538円に対して
    # 90倍の開きが出ていた）。先に明らかな桁違いを落としてから通常の除去を行う。
    hard_ratio: float = 6.0

    @classmethod
    def from_settings(cls, get) -> "PricingConfig":
        """settings_store.get_setting を渡して DB の値から組み立てる。"""
        return cls(
            iqr_multiplier=float(get("pricing.iqr_multiplier", 1.5)),
            median_lower_ratio=float(get("pricing.median_lower_ratio", 0.5)),
            median_upper_ratio=float(get("pricing.median_upper_ratio", 2.0)),
            target_samples=int(get("pricing.target_samples", 30)),
            max_scan_items=int(get("pricing.max_scan_items", 120)),
            window_days=int(get("pricing.window_days", 21)),
            window_days_fallback=int(get("pricing.window_days_fallback", 21)),
            min_samples_window=int(get("pricing.min_samples_window", 5)),
            min_samples_publish=int(get("pricing.min_samples_publish", 3)),
            min_samples_publish_asking=int(get("pricing.min_samples_publish_asking", 1)),
            hard_ratio=float(get("pricing.hard_ratio", 6.0)),
        )


@dataclasses.dataclass
class OutlierResult:
    kept: list[int]
    removed: list[int]
    lower_bound: float | None
    upper_bound: float | None


@dataclasses.dataclass
class PriceStats:
    average_price: int | None
    median_price: int | None
    min_price: int | None
    max_price: int | None
    sample_count: int
    outlier_count: int
    lower_bound: float | None = None
    upper_bound: float | None = None


def quartiles(values: list[int]) -> tuple[float, float]:
    """線形補間による Q1 / Q3。"""
    ordered = sorted(values)
    q1, _q2, q3 = statistics.quantiles(ordered, n=4, method="inclusive")
    return q1, q3


def drop_absurd(values: list[int], config: PricingConfig) -> tuple[list[int], list[int]]:
    """中央値の hard_ratio 倍を超える／下回る価格を先に落とす。

    IQR法は「外れ値は少数」という前提で成り立っている。高額カードとの
    抱き合わせが何件も混ざると四分位そのものが持ち上がり、除去が効かなくなる。
    桁違いのものを先に落としてから、通常の除去にかける。

    中央値を基準にするので、混入が半数を超えない限り正しく働く。
    """
    if len(values) < MIN_SAMPLES_FOR_OUTLIER_REMOVAL or config.hard_ratio <= 1:
        return list(values), []

    median = statistics.median(values)
    if median <= 0:
        return list(values), []

    hi = median * config.hard_ratio
    lo = median / config.hard_ratio
    kept = [v for v in values if lo <= v <= hi]
    dropped = [v for v in values if v < lo or v > hi]
    # 全部落ちることは無いはずだが、念のため安全弁を置く
    if not kept:
        return list(values), []
    return kept, dropped


def remove_outliers(values: list[int], config: PricingConfig) -> OutlierResult:
    """桁違いの除去 → IQR 法 + 中央値レシオガード。

    サンプルが少ないときに除去しすぎて0件になる事故を防ぐため、
    4件未満では除去自体を行わない。
    """
    if len(values) < MIN_SAMPLES_FOR_OUTLIER_REMOVAL:
        return OutlierResult(kept=list(values), removed=[], lower_bound=None, upper_bound=None)

    values, absurd = drop_absurd(values, config)
    if len(values) < MIN_SAMPLES_FOR_OUTLIER_REMOVAL:
        return OutlierResult(
            kept=list(values), removed=absurd, lower_bound=None, upper_bound=None
        )

    median = statistics.median(values)
    q1, q3 = quartiles(values)
    iqr = q3 - q1

    lower = q1 - config.iqr_multiplier * iqr
    upper = q3 + config.iqr_multiplier * iqr

    # 中央値から極端に離れた価格は、IQRが広くても落とす
    lower = max(lower, median * config.median_lower_ratio)
    upper = min(upper, median * config.median_upper_ratio)

    kept = [v for v in values if lower <= v <= upper]
    removed = [v for v in values if v < lower or v > upper]

    # 全部落ちてしまった場合は除去しなかったことにする（安全弁）
    if not kept:
        return OutlierResult(
            kept=list(values), removed=absurd, lower_bound=lower, upper_bound=upper
        )

    return OutlierResult(
        kept=kept, removed=absurd + removed, lower_bound=lower, upper_bound=upper
    )


def compute_price_stats(values: list[int], config: PricingConfig | None = None) -> PriceStats:
    """採用済み価格リストから日次相場を算出する。

    「現在相場」は中央値。平均は補助情報。
    """
    config = config or PricingConfig()

    if not values:
        return PriceStats(
            average_price=None,
            median_price=None,
            min_price=None,
            max_price=None,
            sample_count=0,
            outlier_count=0,
        )

    # 目標件数まで（新しい順に渡される前提で）先頭を使う
    target = values[: config.target_samples]
    outliers = remove_outliers(target, config)
    kept = outliers.kept

    return PriceStats(
        average_price=round(statistics.fmean(kept)),
        median_price=round(statistics.median(kept)),
        min_price=min(kept),
        max_price=max(kept),
        sample_count=len(kept),
        outlier_count=len(outliers.removed),
        lower_bound=outliers.lower_bound,
        upper_bound=outliers.upper_bound,
    )


def day_over_day(today_median: int | None, prev_median: int | None) -> tuple[int | None, float | None, str]:
    """前日比（要件14）。(差額, 比率%, 表示ラベル) を返す。"""
    if not today_median or not prev_median:
        return None, None, "比較データなし"
    diff = today_median - prev_median
    ratio = round(diff / prev_median * 100, 1)
    sign = "+" if diff >= 0 else ""
    return diff, ratio, f"{sign}{diff:,}円 ({sign}{ratio}%)"
