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
make test-unit # 単体テスト（pnpm test:unit = node --test。core・DB を起動しない。make test も最初に流す）
make test    # 単体テストを流してから、専用の core・DB と本番用イメージの studio を使い捨てで起動し、Playwright で確認
make tunnel  # （任意）Cloudflare Quick Tunnel を起動し、外部公開用 URL を表示
make url     # （任意）起動中の Tunnel の URL を再表示
make migrate # 未適用の migrations だけを Atlas で適用（DB を作り直さない）
make migrate-generate NAME=<name> # better-auth の設定と DB の差分 SQL を次の番号で生成
make migrate-hash # migrations を手で足したら atlas.sum を作り直す
make dev-cache-reset # 開発用の Turbopack のキャッシュ（.next/dev）を作り直して再起動（下の注意）
make down    # studio を停止（tunnel を含む。core は game も使うため止めない。studio-db のデータは残す）
make clean   # down に加えて studio-db のデータも消す（core も作り直すこと。下の注意）
```

http://localhost:3001 で開く（envoy 経由。Next.js の開発サーバーはホストに公開していない）。
送ったメール（パスワードの設定等）は http://localhost:8025 の Mailpit で読む（外には送らない。ポートは STUDIO_MAILPIT_PORT で変更可）。
ポートが他と衝突する場合は `STUDIO_PORT=13001 make up` のように変更できる。

開発の画面がページ全体の読み直しを繰り返すとき（ブラウザの console に `[Fast Refresh] rebuilding` が出続ける）は、まず `docker compose restart studio`、直らなければ `make dev-cache-reset` で開発用のキャッシュを作り直す。依存（`pnpm-lock.yaml` から入れたもの）か `next.config.ts` が前回の起動から変わっていれば、起動のとき（`make up`・再起動）に自動で作り直す（local/studio/dev.sh。studio#66・game#39）。

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
core の DB は、core と同じく studio 用・game 用の 2 つ（core_studio・core_game。core_game は local/core-db の初期化の SQL で作る）。

### テストが落ちたとき

`make test` が落ちたときだけ、テスト用の環境を消す前に、`test-failures/<日時>/`（git 管理しない）に記録を移す（scripts/save-test-failure.sh。studio#46）。次に流しても消えない。要らなくなったら手で消す。

| 場所                                                      | 中身                                                                                                                                                                                                                                            | 見方                                                                                                                                                                                                                                   |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test-results/<テスト>/`                                  | 落ちたテストの trace（`trace.zip`）・スクリーンショット・error-context.md                                                                                                                                                                       | trace は https://trace.playwright.dev に `trace.zip` を開く（読み込みはブラウザの中だけで、ファイルは送られない）。画面の操作の順、送った通信（Server Action の応答を含む）、各時点の画面が見える                                      |
| `playwright-report/`                                      | Playwright の HTML のレポート（すべてのテストの結果）                                                                                                                                                                                           | `index.html` をブラウザで開く。落ちたテストは「Failed」で絞り、テスト名を押すと、誤り・操作ごとの時間・スクリーンショット・trace と、「Annotations」の trace id が並ぶ。中の trace は、trace.playwright.dev か `trace.zip` で開く      |
| `logs/<サービス>.log`                                     | 各コンテナのログ（時刻つき）                                                                                                                                                                                                                    | core のログで、操作のコマンド・投影の処理と誤り（ERROR）を時刻で追う                                                                                                                                                                   |
| `db/core_studio.sql`・`db/core_game.sql`・`db/studio.sql` | 各 DB の中身（pg_dump）                                                                                                                                                                                                                         | `domain_events` の行で、操作のイベントが保存されていたかを、read model の表（boards 等）で、反映していたかを見る。イベントは保存され read model にも反映していれば、投影の遅れでテストが待ちきれなかっただけと判断できる               |
| `test-results/<テスト>/trace-id.txt`                      | 落ちたテストの trace id（テストごとに W3C の traceparent を作り、ブラウザの通信と core を直接呼ぶ前準備の両方に付けている。tests/fixtures.ts）                                                                                                  | そのテストの studio・core の処理が、この 1 つの trace id でつながっている                                                                                                                                                              |
| `traces/<trace id>/tempo.json`                            | その trace id の Tempo のトレース（JSON）。studio と core のスパン                                                                                                                                                                              | `batches[].resource` の `service.name`（studio / core）ごとに `scopeSpans[].spans[]`（`name`・開始と終了の時刻・親子）を読む。Grafana で開くなら http://localhost:3002 の Explore（Tempo）に trace id を入れる（受け手が動いていれば） |
| `traces/<trace id>/loki.json`                             | その trace id を持つ core・studio のログと、その保存を処理した投影・ポリシーのログ（`eventdriven: event processed`。`lag_ms`・`duration_ms`・`result` つき。トレースの無い保存、seed 等の処理には付かない）（Loki の query_range の応答。JSON） | `data.result[]` の各 stream の `stream`（`event_id`・`trace_id` 等のメタデータ）と `values[]`（`[時刻(ns), メッセージ]`）                                                                                                              |
| `traces/<trace id>/test-dir.txt`                          | その trace id のテストの `test-results/` の下のディレクトリ名                                                                                                                                                                                   | trace id とテストの対応                                                                                                                                                                                                                |

trace id の見つけ方は、落ちたテストの `test-results/<テスト>/trace-id.txt`、`traces/` の下のディレクトリ名と `test-dir.txt`、または HTML のレポートの「Annotations」。HTML のレポートには通ったテストの trace id も出るので、通ったが遅かったテストも受け手で調べられる。テストが通ったときのレポートは `playwright-report/`（git 管理しない。次に流すと作り直す）に残る。AI に調べさせるときは、`test-failures/<日時>/` のディレクトリごと渡す。受け手（core の compose の otel-lgtm）が動いていない・取れないときは、`traces/` は作られないか欠ける（`make test` の終了コードは変わらない）。ログは、`logs/core.log` でも `event_id` で引ける。

記録に無いことは、受け手に Grafana の API で問い合わせる（受け手が動いていて、core の `make down` の前に限る。前に流したテストや開発の環境のログも入っているので、時刻や条件で絞る）。記録を先に読み、足りないときに使う。時刻は Loki が UNIX 時刻の ns、Tempo の検索が s。出力の整形に jq を使っている（無くても問い合わせはできる）。

```sh
G=http://127.0.0.1:3002/api/datasources/proxy/uid
# core の ERROR のログ（時刻で絞る）
curl -sG $G/loki/loki/api/v1/query_range --data-urlencode 'query={service_name="core"} | detected_level="error"' \
  --data-urlencode start=<ns> --data-urlencode end=<ns> | jq -r '.data.result[].values[][1]'
# 遅れの大きい投影の処理（lag_ms はミリ秒）
curl -sG $G/loki/loki/api/v1/query_range --data-urlencode 'query={service_name="core"} | subscriber_kind="projection" | lag_ms > 30' \
  --data-urlencode start=<ns> | jq -r '.data.result[] | [.values[0][0], .stream.event_type, .stream.subscriber_name, .stream.lag_ms] | @tsv'
# core の処理が 100ms を超えたトレース（TraceQL）。trace id を tempo の /api/traces/<trace id> で開く
curl -sG $G/tempo/api/search --data-urlencode 'q={ resource.service.name = "core" && duration > 100ms }' \
  --data-urlencode start=<s> --data-urlencode end=<s> | jq -r '.traces[] | [.traceID, .durationMs] | @tsv'
```

自動で流し直す（retries）は付けていない。流し直しで通ると、たまに落ちることが隠れるため。たまに落ちるテストは再現を探さず、この記録で調べる。

### Tunnel（任意）

`make tunnel` は `https://xxxx.trycloudflare.com` の URL を表示する。スマホ等の外部端末から確認するときに使う。
URL は起動のたびに変わり、知っていれば誰でもアクセスできるため、使い終わったら `make down` で止める。

## リリースとイメージ配布（CI）

| パイプライン                                       | ジョブ             | 内容                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| マイルストーンのブランチに向かう MR（Issue の MR） | check（手動） | ふだんは実行せず、手元の `make lint`・`make test` で確かめる。パイプラインは skipped になり、「スキップされたパイプラインを成功とみなす」の設定でマージできる。CI の手順を変えたとき等、CI で確かめたいときだけ手で動かす（失敗するとマージできなくなる） |
| main に向かう MR（マイルストーンの MR） | check | `make lint` 相当（biome・型・migrations の検査）のあとに、単体テスト・migrations を空の DB に Atlas で適用・better-auth の設定とスキーマの差分の検査を、1 つのジョブで順に流す（GitLab のコンピューティング時間を短縮するため、ジョブごとの準備を 1 回にする。lint で落ちたら test は流さない。studio#55）。Playwright のテストは CI では未実行 |
| main に向かう MR                                   | build-mr（手動）   | `registry.gitlab.com/aimerzarashi/diecardomain/studio:mr-<MR番号>` と `.../studio/migrate:mr-<MR番号>` に push（check が通った後）                                                                                                                                                                                           |
| main                                               | release            | semantic-release がコミットからバージョンを決め、タグ（`v1.2.0`）と GitLab リリースを作る。リリース対象のコミットが無ければ何もしない。入った MR・Issue へのコメント（どの版で入ったか）は書かない（`.releaserc.json` の `successCommentCondition: false`。書くと GitLab の回数の制限にかかることがあるため。studio#53・core#77） |
| タグ（`v*`）                                       | deploy             | Docker Hub の `diecardomain/studio:<タグ>`・`:latest` と `diecardomain/studio-migrate:<タグ>`・`:latest` に push                                                                                                                                                                                                                  |

本番用イメージは Next.js の standalone 出力を `node server.js` で動かす（`.build/Dockerfile`）。
バージョンは Conventional Commits で決まる（`feat:` → マイナー、`fix:` / `perf:` → パッチ、`BREAKING CHANGE` → メジャー）。

マイルストーンのブランチに向かう Issue の MR では check のジョブを手動にして、ふだんは実行しない（手元の `make lint`・`make test` で確かめる。GitLab のコンピューティング時間を Issue ごとに使わないため）。手動のジョブだけのパイプラインは skipped になり、「スキップされたパイプラインを成功とみなす」の設定でマージできる（「パイプラインが成功する必要がある」の設定は、main に向かう MR の歯止めとして残す）。main への push では lint・test を流さない（直前の main に向かう MR で同じ中身を確かめているため）。main は直接 push できない設定（保護ブランチの push は No one）にして、すべての変更が main に向かう MR の check を通るようにしている（core#30・core#33）。

## 認証（better-auth）

メールアドレス + パスワードでサインアップ・ログインする（better-auth の標準機能）。メールアドレスの確認が済むまでログインできない。
誰をオペレーターにするかは core が決め、better-auth には認証のための情報（メールアドレス・パスワード・セッション）だけを置く（設計メモ「オペレーターの登録と権限」）。

| 項目                         | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| データ                       | studio-db（PostgreSQL）。テーブルは migrations の SQL を Atlas で適用して作る（下の「DB マイグレーション」）。ホストからは `localhost:5433`（user: studio_user / password: studio_password / db: studio。ポートは STUDIO_DB_PORT で変更可）                                                                                                                                                                                                                                   |
| アカウントとオペレーター     | 誰でもサインアップできるが、core にオペレーターとして登録されたメールアドレスを確認したアカウントだけが、初めて core を呼んだときにオペレーターに紐づく（下の「サインアップとオペレーター」）                                                                                                                                                                                                                                                                                 |
| 開発・テスト用のオペレーター | `pnpm db:seed` で作る（operator@example.com / operator-password。メールアドレスは確認済み）。core の初期オペレーター（`STUDIO_INITIAL_OPERATOR_EMAIL`）と同じアドレスで、ログインして core を呼ぶと紐づく。本番では使わない                                                                                                                                                                                                                                                   |
| 名前                         | better-auth の `name` は必須の列だが使わず、空文字にする（オペレーターのプロフィールは core に持つ）                                                                                                                                                                                                                                                                                                                                                                          |
| JWT                          | `/api/auth/token` で取得。`iss` / `aud` は環境変数 `JWT_ISSUER` / `JWT_AUDIENCE`（必須。開発・テストは `diecardomain-studio` / `diecardomain-core`）。`sub` は better-auth のユーザー ID。中身は `sub`・`iss`・`aud`・`iat`・`exp` と、`email`・`email_verified`（core が初めてのログインでオペレーターに紐づけるときにだけ使う。OIDC の標準のクレーム名）（有効期限 15 分）。**`JWT_ISSUER` は core がオペレーターを識別するキーの一部のため、運用を始めた環境では変えない** |
| JWKS                         | `/api/auth/jwks`（EdDSA / Ed25519）。core が JWT の検証に使う                                                                                                                                                                                                                                                                                                                                                                                                                 |

`make up` では、studio-migrate がマイグレーションを適用してから、開発サーバーの起動前に `db:seed`（冪等）を実行する。

studio-db のデータは名前付きのボリュームに置き、`make down` では消さない。`make clean` で消すと、seed がオペレーターを作り直してユーザー ID（JWT の `sub`）が変わり、core の DB に残った前の紐づけと合わずに「この操作をする権限がありません」になる（core は別の (発行元, ユーザー ID) に紐づいたオペレーターを紐づけ直さない）。`make clean` のあとは core も作り直す（ルートの `make down`）。core の DB だけが空になったときは、core が初めてのログインでメールアドレスから紐づけ直すので、そのままでよい（studio#19）。

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

| 環境変数    | 内容                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| `SMTP_URL`  | SMTP の接続先（例: 開発・テストは `smtp://studio-mailpit:1025`、本番は `smtps://<ユーザー>:<パスワード>@<ホスト>:465`） |
| `MAIL_FROM` | 差出人（例: `diecardomain studio <no-reply@diecardomain.example>`）                                                     |

- 本番のメール配信サービスは、本番を用意するときに選ぶ
- nodemailer には、細工した入力の解析による勧告が多い。そのため宛先は DB にあるアドレスだけを渡し、本文はテキストのみにする（HTML・添付・DKIM は使わない）。依存の更新はすぐ取り込む
- 将来、game にもパスワードの設定が入るときに、メール送信を core（Go の標準ライブラリ）に移すかを決める

### レート制限と利用者の IP

better-auth のレート制限は本番モード（`NODE_ENV=production`）でだけ有効で、ログインは同じ IP から 10 秒に 3 回まで。回数は DB（`rateLimit` テーブル）で数えるので、studio を複数台にしても合算される。

利用者の IP は、envoy が接続元から判定して `x-client-ip` に**上書き**で入れ、better-auth はそれだけを見る（better-auth 公式の推奨: プロキシが設定する信頼できるヘッダー 1 つ）。利用者が送った `X-Forwarded-For` や `x-client-ip` は無視される。

| 入口                                                       | 利用者の IP                     | 置く環境                                                                                         |
| ---------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------ |
| 公開の入口（envoy の 10000）                               | 接続元の IP                     | すべて                                                                                           |
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

## トレース（OpenTelemetry）

開発中に、studio から core までのリクエストを 1 本のトレースで見られる（studio#50）。`instrumentation.ts` で `@vercel/otel` の `registerOTel` を呼び、Next.js の処理・better-auth の DB の呼び出し・core への fetch をスパンにして送る。

| 項目              | 内容                                                                                                                                                                                                                                                                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 送り先            | OpenTelemetry の標準の環境変数 `OTEL_EXPORTER_OTLP_ENDPOINT`（開発・テスト用の環境は `http://host.docker.internal:4318`）・`OTEL_EXPORTER_OTLP_PROTOCOL`・`OTEL_SERVICE_NAME`。任意で、渡さなければ送らない（リリース確認の環境・本番のように受け手が無くても、同じイメージのまま普通に動く）。受け手に届かなくても studio は普通に動く |
| 受け手            | core の compose の otel-lgtm（`make up` で core と一緒に起動）。Grafana は http://127.0.0.1:3002（ログインなし）の Explore で Tempo を選ぶ。studio のコンテナは共有ネットワークに入れず、`extra_hosts` の `host.docker.internal` でホストの 4318 番に届ける                                                                             |
| core とのつながり | core を呼ぶ fetch に `traceparent` を付ける。@vercel/otel は既定では自分と同じ宛先への fetch にしか付けないため、instrumentation.ts の `propagateContextUrls` に `CORE_GRAPHQL_URL` を渡している（無いと studio と core が別々のトレースになる）。core は受けた `traceparent` を引き継ぐ                                                |
| 確かめ方          | `traceparent: 00-<32 桁の 16 進数>-<16 桁の 16 進数>-01` を付けて、ログイン後の Cookie でページ（例: `/boards`）を呼び、`curl http://127.0.0.1:3002/api/datasources/proxy/uid/tempo/api/traces/<trace id>` で studio と core のスパンが同じ trace id に並ぶことを見る                                                                   |

## DB マイグレーション

core・studio・game で同じ形式（Atlas Community Edition `arigaio/atlas:1.3.5-community`、`migrations/NNNN_name.sql` + `atlas.sum`）にそろえている（方針は core#5、決まりと Atlas の注意点の詳細は core の README）。
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
- lib/auth.ts を変えたのにマイグレーションを作り忘れると、Atlas の適用は通るのに本番でテーブル・列が足りずに壊れる。`scripts/check-auth-schema.sh`（`auth generate` で差分が無いことを確かめる）で検査する（`make lint`・CI の check のジョブ（test の手順））
- 上記と番号の重複・適用済みより小さい番号の追加は、Atlas が検出しないため `scripts/check-migrations.sh`（core と同じもの）で検査する（`make lint`・CI の check のジョブ（lint の手順））

| 環境                          | 実行方法                                                                                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 開発（compose.yaml）          | studio-migrate サービス（migrations をマウント）が studio の起動前に 1 回実行。`make migrate`                                                         |
| テスト用（compose.test.yaml） | studio-migrate サービス（マイグレーション用イメージ）                                                                                                 |
| リリース・本番                | タグのパイプラインで `diecardomain/studio-migrate:<タグ>` を Docker Hub に push。本番では studio より先に `DATABASE_URL` を渡してジョブとして実行する |

## 依存パッケージ

- 追加は `docker compose exec studio pnpm add <pkg>` のようにコンテナ内で行う
- node_modules はコンテナ内の pnpm がインストールし、ホストと共有する（VSCode の型補完・biome が使える）
