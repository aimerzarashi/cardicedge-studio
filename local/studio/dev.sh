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
exec pnpm dev --hostname 0.0.0.0
