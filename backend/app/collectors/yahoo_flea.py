"""Yahoo!フリマ（paypayfleamarket.yahoo.co.jp）の収集（Phase 2改）。

■ なぜ Yahoo!フリマなのか
メルカリは検索結果HTMLに価格が1件も含まれず（空のスケルトンのみ）、
データを持つ内部API `/v1/ /v2/` は robots.txt で明示的に禁止されている。
一方 Yahoo!フリマは検索結果がサーバー側で描画され、`__NEXT_DATA__` に
商品ID・タイトル・価格・商品状態が構造化された形で入っている（実測で確認）。

■ robots.txt の制約（2026-08-22 時点で実測）
  Disallow: /search/*?*sold=      ← 売却済みだけを絞り込む検索は禁止
  Disallow: /search/*?*sort=  /  order=  /  specs=  /  conditions=
            /  open=  /  minPrice=  /  maxPrice=  /  showFilter=
  Disallow: /product/*?*(同上)
  Disallow: /item/*/edit  /item/*/negotiate  /item/*/question
  （/search/<キーワード> と /item/<id> そのものは禁止されていない）

したがって本モジュールは
  - 検索は `page` パラメータのみ（禁止パラメータは ALLOWED_SEARCH_PARAMS で機械的に弾く）
  - 商品個別ページ `/item/<id>` の取得
だけを行う。「売却済み検索」は使わない。

■ 成約価格をどう取るか
「販売中を毎日記録 → 消えた商品の個別ページを見に行く → 売れていれば成約とする」
という追跡方式をとる（listing_tracker.py）。禁止パスを一切踏まずに成約価格が得られる。
代償として、開始日より前の履歴は取得できない。
"""

from __future__ import annotations

import dataclasses
import datetime as dt
import json
import logging
import re
from typing import Any
from urllib.parse import quote

from app.collectors.http import CrawlError, PoliteClient
from app.config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://paypayfleamarket.yahoo.co.jp"
NEXT_DATA_RE = re.compile(
    r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', re.S
)

# robots.txt で禁止されていないパラメータだけを許可する（追加時は robots.txt を再確認すること）
ALLOWED_SEARCH_PARAMS = frozenset({"page"})

SEARCH_RESULT_PATH = ("props", "initialState", "searchState", "search", "result")
ITEM_PATH = ("props", "initialState", "itemsState", "items", "item")

STATUS_OPEN = "OPEN"
# 売却済みを表しうる値。実データで新しい値が出たら警告ログに出して足す。
SOLD_STATUSES = frozenset({"SOLD", "SOLD_OUT", "CLOSED", "COMPLETED", "PURCHASED"})


class YahooFleaError(RuntimeError):
    pass


@dataclasses.dataclass
class FleaListing:
    """検索結果1件。"""

    item_id: str
    title: str
    price: int
    status: str
    condition: str | None = None
    open_date: dt.datetime | None = None
    thumbnail_url: str | None = None
    seller_id: str | None = None
    raw: dict[str, Any] = dataclasses.field(default_factory=dict)

    @property
    def url(self) -> str:
        return f"{BASE_URL}/item/{self.item_id}"

    @property
    def is_open(self) -> bool:
        return self.status == STATUS_OPEN

    @property
    def is_sold(self) -> bool:
        """検索結果の時点で売却済みと分かるか。

        Yahoo!フリマの検索は売り切れの出品も返してくる（禁止されているのは
        「売却済みだけに絞り込む」検索であって、結果に混ざること自体ではない）。
        """
        return (self.status or "").upper() in SOLD_STATUSES


@dataclasses.dataclass
class FleaItemDetail:
    """商品個別ページ1件。"""

    item_id: str
    title: str | None
    price: int | None
    status: str
    is_purchased: bool
    description: str | None = None
    open_date: dt.datetime | None = None
    update_date: dt.datetime | None = None
    condition: str | None = None
    raw: dict[str, Any] = dataclasses.field(default_factory=dict)

    @property
    def url(self) -> str:
        return f"{BASE_URL}/item/{self.item_id}"

    @property
    def is_sold(self) -> bool:
        """売却済みか。status の表記ゆれに備えて isPurchased も見る。"""
        if self.is_purchased:
            return True
        upper = (self.status or "").upper()
        return upper in SOLD_STATUSES

    @property
    def is_open(self) -> bool:
        return (self.status or "").upper() == STATUS_OPEN


@dataclasses.dataclass
class SearchResult:
    keyword: str
    total_available: int
    total_returned: int
    listings: list[FleaListing]


# ---------------------------------------------------------------- パース


def extract_next_data(html: str) -> dict[str, Any]:
    match = NEXT_DATA_RE.search(html)
    if match is None:
        raise YahooFleaError("__NEXT_DATA__ が見つかりません（ページ構造が変わった可能性）")
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError as exc:
        raise YahooFleaError(f"__NEXT_DATA__ のJSONを解釈できません: {exc}") from exc


def _dig(data: dict[str, Any], path: tuple[str, ...]) -> Any:
    node: Any = data
    for key in path:
        if not isinstance(node, dict) or key not in node:
            return None
        node = node[key]
    return node


def _parse_datetime(value: str | None) -> dt.datetime | None:
    if not value:
        return None
    try:
        return dt.datetime.fromisoformat(value)
    except ValueError:
        logger.debug("日時を解釈できません: %s", value)
        return None


def parse_search_html(html: str, keyword: str) -> SearchResult:
    data = extract_next_data(html)
    result = _dig(data, SEARCH_RESULT_PATH)
    if result is None:
        raise YahooFleaError("検索結果のノードが見つかりません（ページ構造が変わった可能性）")

    listings: list[FleaListing] = []
    for raw in result.get("items") or []:
        item_id = raw.get("id")
        price = raw.get("price")
        if not item_id or price is None:
            continue
        listings.append(
            FleaListing(
                item_id=str(item_id),
                title=raw.get("title") or "",
                price=int(price),
                status=str(raw.get("itemStatus") or "UNKNOWN"),
                condition=raw.get("condition"),
                open_date=_parse_datetime(raw.get("openTime")),
                thumbnail_url=raw.get("thumbnailImageUrl"),
                seller_id=raw.get("sellerId"),
                raw={k: raw.get(k) for k in ("condition", "likeCount", "hashtag")},
            )
        )

    return SearchResult(
        keyword=keyword,
        total_available=int(result.get("totalResultsAvailable") or 0),
        total_returned=int(result.get("totalResultsReturned") or 0),
        listings=listings,
    )


def parse_item_html(html: str, item_id: str) -> FleaItemDetail:
    data = extract_next_data(html)
    item = _dig(data, ITEM_PATH)
    if not isinstance(item, dict) or not item.get("id"):
        raise YahooFleaError("商品ノードが見つかりません（ページ構造が変わった可能性）")

    status = str(item.get("status") or "UNKNOWN")
    if status.upper() != STATUS_OPEN and status.upper() not in SOLD_STATUSES:
        # 想定外の状態。分類を間違えないよう記録しておく。
        logger.warning("未知の商品ステータス item=%s status=%s", item_id, status)

    price = item.get("price")
    return FleaItemDetail(
        item_id=str(item.get("id")),
        title=item.get("title"),
        price=int(price) if price is not None else None,
        status=status,
        is_purchased=bool(item.get("isPurchased")),
        description=item.get("description"),
        open_date=_parse_datetime(item.get("openDate")),
        update_date=_parse_datetime(item.get("updateDate")),
        condition=item.get("condition"),
        raw={k: item.get(k) for k in ("status", "isPurchased", "updateDate", "location")},
    )


# ---------------------------------------------------------------- 収集


class YahooFleaCollector:
    MAX_PAGES = 20  # 暴走防止

    def __init__(self, client: PoliteClient | None = None) -> None:
        interval = getattr(settings, "yahoo_flea_interval_sec", 3.0)
        self._client = client or PoliteClient(min_interval_sec=interval)
        self._owns_client = client is None
        self.request_count = 0

    def _get(self, url: str, params: dict[str, str] | None = None) -> str:
        if params:
            forbidden = set(params) - ALLOWED_SEARCH_PARAMS
            if forbidden:
                # robots.txt で禁止されているパラメータを誤って付けないための保険
                raise YahooFleaError(
                    f"robots.txt で許可されていない検索パラメータです: {sorted(forbidden)}"
                )
        response = self._client.get(url, params=params)
        self.request_count += 1
        return response.text

    def search(self, keyword: str, page: int = 0) -> SearchResult:
        """キーワード検索。売却済みの絞り込みは行わない（robots.txt 遵守）。"""
        url = f"{BASE_URL}/search/{quote(keyword, safe='')}"
        params = {"page": str(page)} if page else None
        html = self._get(url, params)
        return parse_search_html(html, keyword)

    def search_all(self, keyword: str, max_pages: int | None = None) -> list[FleaListing]:
        """必要なだけページを辿る。1ページ100件。

        ページ番号は1始まり。総件数から必要ページ数を計算し、
        存在しないページを叩かないようにする（叩くと404が返る）。
        """
        limit = min(max_pages or self.MAX_PAGES, self.MAX_PAGES)
        first = self.search(keyword)
        collected: list[FleaListing] = list(first.listings)
        seen: set[str] = {x.item_id for x in collected}

        per_page = first.total_returned or len(collected)
        if per_page <= 0:
            return collected
        needed = -(-first.total_available // per_page)  # 切り上げ
        last_page = min(limit, max(1, needed))

        for page in range(2, last_page + 1):
            try:
                result = self.search(keyword, page=page)
            except CrawlError as exc:
                if exc.http_status == 404:
                    # ページが尽きた
                    break
                raise
            if not result.listings:
                break
            new = [x for x in result.listings if x.item_id not in seen]
            seen.update(x.item_id for x in new)
            collected.extend(new)
        return collected

    def fetch_item(self, item_id: str) -> FleaItemDetail | None:
        """商品個別ページ。消えている場合は None。"""
        url = f"{BASE_URL}/item/{quote(item_id, safe='')}"
        try:
            html = self._get(url)
        except CrawlError as exc:
            if exc.http_status in (403, 404, 410):
                logger.info("商品ページが取得できません item=%s (%s)", item_id, exc.http_status)
                return None
            raise
        return parse_item_html(html, item_id)

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def __enter__(self) -> "YahooFleaCollector":
        return self

    def __exit__(self, *exc_info) -> None:
        self.close()
