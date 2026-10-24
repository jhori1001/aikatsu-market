"""アイカツ！アンコール公式サイトのカードリスト収集。

■ サイトの構造（実測済み、2026-10-24、dcd.aikatsu.com/encore/cardlist/）
  - robots.txt は無し（404）。負荷は抑える（PoliteClientでリクエスト間隔を空ける）
  - カード一覧は GET のクエリ文字列で絞り込める。絞り込みフォーム自体は
    POSTだが、同じパラメータ名でGETしても同じ結果が返ってくることを確認済み。
      GET /encore/cardlist/?search=true&series=<series>&display=3&sort=1
      search=true 固定、display=3（通常+パラレル両方）、sort=1（カード番号昇順）
  - 絞り込みの選択肢は <select> ではなく、隠しinput + ボタン群（data-value）。
    弾数(series) の例: ""=すべて, "629001"=1弾, "629901"=プロモーションカード
    （新しい弾が出たら値が増えるので、固定値に頼らず都度HTMLから読む）
  - レアリティのコード: PR=プレミアムレア, R=レア, N=ノーマル, ER=アンコールレア
  - **カード名・アイドル名はHTMLに1文字も存在しない。** 取得できるのは
    画像ファイル名（例: "E1-01_PR"）と表/裏の画像URLだけ。
    "E1-01_PR" = 弾コード"E1" + カード番号"01" + レアリティ記号"PR"
  - 指定した弾は1回のGETで全件が返ってくる（実測: series=629001で85件が
    1レスポンスに収まっていた。追加のページングリクエストは不要）
"""

from __future__ import annotations

import dataclasses
import logging
import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from app.collectors.http import CrawlError, PoliteClient
from app.config import settings

logger = logging.getLogger(__name__)

CODE_RE = re.compile(r"^([A-Za-z]+\d+)-(\d+)(?:_(.+))?$")

RARITY_LABELS = {
    "PR": "プレミアムレア",
    "R": "レア",
    "N": "ノーマル",
    "ER": "アンコールレア",
}


@dataclasses.dataclass
class CollectedCard:
    official_code: str
    series_code: str | None
    card_number: str | None
    code_suffix: str | None
    rarity: str | None
    image_front_url: str
    image_back_url: str | None
    official_url: str


class AikatsuCollector:
    BASE_URL = "https://dcd.aikatsu.com/encore/cardlist/"

    def __init__(self, client: PoliteClient | None = None) -> None:
        self._client = client or PoliteClient(
            min_interval_sec=settings.aikatsu_interval_sec,
            user_agent=settings.crawler_user_agent,
        )
        self._owns_client = client is None
        self.request_count = 0

    def _get(self, params: dict[str, str]) -> BeautifulSoup:
        response = self._client.get(self.BASE_URL, params=params)
        self.request_count += 1
        return BeautifulSoup(response.text, "lxml")

    # ------------------------------------------------------------------ 絞り込みの選択肢

    @staticmethod
    def _dropdown_values(soup: BeautifulSoup, field_name: str) -> list[tuple[str, str]]:
        """隠しinput[name=field_name] と同じ区画にあるボタン群から (値, 表示名) を拾う。"""
        hidden = soup.select_one(f'input[type="hidden"][name="{field_name}"]')
        if hidden is None:
            return []
        node = hidden
        for _ in range(6):
            node = node.parent
            if node is None:
                return []
            dropdown = node.select_one(".dropdown")
            if dropdown is not None:
                result: list[tuple[str, str]] = []
                seen: set[str] = set()
                for btn in dropdown.select("button[data-value]"):
                    value = btn.get("data-value") or ""
                    if not value or value in seen:
                        continue
                    seen.add(value)
                    result.append((value, btn.get_text(strip=True)))
                return result
        return []

    def list_series(self) -> list[tuple[str, str]]:
        """弾（series）の選択肢。新しい弾が出てもここから自動で拾える。"""
        soup = self._get({"search": "true"})
        return self._dropdown_values(soup, "series")

    # ------------------------------------------------------------------ カード一覧

    @staticmethod
    def _parse_code(alt: str) -> tuple[str | None, str | None, str | None]:
        m = CODE_RE.match(alt.strip())
        if not m:
            return None, None, None
        return m.group(1), m.group(2), m.group(3)

    def _parse_entries(self, soup: BeautifulSoup) -> list[CollectedCard]:
        entries: list[CollectedCard] = []
        for item in soup.select(".cardList__item"):
            img = item.select_one(".cardList__img")
            if img is None:
                continue
            alt = (img.get("alt") or "").strip()
            front_src = img.get("data-src") or img.get("src")
            if not alt or not front_src:
                logger.warning("cardList__item を解釈できませんでした: %r", item)
                continue

            modal = item.select_one(".cardModal")
            back_src = None
            if modal is not None:
                back_img = modal.select_one(".cardModal__face--back img.cardModal__img")
                if back_img is not None:
                    back_src = back_img.get("data-src") or back_img.get("src")

            series_code, card_number, suffix = self._parse_code(alt)
            entries.append(
                CollectedCard(
                    official_code=alt,
                    series_code=series_code,
                    card_number=card_number,
                    code_suffix=suffix,
                    rarity=RARITY_LABELS.get(suffix or "", None),
                    image_front_url=urljoin(self.BASE_URL, front_src),
                    image_back_url=urljoin(self.BASE_URL, back_src) if back_src else None,
                    official_url=f"{self.BASE_URL}?search=true&series={series_code}"
                    if series_code
                    else self.BASE_URL,
                )
            )
        return entries

    def collect(self, *, series_values: list[str] | None = None) -> list[CollectedCard]:
        """全弾ぶんのカードを集める。series_values未指定なら自動で全弾ぶん回る。"""
        if series_values is None:
            series_values = [v for v, _ in self.list_series() if v]
            if not series_values:
                logger.warning(
                    "弾の選択肢が読めませんでした。既定の2つ(629001, 629901)で試みます"
                )
                series_values = ["629001", "629901"]

        cards: dict[str, CollectedCard] = {}
        for series in series_values:
            try:
                soup = self._get(
                    {"search": "true", "series": series, "display": "3", "sort": "1"}
                )
            except CrawlError as exc:
                logger.warning("弾 series=%s の取得に失敗しました: %s", series, exc)
                continue
            found = self._parse_entries(soup)
            for entry in found:
                cards[entry.official_code] = entry
            logger.info("series=%s: %d枚（累計 %d枚）", series, len(found), len(cards))

        return list(cards.values())

    def fetch_image(self, url: str):
        """画像本体を取得する（表/裏の画像URL用）。"""
        self.request_count += 1
        return self._client.get(url)

    # ------------------------------------------------------------------ 後始末

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def __enter__(self) -> "AikatsuCollector":
        return self

    def __exit__(self, *exc_info) -> None:
        self.close()
