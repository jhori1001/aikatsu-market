"""全テーブル定義。"""

from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

# ---------------------------------------------------------------- 定数


class BatchStatus:
    RUNNING = "running"
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"


class LogStatus:
    SUCCESS = "success"
    SKIPPED = "skipped"
    FAILED = "failed"


# ---------------------------------------------------------------- cards


class Card(Base):
    """アイカツ！アンコールのカード図鑑。

    公式サイト(dcd.aikatsu.com)のHTMLにはカード名・アイドル名が文字として
    存在せず、画像ファイル名（例: "E1-01_PR"）しか自動取得できない。
    カード名などは取り込み後に手入力で埋める想定。

    いまのところ価格追跡（Yahoo!フリマ巡回・判定）はせず、図鑑（一覧・画像）
    のみ。
    """

    __tablename__ = "cards"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    # 公式由来（自動取得できる）。画像ファイル名そのもの（例: "E1-01_PR"）
    official_code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    series_code: Mapped[str | None] = mapped_column(String(16))
    card_number: Mapped[str | None] = mapped_column(String(16))
    code_suffix: Mapped[str | None] = mapped_column(String(16))
    image_front_url: Mapped[str | None] = mapped_column(Text)
    image_back_url: Mapped[str | None] = mapped_column(Text)
    official_url: Mapped[str | None] = mapped_column(Text)

    # 手入力で埋める
    name: Mapped[str | None] = mapped_column(String(128))
    idol_name: Mapped[str | None] = mapped_column(String(64))
    rarity: Mapped[str | None] = mapped_column(String(16))
    is_parallel: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    first_seen_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    last_seen_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (Index("ix_cards_series_code", "series_code"),)


class CardImage(Base):
    """カード画像の本体。自前のDBに置き、見に来た人のブラウザには
    公式サーバーを叩かせない。
    """

    __tablename__ = "card_images"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    card_pk: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False
    )
    side: Mapped[str] = mapped_column(String(8), nullable=False)  # front / back
    variant: Mapped[str] = mapped_column(String(8), nullable=False)  # thumb / large
    content_type: Mapped[str] = mapped_column(String(32), nullable=False, default="image/webp")
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    byte_size: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    source_url: Mapped[str | None] = mapped_column(Text)
    source_last_modified: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("card_pk", "side", "variant", name="uq_card_images_card_side_variant"),
        CheckConstraint("side in ('front', 'back')", name="ck_card_images_side"),
        CheckConstraint("variant in ('thumb', 'large')", name="ck_card_images_variant"),
    )


# ---------------------------------------------------------------- バッチ記録


class Batch(Base):
    """バッチ実行単位。"""

    __tablename__ = "batches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default=BatchStatus.RUNNING)
    started_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    finished_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    stats: Mapped[dict | None] = mapped_column(JSONB)
    error: Mapped[str | None] = mapped_column(Text)

    logs: Mapped[list["CrawlLog"]] = relationship(back_populates="batch")

    __table_args__ = (Index("ix_batches_started_at", "started_at"),)


class CrawlLog(Base):
    """個別処理ログ。カード1枚・URL1本ごとに1行。"""

    __tablename__ = "crawl_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    batch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("batches.id", ondelete="CASCADE")
    )
    job_name: Mapped[str] = mapped_column(String(64), nullable=False)
    card_pk: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("cards.id", ondelete="SET NULL")
    )
    target_url: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    http_status: Mapped[int | None] = mapped_column(Integer)
    message: Mapped[str | None] = mapped_column(Text)
    fetched_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    adopted_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    excluded_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    started_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    finished_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    duration_ms: Mapped[int | None] = mapped_column(Integer)

    batch: Mapped["Batch"] = relationship(back_populates="logs")


# ---------------------------------------------------------------- 相場（ER・PRのみ）


class ListingStatus:
    OPEN = "open"
    SOLD = "sold"
    WITHDRAWN = "withdrawn"
    UNKNOWN = "unknown"


class SaleSource:
    YAHOO_FLEA = "yahoo_flea"


class SaleListing(Base):
    """Yahoo!フリマの出品1件。

    アイカツ！アンコールは発売間もなく(2026-10-08〜)、カード数も少ない
    （ER・PRのみ26枚）ため、カドソバのような成約価格の追跡（消えた出品を
    個別ページで確認して売れたか判定する）は行わず、販売中の出品を
    記録するだけにする（要望「少なく入れれば理想」）。
    """

    __tablename__ = "sale_listings"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    card_pk: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False
    )
    source: Mapped[str] = mapped_column(String(32), nullable=False, default=SaleSource.YAHOO_FLEA)
    external_id: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    listing_status: Mapped[str] = mapped_column(String(16), nullable=False, default=ListingStatus.OPEN)
    is_adopted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    exclusion_reason: Mapped[str | None] = mapped_column(String(32))
    # Yahoo!フリマの状態コード（new / used10 ...）と、それを美品・傷ありに
    # 丸めたもの（0003、カドソバと同じ。services/conditions.py）
    item_condition: Mapped[str | None] = mapped_column(String(16))
    condition_grade: Mapped[str | None] = mapped_column(String(16))
    first_seen_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    last_seen_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        UniqueConstraint("source", "external_id", name="uq_sale_listings_source_external_id"),
        Index("ix_sale_listings_card_pk", "card_pk"),
    )


class DailyPrice(Base):
    """カードごとの日次相場（販売中の平均）。"""

    __tablename__ = "daily_prices"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    card_pk: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    average_asking_price: Mapped[int | None] = mapped_column(Integer)
    asking_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (UniqueConstraint("card_pk", "date", name="uq_daily_prices_card_date"),)


# ---------------------------------------------------------------- ショップ価格


class ShopPrice(Base):
    """カードショップの販売価格（0003、カドソバの shop_prices と同じ作り）。

    いまはフルアヘッド（アイドル館 fullahead-idol.com）だけ。
    フリマの相場とは別の物差し（店の定価）なので、daily_prices には混ぜない。
    店の一覧に無いカードは行を作らない。在庫0は stock=0 で行を作る。
    アイカツはパラレル版がカードの行として無いので、同じカードの
    パラレル版の値段は is_parallel=true の行として持つ。
    """

    __tablename__ = "shop_prices"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    card_pk: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False
    )
    shop: Mapped[str] = mapped_column(String(32), nullable=False)
    is_parallel: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    stock: Mapped[int | None] = mapped_column(Integer)
    url: Mapped[str | None] = mapped_column(Text)
    fetched_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        UniqueConstraint(
            "card_pk", "shop", "is_parallel", "date", name="uq_shop_prices_card_shop_variant_date"
        ),
        Index("ix_shop_prices_date", "date"),
    )


class ShopFetchLog(Base):
    """ショップの価格を取った日ごとの記録（0003）。

    行が無い日が「一覧に無かった」のか「取得に失敗した」のかを区別するため。
    """

    __tablename__ = "shop_fetch_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    shop: Mapped[str] = mapped_column(String(32), nullable=False)
    date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    complete: Mapped[bool] = mapped_column(Boolean, nullable=False)
    items: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    in_stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    fetched_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (UniqueConstraint("shop", "date", name="uq_shop_fetch_logs_shop_date"),)
