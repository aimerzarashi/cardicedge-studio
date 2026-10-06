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
make lint    # biome check と型チェック
make test    # 専用の core・DB と本番用イメージの cms を使い捨てで起動し、Playwright で確認
make tunnel  # （任意）Cloudflare Quick Tunnel を起動し、外部公開用 URL を表示
make url     # （任意）起動中の Tunnel の URL を再表示
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
| MR | lint | `make lint` 相当（Playwright のテストは CI では未実行） |
| MR | build-mr（手動） | `registry.gitlab.com/aimerzarashi/diecardomain/cms:mr-<MR番号>` に push |
| main | lint / release | semantic-release がコミットからバージョンを決め、タグ（`v1.2.0`）と GitLab リリースを作る。リリース対象のコミットが無ければ何もしない |
| タグ（`v*`） | deploy | Docker Hub の `diecardomain/cms:<タグ>` と `:latest` に push |

本番用イメージは Next.js の standalone 出力を `node server.js` で動かす（`.build/Dockerfile`）。
バージョンは Conventional Commits で決まる（`feat:` → マイナー、`fix:` / `perf:` → パッチ、`BREAKING CHANGE` → メジャー）。

## 依存パッケージ

- 追加は `docker compose exec cms pnpm add <pkg>` のようにコンテナ内で行う
- node_modules はコンテナ内の pnpm がインストールし、ホストと共有する（VSCode の型補完・biome が使える）
