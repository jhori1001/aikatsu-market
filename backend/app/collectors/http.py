"""相手サイトに負荷をかけないための共通HTTPクライアント。

方針（要件26）:
  - 並列度は常に1。リクエスト間隔を必ず空ける（サイトごとに設定可能）
  - User-Agent は偽装せず、連絡先を含めて名乗る
  - 429 / 5xx / 接続エラーのみ指数バックオフでリトライ。4xx（404含む）は即失敗
  - Retry-After ヘッダがあれば優先して従う
  - 接続・読み取りタイムアウトを必ず設定する
"""

from __future__ import annotations

import logging
import random
import time

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class CrawlError(RuntimeError):
    """リトライしても回復しなかった取得失敗。"""

    def __init__(self, message: str, *, http_status: int | None = None, url: str | None = None):
        super().__init__(message)
        self.http_status = http_status
        self.url = url


class PoliteClient:
    """レート制限つきHTTPクライアント。with 文で使う。"""

    def __init__(
        self,
        *,
        min_interval_sec: float,
        user_agent: str | None = None,
        max_retries: int | None = None,
        read_timeout_sec: int | None = None,
        connect_timeout_sec: int | None = None,
        default_headers: dict[str, str] | None = None,
    ) -> None:
        self.min_interval_sec = min_interval_sec
        self.max_retries = max_retries if max_retries is not None else settings.crawl_max_retries
        read_timeout = read_timeout_sec or settings.crawl_timeout_sec
        connect_timeout = connect_timeout_sec or settings.crawl_connect_timeout_sec

        headers = {
            "User-Agent": user_agent or settings.crawler_user_agent,
            "Accept-Language": "ja,en;q=0.8",
        }
        if default_headers:
            headers.update(default_headers)

        self._client = httpx.Client(
            headers=headers,
            timeout=httpx.Timeout(read_timeout, connect=connect_timeout),
            follow_redirects=True,
        )
        self._last_request_at: float | None = None

    # ------------------------------------------------------------------ 内部

    def _wait_for_slot(self) -> None:
        if self._last_request_at is None:
            return
        elapsed = time.monotonic() - self._last_request_at
        remaining = self.min_interval_sec - elapsed
        if remaining > 0:
            time.sleep(remaining)

    @staticmethod
    def _backoff_seconds(attempt: int, retry_after: str | None) -> float:
        if retry_after:
            try:
                return min(float(retry_after), 120.0)
            except ValueError:
                pass
        base = 1.0 * (2**attempt)          # 1s, 2s, 4s, ...
        jitter = base * random.uniform(-0.2, 0.2)
        return max(0.5, base + jitter)

    # ------------------------------------------------------------------ 公開API

    def request(
        self,
        method: str,
        url: str,
        *,
        data: dict[str, str] | None = None,
        params: dict[str, str] | None = None,
        headers: dict[str, str] | None = None,
    ) -> httpx.Response:
        last_error: str = "unknown"
        last_status: int | None = None

        for attempt in range(self.max_retries + 1):
            self._wait_for_slot()
            retry_after: str | None = None
            try:
                response = self._client.request(
                    method, url, data=data, params=params, headers=headers
                )
            except httpx.TransportError as exc:
                self._last_request_at = time.monotonic()
                last_error = f"{type(exc).__name__}: {exc}"
                last_status = None
                logger.warning("transport error (attempt %d) %s: %s", attempt + 1, url, exc)
            else:
                self._last_request_at = time.monotonic()
                if response.status_code < 400:
                    return response
                last_status = response.status_code
                last_error = f"HTTP {response.status_code}"
                if response.status_code not in RETRYABLE_STATUS:
                    # 404 などはリトライしても無駄なので即失敗させる
                    raise CrawlError(last_error, http_status=response.status_code, url=url)
                retry_after = response.headers.get("Retry-After")
                logger.warning(
                    "retryable status (attempt %d) %s: %s", attempt + 1, url, response.status_code
                )

            if attempt < self.max_retries:
                time.sleep(self._backoff_seconds(attempt, retry_after))

        raise CrawlError(
            f"リトライ上限に到達しました ({last_error})", http_status=last_status, url=url
        )

    def get(self, url: str, **kwargs) -> httpx.Response:
        return self.request("GET", url, **kwargs)

    def post(self, url: str, **kwargs) -> httpx.Response:
        return self.request("POST", url, **kwargs)

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "PoliteClient":
        return self

    def __exit__(self, *exc_info) -> None:
        self.close()
