# aikatsu-market

アイカツ！アンコール（dcd.aikatsu.com/encore/）の収録カードを画像つきで見られる、
個人運営の図鑑サイト。nichirin-market（カドソバ）とは別ゲーム・別サイト・別DBとして
独立させたもの。

## 構成

- `backend/` — Python。公式サイトからカード一覧・画像を取り込むバッチ（GitHub Actions
  から実行する想定。会社のネットワークからは5432番ポートが塞がれていて直接DBに
  つながらないため）
  - `app/collectors/aikatsu.py` — 公式サイトの収集ロジック
  - `app/jobs/crawl.py` — 取り込み本体（`--dry-run` で数えるだけ、`--skip-images` で
    画像なし）
  - `app/models.py` — `cards` / `card_images` / `batches` / `crawl_logs`
  - `alembic/` — DBマイグレーション
- `frontend/` — Next.js（Vercelにデプロイ想定）。Neon（PostgreSQL）へ直接クエリして
  一覧・詳細を出す
- `.github/workflows/`
  - `migrate.yml` — master への push で自動、または手動でマイグレーションを流す
  - `crawl.yml` — 手動実行。既定は `dry_run=true`（保存しない。まず件数だけ見る）

## セットアップ（新しいDB・リポジトリを用意したあと）

1. Neonなどで新しいPostgreSQLを用意し、`DATABASE_URL`を取得する
   （`postgresql+psycopg://...` の形。sqlalchemy用）
2. GitHub の Secrets に `DATABASE_URL` と `CRAWLER_UA`（クローラの名乗り。
   連絡先入り）を登録する
3. `migrate.yml` を手動実行してテーブルを作る
4. `crawl.yml` を `dry_run=true` で実行し、何件取れるか確認する
5. 問題なければ `dry_run=false` で本番実行する
6. Vercel にフロントエンドをデプロイし、環境変数 `DATABASE_URL`
   （同じ接続文字列。`postgresql://` に直しても `postgresql+psycopg://` の
   ままでも動く。`frontend/src/lib/db.ts` が自動で変換する）を設定する

## 注意

- カード名・アイドル名は公式サイトのHTMLに存在しないため、取り込み後に
  `cards.name` / `cards.idol_name` を手入力で埋める想定（自動取り込みは
  上書きしない）
- カード画像は自前のDBに本体を置き、見に来た人のブラウザには公式サーバーを
  直接叩かせない（`/img/cards/{official_code}/front-thumb.webp` など）
- 判定ルール（相場採用・除外）はまだ無い。現状は図鑑（一覧・画像）のみ
