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
送ったメール（パスワードの設定等）は http://localhost:8025 の Mailpit で読む（外には送らない。ポートは CMS_MAILPIT_PORT で変更可）。
ポートが他と衝突する場合は `CMS_PORT=13001 make up` のように変更できる。

### 構成

```
ブラウザ ─────────────┐                     ┌─▶ cms:3000（Next.js）
cloudflared（任意）───┼─▶ cms-envoy:10000 ─┤
Playwright のブラウザ ┘                     └─▶ core:3333（/cms/graphql）
```

共有ネットワーク `diecardomain` に参加するのは **cms-envoy だけ**で、cms 自身は参加しない（core（../core で `make up`）とは cms-envoy を通してつながる）。
core・game から cms に envoy を通らずに直接届くと、`x-client-ip` を自由に付けてレート制限をすり抜けられるため（cms#11）。

- cms のサーバーから core を呼ぶときは、cms-envoy の `/cms/graphql`（`http://cms-envoy:10000/cms/graphql`）を通す
- core から cms（JWKS 等）を呼ぶときも、cms-envoy（`http://cms-envoy:10000/api/auth/jwks`）を通す
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
| 最初の管理者 | 起動時に `INITIAL_ADMIN_EMAIL` のアドレスでパスワード無しで作り、本人がメールで設定する（下の「最初の管理者とパスワードの設定」） |
| 開発・テスト用の管理者 | `pnpm db:seed` で作る（operator@example.com / operator-password、role: admin）。本番では使わない |
| 管理者と権限 | better-auth の Admin プラグイン。管理者 role から、なりすまし・削除・メールアドレスの変更を外している（下の「管理者の権限」） |
| JWT | `/api/auth/token` で取得。`iss` / `aud` は環境変数 `JWT_ISSUER` / `JWT_AUDIENCE`（必須。開発・テストは `diecardomain-cms` / `diecardomain-core`）。`sub` は better-auth のユーザー ID。中身は `sub`・`iss`・`aud`・`iat`・`exp` だけ（有効期限 15 分）。**`JWT_ISSUER` は core がオペレーターを識別するキーの一部のため、運用を始めた環境では変えない** |
| JWKS | `/api/auth/jwks`（EdDSA / Ed25519）。core が JWT の検証に使う |

`make up` では、cms-migrate がマイグレーションを適用してから、開発サーバーの起動前に `db:seed`（冪等）を実行する。

### 最初の管理者とパスワードの設定

サインアップは無効で、オペレーターは管理者が作る。最初の管理者は、**ローカルと本番で同じ方法**で作る。

1. 環境変数 `INITIAL_ADMIN_EMAIL`（と `INITIAL_ADMIN_NAME`）にアドレスを入れて cms を起動する
2. cms は起動時に、そのアドレスのユーザーがいなければ、**パスワード無しの管理者**として作る（lib/initial-admin.ts。パスワードの登録が無いので、何を入力してもログインできない）
3. 本人がログイン画面の「パスワードを忘れた・初めて設定する」からメールを送り、届いたリンク（1 時間有効）でパスワードを設定する

- デプロイする人ごとにアドレスを変えられ、リポジトリには残らない。パスワードは誰も入力せず、受け渡さない
- そのアドレスのユーザーがすでにいれば何もしない（複数台で同時に起動しても 1 人だけ作られる）。別のアドレスに変えて起動すると、そのアドレスで新しい管理者が作られる（管理者が全員ログインできなくなったときの立て直しにも使える。誤ったアドレスで作られた管理者は利用停止にする）
- 開発用の環境は `admin@example.com`（compose.yaml）。開発・テスト用には、パスワード付きの管理者 operator@example.com も seed で作る
- パスワードを設定し直すと、その人のセッションはすべて無効になる。登録されていないアドレスでも同じ表示になり、メールは送られない

### メール

メールは SMTP で送る（lib/mail.ts。nodemailer）。送り方をローカルと本番で同じにするため、配信サービスの SDK は使わない。

| 環境変数 | 内容 |
|---|---|
| `SMTP_URL` | SMTP の接続先（例: 開発・テストは `smtp://cms-mailpit:1025`、本番は `smtps://<ユーザー>:<パスワード>@<ホスト>:465`） |
| `MAIL_FROM` | 差出人（例: `diecardomain cms <no-reply@diecardomain.example>`） |

- 本番のメール配信サービスは、本番を用意するときに選ぶ
- nodemailer には、細工した入力の解析による勧告が多い。そのため宛先は DB にあるアドレスだけを渡し、本文はテキストのみにする（HTML・添付・DKIM は使わない）。依存の更新はすぐ取り込む
- 将来、game にもパスワードの設定が入るときに、メール送信を core（Go の標準ライブラリ）に移すかを決める

### 管理者の権限

Admin プラグインの既定の管理者から、次の権限を外している（lib/auth.ts）。

| 外した権限 | 理由 |
|---|---|
| なりすまし（impersonate） | JWT は (iss, sub) だけのため、core からなりすましを見分けられず、操作が本人のものとして記録される |
| 削除（delete） | core 側の (iss, sub) → operator.ID の対応が宙に浮く。使えなくするときは利用停止（ban）にする |
| メールアドレスの変更（set-email） | メールによるパスワードリセット（#8）と組み合わせると、ほかのオペレーターを乗っ取れる |

### レート制限と利用者の IP

better-auth のレート制限は本番モード（`NODE_ENV=production`）でだけ有効で、ログインは同じ IP から 10 秒に 3 回まで。回数は DB（`rateLimit` テーブル）で数えるので、cms を複数台にしても合算される。

利用者の IP は、envoy が接続元から判定して `x-client-ip` に**上書き**で入れ、better-auth はそれだけを見る（better-auth 公式の推奨: プロキシが設定する信頼できるヘッダー 1 つ）。利用者が送った `X-Forwarded-For` や `x-client-ip` は無視される。

| 入口 | 利用者の IP | 置く環境 |
|---|---|---|
| 公開の入口（envoy の 10000） | 接続元の IP | すべて |
| 中継役用の入口（10001。`local/envoy/relay-listener.yaml`） | `X-Forwarded-For` の最後の 1 段 | **テスト用の環境（compose.test.yaml）だけ**。Playwright がテストごとに別の IP を名乗るために使う |

- **cms には envoy を経由してしか届かないようにする**（cms の 3000 番を公開しない）。直接届くと `x-client-ip` を偽装できる
- **中継役用の入口は、開発用・リリース版の環境に置かず、ポートも公開しない**。届いた `X-Forwarded-For` を信じるので、公開するとそのまま偽装の穴になる
- Tunnel（cloudflared）は公開の入口を通るので、Tunnel の利用者は全員が cloudflared の IP を共有する（偽装はできないが、利用者どうしで制限を食い合う）。Tunnel は確認のために一時的に使うものなので受け入れている
- 本番（クラウド）の前段（ロードバランサー等）に合わせた入口は、クラウドを用意するときに決める
- テストのためにレート制限を無効にする設定は作らない（本番用イメージに防御を消すスイッチが入るため）

### secret（`BETTER_AUTH_SECRET`）の変更

secret は Cookie の署名と、JWT の署名鍵（cms-db の `jwks`）の暗号化に使われる。パスワードのハッシュには使われない。
**そのまま変えると `jwks` を復号できず、ログイン後のセッションの取得・JWT の発行がすべて 500 になる**（2026-10-10 に確認）。

定期的な変更（漏洩していないとき）:

1. 新しい secret を作る（`openssl rand -hex 32`）
2. `BETTER_AUTH_SECRET` の代わりに `BETTER_AUTH_SECRETS=2:<新>,1:<旧>`（先頭が今の secret）を渡して再起動する。`jwks` の秘密鍵は旧い secret でも復号できるため、cms は動き続ける
3. ログイン中のオペレーターは一度ログアウトされる（Cookie は今の secret でしか確かめない）

漏洩したとき（旧い secret を残さない）:

1. 漏洩の経路を塞ぐ
2. 新しい secret を作り、`BETTER_AUTH_SECRET` を差し替える（`BETTER_AUTH_SECRETS` で旧い値を残さない。残すと漏れた secret で暗号化された秘密鍵が使われ続ける）
3. cms-db の `jwks` と `session` を空にする（`delete from jwks; delete from session;`）。署名鍵は次の署名のときに自動で作り直される
4. cms を再起動する
5. core が JWKS を取り直し、古い kid の JWT を信用しないようにする（JWT の有効期限は最大 15 分）
6. cms-db も漏れた疑いがあれば、全オペレーターのパスワードを無効にし、「パスワードを忘れた」から設定し直してもらう（無効にする操作は #9。未実装）

secret だけが漏れた場合、Cookie の署名は作れるが、セッションの token（DB にあるランダムな値）を知らないとログイン状態は偽造できない。secret と cms-db の両方が漏れると、`jwks` の秘密鍵を復号して JWT を偽造できる（core に対して任意のオペレーターになりすませる）。

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
