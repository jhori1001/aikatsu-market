"""初期スキーマ（cards / card_images / batches / crawl_logs）

アイカツ！アンコール専用のカード図鑑サイト。公式サイト(dcd.aikatsu.com)の
HTMLにはカード名・アイドル名が文字として存在せず、画像ファイル名（例:
"E1-01_PR"）しか自動取得できないため、name/idol_name/is_parallel は
手入力で埋める想定の列として用意する。

画像は自前のDBに本体を置き、見に来た人のブラウザには公式サーバーを
直接叩かせない（card_images）。

Revision ID: 0001_initial
Revises: None
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cards",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        # 公式サイトの画像ファイル名そのもの（例: "E1-01_PR"）。カードごとに一意で、
        # 自動取得できる自然キー
        sa.Column("official_code", sa.String(64), nullable=False, unique=True),
        # official_code を "-" "_" で分けたもの。並び替え・絞り込みに使う
        sa.Column("series_code", sa.String(16)),  # 例: "E1"
        sa.Column("card_number", sa.String(16)),  # 例: "01"
        # official_codeの末尾（例: "PR"）
        sa.Column("code_suffix", sa.String(16)),
        sa.Column("image_front_url", sa.Text()),
        sa.Column("image_back_url", sa.Text()),
        sa.Column("official_url", sa.Text()),
        # 手入力で埋める（公式サイトのHTMLにカード名・アイドル名などの文字が無いため）
        sa.Column("name", sa.String(128)),
        sa.Column("idol_name", sa.String(64)),
        sa.Column("rarity", sa.String(16)),
        sa.Column("is_parallel", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "first_seen_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "last_seen_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_cards_series_code", "cards", ["series_code"])

    op.create_table(
        "card_images",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "card_pk",
            sa.BigInteger(),
            sa.ForeignKey("cards.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("side", sa.String(8), nullable=False),
        sa.Column("variant", sa.String(8), nullable=False),
        sa.Column("content_type", sa.String(32), nullable=False, server_default="image/webp"),
        sa.Column("data", sa.LargeBinary(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=False),
        sa.Column("height", sa.Integer(), nullable=False),
        sa.Column("byte_size", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("source_url", sa.Text()),
        sa.Column("source_last_modified", sa.DateTime(timezone=True)),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "card_pk", "side", "variant", name="uq_card_images_card_side_variant"
        ),
        sa.CheckConstraint("side in ('front', 'back')", name="ck_card_images_side"),
        sa.CheckConstraint("variant in ('thumb', 'large')", name="ck_card_images_variant"),
    )

    op.create_table(
        "batches",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="running"),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("stats", JSONB()),
        sa.Column("error", sa.Text()),
    )
    op.create_index("ix_batches_started_at", "batches", ["started_at"])

    op.create_table(
        "crawl_logs",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "batch_id", UUID(as_uuid=True), sa.ForeignKey("batches.id", ondelete="CASCADE")
        ),
        sa.Column("job_name", sa.String(64), nullable=False),
        sa.Column(
            "card_pk", sa.BigInteger(), sa.ForeignKey("cards.id", ondelete="SET NULL")
        ),
        sa.Column("target_url", sa.Text()),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("http_status", sa.Integer()),
        sa.Column("message", sa.Text()),
        sa.Column("fetched_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("adopted_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("excluded_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("duration_ms", sa.Integer()),
    )


def downgrade() -> None:
    op.drop_table("crawl_logs")
    op.drop_index("ix_batches_started_at", table_name="batches")
    op.drop_table("batches")
    op.drop_table("card_images")
    op.drop_index("ix_cards_series_code", table_name="cards")
    op.drop_table("cards")
