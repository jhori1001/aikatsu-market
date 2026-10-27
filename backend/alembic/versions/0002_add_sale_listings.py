"""相場（sale_listings / daily_prices）を追加

ER・PRカード(26枚)だけを対象に、Yahoo!フリマの販売中の出品を記録し、
日次の平均価格を計算する。アイカツ！アンコールは発売間もなく(2026-10-08〜)
カード数も少ないため、カドソバのような成約価格の追跡（消えた出品を
個別ページで確認する）は行わず、販売中の出品の平均だけにする。

Revision ID: 0002_add_sale_listings
Revises: 0001_initial
"""

import sqlalchemy as sa
from alembic import op

revision = "0002_add_sale_listings"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sale_listings",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "card_pk", sa.BigInteger(), sa.ForeignKey("cards.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("source", sa.String(32), nullable=False, server_default="yahoo_flea"),
        sa.Column("external_id", sa.String(64), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("price", sa.Integer(), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("listing_status", sa.String(16), nullable=False, server_default="open"),
        sa.Column("is_adopted", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("exclusion_reason", sa.String(32)),
        sa.Column(
            "first_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "last_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("source", "external_id", name="uq_sale_listings_source_external_id"),
    )
    op.create_index("ix_sale_listings_card_pk", "sale_listings", ["card_pk"])

    op.create_table(
        "daily_prices",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "card_pk", sa.BigInteger(), sa.ForeignKey("cards.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("average_asking_price", sa.Integer()),
        sa.Column("asking_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("card_pk", "date", name="uq_daily_prices_card_date"),
    )


def downgrade() -> None:
    op.drop_table("daily_prices")
    op.drop_index("ix_sale_listings_card_pk", table_name="sale_listings")
    op.drop_table("sale_listings")
