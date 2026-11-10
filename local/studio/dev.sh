#!/bin/sh
# 開発の studio の起動。依存を入れ、開発用オペレーターの seed（冪等）を済ませてから開発サーバーを起動する
set -eu

pnpm install --frozen-lockfile

# 依存か Next.js の設定が前回の起動から変わっていたら、起動をまたいで残る開発用のキャッシュ（.next/dev）を消す。依存を入れ替えた後に
# 残ったキャッシュを使うと、開くたびに Turbopack が作り直しと全体の読み直しを指示し、再起動しても直らなかったため（studio#66・game#39）。
# キャッシュを切る設定（turbopackFileSystemCacheForDev: false）にしないのは、変わらない起動では既定どおりキャッシュを効かせるため。
# 起動のたびには消さない。手で作り直すときは make dev-cache-reset（控えを消して再起動し、ここで消す）
stamp=.next/dev-cache-key.sha256
current=$(cat node_modules/.pnpm/lock.yaml next.config.ts | sha256sum)
if [ "$(cat "$stamp" 2>/dev/null || true)" != "$current" ]; then
  echo "依存か Next.js の設定が変わったため、開発用のキャッシュ（.next/dev）を消します"
  rm -rf .next/dev
  mkdir -p .next
  printf '%s\n' "$current" > "$stamp"
fi

pnpm db:seed

# 依存が変わっていなくても、起動の直後にキャッシュが壊れて読み直しを繰り返すことがある（2026-11-09・11-10 の WSL の再起動の後）。
# 開発サーバーを子として動かし、出力の「Compiled in」の行を 1 分ごとに数え、しきい値を超えたらキャッシュを消して起動し直す（game#68・studio#77）。
# しきい値は core#133 の Grafana のパネルと同じ（ふだんは 1 分に数行、繰り返しの最中は 100 行前後）。exec で置き換えないのは、出力を読むため。
# 作り直しても直らないときは原因がキャッシュでないので、回数の上限を超えたら数えるのをやめる（無限に作り直さないため）
limit=${DEV_RELOAD_LOOP_LIMIT:-20}
max_resets=${DEV_RELOAD_LOOP_MAX_RESETS:-3}
output=/tmp/next-dev-output
dev=

# 開発サーバーを子プロセスまでまとめて止める（setsid で起動したので、グループごとに送れる。dash の kill は「--」を受け付けないので付けない）。10 秒で止まらなければ強制的に止める
stop_dev() {
  kill -TERM "-$dev" 2>/dev/null || true
  waited=0
  while kill -0 "$dev" 2>/dev/null && [ "$waited" -lt 10 ]; do
    sleep 1
    waited=$((waited + 1))
  done
  kill -KILL "-$dev" 2>/dev/null || true
  wait "$dev" 2>/dev/null || true
}

# 止めるとき（docker compose stop の合図）
stop() {
  if [ -n "$dev" ]; then
    stop_dev
  fi
  exit 143
}
trap stop TERM INT

# 出力をそのまま流しながら数える。しきい値を超えたら 3 で終わり、開発サーバーが終われば（出力が閉じれば）0 で終わる
watch_output() {
  detect=$1
  window=$(date +%s)
  count=0
  while IFS= read -r line; do
    printf '%s\n' "$line"
    case $line in
      *"Compiled in"*)
        [ "$detect" = yes ] || continue
        now=$(date +%s)
        if [ $((now - window)) -ge 60 ]; then
          window=$now
          count=0
        fi
        count=$((count + 1))
        if [ "$count" -ge "$limit" ]; then
          return 3
        fi
        ;;
    esac
  done
  return 0
}

resets=0
while :; do
  rm -f "$output"
  mkfifo "$output"
  # pnpm を挟まない。pnpm がスクリプトを動かすシェルは止める合図を受け付けず、開発サーバーを止められなかったため
  setsid node_modules/.bin/next dev --hostname 0.0.0.0 > "$output" 2>&1 &
  dev=$!
  detect=yes
  if [ "$resets" -ge "$max_resets" ]; then
    detect=no
  fi
  watch_output "$detect" < "$output" &
  watcher=$!
  status=0
  wait "$watcher" || status=$?
  if [ "$status" -ne 3 ]; then
    # 開発サーバーが自分で終わった。その終わり方をコンテナの終わり方にする
    status=0
    wait "$dev" || status=$?
    exit "$status"
  fi
  resets=$((resets + 1))
  echo "開発の画面の読み直しの繰り返し（1 分に ${limit} 回以上の再コンパイル）を見つけたので、開発用のキャッシュ（.next/dev）を消して起動し直します（${resets} 回目）"
  if [ "$resets" -ge "$max_resets" ]; then
    echo "作り直しが ${max_resets} 回に達したので、この起動の間は数えるのをやめます。直らなければキャッシュ以外の原因を調べる"
  fi
  stop_dev
  rm -rf .next/dev
done
