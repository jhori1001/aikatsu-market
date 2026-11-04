"""アイカツ！アンコール公式サイトのカードリストを収集する（図鑑用）。

    python -m app.jobs.crawl              # 取って保存
    python -m app.jobs.crawl --dry-run     # 数えるだけ
    python -m app.jobs.crawl --skip-images # カード情報だけ（画像は取らない）

考え方（nichirin-market の crawl_konami.py / store_card_images.py と同じ）:
  1. 公式サイトから一覧を取得し、cards を official_code で upsert
     （自動取得できる列だけ更新。name / idol_name / is_parallel は手入力の
     ため絶対に上書きしない）
  2. 画像を取得し、縮小して card_images に保存（見に来た人の
     ブラウザに公式サーバーを直接叩かせない）
  3. 今回の一覧に出てこなかった既存カードも、そのまま残す（無効にしない）
  4. パラレル版（公式の画像名 "E1-01_PR_p1"）は別のカードとして持つ
     （is_parallel=true）。新しく作るときだけ、通常版の name / idol_name を写す
  5. 保存済みの画像の取得元URLが、いまのカードの画像URLと違えば取り直す
     （以前は通常版とパラレル版が1枚に潰れていて、どちらの絵が入ったか
     分からないため）
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import logging

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.collectors.aikatsu import AikatsuCollector, CollectedCard
from app.collectors.http import CrawlError
from app.db import session_scope
from app.jobs.images import make_variants
from app.jobs.runner import batch_run
from app.models import Card, CardImage, LogStatus

logger = logging.getLogger(__name__)

JOB_NAME = "crawl"

# 自動取得できる属性。手入力の name / idol_name / is_parallel は絶対に上書きしない
AUTO_FIELDS = (
    "series_code",
    "card_number",
    "code_suffix",
    "rarity",
    "image_front_url",
    "image_back_url",
    "official_url",
)


def _upsert_image(
    db, card: Card, side: str, variant: str, blob: tuple[bytes, int, int], url: str
) -> None:
    data, width, height = blob
    values = {
        "card_pk": card.id,
        "side": side,
        "variant": variant,
        "content_type": "image/webp",
        "data": data,
        "width": width,
        "height": height,
        "byte_size": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "source_url": url,
        "source_last_modified": None,
    }
    stmt = insert(CardImage).values(**values)
    stmt = stmt.on_conflict_do_update(
        constraint="uq_card_images_card_side_variant",
        set_={k: stmt.excluded[k] for k in values if k not in {"card_pk", "side", "variant"}}
        | {"updated_at": dt.datetime.now(dt.timezone.utc)},
    )
    db.execute(stmt)


def _apply_auto_fields(card: Card, collected: CollectedCard) -> bool:
    changed = False
    for field in AUTO_FIELDS:
        new_value = getattr(collected, field)
        if new_value is None:
            continue
        if getattr(card, field) != new_value:
            setattr(card, field, new_value)
            changed = True
    return changed


def _report_dry_run(collected_cards: list[CollectedCard], stats: dict) -> None:
    """保存はせず、DBと見比べて「保存したら何が変わるか」を数える（読むだけ）。"""
    with session_scope() as db:
        existing = {c.official_code: c for c in db.execute(select(Card)).scalars().all()}
        image_src = {
            (row.card_pk, row.side): row.source_url
            for row in db.execute(
                select(CardImage.card_pk, CardImage.side, CardImage.source_url).where(
                    CardImage.variant == "large"
                )
            ).all()
        }
    new = [c for c in collected_cards if c.official_code not in existing]
    url_changed = []
    image_mismatch = []
    for c in collected_cards:
        card = existing.get(c.official_code)
        if card is None:
            continue
        if card.image_front_url != c.image_front_url or (
            c.image_back_url and card.image_back_url != c.image_back_url
        ):
            url_changed.append(f"{c.official_code}: {card.image_front_url} → {c.image_front_url}")
        for side, url in (("front", c.image_front_url), ("back", c.image_back_url)):
            src = image_src.get((card.id, side))
            if url and src and src != url:
                image_mismatch.append(f"{c.official_code} {side}: 保存済み {src} / 公式 {url}")
    stats["would_create"] = len(new)
    stats["url_changed"] = len(url_changed)
    stats["image_mismatch"] = len(image_mismatch)
    logger.info("dry-run: DBのカード %d 枚 / 新しく作る %d 枚", len(existing), len(new))
    for c in new:
        base = existing.get(c.base_code or "")
        logger.info(
            "  新規 %s（パラレル=%s 通常版の名前=%s / %s）",
            c.official_code,
            c.is_parallel,
            base.name if base else None,
            base.idol_name if base else None,
        )
    logger.info("dry-run: 画像URLが変わるカード %d 枚", len(url_changed))
    for line in url_changed:
        logger.info("  %s", line)
    logger.info("dry-run: 保存済みの画像の取得元が公式と違う %d 件", len(image_mismatch))
    for line in image_mismatch:
        logger.info("  %s", line)


def run(*, skip_images: bool = False, dry_run: bool = False) -> dict:
    now = dt.datetime.now(dt.timezone.utc)
    stats: dict = {
        "fetched": 0,
        "created": 0,
        "updated": 0,
        "images_stored": 0,
        "image_errors": 0,
        "requests": 0,
    }

    with batch_run(JOB_NAME) as ctx:
        with AikatsuCollector() as collector:
            with ctx.step(f"{JOB_NAME}.collect", target_url=collector.BASE_URL):
                collected_cards = collector.collect()

            stats["fetched"] = len(collected_cards)
            stats["requests"] = collector.request_count
            logger.info("公式から %d 枚を取得しました", len(collected_cards))

            if not collected_cards:
                ctx.stats = stats
                logger.error("1枚も取得できませんでした。HTML構造の変更を疑ってください。")
                return stats

            parallels = [c for c in collected_cards if c.is_parallel]
            stats["parallel"] = len(parallels)
            logger.info(
                "うちパラレル版 %d 枚: %s",
                len(parallels),
                ", ".join(c.official_code for c in parallels),
            )

            if dry_run:
                _report_dry_run(collected_cards, stats)
                ctx.stats = stats
                logger.info("--dry-run のため DB へは書き込みませんでした")
                return stats

            # ---------------- cards の upsert ----------------
            with session_scope() as db:
                existing = {
                    card.official_code: card
                    for card in db.execute(select(Card)).scalars().all()
                }

                for collected in collected_cards:
                    card = existing.get(collected.official_code)
                    if card is None:
                        card = Card(
                            official_code=collected.official_code,
                            first_seen_at=now,
                            last_seen_at=now,
                        )
                        _apply_auto_fields(card, collected)
                        card.is_active = True
                        card.is_parallel = collected.is_parallel
                        base = existing.get(collected.base_code or "")
                        if base is not None:
                            # 名前は手入力の列。新しく作るときだけ通常版から写す
                            card.name = base.name
                            card.idol_name = base.idol_name
                        db.add(card)
                        stats["created"] += 1
                        logger.info("新しいカード: %s", collected.official_code)
                    else:
                        changed = _apply_auto_fields(card, collected)
                        if collected.is_parallel and not card.is_parallel:
                            card.is_parallel = True
                            changed = True
                        if changed:
                            stats["updated"] += 1
                        card.last_seen_at = now
                        card.is_active = True

                db.flush()

            ctx.log(
                f"{JOB_NAME}.upsert",
                LogStatus.SUCCESS,
                fetched_count=stats["fetched"],
                message=f"created={stats['created']} updated={stats['updated']}",
            )

            # ---------------- 画像のダウンロード ----------------
            if not skip_images:
                with session_scope() as db:
                    cards = (
                        db.execute(select(Card).where(Card.is_active.is_(True)))
                        .scalars()
                        .all()
                    )
                    # (card_pk, side, variant) → 取得元URL
                    existing_images = {
                        (row.card_pk, row.side, row.variant): row.source_url
                        for row in db.execute(
                            select(
                                CardImage.card_pk,
                                CardImage.side,
                                CardImage.variant,
                                CardImage.source_url,
                            )
                        ).all()
                    }

                    for card in cards:
                        for side in ("front", "back"):
                            url = getattr(card, f"image_{side}_url")
                            if not url:
                                continue
                            have_all = all(
                                existing_images.get((card.id, side, v)) == url
                                for v in ("thumb", "large")
                            )
                            if have_all:
                                continue
                            if (card.id, side, "large") in existing_images:
                                stats["images_replaced"] = stats.get("images_replaced", 0) + 1
                                logger.info(
                                    "画像を取り直します %s %s: %s → %s",
                                    card.official_code,
                                    side,
                                    existing_images[(card.id, side, "large")],
                                    url,
                                )

                            try:
                                response = collector.fetch_image(url)
                            except CrawlError as exc:
                                stats["image_errors"] += 1
                                ctx.log(
                                    f"{JOB_NAME}.image",
                                    LogStatus.FAILED,
                                    card_pk=card.id,
                                    target_url=url,
                                    message=f"{type(exc).__name__}: {exc}",
                                )
                                continue

                            try:
                                variants = make_variants(response.content)
                            except Exception as exc:  # noqa: BLE001  壊れた画像で全体を止めない
                                stats["image_errors"] += 1
                                logger.warning(
                                    "画像を読めません %s %s: %s", card.official_code, side, exc
                                )
                                continue

                            for variant, blob in variants.items():
                                _upsert_image(db, card, side, variant, blob, url)
                            db.commit()
                            stats["images_stored"] += 1
                            logger.info(
                                "保存 %s %s: thumb %dKB / large %dKB",
                                card.official_code,
                                side,
                                len(variants["thumb"][0]) // 1024,
                                len(variants["large"][0]) // 1024,
                            )

                ctx.log(
                    f"{JOB_NAME}.images",
                    LogStatus.SUCCESS,
                    fetched_count=stats["images_stored"],
                    message=f"stored={stats['images_stored']} errors={stats['image_errors']}",
                )

        ctx.stats = stats

    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description="アイカツ！アンコール公式カードリストを収集します")
    parser.add_argument("--dry-run", action="store_true", help="保存せずに数えるだけ")
    parser.add_argument("--skip-images", action="store_true", help="カード情報だけ（画像は取らない）")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)-5s [%(name)s] %(message)s"
    )
    stats = run(skip_images=args.skip_images, dry_run=args.dry_run)
    logger.info("結果: %s", stats)


if __name__ == "__main__":
    main()
