# cms

カルドセプト風ブラウザゲームの管理 UI（Next.js）。ゲームのコンテンツを編集する。

## 必要なもの

- Docker Engine + Docker Compose v2 以降
- make

Node.js・pnpm はコンテナ内で動くため、ホストへのインストールは不要。

## セットアップ

```bash
make up      # 開発サーバー（Next.js）・envoy・Playwright のブラウザを起動
make fmt     # biome でフォーマットを修正
make lint    # biome check と型チェック
make test    # Playwright でトップページが表示されることを確認
make tunnel  # （任意）Cloudflare Quick Tunnel を起動し、外部公開用 URL を表示
make down    # tunnel を含めて停止
```

http://localhost:3001 で開く（envoy 経由。Next.js の開発サーバーはホストに公開していない）。
ポートが他と衝突する場合は `CMS_PORT=13001 make up` のように変更できる。

### 構成

```
ブラウザ ─────────────┐
cloudflared（任意）───┼─▶ cms-envoy:10000 ─▶ cms:3000（Next.js）
Playwright のブラウザ ┘
```

### Tunnel（任意）

`make tunnel` は `https://xxxx.trycloudflare.com` の URL を表示する。スマホ等の外部端末から確認するときに使う。
URL は起動のたびに変わり、知っていれば誰でもアクセスできるため、使い終わったら `make down` で止める。

## 依存パッケージ

- 追加は `docker compose exec cms pnpm add <pkg>` のようにコンテナ内で行う
- node_modules はコンテナ内の pnpm がインストールし、ホストと共有する（VSCode の型補完・biome が使える）
