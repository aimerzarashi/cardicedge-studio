# コマンド

- `make up` / `make down` / `make fmt` / `make lint` / `make test`、任意で `make tunnel`（Cloudflare Quick Tunnel。URL の再表示は `make url`）
- `make up` は先に `../core` の `make up` を実行する。`make down` は cms だけを止める（core は止めない）
- pnpm・node はコンテナ内で実行する（例: `docker compose exec cms pnpm lint`）。node_modules はコンテナの pnpm が作り、ホストと共有する
- lint は `make lint`（biome check と `pnpm typecheck`）でファイルを書き換えない。typecheck は `next typegen` で Next.js の型（LayoutProps 等）を生成してから tsc を実行する。フォーマットの修正は `make fmt`（biome format --write）
- pnpm のバージョンを上げるときは package.json の `packageManager`、local/cms/Dockerfile・.build/Dockerfile・.gitlab-ci.yml の `PNPM_VERSION` を揃える（corepack は使わない）
- React Compiler を有効にしている（next.config.ts の `reactCompiler`）。useMemo / useCallback による手動メモ化は原則書かない

# ディレクトリ構成

| パス | 責務 |
|---|---|
| app | App Router のページ・レイアウト |
| tests | Playwright のテスト |
| local/cms | 開発用 Dockerfile |
| .build | 本番用 Dockerfile（standalone 出力を node で動かす。テスト用環境・CI でも使う） |
| local/envoy | envoy の設定（開発環境の入口） |

# 入口（envoy）

- アクセスはすべて cms-envoy:10000 を経由する（ホストは CMS_PORT、既定 3001）。cms:3000 はホストに公開しない
- envoy を経由するホスト名からのアクセスは Next.js の `allowedDevOrigins` に追加する（`cms-envoy`、`*.trycloudflare.com`）

# 統合（core）

- cms・cms-envoy は共有ネットワーク `diecardomain` に参加し、`core:3333` に接続する
- envoy は `/cms/graphql` を core に転送する（core が止まっていれば 503）

# テスト

- `make test` は compose.test.yaml（プロジェクト名 cms-test）で専用の core・DB・本番用イメージの cms を起動し、終了後に破棄する。開発用環境・開発用 DB には触れない
- テストは開発用イメージの cms-test-runner（profile: runner）から `docker compose run` で実行する。本番用イメージにはテストコードを含めない
- Playwright のブラウザは cms-playwright コンテナ（公式イメージ）で動く。cms コンテナから `run-server` に接続して実行する
- baseURL は `http://cms-envoy:10000`（本番と同じく envoy 経由で確認する）
- `@playwright/test` と compose の Playwright イメージ・`run-server` のバージョンは一致させる
