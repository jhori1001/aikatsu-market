"""画像を縮小して版を作る（nichirin-market の store_card_images.py と同じ考え方）。"""

from __future__ import annotations

import io

from PIL import Image

# 一覧やタイル用。長い辺をこの大きさに収める
THUMB_LONG_EDGE = 440
THUMB_QUALITY = 80
# 詳細と拡大表示用。元の大きさのまま詰め直す
LARGE_QUALITY = 85


def _encode(image: Image.Image, quality: int) -> tuple[bytes, int, int]:
    buffer = io.BytesIO()
    image.save(buffer, "WEBP", quality=quality, method=6)
    return buffer.getvalue(), image.width, image.height


def make_variants(raw: bytes) -> dict[str, tuple[bytes, int, int]]:
    """元画像から、置く大きさの版を作る。"""
    with Image.open(io.BytesIO(raw)) as source:
        # 透過や色の持ち方がばらばらでも WebP に詰められるようにそろえる
        base = source.convert("RGBA") if source.mode in ("P", "LA", "RGBA") else source.convert("RGB")

        large = _encode(base, LARGE_QUALITY)

        thumb_image = base.copy()
        thumb_image.thumbnail((THUMB_LONG_EDGE, THUMB_LONG_EDGE), Image.LANCZOS)
        thumb = _encode(thumb_image, THUMB_QUALITY)

    return {"large": large, "thumb": thumb}
