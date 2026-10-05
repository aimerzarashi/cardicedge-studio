# コマンド

- `make up` / `make down` / `make fmt` / `make lint` / `make test`、任意で `make tunnel`（Cloudflare Quick Tunnel）
- pnpm・node はコンテナ内で実行する（例: `docker compose exec cms pnpm lint`）。node_modules はコンテナの pnpm が作り、ホストと共有する
- lint は `make lint`（biome check と tsc）でファイルを書き換えない。フォーマットの修正は `make fmt`（biome format --write）
- pnpm のバージョンを上げるときは package.json の `packageManager` と local/cms/Dockerfile の `PNPM_VERSION` を揃える（corepack は使わない）
- React Compiler を有効にしている（next.config.ts の `reactCompiler`）。useMemo / useCallback による手動メモ化は原則書かない

# ディレクトリ構成

| パス | 責務 |
|---|---|
| app | App Router のページ・レイアウト |
| tests | Playwright のテスト |
| local/cms | 開発用 Dockerfile |
| local/envoy | envoy の設定（開発環境の入口） |

# 入口（envoy）

- アクセスはすべて cms-envoy:10000 を経由する（ホストは CMS_PORT、既定 3001）。cms:3000 はホストに公開しない
- envoy を経由するホスト名からのアクセスは Next.js の `allowedDevOrigins` に追加する（`cms-envoy`、`*.trycloudflare.com`）

# テスト

- Playwright のブラウザは cms-playwright コンテナ（公式イメージ）で動く。cms コンテナから `run-server` に接続して実行する
- baseURL は `http://cms-envoy:10000`（本番と同じく envoy 経由で確認する）
- `@playwright/test` と compose の Playwright イメージ・`run-server` のバージョンは一致させる
