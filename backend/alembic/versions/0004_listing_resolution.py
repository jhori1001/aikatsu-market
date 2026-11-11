"""出品が売れたか・掲載終了したかを記録する列を足す（カドソバと同じ）

検索に出てこなくなった「販売中」の出品を、商品ページ（/item/<id>、robots.txt で許可）で
1件ずつ確かめ、売り切れなら sold、ページが無ければ withdrawn（掲載終了）にする
（app/jobs/resolve_listings.py）。そのとき確かめた日時と、売れた日時を持つ。

Revision ID: 0004_listing_resolution
Revises: 0003_add_shop_prices
"""

import sqlalchemy as sa
from alembic import op

revision = "0004_listing_resolution"
down_revision = "0003_add_shop_prices"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sale_listings", sa.Column("sold_at", sa.DateTime(timezone=True)))
    op.add_column("sale_listings", sa.Column("resolved_at", sa.DateTime(timezone=True)))
    op.create_index(
        "ix_sale_listings_status_last_seen", "sale_listings", ["listing_status", "last_seen_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_sale_listings_status_last_seen", table_name="sale_listings")
    op.drop_column("sale_listings", "resolved_at")
    op.drop_column("sale_listings", "sold_at")
