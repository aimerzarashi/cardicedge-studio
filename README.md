# cms

カルドセプト風ブラウザゲームの管理 UI（Next.js）。ゲームのコンテンツを編集する。

## 必要なもの

- Docker Engine + Docker Compose v2 以降
- make

想定環境は Linux / WSL2（ホストの uid 1000）。開発用コンテナは uid 1000 のユーザーで動き、生成物をホストユーザー所有にする。
macOS・Windows ネイティブでは、ホストのエディタの型補完・biome 拡張が動かない（node_modules に Linux 用バイナリが入るため）。実行・テスト・lint はコンテナ内で動く。

Node.js・pnpm はコンテナ内で動くため、ホストへのインストールは不要。

## セットアップ

```bash
make up      # core（../core）を起動してから、開発サーバー（Next.js）・envoy・Playwright のブラウザを起動
make fmt     # biome でフォーマットを修正
make lint    # biome check・型チェック・migrations の検査・better-auth の設定と開発用 DB の差分の検査
make test    # 専用の core・DB と本番用イメージの cms を使い捨てで起動し、Playwright で確認
make tunnel  # （任意）Cloudflare Quick Tunnel を起動し、外部公開用 URL を表示
make url     # （任意）起動中の Tunnel の URL を再表示
make migrate # 未適用の migrations だけを Atlas で適用（DB を作り直さない）
make migrate-generate NAME=<name> # better-auth の設定と DB の差分 SQL を次の番号で生成
make migrate-hash # migrations を手で足したら atlas.sum を作り直す
make down    # cms を停止（tunnel を含む。core は game も使うため止めない）
```

http://localhost:3001 で開く（envoy 経由。Next.js の開発サーバーはホストに公開していない）。
ポートが他と衝突する場合は `CMS_PORT=13001 make up` のように変更できる。

### 構成

```
ブラウザ ─────────────┐                     ┌─▶ cms:3000（Next.js）
cloudflared（任意）───┼─▶ cms-envoy:10000 ─┤
Playwright のブラウザ ┘                     └─▶ core:3333（/cms/graphql）
```

cms と cms-envoy は共有ネットワーク `diecardomain` に参加し、core（../core で `make up`）に接続する。
core は game / cms で1つを共有する。core が兄弟ディレクトリ（../core）に clone されている前提。

### テスト用環境（compose.test.yaml）

`make test` はプロジェクト名 `cms-test` で、専用の core・DB（../core/compose.test.yaml）と本番用イメージ（`.build/Dockerfile`）の cms を起動し、終了後に破棄する。テストは開発用イメージの cms-test-runner から実行する。
開発用の環境とはコンテナ・ネットワーク・DB が別で、ホストにポートも公開しないため、開発用を起動したままでも実行できる。

### Tunnel（任意）

`make tunnel` は `https://xxxx.trycloudflare.com` の URL を表示する。スマホ等の外部端末から確認するときに使う。
URL は起動のたびに変わり、知っていれば誰でもアクセスできるため、使い終わったら `make down` で止める。

## リリースとイメージ配布（CI）

| パイプライン | ジョブ | 内容 |
|---|---|---|
| MR | lint | `make lint` 相当 |
| MR | test | migrations を空の DB に Atlas で適用し、better-auth の設定とスキーマに差分が無いことを確かめる（Playwright のテストは CI では未実行） |
| MR | build-mr（手動） | `registry.gitlab.com/aimerzarashi/diecardomain/cms:mr-<MR番号>` と `.../cms/migrate:mr-<MR番号>` に push（lint・test が通った後） |
| main | lint / test / release | semantic-release がコミットからバージョンを決め、タグ（`v1.2.0`）と GitLab リリースを作る。リリース対象のコミットが無ければ何もしない |
| タグ（`v*`） | deploy | Docker Hub の `diecardomain/cms:<タグ>`・`:latest` と `diecardomain/cms-migrate:<タグ>`・`:latest` に push |

本番用イメージは Next.js の standalone 出力を `node server.js` で動かす（`.build/Dockerfile`）。
バージョンは Conventional Commits で決まる（`feat:` → マイナー、`fix:` / `perf:` → パッチ、`BREAKING CHANGE` → メジャー）。

## 認証（better-auth）

オペレーターはメールアドレス + パスワードでログインする（better-auth の標準機能。サインアップは無効）。

| 項目 | 内容 |
|---|---|
| データ | cms-db（PostgreSQL）。テーブルは migrations の SQL を Atlas で適用して作る（下の「DB マイグレーション」）。ホストからは `localhost:5433`（user: cms_user / password: cms_password / db: cms。ポートは CMS_DB_PORT で変更可） |
| 開発・テスト用のオペレーター | `pnpm db:seed` で作る（operator@example.com / operator-password）。本番では使わない |
| JWT | `/api/auth/token` で取得。`iss` / `aud` は環境変数 `JWT_ISSUER` / `JWT_AUDIENCE`（必須。開発・テストは `diecardomain-cms` / `diecardomain-core`）。`sub` は better-auth のユーザー ID。中身は `sub`・`iss`・`aud`・`iat`・`exp` だけ（有効期限 15 分）。**`JWT_ISSUER` は core がオペレーターを識別するキーの一部のため、運用を始めた環境では変えない** |
| JWKS | `/api/auth/jwks`（EdDSA / Ed25519）。core が JWT の検証に使う |

`make up` では、cms-migrate がマイグレーションを適用してから、開発サーバーの起動前に `db:seed`（冪等）を実行する。

## DB マイグレーション

core・cms・game で同じ形式（Atlas Community Edition `arigaio/atlas:1.3.3-community`、`migrations/NNNN_name.sql` + `atlas.sum`）にそろえている（方針は core#5、決まりと Atlas の注意点の詳細は core の README）。
better-auth の CLI（`auth migrate`）で直接 DB を変えるのではなく、`auth generate` で差分 SQL をファイルに出し、レビューしてから Atlas で適用する。

### better-auth の設定を変えたとき（プラグインの追加等）

1. lib/auth.ts を変える
2. `make migrate-generate NAME=<name>`（開発用 DB を最新にしてから、差分 SQL を `migrations/<次の番号>_<name>.sql` に出し、`atlas.sum` を作り直す。差分が無ければファイルは作らない）
3. 生成された SQL を確認し、`make migrate` で開発用 DB に適用する
4. lib/auth.ts・SQL・`atlas.sum` を一緒にコミットする

### 決まり

- 追加のみ。適用済みのファイルは変更・削除・改名しない。down は無い
- ファイル名は `NNNN_name.sql`（番号は数字だけ）。`-- atlas:txmode none` 等の指示行の直後には空行を入れる
- lib/auth.ts を変えたのにマイグレーションを作り忘れると、Atlas の適用は通るのに本番でテーブル・列が足りずに壊れる。`scripts/check-auth-schema.sh`（`auth generate` で差分が無いことを確かめる）で検査する（`make lint`・CI の test）
- 上記と番号の重複・適用済みより小さい番号の追加は、Atlas が検出しないため `scripts/check-migrations.sh`（core と同じもの）で検査する（`make lint`・CI の lint）

| 環境 | 実行方法 |
|---|---|
| 開発（compose.yaml） | cms-migrate サービス（migrations をマウント）が cms の起動前に 1 回実行。`make migrate` |
| テスト用（compose.test.yaml） | cms-migrate サービス（マイグレーション用イメージ） |
| リリース・本番 | タグのパイプラインで `diecardomain/cms-migrate:<タグ>` を Docker Hub に push。本番では cms より先に `DATABASE_URL` を渡してジョブとして実行する |

## 依存パッケージ

- 追加は `docker compose exec cms pnpm add <pkg>` のようにコンテナ内で行う
- node_modules はコンテナ内の pnpm がインストールし、ホストと共有する（VSCode の型補完・biome が使える）
