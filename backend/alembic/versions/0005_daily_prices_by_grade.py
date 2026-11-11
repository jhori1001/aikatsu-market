"""日次相場を状態（すべて・美品・傷あり）別に持てるようにする（日輪の daily_prices と同じ形）

・condition_grade（all / mint / damaged）を足し、一意キーを (card_pk, date) → (card_pk, date, condition_grade) に。
  いまある行は全部 all。
・売れた価格の統計（average_price・median_price・sample_count）を足す。日輪と同じく、販売中の出品が
  3件に満たない日は売れた価格の平均を相場に使う。

Revision ID: 0005_daily_prices_by_grade
Revises: 0004_listing_resolution
"""

import sqlalchemy as sa
from alembic import op

revision = "0005_daily_prices_by_grade"
down_revision = "0004_listing_resolution"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "daily_prices",
        sa.Column("condition_grade", sa.String(16), nullable=False, server_default="all"),
    )
    op.add_column("daily_prices", sa.Column("average_price", sa.Integer()))
    op.add_column("daily_prices", sa.Column("median_price", sa.Integer()))
    op.add_column(
        "daily_prices", sa.Column("sample_count", sa.Integer(), nullable=False, server_default="0")
    )
    op.drop_constraint("uq_daily_prices_card_date", "daily_prices", type_="unique")
    op.create_unique_constraint(
        "uq_daily_prices_card_date_grade", "daily_prices", ["card_pk", "date", "condition_grade"]
    )


def downgrade() -> None:
    op.execute("delete from daily_prices where condition_grade <> 'all'")
    op.drop_constraint("uq_daily_prices_card_date_grade", "daily_prices", type_="unique")
    op.create_unique_constraint("uq_daily_prices_card_date", "daily_prices", ["card_pk", "date"])
    op.drop_column("daily_prices", "sample_count")
    op.drop_column("daily_prices", "median_price")
    op.drop_column("daily_prices", "average_price")
    op.drop_column("daily_prices", "condition_grade")
