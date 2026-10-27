"""設定（環境変数）。"""

from __future__ import annotations

import re
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://aikatsu:CHANGE_ME@localhost:5432/aikatsu"

    @field_validator("database_url")
    @classmethod
    def _use_psycopg3_driver(cls, value: str) -> str:
        """Neonのコンソールが出す接続文字列は postgres:// / postgresql:// のまま
        （ドライバ指定なし）。SQLAlchemyはそれだとpsycopg2を探しに行ってしまう
        （未インストール）ため、ここでpsycopg3用に書き換える。"""
        return re.sub(r"^postgres(ql)?://", "postgresql+psycopg://", value)

    # --- クローラの名乗り ---
    crawler_contact: str = "your-mail@example.com"
    crawler_user_agent: str = (
        "AikatsuMarketBot/0.1 (personal card catalog; contact: your-mail@example.com)"
    )

    # --- クロール挙動 ---
    aikatsu_interval_sec: float = 3.0
    yahoo_flea_interval_sec: float = 3.0
    crawl_max_retries: int = 3
    crawl_timeout_sec: int = 20
    crawl_connect_timeout_sec: int = 5

    # --- その他 ---
    tz: str = "Asia/Tokyo"
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
