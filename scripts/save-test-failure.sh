#!/usr/bin/env bash
# make test が落ちたときに、テスト用の環境を消す前に、あとから原因を確かめるための材料を test-failures/<日時>/ に移す。
# Playwright は流すたびに test-results/ を空にし、make test は終わると down -v でログと DB ごと環境を消すため、
# 移しておかないと次に流した時点で何も残らない。DB の中身まで残すのは、投影が遅れてテストが待ちきれなかっただけか
# （イベントは保存され、あとで read model に反映していたか）を、落ちたあとで確かめられるようにするため（studio#46）
# 使い方: scripts/save-test-failure.sh <テスト用の環境の docker compose のコマンド>
set -euo pipefail

compose=("$@")
dir="test-failures/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$dir/logs" "$dir/db"

if [ -d test-results ]; then
  mv test-results "$dir/test-results"
fi

for service in $("${compose[@]}" --profile runner ps -a --services); do
  "${compose[@]}" logs --no-color --timestamps "$service" > "$dir/logs/$service.log" 2>&1 || true
done

"${compose[@]}" exec -T core-db pg_dump -U core_user core_studio > "$dir/db/core_studio.sql" || true
"${compose[@]}" exec -T core-db pg_dump -U core_user core_game > "$dir/db/core_game.sql" || true
"${compose[@]}" exec -T studio-db pg_dump -U studio_user studio > "$dir/db/studio.sql" || true

echo "テストが落ちたときの記録を $dir に保存しました（見方は README の「テストが落ちたとき」）" >&2
