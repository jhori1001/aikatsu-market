"""バッチ実行のラッパ。batches / crawl_logs を必ず残す（要件12・19）。

ログ用のセッションは本処理と分ける。本処理が rollback しても
「何が起きたか」の記録だけは残るようにするため。
"""

from __future__ import annotations

import datetime as dt
import logging
import time
import traceback
import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

from app.db import SessionLocal
from app.models import Batch, BatchStatus, CrawlLog, LogStatus

logger = logging.getLogger(__name__)


class BatchContext:
    """バッチ1回ぶんの実行コンテキスト。"""

    def __init__(self, name: str) -> None:
        self.name = name
        self.batch_id: uuid.UUID = uuid.uuid4()
        self.stats: dict[str, Any] = {}
        self.failure_count = 0
        self._log_session = SessionLocal()

        batch = Batch(id=self.batch_id, name=name, status=BatchStatus.RUNNING)
        self._log_session.add(batch)
        self._log_session.commit()
        logger.info("バッチ開始 name=%s id=%s", name, self.batch_id)

    # ---------------------------------------------------------------- ログ

    def log(
        self,
        job_name: str,
        status: str,
        *,
        card_pk: int | None = None,
        target_url: str | None = None,
        http_status: int | None = None,
        message: str | None = None,
        fetched_count: int = 0,
        adopted_count: int = 0,
        excluded_count: int = 0,
        duration_ms: int | None = None,
    ) -> None:
        if status == LogStatus.FAILED:
            self.failure_count += 1
        entry = CrawlLog(
            batch_id=self.batch_id,
            job_name=job_name,
            card_pk=card_pk,
            target_url=target_url,
            status=status,
            http_status=http_status,
            message=message,
            fetched_count=fetched_count,
            adopted_count=adopted_count,
            excluded_count=excluded_count,
            finished_at=dt.datetime.now(dt.timezone.utc),
            duration_ms=duration_ms,
        )
        self._log_session.add(entry)
        self._log_session.commit()

    @contextmanager
    def step(self, job_name: str, *, card_pk: int | None = None, target_url: str | None = None):
        """1ステップを計測し、例外を握って failed ログにする。"""
        started = time.monotonic()
        try:
            yield
        except Exception as exc:  # noqa: BLE001 - バッチは1件の失敗で止めない
            duration = int((time.monotonic() - started) * 1000)
            logger.exception("ステップ失敗 job=%s", job_name)
            self.log(
                job_name,
                LogStatus.FAILED,
                card_pk=card_pk,
                target_url=target_url,
                message=f"{type(exc).__name__}: {exc}",
                duration_ms=duration,
            )
        else:
            duration = int((time.monotonic() - started) * 1000)
            self.log(
                job_name,
                LogStatus.SUCCESS,
                card_pk=card_pk,
                target_url=target_url,
                duration_ms=duration,
            )

    # ---------------------------------------------------------------- 終了

    def finish(self, status: str, error: str | None = None) -> None:
        batch = self._log_session.get(Batch, self.batch_id)
        if batch is not None:
            batch.status = status
            batch.finished_at = dt.datetime.now(dt.timezone.utc)
            batch.stats = self.stats
            batch.error = error
            self._log_session.commit()
        self._log_session.close()
        logger.info("バッチ終了 name=%s status=%s stats=%s", self.name, status, self.stats)


@contextmanager
def batch_run(name: str) -> Iterator[BatchContext]:
    ctx = BatchContext(name)
    try:
        yield ctx
    except Exception as exc:  # noqa: BLE001
        ctx.finish(BatchStatus.FAILED, error="".join(traceback.format_exception(exc))[:8000])
        raise
    else:
        status = BatchStatus.PARTIAL if ctx.failure_count else BatchStatus.SUCCESS
        ctx.finish(status)
