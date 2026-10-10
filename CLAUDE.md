# コマンド

- `make up` / `make down` / `make migrate` / `make migrate-generate NAME=<name>` / `make migrate-hash` / `make fmt` / `make lint` / `make test`、任意で `make tunnel`（Cloudflare Quick Tunnel。URL の再表示は `make url`）
- `make up` は先に `../core` の `make up` を実行する。`make down` は cms だけを止める（core は止めない）
- pnpm・node はコンテナ内で実行する（例: `docker compose exec cms pnpm lint`）。node_modules はコンテナの pnpm が作り、ホストと共有する
- lint は `make lint`（biome check、`pnpm typecheck`、scripts/check-migrations.sh、scripts/check-auth-schema.sh）でファイルを書き換えない。typecheck は `next typegen` で Next.js の型（LayoutProps 等）を生成してから tsc を実行する。フォーマットの修正は `make fmt`（biome format --write）
- pnpm のバージョンを上げるときは package.json の `packageManager`、local/cms/Dockerfile・.build/Dockerfile・.gitlab-ci.yml の `PNPM_VERSION` を揃える（corepack は使わない）
- React Compiler を有効にしている（next.config.ts の `reactCompiler`）。useMemo / useCallback による手動メモ化は原則書かない

# ディレクトリ構成

| パス | 責務 |
|---|---|
| app | App Router のページ・レイアウト（`/login`、`/api/auth/[...all]` は better-auth） |
| lib/auth.ts | better-auth の設定（サーバー側）。公式どおり `export const auth = betterAuth(...)`。CLI もこれを読む |
| lib/auth-client.ts | better-auth のクライアント |
| proxy.ts | 未ログインのときにログイン画面へ移す（Next.js 16 の proxy。Cookie の有無だけを見る） |
| migrations | DB マイグレーション（`NNNN_name.sql` + `atlas.sum`）。better-auth のテーブルも `auth generate` で SQL にしてここに置き、Atlas で適用する |
| local/migrate | マイグレーション用イメージ（Atlas Community + migrations。core と同じ構成） |
| scripts/check-migrations.sh | Atlas が検出しない migrations の違反の検査（core と同じものを置く。変えるときは core / game と揃える） |
| scripts/check-auth-schema.sh | better-auth の設定と DB（DATABASE_URL）のスキーマに差分が無いことの検査（マイグレーションの作り忘れを防ぐ） |
| scripts/seed.ts | 開発・テスト用のオペレーターを作る（`pnpm db:seed`） |
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

# 認証（better-auth）

- better-auth は標準の範囲で使う（独自の項目・独自の認証処理は作らない）。メールアドレス + パスワード、サインアップは無効
- JWT の issuer / audience は環境変数 `JWT_ISSUER` / `JWT_AUDIENCE`（必須）で渡し、core の設定と一致させる。core は (iss, sub) で operator を識別するため、運用を始めた環境では issuer を変えない
- JWT の中身は `definePayload` で最小限にしている（email 等は入れない）
- `disableSignUp` はサーバー側の `auth.api.signUpEmail` も拒否するため、seed のときだけ `AUTH_ALLOW_SIGN_UP=true` で許可する（`pnpm db:seed` が付ける）
- lib/auth.ts は公式チュートリアルどおり、読み込み時に betterAuth を作る。next build 中は環境変数を渡さないため、better-auth が「Base URL is not set」（警告）と「default secret」（エラーのログ）を出すが、ビルドは成功し、実行時はコンテナの環境変数が使われる
- JWT_ISSUER / JWT_AUDIENCE が未設定だと better-auth は黙って BETTER_AUTH_URL を使うため、lib/auth.ts で実行時に必須チェックしている（next build 中は `NEXT_PHASE=phase-production-build` で判定して確かめない）
- lib/auth.ts は `import "server-only"` でクライアントからの読み込みをビルドエラーにしている。Node.js で直接動かす seed・CLI は `--conditions=react-server` を付けて実行する（付けないと server-only がエラーを投げる）
- DB のスキーマは better-auth の CLI（`auth migrate`）で直接変えない。`make migrate-generate` で差分 SQL を migrations に出し、Atlas で適用する（core・game と同じ手順・同じ記録にするため）
- マイグレーションは追加のみ。適用済みのファイルは変更・削除・改名しない。Atlas のバージョンは local/migrate/Dockerfile の FROM を core / game と揃える
- 環境変数はサーバー側（lib/auth.ts）でだけ読む。`NEXT_PUBLIC_` は使わない（ビルド時に埋め込まれ、コンテナの環境変数で変えられなくなるため）
