# コマンド

- `make up` / `make down` / `make clean` / `make migrate` / `make migrate-generate NAME=<name>` / `make migrate-hash` / `make gen-api` / `make core-local` / `make fmt` / `make lint` / `make test-unit` / `make test`、任意で `make tunnel`（Cloudflare Quick Tunnel。URL の再表示は `make url`）
- `make up` は先に `../core` の `make up` を実行する。`make down` は studio だけを止める（core は止めない）。studio-db のデータは名前付きのボリュームに置き、`make down` では消さない。消す `make clean` のあとは core も作り直す（seed が作り直したオペレーターを、core が前の紐づけのまま紐づけ直さないため。studio#19）
- pnpm・node はコンテナ内で実行する（例: `docker compose exec studio pnpm lint`）。node_modules はコンテナの pnpm が作り、ホストと共有する
- lint は `make lint`（biome check、`pnpm typecheck`、scripts/check-migrations.sh、scripts/check-auth-schema.sh）でファイルを書き換えない。typecheck は `next typegen` で Next.js の型（LayoutProps 等）を生成してから tsc を実行する。フォーマットの修正は `make fmt`（biome format --write）
- pnpm のバージョンを上げるときは package.json の `packageManager`、local/studio/Dockerfile・.build/Dockerfile・.gitlab-ci.yml の `PNPM_VERSION` を揃える（corepack は使わない）
- React Compiler を有効にしている（next.config.ts の `reactCompiler`）。useMemo / useCallback による手動メモ化は原則書かない

# ディレクトリ構成

| パス | 責務 |
|---|---|
| app | App Router のページ・レイアウト（`/login`・`/signup`・`/forgot-password`・`/reset-password`、`/api/auth/[...all]` は better-auth、`/cards`（カードの一覧。状態の絞り込み・公開する・使用不可にする）・`/creatures/new`（Creature の登録）・`/items/new`（Item の登録）・`/spells/new`（Spell の登録）・`/preset-decks`（プリセットデッキの一覧）・`/preset-decks/new`（登録）・`/preset-decks/[id]`（詳細。名前の変更・カードの枚数の変更・削除）・`/starter-decks`（スターターデッキの一覧）・`/starter-decks/new`（空から登録・プリセットデッキから写して登録）・`/starter-decks/[id]`（詳細。準備中だけ名前・カードの枚数の変更と削除。公開する・使用不可にする）・`/boards`（ボードの一覧。1 つのボードを 2 行にし、1 行目は名前・状態・大きさ・マスの数（core の tileCounts をそのまま出す。拠点・チェックポイント・土地の順で、土地の後に属性ごとの数（0 も出す）を括弧で添え、そのあとに転送円・橋・聖堂・ほこら・占い館・カード屋の数（0 も出す）を道具と同じ順に並べる）・登録日時・更新日時、2 行目は既定のルールの 7 つの値）・`/boards/new`（登録）・`/boards/[id]`（詳細。大きさ・マスの数・つながりの数（種類ごとの数は一覧の絞り込みになるため出さない。格子の絵で見る）。「既定のルール」の節に、目標の魔力・開始時の魔力・周回のボーナス・チェックポイントのボーナス・ラウンドの上限・サイコロの目（最小）・サイコロの目（最大）（対戦を始めるときに変えられる既定の値）を置き、準備中だけ数の入力（魔力の 4 つは 100 刻み、ラウンドの上限とサイコロの目は 1 刻み。入力のしやすさのための表示の都合の値で、core の決まりではない。刻みは messages.ts の ruleStep）と保存（changeBoardDefaultRules。誤りの文言は core が返した下限・比べる相手の項目（FieldTooSmall・FieldNotGreaterThan・FieldLessThan）から作り、決まりの値は書き写さない。公開中・使用不可は表示だけ）。準備中だけ名前の変更と削除。公開する・使用不可にする。公開できない理由は core が返す（Board.publishProblems。公開に失敗したときの BoardNotPublishableError.problems も同じ形）。理由は __typename（BaseCountProblem・NoCheckpointProblem・UnreachableTilesProblem・UnpairedTilesProblem）で見分け、文言は理由ごとに studio が作る（座標の羅列は出さず、拠点の数・行けないマスの数・相手のいない転送円・橋の数で言う。messages.ts の boardPublishProblemMessage）。「レイアウト」の節に格子を置く。準備中だけ道具（拠点・チェックポイント・火・地・水・風・無・複の属性ごとの土地・転送円・橋・聖堂・ほこら・占い館・カード屋・消す。置く・属性だけ違う土地を上書き（つながりは残す）・消す。道具と凡例の並びは board-layout.ts の PLACEMENTS で 1 か所）を選んでマスを押して編集し、幅・高さは数の入力で変えて、幅・高さの範囲は core の studioRules.board（minSize・maxSize）から読んで入力の min・max にし、整数で範囲の中のときだけ格子を描き直す。下限は置いてあるマスにも合わせ、一番右の列 + 1・一番下の行 + 1 より小さくできない（格子の外のマスを画面の操作で作らない。縮めたら外のマスを消す形にしないのは、消したつもりのないマスが消えるため。下限より小さい値は格子を描き直さず判定も問い合わせず、保存は入力の min で止まる。マスを消して下限が下がったら、入力中の値で描き直す。studio#40）。保存で changeBoardLayout を呼ぶ（マスは core の入力（@oneOf の land・base・checkpoint・warp・bridge・sanctuary・shrine・prophecyShop・cardShop）に合わせて種類ごとに送り、転送円・橋の対は pairs（{ a, b }。a は座標が小さい側）で送る。画面の中のマスは出力と同じ LandTile・BaseTile・CheckpointTile・WarpTile・BridgeTile・SanctuaryTile・ShrineTile・ProphecyShopTile・CardShopTile の型で、種類は __typename で見分け、属性は土地だけが必ず持つ）。公開中・使用不可は同じ格子を表示だけで出す。格子の外のマスなどの誤り（対の誤り pairs.N.a・pairs.N.b・pairs.N も）は core が返した位置を送った一覧の N 番目に読み替えて文言にする（格子に印は付けない。画面の操作ではレイアウトの誤りを起こせず、起きるのは画面と core の決まりがずれたときだけのため。studio#33・studio#40）。格子の部品は app/boards/board-grid.tsx（表示。幅・高さ・マス・つながりの props と、押されたときの処理。game#9 が写す）と app/boards/[id]/layout-editor.tsx（編集）。部品の中の純粋な関数は、単体テストで読めるよう .ts に分けている（studio#47）: app/boards/board-view.ts（表示の計算。span・fitView・centerOn・zoomAt・tracks と倍率の定数）、app/boards/board-paint.ts（色と文字の paint・tileText・FACILITY_GLYPHS、印の markOutline・markStyle・MARK_STYLES、マスの名前 tileName。game#9 も写す）、app/boards/[id]/layout-size.ts（幅・高さの判定。minSize・inRange・gridSizeFor・isBelowMin）。格子は (2W−1)×(2H−1) の grid で、偶数の位置がマス「(x, y) のマス」（置いてあれば種類が付く。例「(2, 0) のマス 拠点」「(1, 0) のマス 火属性の土地」。種類・属性は色で見せ（火属性は赤・地属性は緑・水属性は青・風属性は黄土色・無属性は灰色・複属性は 4 色を 4 つに分けて塗る・拠点は紫・チェックポイントは明るめの桃色・転送円は青緑・橋は茶色・施設 4 つは共通の濃い灰色。転送円・橋は対の番号「1-1」「1-2」（相手のいないものは「?」）、施設は 1 文字（聖・祠・占・店）をマスの中に書く。文字は盤面の回転を打ち消して正面に向ける）、凡例（14 個。道具と同じ並びで消すは無い）を格子の外に置く）、奇数の位置が間の印「(x, y) と (x+1, y) のつながり」「(x, y) と (x, y+1) のつながり」（aria-pressed。つながっていれば白、いなければ暗い灰色）、奇数×奇数は空き。grid 全体を `scaleY(0.5) rotate(45deg)` で回してつぶし、斜め見下ろしにする。格子は決まった大きさの枠の中に描き（枠の背景は画面のモードによらず濃い紺に固定）、はみ出しはスクロールではなくドラッグで動かし、ホイールとボタン（拡大・縮小・全体を表示）で拡大縮小して見る（最初と「全体を表示」は全体が収まる大きさで中央。倍率は枠の data-scale。拡大の上限・下限は表示の都合の値で studio が持つ）。公開できない理由は、準備中のレイアウトの節に「公開できない理由」の一覧（core が判定したもの。開いた直後・保存した直後は core が返した保存済みの形のもの。マスの置き換え・対の変更・つながりの切り替え・幅・高さの変更のたびに、操作が止まって 0.3 秒たってから Server Action（actions.ts の checkBoardLayout。ブラウザから core を直接呼ばない）で core の checkBoardLayout（保存せず、イベントも作らない）に問い合わせ、結果に変える。判定は studio に書き写さない。古い問い合わせの結果は番号で見分けて捨てる。レイアウトの誤りが返ったら（画面の操作では起きない）、保存のときと同じ文言（layoutErrors）を「レイアウトの誤り」の一覧として同じ場所に出し、公開できない理由は出さない。core に届かなかったときは今の一覧を残して確かめられなかったことを知らせる。空なら「公開できます」。公開中・使用不可は出さない）として出し、座標のある理由（拠点の数・行けないマス・相手のいない転送円・橋）は格子の該当のマスに枠の印を付ける（拠点の数は黄色の実線、行けないマスは水色の破線、相手のいない転送円・橋は橙色の点線。格子の部品へは marks で渡し、渡さなければ印は無い。game への写しでも同じ props）。一覧の項目を押すと、格子の focus で最初のマスが枠の中央へ動き（倍率は変えない）、その理由のマスすべてが太い枠で光る。座標の無い理由は押せない。公開に失敗したときは公開の節に同じ一覧の部品を（押せない形で）出す。ボードの一覧は、準備中のボードだけ 2 段目に「公開できない理由 N 件」か「公開できます」を出す。理由の部品は app/boards/publish-problems.tsx。理由の型 PublishProblem と印の作り方 problemMarks は、単体テストで読めるよう app/boards/publish-problem.ts に分けている）。転送円・橋の対の編集（board-layout.ts の pressPairable。画面の部品は呼ぶだけ）: 転送円（橋）の道具で押すと、相手待ち（画面の中だけの状態で、開いた直後と道具を変えたときは無い。白い点線の枠）が無ければ新しく置いて（ほかの種類のマスの上書きでもよい）それを相手待ちにし、あれば置いたものと対にする。相手のいないものを押すとそれを相手待ちにし、相手待ちのまま相手のいない別のものを押すと対にする。同じものをもう一度押すと相手待ちをやめる。対になっているものを押しても何もしない。片方を消す・種類の違う道具で上書きすると、もう一方は相手のいないものとして残る。番号は転送円と橋で別に、cells.pairs の並び（座標では並べ替えない）で対ごとに 1 から振り、端は a が 1・b が 2。格子の部品へは pairs・pending（相手待ち）で渡す、`error.tsx`（想定外の誤り））。core の操作は、使うページと同じディレクトリに `graphql()` で書く（いくつかのページで使うものは、その親のディレクトリに置く。例: app/preset-decks/wait-preset-deck.ts。プリセットデッキとスターターデッキの詳細で共通のフォーム・文言は app 直下の card-counts-form.tsx・rename-deck-form.tsx・delete-deck.tsx・deck-form.ts・messages.ts。公開する・使用不可にするボタンの status-button.tsx はスターターデッキとボードで共通） |
| lib/auth.ts | better-auth の設定（サーバー側）。公式どおり `export const auth = betterAuth(...)`。CLI もこれを読む |
| lib/auth-client.ts | better-auth のクライアント |
| lib/card-type.ts・lib/format.ts・lib/search-params.ts | 画面で共通に使う、カードの種類（絞り込みの選択肢・表示名）、日時の表示、ページの searchParams の読み方 |
| lib/core.ts | core の GraphQL を、ログイン中のオペレーターとして呼ぶ（`callCore`。サーバーだけ。最初に `connection()` を呼び、core を呼ぶ画面をビルドのときに前もって描かせない。studio#21）。JWT は `auth.api.getToken({ headers })` でセッションの Cookie からもらう。core に届かない（502・503・504・つながらない・10 秒の時間切れ）ときは投げずに `{ ok: false, reason: "unavailable" }` を返し、401 はログイン画面へ移す |
| graphql | `make gen-api` の生成物（`schema.graphql` は前提にする版の core のイメージから取り出した studio 用のスキーマ、ほかは graphql-codegen の型）。手で直さない。biome の対象から外している |
| codegen.ts・.graphqlrc.yaml | graphql-codegen の設定と、VSCode の GraphQL の拡張の設定（どちらも graphql/schema.graphql と app・lib の操作を指す） |
| proxy.ts | 未ログインのときにログイン画面へ移す（Next.js 16 の proxy。Cookie の有無だけを見る） |
| migrations | DB マイグレーション（`NNNN_name.sql` + `atlas.sum`）。better-auth のテーブルも `auth generate` で SQL にしてここに置き、Atlas で適用する |
| local/migrate | マイグレーション用イメージ（Atlas Community + migrations。core と同じ構成） |
| scripts/check-migrations.sh | Atlas が検出しない migrations の違反の検査（core と同じものを置く。変えるときは core / game と揃える） |
| scripts/check-auth-schema.sh | better-auth の設定と DB（DATABASE_URL）のスキーマに差分が無いことの検査（マイグレーションの作り忘れを防ぐ） |
| scripts/save-test-failure.sh | `make test` が落ちたときに、テスト用の環境を消す前に記録（test-results・ログ・DB の中身）を test-failures/ に移す |
| scripts/seed.ts | 開発・テスト用の、メールアドレスを確認済みのオペレーターを作る（`pnpm db:seed`） |
| tests | Playwright のテスト（E2E） |
| `*.test.ts`（app/ 配下） | `node --test` の単体テスト。調べる元のファイルの隣に置く（board-layout.test.ts・messages.test.ts・boards/board-view.test.ts・boards/board-paint.test.ts・boards/publish-problem.test.ts・boards/[id]/layout-size.test.ts）。本番用イメージのビルドには入れない（.dockerignore） |
| local/studio | 開発用 Dockerfile |
| .build | 本番用 Dockerfile（standalone 出力を node で動かす。テスト用環境・CI でも使う） |
| local/core-db | テスト用の環境（compose.test.yaml）の core-db の初期化（core_game を作る。core のものを使わないのは、../core のブランチしだいで中身が変わるため） |
| local/envoy | envoy の設定（開発環境・テスト用の環境の入口。relay-listener.yaml はテスト用の環境だけの中継役用の入口） |

# 入口（envoy）

- アクセスはすべて studio-envoy:10000 を経由する（ホストは STUDIO_PORT、既定 3001）。studio:3000 はホストに公開しない
- envoy を経由するホスト名からのアクセスは Next.js の `allowedDevOrigins` に追加する（`studio-envoy`、`*.trycloudflare.com`）

# 画面の決まり

参照プロジェクトの game の決まり（.claude/rules/）から、studio に合うものを取り入れた（studio#14）。見た目の作り方（デザインシステム）は studio#17 で決める。

- Next.js の仕様は、覚えている知識ではなく、入っている版に同梱された公式の文書（`node_modules/next/dist/docs`）を探して読んで確かめる（版ごとの変化が大きいため。参照の game の AGENTS.md の索引は、毎回の会話に数千トークン入るため読み込まない）

- 画面は表示と入力の受け渡しに徹し、ドメインの判断（正誤・権限・計算）は core に任せる
- core が返した一覧を画面で絞り込んだり並べ替えたりしない。要るなら core の引数で渡す
- 入力の検査は送信前の最小限（`required` 等）にし、正誤は core に任せる。上限などの値を studio に書き写さない（core を変えたときにずれるため）
- 画面が持つ状態は、表示のためのもの（開閉・入力中の値・読み込み中等）だけにする
- 文言は studio が作る。core は文言を返さず、結果の型と値（`__typename`・`field`・`max` 等）だけを返す（core の決まり）ため、型と値から文言を組み立てる（参照の game は API の `Error` のメッセージをそのまま表示していた）
- 標準（JS・HTML・CSS）で用意されている機能があれば、それだけのためにパッケージを足さない（日付・数値の表示は `Intl`、ダイアログは `<dialog>`、ポップオーバーは `popover` 属性 等）。パッケージを足すときは、標準で足りない理由を MR に書く（graphql-codegen 等、標準に代わるものが無いものは足してよい）
- 実行時の検査は、型で保証できない境界（フォームの入力の `FormData` 等）だけで行う。codegen で型が付いた core の応答と、境界でない関数の間の受け渡しは検査し直さない。中身の正誤は core が判定するため、studio が確かめるのは形（文字列であること等）だけ。構造のある検査が要る境界が出てきたら valibot を入れる（Zod は使わない。参照の game と同じ）
- 絞り込み・ページ（カーソル）等は URL に持ち、`useState` で持たない（再読み込み・共有で同じ画面に戻るため）。ページ（Server Component）は `searchParams` で読み、変えるときは `next/form` の `<Form>`（GET）か `<Link>` を使う（画面の移動として Transition の中で進む）。参照の game の nuqs は、サーバーに問い合わせ直さずにブラウザの中の状態を URL に持つ（shallow）ためのもので、studio の一覧は条件が変わるたびにサーバーで core を呼び直すため入れない。そういう場面が出てきたら考える

## React（Async React）

非同期の処理は、React Conf 2025 の「Async React」の考え方に沿って、待ち状態・楽観的な表示・読み込みの境界を React に任せ、部品ごとに読み込み中の印・エラー・競合を手で持たない。

- 読み込み: データは async の Server Component で読み、読み込み中の表示は `Suspense`（`loading.tsx` か `<Suspense>`）の境界で出す。`useEffect` と `useState` でデータを取りに行かない
- 変更: core を呼ぶフォームは Server Action（`<form action>`）と `useActionState` で送る。送信中の表示は `useActionState` の待ち状態か `useFormStatus` で出す。ハイドレーションの前でも POST で届くため、送れなくする工夫（`useHydrated`）は要らない
- 更新の間: 絞り込み・ページの移動は Transition の中で行い、前の表示を残したまま次を待つ。素早い入力（名前の検索等）には `useDeferredValue` を使う
- 先に見せる: 変更の結果を先に見せるときは `useOptimistic` を使う
- 誤り: 想定内の誤り（入力の誤り・名前の重複・権限なし）は core の結果の型として表示し、想定外の誤りはエラーの境界（`error.tsx`）で受ける
- 版（revision）: 変える・消す操作は、画面で見た版を隠し項目で送る（利用者には見せない）。core の操作の結果は id と revision だけで、詳細は投影から読むため、Server Action は詳細が結果の revision に届くまで読み直してから `refresh`・`redirect` で出し直す（届く前に出し直すと、古い版のまま次の操作をして「先に変えられた」になる。例: app/preset-decks/wait-preset-deck.ts。studio#20）。「先に変えられた」は、変えずに `refresh` で最新を出し直して知らせる。入力した値・確認の表示は、入力したときの版に結びつけ、版が変わったら残さない
- React Compiler に任せ、手動のメモ化（`useMemo`・`useCallback`・`React.memo`）を書かない。`forwardRef` を使わない（`ref` は普通の prop）。非推奨の警告が出たら、今の推奨の書き方に直す
- better-auth のクライアントを呼ぶ認証の画面（ログイン等）は、ブラウザで Cookie を受け取る形のため、今の形（`authClient` と `useState`）のままにする

# 統合（core）

- core と共有する studio 用のネットワーク `diecardomain-studio` に参加するのは studio-envoy だけ（game 用の `diecardomain-game` とは分け、game から studio に内部から届く経路を無くす。studio#30）。studio は参加させない（core・game から直接届くと x-client-ip を偽装できる。studio#11）。studio から core へは studio-envoy の `/studio/graphql`、core から studio へは studio-envoy を通す
- envoy は `/studio/graphql` を core に転送する（core が止まっていれば 503）
- studio が前提にする core の版は、Makefile の `CORE_VERSION` に書く（studio の .env は git 管理しないため）。`make gen-api` は、その版のイメージから `docker run --rm diecardomain/core:<版> schema studio` でスキーマを取り出して graphql/schema.graphql に書き、graphql-codegen で型を作る。版を上げるときは `CORE_VERSION` を変えて `make gen-api` し、graphql/ の差分と一緒にコミットする（studio#14）
- マイルストーンの途中で、まだリリースしていない core の変更を使うときは、`make core-local` で手元の ../core から `diecardomain/core:local`・`core-migrate:local` をリリースと同じ Dockerfile で作り、`make gen-api CORE_VERSION=local`・`make test CORE_VERSION=local` のように引数で渡す。Makefile の `CORE_VERSION` は local にしない（コミットした Makefile が手元にしか無いイメージを指さないようにするため）。マイルストーンの MR の前に、core のリリースした版に `CORE_VERSION` を固定して `make gen-api`（差分が無いこと）と `make test` をやり直す（作業の進め方を、マイルストーンの終わりに core をリリースする形に変えたため。studio#23）
- 開発の環境（`make up`）の core は、ルートの決まり（core は 1 つを共有する）のため ../core のソースから動く。`CORE_VERSION` とずれることはありうる
- core の宛先は環境変数 `CORE_GRAPHQL_URL`（studio-envoy の `/studio/graphql`）

# テスト

- テストの基準（studio#47）。E2E（Playwright）は遅く、機能を足すたびに増えるため、次に絞る。そのほかは単体テストで確かめる
  - E2E に残すもの: 画面ごとの主な流れを 1 本ずつ（core まで通して操作が届き、画面が最新を出し直す）、層をまたぐ約束（revision の取り違え、投影を待ってから出し直す等）、本物のブラウザでしか確かめられないもの（ドラッグ・拡大縮小・認証やメールの流れ）
  - 単体テストにするもの: 純粋な関数の決まり（編集の決まり・番号の振り方・誤りの文言の作り分け・並びや色の対応）。core が判定する決まりそのもの（公開できない理由・既定のルールの範囲等）は core のテストに任せ、画面では core の結果が文言と印になることを確かめる
  - 同じ画面の流れを重ねて確かめない。流れが重なるテストは 1 本にまとめ、テスト名で何を保証するかがわかるようにする
  - 見た目（色）は自動のテストにせず、目で確かめる
  - E2E から外したテストは、何で確かめるようになったか（単体テスト・残した E2E・確かめなくてよい理由）を MR に一覧で書く
- 単体テストは Node 組み込みの `node --test`（Node 24 は型を取り除いて .ts をそのまま読む）で、`describe`/`it` と `node:assert/strict` を使う。標準で足りるのでパッケージは足さない（部品の描画を単体で確かめたくなったら、そのときに Vitest 等を足すか考える）。`pnpm test:unit` で流し（`app/**/*.test.ts`）、`make test` の最初に `make test-unit`（テスト用のランナーのコンテナだけを `--no-deps` で一度動かす。core・DB・ブラウザは起動しない）を流して、落ちたら E2E の環境を起動せずに止める。`make lint` では流さない
- 単体テストは調べる元のファイルの隣に `*.test.ts` で置く。JSX を含む `.tsx` は Node が読めないため、部品の中の純粋な関数は `.ts` に出してから単体テストにする（board-view.ts・board-paint.ts 等。振る舞いは変えない）。時間に関わる副作用（layout-editor.tsx の scheduleCheck の 0.3 秒の待ちと古い結果を捨てる番号）は出さず、E2E で確かめる
- 単体テストで読むファイル（とそこから値を import するファイル）は、値の相対 import に `.ts` の拡張子を付ける（tsconfig の `allowImportingTsExtensions` で許している。Node は拡張子を補わないため）。型だけの import（`import type`）は消えるので、そのままでよい。`@/` で値を import しているファイルは Node が解決できないため、単体テストで読むなら相対パスにする。単体テストで読まない `.tsx` は拡張子を付けない
- `*.test.ts` は biome・typecheck の対象に入る。本番用イメージのビルドには入れない（.dockerignore の `**/*.test.ts`）
- `make test` は compose.test.yaml（プロジェクト名 studio-test）で専用の core・DB・本番用イメージの studio を起動し、終了後に破棄する。開発用環境・開発用 DB には触れない。core は ../core のソースではなく、`CORE_VERSION` のイメージ（`diecardomain/core`・`core-migrate`）を使う。ふだんはリリース済みの版（手元の ../core のブランチしだいで、前提と違う core でテストしないため）。マイルストーンの途中だけ、`CORE_VERSION=local` で `make core-local` のイメージを使い、マイルストーンの MR の前にリリースした版でやり直す（studio#23）
- 前準備は GraphQL で入れる（studio#48）。テストが確かめたいことの前に要るもの（公開中のカード、40 枚のプリセットデッキ・スターターデッキ、空のデッキ等）は、ログイン中のオペレーターの JWT で公開の入口の `/studio/graphql` を直接呼んで入れ、画面で 1 件ずつ作らない（画面で作ると 1 件で 10 秒を超え、E2E 全体を遅くする）。画面で作る流れは、その画面のテストで 1 本ずつ確かめる（カードの登録・公開は cards.spec.ts、デッキの登録は preset-decks.spec.ts・starter-decks.spec.ts の 1 本目）。テストが確かめている画面の操作（枚数を保存すると入れたカードに出る、プリセットデッキから写して登録する等）は、前準備にせず画面のままにする。道具は tests/core.ts（`callCore`。JWT を呼ぶページごとに 1 度だけ取る。`untilReached`）、tests/card.ts（`createPublishedCreatures`・`createDraftCreatures`）、tests/preset-deck.ts（`createPresetDeck`・`createFullPresetDeck`）、tests/starter-deck.ts（`createStarterDeck`・`createFullStarterDeck`・`createTenCreatures`）。core の操作の結果は id と revision だけで詳細は投影から読むため、道具は投影が結果の revision に届くまで待ってから返し、返した URL をすぐ開ける（画面の Server Action の wait-*.ts と同じ考え）。名前はテストごとに一意にする
- ボードのレイアウトは画面の操作（道具を選んでマスを押す）で入れる（tests/board.ts の `putTiles`・`saveLayout`）。画面で作るのが重いもの（拠点から行けないマスの座標の確かめ）だけ、tests/board.ts の `setBoardLayout` が、ログイン中のオペレーターの JWT（`/api/auth/token`）で公開の入口（`PLAYWRIGHT_PUBLIC_URL`）の `/studio/graphql` を直接呼んで入れる
- core を呼ぶテストは並列に動き、core の DB を共有するため、カード名等にテストごとに一意の値を付ける。core に届かないときの表示・error.tsx・次のページへのリンクは自動のテストにせず、テスト用の環境で画面で確かめて MR に書く（途中で core を止めると並列のテストに響く・50 件を超えるデータが要るため）
- テストは開発用イメージの studio-test-runner（profile: runner）から `docker compose run` で実行する。本番用イメージにはテストコードを含めない
- Playwright のブラウザは studio-playwright コンテナ（公式イメージ）で動く。studio コンテナから `run-server` に接続して実行する
- baseURL は `http://studio-envoy:10000`（本番と同じく envoy 経由で確認する）
- `run-server` は studio の node_modules の `@playwright/test` を Playwright のコンテナに読み取り専用で渡して起動する（npx で起動のたびに npm から取ってこない。npm に届かないとサーバーが立たないため。studio#25）。`@playwright/test`（package.json）と compose の Playwright イメージのバージョンは一致させる
- テストは tests/fixtures.ts の `test` / `expect` を使う。テストごとに `X-Forwarded-For` で別の IP を名乗り、本番モードのレート制限（ログインは同じ IP から 10 秒に 3 回）でほかのテストと枠を共有しないようにしている。名乗った IP が効くのは、テスト用の環境だけにある中継役用の入口（envoy の 10001。`PLAYWRIGHT_BASE_URL`）を通るとき。公開の入口は `PLAYWRIGHT_PUBLIC_URL`
- `make test` のテスト用のオペレーターは seed（operator@example.com。パスワード付き・確認済み）。ほかのアカウントはテストの中でサインアップし、Mailpit の確認のメールで確認する（tests/account.ts）
- 落ちたテストだけ Playwright が trace とスクリーンショットを残し（playwright.config.ts）、`make test` が落ちたときだけ、テスト用の環境を消す前に scripts/save-test-failure.sh が test-results・各コンテナのログ・各 DB の中身（pg_dump）を `test-failures/<日時>/`（git 管理しない）に移す。見方は README の「テストが落ちたとき」。retries は付けない（流し直しで通ると、たまに落ちることが隠れるため）。たまに落ちるテストは再現を探さず、起きたときにこの記録で調べる（投影の遅れで待ちきれなかっただけか、イベントと read model で確かめる。studio#46）
- メールは Mailpit が受け止め、テストは Mailpit の API で読む（tests/mail.ts）。メールのリンクのホスト名は BETTER_AUTH_URL のため、パスだけを使う（開発用の環境では localhost:3001 で、ブラウザのコンテナから届かない）

# 認証（better-auth）

- better-auth は標準の範囲で使う（独自の項目・独自の認証処理は作らない）。メールアドレス + パスワード。サインアップはメールアドレスの確認つき（`requireEmailVerification`）
- JWT の issuer / audience は環境変数 `JWT_ISSUER` / `JWT_AUDIENCE`（必須）で渡し、core の設定と一致させる。core は (iss, sub) で operator を識別するため、運用を始めた環境では issuer を変えない
- 誰をオペレーターにするか・権限は core が決める。better-auth に任せるのは、確認つきのサインアップ・ログイン・パスワードの再設定だけ。Admin プラグイン・role は使わない（studio#12）
- JWT には `definePayload` で `email`・`email_verified` だけを足す（core が初めてのログインでオペレーターに紐づけるのに使う）。メールアドレスの変更（changeEmail）は有効にしない（紐づけの前提が崩れる）
- better-auth の `name` は空文字にし、表示・メールに使わない
- lib/auth.ts とそこから読むファイル（lib/mail.ts）は、seed・better-auth の CLI が Node.js で直接読むため、パスの別名（`@/`）を使わず相対パス（`./mail.ts`）で import する（別名だと CLI が「server-only を外せ」という紛らわしいエラーを出す）
- メールは lib/mail.ts の `sendMail` だけで送る。better-auth の送信の関数では送信を await しない（登録の有無で応答時間が変わるため。公式の注意）
- 利用者の IP は envoy が上書きで入れる `x-client-ip` だけを見る（`advanced.ipAddress.ipAddressHeaders`）。studio の 3000 番を公開しない（直接届くと偽装できる）。中継役用の入口（local/envoy/relay-listener.yaml）は compose.test.yaml でだけ重ね、開発用・リリース版の環境に置かない
- レート制限の回数は DB（`rateLimit.storage: "database"`）で数える。テストのためにレート制限を無効にする設定は作らない
- secret（BETTER_AUTH_SECRET）はそのまま変えると jwks を復号できず 500 になる。変えるときは README の手順に従う
- lib/auth.ts は公式チュートリアルどおり、読み込み時に betterAuth を作る。next build 中は環境変数を渡さないため、better-auth が「Base URL is not set」（警告）と「default secret」（エラーのログ）を出すが、ビルドは成功し、実行時はコンテナの環境変数が使われる
- JWT_ISSUER / JWT_AUDIENCE が未設定だと better-auth は黙って BETTER_AUTH_URL を使うため、lib/auth.ts で実行時に必須チェックしている（next build 中は `NEXT_PHASE=phase-production-build` で判定して確かめない）
- lib/auth.ts は `import "server-only"` でクライアントからの読み込みをビルドエラーにしている。Node.js で直接動かす seed・CLI は `--conditions=react-server` を付けて実行する（付けないと server-only がエラーを投げる）
- DB のスキーマは better-auth の CLI（`auth migrate`）で直接変えない。`make migrate-generate` で差分 SQL を migrations に出し、Atlas で適用する（core・game と同じ手順・同じ記録にするため）
- マイグレーションは追加のみ。適用済みのファイルは変更・削除・改名しない。リリース前に限り並びを作り直してよく、そのときは migrations/BASELINE の 1 行目を書き換える（core と同じ。core#33）。Atlas のバージョンは local/migrate/Dockerfile の FROM を core / game と揃える
- 環境変数はサーバー側（lib/auth.ts）でだけ読む。`NEXT_PUBLIC_` は使わない（ビルド時に埋め込まれ、コンテナの環境変数で変えられなくなるため）
