# studio

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
make test    # 専用の core・DB と本番用イメージの studio を使い捨てで起動し、Playwright で確認
make tunnel  # （任意）Cloudflare Quick Tunnel を起動し、外部公開用 URL を表示
make url     # （任意）起動中の Tunnel の URL を再表示
make migrate # 未適用の migrations だけを Atlas で適用（DB を作り直さない）
make migrate-generate NAME=<name> # better-auth の設定と DB の差分 SQL を次の番号で生成
make migrate-hash # migrations を手で足したら atlas.sum を作り直す
make down    # studio を停止（tunnel を含む。core は game も使うため止めない）
```

http://localhost:3001 で開く（envoy 経由。Next.js の開発サーバーはホストに公開していない）。
送ったメール（パスワードの設定等）は http://localhost:8025 の Mailpit で読む（外には送らない。ポートは STUDIO_MAILPIT_PORT で変更可）。
ポートが他と衝突する場合は `STUDIO_PORT=13001 make up` のように変更できる。

### 構成

```
ブラウザ ─────────────┐                     ┌─▶ studio:3000（Next.js）
cloudflared（任意）───┼─▶ studio-envoy:10000 ─┤
Playwright のブラウザ ┘                     └─▶ core:3333（/studio/graphql）
```

core と共有する studio 用のネットワーク `diecardomain-studio` に参加するのは **studio-envoy だけ**で（game 用の `diecardomain-game` とは分ける。studio#30）、studio 自身は参加しない（core（../core で `make up`）とは studio-envoy を通してつながる）。
core・game から studio に envoy を通らずに直接届くと、`x-client-ip` を自由に付けてレート制限をすり抜けられるため（studio#11）。

- studio のサーバーから core を呼ぶときは、studio-envoy の `/studio/graphql`（`http://studio-envoy:10000/studio/graphql`）を通す
- core から studio（JWKS 等）を呼ぶときも、studio-envoy（`http://studio-envoy:10000/api/auth/jwks`）を通す
core は game / studio で1つを共有する。core が兄弟ディレクトリ（../core）に clone されている前提。

studio が前提にする core の版は Makefile の `CORE_VERSION` に書く。`make gen-api` はその版のイメージから studio 用 GraphQL のスキーマを取り出し（`docker run --rm diecardomain/core:<版> schema studio`）、graphql-codegen で型を作る（生成物 graphql/ はコミットする）。マイルストーンの途中で、まだリリースしていない core を使うときは、`make core-local` で手元の ../core から `local` の版のイメージを作り、`make gen-api CORE_VERSION=local`・`make test CORE_VERSION=local` で使う（Makefile の `CORE_VERSION` は local にしない。studio#23）。

### テスト用環境（compose.test.yaml）

`make test` はプロジェクト名 `studio-test` で、専用の core・DB（`CORE_VERSION` のイメージ。ふだんはリリース済みの版、マイルストーンの途中は `local` も使える）と本番用イメージ（`.build/Dockerfile`）の studio を起動し、終了後に破棄する。テストは開発用イメージの studio-test-runner から実行する。
開発用の環境とはコンテナ・ネットワーク・DB が別で、ホストにポートも公開しないため、開発用を起動したままでも実行できる。
core の DB は、core#33 の後の core と同じく studio 用・game 用の 2 つ（core_studio・core_game。core_game は local/core-db の初期化の SQL で作る）にし、前提の版（DB が 1 つの core）でも動くよう `DB_DSN` も渡している（前提の版を core#33 の後の版に上げるときに消す）。

### Tunnel（任意）

`make tunnel` は `https://xxxx.trycloudflare.com` の URL を表示する。スマホ等の外部端末から確認するときに使う。
URL は起動のたびに変わり、知っていれば誰でもアクセスできるため、使い終わったら `make down` で止める。

## リリースとイメージ配布（CI）

| パイプライン | ジョブ | 内容 |
|---|---|---|
| マイルストーンのブランチに向かう MR（Issue の MR） | lint・test（手動） | ふだんは実行せず、手元の `make lint`・`make test` で確かめる。パイプラインは skipped になり、「スキップされたパイプラインを成功とみなす」の設定でマージできる。CI の手順を変えたとき等、CI で確かめたいときだけ手で動かす（失敗するとマージできなくなる） |
| main に向かう MR（マイルストーンの MR） | lint | `make lint` 相当 |
| main に向かう MR | test | migrations を空の DB に Atlas で適用し、better-auth の設定とスキーマに差分が無いことを確かめる（Playwright のテストは CI では未実行） |
| main に向かう MR | build-mr（手動） | `registry.gitlab.com/aimerzarashi/diecardomain/studio:mr-<MR番号>` と `.../studio/migrate:mr-<MR番号>` に push（lint・test が通った後） |
| main | release | semantic-release がコミットからバージョンを決め、タグ（`v1.2.0`）と GitLab リリースを作る。リリース対象のコミットが無ければ何もしない |
| タグ（`v*`） | deploy | Docker Hub の `diecardomain/studio:<タグ>`・`:latest` と `diecardomain/studio-migrate:<タグ>`・`:latest` に push |

本番用イメージは Next.js の standalone 出力を `node server.js` で動かす（`.build/Dockerfile`）。
バージョンは Conventional Commits で決まる（`feat:` → マイナー、`fix:` / `perf:` → パッチ、`BREAKING CHANGE` → メジャー）。

Issue の MR では、何もしない手動のジョブだけを置いて実行しない（lint・test は手元の `make lint`・`make test` で確かめる。パイプラインを作らないと「パイプラインが成功する必要がある」の設定でマージできず、その設定は main に向かう MR の歯止めとして残すため）。main への push では lint・test を流さない（直前の main に向かう MR で同じ中身を確かめているため。main は直接 push できない設定にしている）。共有 Runner の時間を減らすため（core#30・studio#22）。

## 認証（better-auth）

メールアドレス + パスワードでサインアップ・ログインする（better-auth の標準機能）。メールアドレスの確認が済むまでログインできない。
誰をオペレーターにするかは core が決め、better-auth には認証のための情報（メールアドレス・パスワード・セッション）だけを置く（設計メモ「オペレーターの登録と権限」）。

| 項目 | 内容 |
|---|---|
| データ | studio-db（PostgreSQL）。テーブルは migrations の SQL を Atlas で適用して作る（下の「DB マイグレーション」）。ホストからは `localhost:5433`（user: studio_user / password: studio_password / db: studio。ポートは STUDIO_DB_PORT で変更可） |
| アカウントとオペレーター | 誰でもサインアップできるが、core にオペレーターとして登録されたメールアドレスを確認したアカウントだけが、初めて core を呼んだときにオペレーターに紐づく（下の「サインアップとオペレーター」） |
| 開発・テスト用のオペレーター | `pnpm db:seed` で作る（operator@example.com / operator-password。メールアドレスは確認済み）。core の初期オペレーター（`STUDIO_INITIAL_OPERATOR_EMAIL`）と同じアドレスで、ログインして core を呼ぶと紐づく。本番では使わない |
| 名前 | better-auth の `name` は必須の列だが使わず、空文字にする（オペレーターのプロフィールは core に持つ） |
| JWT | `/api/auth/token` で取得。`iss` / `aud` は環境変数 `JWT_ISSUER` / `JWT_AUDIENCE`（必須。開発・テストは `diecardomain-studio` / `diecardomain-core`）。`sub` は better-auth のユーザー ID。中身は `sub`・`iss`・`aud`・`iat`・`exp` と、`email`・`email_verified`（core が初めてのログインでオペレーターに紐づけるときにだけ使う。OIDC の標準のクレーム名）（有効期限 15 分）。**`JWT_ISSUER` は core がオペレーターを識別するキーの一部のため、運用を始めた環境では変えない** |
| JWKS | `/api/auth/jwks`（EdDSA / Ed25519）。core が JWT の検証に使う |

`make up` では、studio-migrate がマイグレーションを適用してから、開発サーバーの起動前に `db:seed`（冪等）を実行する。

### サインアップとオペレーター

1. core の管理者がオペレーターをメールアドレスで登録する。最初のオペレーターは、core が起動時に環境変数（`STUDIO_INITIAL_OPERATOR_EMAIL`）のアドレスで登録する（core の README）
2. 本人がそのアドレスで studio にサインアップする。確認のメールのリンク（better-auth の `/api/auth/verify-email`）を開くまでログインできない
3. 本人がログインして studio が初めて core を呼ぶと、core が JWT の確認済みのメールアドレスで、オペレーターに (iss, sub) を紐づける。以後は (iss, sub) で識別する

- 誰でもアカウントは作れるが、core に登録されたメールアドレスでなければ、core の操作は認可で拒否される（オペレーターでないアカウントが studio-db に残ることへの対策は、必要になったら考える）
- 他人に先にそのアドレスでサインアップされても、確認のメールは持ち主に届くので、他人はログインできず、オペレーターにも紐づかない。持ち主は「パスワードを忘れた」から設定し直してログインしようとすると、確認のメールが送り直され（`sendOnSignIn`。パスワードの再設定では確認済みにならないため）、確認すれば使える
- 登録済みのアドレスでサインアップしても同じ表示になり、メールは送られない（登録の有無を探られないため）
- メールアドレスの変更（`changeEmail`）は無効のまま（既定）。変えられると、紐づけの前提（確認済みのメールアドレス）が崩れるため
- パスワードを設定し直すと、その人のセッションはすべて無効になる。登録されていないアドレスでも同じ表示になり、メールは送られない
- 以前は Admin プラグインで管理者がオペレーターを作っていた（studio#7）。誰をオペレーターにするかを core が決めることにしたため、やめた（studio#12。列は migrations/0004 で消した）

### メール

メールは SMTP で送る（lib/mail.ts。nodemailer）。送り方をローカルと本番で同じにするため、配信サービスの SDK は使わない。

| 環境変数 | 内容 |
|---|---|
| `SMTP_URL` | SMTP の接続先（例: 開発・テストは `smtp://studio-mailpit:1025`、本番は `smtps://<ユーザー>:<パスワード>@<ホスト>:465`） |
| `MAIL_FROM` | 差出人（例: `diecardomain studio <no-reply@diecardomain.example>`） |

- 本番のメール配信サービスは、本番を用意するときに選ぶ
- nodemailer には、細工した入力の解析による勧告が多い。そのため宛先は DB にあるアドレスだけを渡し、本文はテキストのみにする（HTML・添付・DKIM は使わない）。依存の更新はすぐ取り込む
- 将来、game にもパスワードの設定が入るときに、メール送信を core（Go の標準ライブラリ）に移すかを決める

### レート制限と利用者の IP

better-auth のレート制限は本番モード（`NODE_ENV=production`）でだけ有効で、ログインは同じ IP から 10 秒に 3 回まで。回数は DB（`rateLimit` テーブル）で数えるので、studio を複数台にしても合算される。

利用者の IP は、envoy が接続元から判定して `x-client-ip` に**上書き**で入れ、better-auth はそれだけを見る（better-auth 公式の推奨: プロキシが設定する信頼できるヘッダー 1 つ）。利用者が送った `X-Forwarded-For` や `x-client-ip` は無視される。

| 入口 | 利用者の IP | 置く環境 |
|---|---|---|
| 公開の入口（envoy の 10000） | 接続元の IP | すべて |
| 中継役用の入口（10001。`local/envoy/relay-listener.yaml`） | `X-Forwarded-For` の最後の 1 段 | **テスト用の環境（compose.test.yaml）だけ**。Playwright がテストごとに別の IP を名乗るために使う |

- **studio には envoy を経由してしか届かないようにする**（studio の 3000 番を公開しない）。直接届くと `x-client-ip` を偽装できる
- **中継役用の入口は、開発用・リリース版の環境に置かず、ポートも公開しない**。届いた `X-Forwarded-For` を信じるので、公開するとそのまま偽装の穴になる
- Tunnel（cloudflared）は公開の入口を通るので、Tunnel の利用者は全員が cloudflared の IP を共有する（偽装はできないが、利用者どうしで制限を食い合う）。Tunnel は確認のために一時的に使うものなので受け入れている
- 本番（クラウド）の前段（ロードバランサー等）に合わせた入口は、クラウドを用意するときに決める
- テストのためにレート制限を無効にする設定は作らない（本番用イメージに防御を消すスイッチが入るため）

### secret（`BETTER_AUTH_SECRET`）の変更

secret は Cookie の署名と、JWT の署名鍵（studio-db の `jwks`）の暗号化に使われる。パスワードのハッシュには使われない。
**そのまま変えると `jwks` を復号できず、ログイン後のセッションの取得・JWT の発行がすべて 500 になる**（2026-10-10 に確認）。

定期的な変更（漏洩していないとき）:

1. 新しい secret を作る（`openssl rand -hex 32`）
2. `BETTER_AUTH_SECRET` の代わりに `BETTER_AUTH_SECRETS=2:<新>,1:<旧>`（先頭が今の secret）を渡して再起動する。`jwks` の秘密鍵は旧い secret でも復号できるため、studio は動き続ける
3. ログイン中のオペレーターは一度ログアウトされる（Cookie は今の secret でしか確かめない）

漏洩したとき（旧い secret を残さない）:

1. 漏洩の経路を塞ぐ
2. 新しい secret を作り、`BETTER_AUTH_SECRET` を差し替える（`BETTER_AUTH_SECRETS` で旧い値を残さない。残すと漏れた secret で暗号化された秘密鍵が使われ続ける）
3. studio-db の `jwks` と `session` を空にする（`delete from jwks; delete from session;`）。署名鍵は次の署名のときに自動で作り直される
4. studio を再起動する
5. core が JWKS を取り直し、古い kid の JWT を信用しないようにする（JWT の有効期限は最大 15 分）
6. studio-db も漏れた疑いがあれば、全オペレーターのパスワードを無効にし、「パスワードを忘れた」から設定し直してもらう（無効にする操作は #9。未実装）

secret だけが漏れた場合、Cookie の署名は作れるが、セッションの token（DB にあるランダムな値）を知らないとログイン状態は偽造できない。secret と studio-db の両方が漏れると、`jwks` の秘密鍵を復号して JWT を偽造できる（core に対して任意のオペレーターになりすませる）。

## DB マイグレーション

core・studio・game で同じ形式（Atlas Community Edition `arigaio/atlas:1.3.3-community`、`migrations/NNNN_name.sql` + `atlas.sum`）にそろえている（方針は core#5、決まりと Atlas の注意点の詳細は core の README）。
better-auth の CLI（`auth migrate`）で直接 DB を変えるのではなく、`auth generate` で差分 SQL をファイルに出し、レビューしてから Atlas で適用する。

### better-auth の設定を変えたとき（プラグインの追加等）

1. lib/auth.ts を変える
2. `make migrate-generate NAME=<name>`（開発用 DB を最新にしてから、差分 SQL を `migrations/<次の番号>_<name>.sql` に出し、`atlas.sum` を作り直す。差分が無ければファイルは作らない）
3. 生成された SQL を確認し、`make migrate` で開発用 DB に適用する
4. lib/auth.ts・SQL・`atlas.sum` を一緒にコミットする

### 決まり

- 追加のみ。適用済みのファイルは変更・削除・改名しない。down は無い
- 例外として、リリース前（本番の DB ができる前）に限り、並びを作り直してよい。作り直したら `migrations/BASELINE` の 1 行目を書き換える（`check-migrations.sh` は比較元とこの行が違えば比べ合わせを飛ばす。core#33）
- ファイル名は `NNNN_name.sql`（番号は数字だけ）。`-- atlas:txmode none` 等の指示行の直後には空行を入れる
- lib/auth.ts を変えたのにマイグレーションを作り忘れると、Atlas の適用は通るのに本番でテーブル・列が足りずに壊れる。`scripts/check-auth-schema.sh`（`auth generate` で差分が無いことを確かめる）で検査する（`make lint`・CI の test）
- 上記と番号の重複・適用済みより小さい番号の追加は、Atlas が検出しないため `scripts/check-migrations.sh`（core と同じもの）で検査する（`make lint`・CI の lint）

| 環境 | 実行方法 |
|---|---|
| 開発（compose.yaml） | studio-migrate サービス（migrations をマウント）が studio の起動前に 1 回実行。`make migrate` |
| テスト用（compose.test.yaml） | studio-migrate サービス（マイグレーション用イメージ） |
| リリース・本番 | タグのパイプラインで `diecardomain/studio-migrate:<タグ>` を Docker Hub に push。本番では studio より先に `DATABASE_URL` を渡してジョブとして実行する |

## 依存パッケージ

- 追加は `docker compose exec studio pnpm add <pkg>` のようにコンテナ内で行う
- node_modules はコンテナ内の pnpm がインストールし、ホストと共有する（VSCode の型補完・biome が使える）
