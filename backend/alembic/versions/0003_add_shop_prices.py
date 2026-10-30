"""ショップ価格（shop_prices / shop_fetch_logs）と、出品の状態を追加

・フルアヘッド（アイドル館）の販売価格を毎日記録する。全カード（R・Nも）が
  対象になるので、フリマ相場の無いカードにも「ショップ参考価格」を出せる。
  カドソバの 0017 / 0018 と同じ作り。パラレル版はカードの行が無いため
  is_parallel で分けて持つ。
・sale_listings に Yahoo!フリマの状態（item_condition）と、それを美品・傷ありに
  丸めたもの（condition_grade）を足す。出品一覧の表をカドソバと同じにするため。

Revision ID: 0003_add_shop_prices
Revises: 0002_add_sale_listings
"""

import sqlalchemy as sa
from alembic import op

revision = "0003_add_shop_prices"
down_revision = "0002_add_sale_listings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "shop_prices",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "card_pk", sa.BigInteger(), sa.ForeignKey("cards.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("shop", sa.String(32), nullable=False),
        sa.Column("is_parallel", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("price", sa.Integer(), nullable=False),
        sa.Column("stock", sa.Integer()),
        sa.Column("url", sa.Text()),
        sa.Column(
            "fetched_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint(
            "card_pk", "shop", "is_parallel", "date", name="uq_shop_prices_card_shop_variant_date"
        ),
    )
    op.create_index("ix_shop_prices_date", "shop_prices", ["date"])

    op.create_table(
        "shop_fetch_logs",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("shop", sa.String(32), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("complete", sa.Boolean(), nullable=False),
        sa.Column("items", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("in_stock", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "fetched_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("shop", "date", name="uq_shop_fetch_logs_shop_date"),
    )

    op.add_column("sale_listings", sa.Column("item_condition", sa.String(16)))
    op.add_column("sale_listings", sa.Column("condition_grade", sa.String(16)))


def downgrade() -> None:
    op.drop_column("sale_listings", "condition_grade")
    op.drop_column("sale_listings", "item_condition")
    op.drop_table("shop_fetch_logs")
    op.drop_index("ix_shop_prices_date", table_name="shop_prices")
    op.drop_table("shop_prices")
