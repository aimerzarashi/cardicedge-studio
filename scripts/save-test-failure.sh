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
if [ -d playwright-report ]; then
  mv playwright-report "$dir/playwright-report"
fi

for service in $("${compose[@]}" --profile runner ps -a --services); do
  "${compose[@]}" logs --no-color --timestamps "$service" > "$dir/logs/$service.log" 2>&1 || true
done

"${compose[@]}" exec -T core-db pg_dump -U core_user core_studio > "$dir/db/core_studio.sql" || true
"${compose[@]}" exec -T core-db pg_dump -U core_user core_game > "$dir/db/core_game.sql" || true
"${compose[@]}" exec -T studio-db pg_dump -U studio_user studio > "$dir/db/studio.sql" || true

# 落ちたテストの trace id（tests/fixtures.ts が test-results/<テスト>/trace-id.txt に書く）ごとに、受け手（core の compose の
# otel-lgtm。Grafana の API 経由）から Tempo のトレースと Loki のログを取り出す。受け手が動いていない・取れないときは、
# 飛ばして今までの記録だけ残す（make test の終了コードを変えない）
grafana="${GRAFANA_URL:-http://127.0.0.1:3002}"
loki="$grafana/api/datasources/proxy/uid/loki/loki/api/v1/query_range"
tempo="$grafana/api/datasources/proxy/uid/tempo/api/traces"
since="$(( ($(date +%s) - 6 * 3600) * 1000000000 ))"

# 使い方: query <LogQL> <出力ファイル> [始まりの時刻(ns)]
query() {
  curl -fsS --max-time 20 -G "$loki" --data-urlencode "query=$1" \
    --data-urlencode "start=${3:-$since}" --data-urlencode "limit=5000" --data-urlencode "direction=forward" > "$2"
}

for file in "$dir"/test-results/*/trace-id.txt; do
  [ -e "$file" ] || continue
  id="$(tr -d '[:space:]' < "$file")"
  out="$dir/traces/$id"
  mkdir -p "$out"
  basename "$(dirname "$file")" > "$out/test-dir.txt"
  curl -fsS --max-time 20 "$tempo/$id" > "$out/tempo.json" || { echo "Tempo からトレース $id を取れませんでした" >&2; rm -f "$out/tempo.json"; }
  # trace_id はログの本文ではなく構造化メタデータのため、本文の検索（|=）ではなくフィルター（| trace_id=）で引く
  query "{service_name=~\"core|studio\"} | trace_id=\"$id\"" "$out/loki.json" || { echo "Loki からトレース $id のログを取れませんでした" >&2; rm -f "$out/loki.json"; }
  # 投影・ポリシーの処理のログは trace_id を持たず、event_id 等（構造化メタデータ）で保存のログとつながる。
  # event_id だけで引かないのは、DB ごとの連番でテスト用の環境を作るたびに同じ番号になり、受け手には前に流したテストのログも
  # 残っていて、別の実行のログが混ざるため（実際に混ざった）。イベントを決める項目をそろえ、保存のログの時刻より後に絞る
  if [ -f "$out/loki.json" ] && command -v jq > /dev/null; then
    jq -r '.data.result[] | select(.stream.event_id) | [.stream.event_id, .stream.entity_type, .stream.entity_id, .stream.aggregate_version, .values[0][0]] | @tsv' \
      "$out/loki.json" | while IFS=$'\t' read -r event type entity version at; do
      query "{service_name=\"core\"} | event_id=\"$event\" | entity_type=\"$type\" | entity_id=\"$entity\" | aggregate_version=\"$version\"" \
        "$out/loki-event-$event.json" "$at" || rm -f "$out/loki-event-$event.json"
    done
  elif [ -f "$out/loki.json" ]; then
    echo "jq が無いため、投影・ポリシーの処理のログを取りませんでした（README の「必要なもの」）" >&2
  fi
done

echo "テストが落ちたときの記録を $dir に保存しました（見方は README の「テストが落ちたとき」）" >&2
